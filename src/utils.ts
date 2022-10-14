/* c8 ignore next */
import { existsSync, readdir, readFileSync, stat } from 'fs'
import path from 'path'
import requireFromString from 'require-from-string'
import { promisify } from 'util'
import { dataDefaults, dataFileName, ProjectData } from './constants'
import { log } from './logger'

const statAsync = promisify(stat)

const readDirectoryAsync = promisify(readdir)

export const join = path.join

export const resolve = path.resolve

export async function isGitFolder (folderPath: string): Promise<boolean> {
  const stat = await statAsync(folderPath)
  if (!stat.isDirectory()) return false
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

export async function augmentDataWithGit (folderPath: string, dataSource: ProjectData): Promise<ProjectData> {
  const data = new ProjectData(dataSource)
  const gitFolder = join(folderPath, '.git')
  if (!existsSync(join(gitFolder, 'config'))) return data
  const gitConfigContent = await readFileInFolder(gitFolder, 'config')
  const matches = /url = .*[/:]([\w-]+)\/([\w-]+)/.exec(gitConfigContent)
  if (matches && matches[1]) {
    data.user_id = matches[1]
    log.debug('found user_id in git config :', data.user_id)
    data.user_id_lowercase = data.user_id.toLowerCase()
  }
  if (matches && matches[2]) {
    data.repo_id = matches[2]
    log.debug('found repo_id in git config :', data.repo_id)
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
  data.package_name = /"name": "([\w+/@-]+)"/.exec(content)?.[1] ?? dataDefaults.package_name
  data.license = /"license": "([\w+-.]+)"/.exec(content)?.[1] ?? dataDefaults.license
  const author = /"author": "([\s\w/@-]+)\b[\s<]*([\w-.@]+)?>?"/.exec(content) ?? ['', '', '']
  if (author[1]) data.user_name = author[1]
  if (author[2]) data.user_mail = author[2]
  data.is_module = content.includes('"type": "module"')
  data.useTailwind = content.includes('"tailwindcss"')
  data.useNyc = content.includes('"nyc"')
  data.useC8 = content.includes('"c8"')
  data.user_id = /github\.com\/([\w-]+)\//.exec(content)?.[1] ?? dataDefaults.user_id
  data.user_id_lowercase = data.user_id.toLowerCase()
  if (/"(vue|vitepress|nuxt)"/.test(content)) data.use_vue = true
  if (/(ts-node|typescript|@types)/.test(content)) data.use_typescript = true
  if (/(webcomponent|css|website|webapp)/.test(content) || data.use_vue) data.web_published = true
  if (content.includes('npm publish')) data.npm_package = true
  return data
}

export async function augmentData (folderPath: string, dataSource: ProjectData, shouldLoadLocal = false): Promise<ProjectData> {
  let data = new ProjectData(dataSource)
  data = await augmentDataWithGit(folderPath, data)
  data = await augmentDataWithPackageJson(folderPath, data)
  const localDataExists = shouldLoadLocal ? existsSync(join(folderPath, dataFileName)) : false
  if (localDataExists) { // local data overwrite the rest
    // should use something else than requireFromString
    const localData = requireFromString(await readFileInFolder(folderPath, dataFileName))
    Object.assign(data, localData)
  }
  return data
}

export async function readFileInFolder (folderPath: string, fileName: string): Promise<string> {
  const filePath = join(folderPath, fileName)
  if (!existsSync(filePath)) throw new Error(`file "${filePath}" does not exists`)
  const stat = await statAsync(filePath)
  if (stat.isDirectory()) throw new Error(`filepath "${filePath}" is a directory`)
  return readFileSync(filePath, 'utf8')
}

export async function getFileSizeInKo (filePath: string): Promise<number> {
  if (!existsSync(filePath)) return 0
  const stat = await statAsync(filePath)
  const size = Math.round(stat.size / 1024)
  log.debug('found that file', filePath, 'has a size of :', `${size}`, 'Ko')
  return size
}

export async function findStringInFolder (folderPath: string, pattern: string, count = 0): Promise<string[]> {
  const filePaths = await readDirectoryAsync(folderPath)
  const matches: string[] = []
  for (const filePath of filePaths) {
    if (['node_modules', '.git'].includes(filePath)) continue
    count++
    /* c8 ignore next */
    if (count > 1000) throw new Error('too many files to scan, please reduce the scope')
    const target = join(folderPath, filePath)
    const stat = await statAsync(target)
    if (stat.isDirectory()) {
      matches.push(...(await findStringInFolder(target, pattern, count)))
      continue
    }
    const content = await readFileInFolder(folderPath, filePath)
    if (content.includes(pattern)) matches.push(filePath)
  }
  return matches
}
