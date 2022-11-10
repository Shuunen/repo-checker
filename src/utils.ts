/* c8 ignore next */
import { existsSync, readFileSync } from 'fs'
import { readdir, stat } from 'fs/promises'
import path from 'path'
import requireFromString from 'require-from-string'
import { arrayUnique } from 'shuutils/dist/arrays'
import { slugify } from 'shuutils/dist/strings'
import { dataDefaults, dataFileName, ProjectData } from './constants'
import { log } from './logger'

const statAsync = stat

const readDirectoryAsync = readdir

export const join = path.join.bind(path)

export const resolve = path.resolve.bind(path)

export async function isGitFolder (folderPath: string): Promise<boolean> {
  const statData = await statAsync(folderPath)
  if (!statData.isDirectory()) return false
  return existsSync(join(folderPath, '.git', 'config'))
}

export async function getGitFolders (folderPath: string): Promise<string[]> {
  if (await isGitFolder(folderPath)) return [folderPath]
  const filePaths = await readDirectoryAsync(folderPath)
  const gitDirectories = []
  for (const filePath of filePaths) {
    const p = join(folderPath, filePath)
    if (await isGitFolder(p)) gitDirectories.push(p) // eslint-disable-line no-await-in-loop
  }
  return gitDirectories
}

export async function readFileInFolder (folderPath: string, fileName: string): Promise<string> {
  const filePath = join(folderPath, fileName)
  if (!existsSync(filePath)) throw new Error(`file "${filePath}" does not exists`)
  const statData = await statAsync(filePath)
  if (statData.isDirectory()) throw new Error(`filepath "${filePath}" is a directory`)
  return readFileSync(filePath, 'utf8')
}

export async function augmentDataWithGit (folderPath: string, dataSource: ProjectData): Promise<ProjectData> {
  const data = new ProjectData(dataSource)
  const gitFolder = join(folderPath, '.git')
  if (!existsSync(join(gitFolder, 'config'))) return data
  const gitConfigContent = await readFileInFolder(gitFolder, 'config')
  const matches = /url = .*[/:]([\w-]+)\/([\w-]+)/.exec(gitConfigContent)
  if (matches?.[1] !== undefined) {
    data.userId = matches[1]
    log.debug('found userId in git config :', data.userId)
    data.userIdLowercase = data.userId.toLowerCase()
  }
  if (matches?.[2] !== undefined) {
    data.repoId = matches[2]
    log.debug('found repoId in git config :', data.repoId)
  }
  return data
}

export async function augmentDataWithPackageJson (folderPath: string, dataSource: ProjectData): Promise<ProjectData> {
  const data = new ProjectData(dataSource)
  if (!existsSync(join(folderPath, 'package.json'))) {
    log.debug('cannot augment, no package.json found in', folderPath)
    return data
  }
  const content = await readFileInFolder(folderPath, 'package.json')
  data.packageName = /"name": "([\w+/@-]+)"/.exec(content)?.[1] ?? dataDefaults.packageName
  data.license = /"license": "([\w+-.]+)"/.exec(content)?.[1] ?? dataDefaults.license
  // eslint-disable-next-line unicorn/no-unsafe-regex
  const author = /"author": "([\s\w/@-]+)\b[\s<]*([\w-.@]+)?>?"/.exec(content) ?? []
  if (author[1] !== undefined) data.userName = author[1]
  if (author[2] !== undefined) data.userMail = author[2]
  data.isModule = content.includes('"type": "module"')
  data.useTailwind = content.includes('"tailwindcss"')
  data.useDependencyCruiser = content.includes('"dependency-cruiser"')
  data.useNyc = content.includes('"nyc"')
  data.useC8 = content.includes('"c8"')
  data.useEslint = content.includes('"eslint"')
  data.userId = /github\.com\/([\w-]+)\//.exec(content)?.[1] ?? dataDefaults.userId
  data.userIdLowercase = data.userId.toLowerCase()
  if (/"(vue|vitepress|nuxt)"/.test(content)) data.useVue = true
  if (/(ts-node|typescript|@types)/.test(content)) data.useTypescript = true
  if (/(webcomponent|css|website|webapp)/.test(content) || data.useVue) data.webPublished = true
  if (content.includes('npm publish')) data.npmPackage = true
  return data
}

export async function augmentData (folderPath: string, dataSource: ProjectData, shouldLoadLocal = false): Promise<ProjectData> {
  let data = new ProjectData(dataSource)
  data = await augmentDataWithGit(folderPath, data)
  data = await augmentDataWithPackageJson(folderPath, data)
  const localDataExists = shouldLoadLocal ? existsSync(join(folderPath, dataFileName)) : false
  if (localDataExists) { // local data overwrite the rest
    // should use something else than requireFromString
    const localData = requireFromString(await readFileInFolder(folderPath, dataFileName)) as ProjectData
    Object.assign(data, localData)
  }
  return data
}

export async function getFileSizeInKo (filePath: string): Promise<number> {
  if (!existsSync(filePath)) return 0
  const statData = await statAsync(filePath)
  const size = Math.round(statData.size / 1024)
  log.debug('found that file', filePath, 'has a size of :', `${size}`, 'Ko')
  return size
}

export async function findStringInFolder (folderPath: string, pattern: string, ignored = ['node_modules', '.git'], count = 0): Promise<string[]> {
  const filePaths = await readDirectoryAsync(folderPath)
  const matches: string[] = []
  if (filePaths.includes('.gitignore')) {
    const content = await readFileInFolder(folderPath, '.gitignore')
    ignored = arrayUnique([...ignored, ...content.split('\n')])
  }
  for (const filePath of filePaths) {
    if (ignored.includes(filePath)) continue
    count++
    /* c8 ignore next */
    if (count > 1000) throw new Error('too many files to scan, please reduce the scope')
    const target = join(folderPath, filePath)
    const statData = await statAsync(target).catch(() => null) // eslint-disable-line unicorn/no-null
    if (!statData) continue
    if (statData.isDirectory()) {
      matches.push(...await findStringInFolder(target, pattern, ignored, count))
      continue
    }
    const content = await readFileInFolder(folderPath, filePath)
    if (content.includes(pattern)) matches.push(filePath)
  }
  return matches
}

export const messageToCode = (message: string): string => {
  return slugify(message.replace(/[,./:\\_]/g, '-').replace(/([a-z])([A-Z])/g, '$1-$2'))
}
