/* c8 ignore next */
import { readdir, readFile as nodeReadFile, stat as nodeStat } from 'fs/promises' // eslint-disable-line no-restricted-imports
import path from 'path' // eslint-disable-line no-restricted-imports
import { arrayUnique, Nb, parseJson, slugify } from 'shuutils'
import { dataDefaults, dataFileName, ProjectData } from './constants'
import { log } from './logger'

const statAsync = nodeStat

const readDirectoryAsync = readdir

// eslint-disable-next-line @typescript-eslint/require-await
export const fileExists = async (filePath: string): Promise<boolean> => nodeStat(filePath).then(() => true).catch(() => false)


export const readFile = async (filePath: string): Promise<string> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const fileContent = await nodeReadFile(filePath, { encoding: 'utf8' })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  return Buffer.from(fileContent).toString()
}
export async function isGitFolder (folderPath: string): Promise<boolean> {
  const statData = await statAsync(folderPath)
  if (!statData.isDirectory()) return false
  return fileExists(path.join(folderPath, '.git', 'config'))
}

export async function getGitFolders (folderPath: string): Promise<string[]> {
  if (await isGitFolder(folderPath)) return [folderPath]
  const filePaths = await readDirectoryAsync(folderPath)
  const gitDirectories: string[] = []
  for (const filePath of filePaths) {
    const p = path.join(folderPath, filePath)
    if (await isGitFolder(p)) gitDirectories.push(p) // eslint-disable-line no-await-in-loop
  }
  return gitDirectories
}

export async function readFileInFolder (folderPath: string, fileName: string): Promise<string> {
  const filePath = path.join(folderPath, fileName)
  if (!await fileExists(filePath)) throw new Error(`file "${filePath}" does not exists`)
  const statData = await statAsync(filePath)
  if (statData.isDirectory()) throw new Error(`filepath "${filePath}" is a directory`)
  return readFile(filePath)
}

export async function augmentDataWithGit (folderPath: string, dataSource: ProjectData): Promise<ProjectData> {
  const data = new ProjectData(dataSource)
  const gitFolder = path.join(folderPath, '.git')
  if (!await fileExists(path.join(gitFolder, 'config'))) return data
  const gitConfigContent = await readFileInFolder(gitFolder, 'config')
  const matches = /url = .*[/:]([\w-]+)\/([\w-]+)/.exec(gitConfigContent)
  if (matches?.[Nb.Second] !== undefined) {
    data.userId = matches[Nb.Second]
    log.debug('found userId in git config :', data.userId)
    data.userIdLowercase = data.userId.toLowerCase()
  }
  if (matches?.[Nb.Third] !== undefined) {
    data.repoId = matches[Nb.Third]
    log.debug('found repoId in git config :', data.repoId)
  }
  return data
}

export async function augmentDataWithPackageJson (folderPath: string, dataSource: ProjectData): Promise<ProjectData> {
  const data = new ProjectData(dataSource)
  if (!await fileExists(path.join(folderPath, 'package.json'))) {
    log.debug('cannot augment, no package.json found in', folderPath)
    return data
  }
  const content = await readFileInFolder(folderPath, 'package.json')
  data.packageName = /"name": "([\w+/@-]+)"/.exec(content)?.[Nb.Second] ?? dataDefaults.packageName
  data.license = /"license": "([\w+-.]+)"/.exec(content)?.[Nb.Second] ?? dataDefaults.license
  // eslint-disable-next-line unicorn/no-unsafe-regex
  const author = /"author": "([\s\w/@-]+)\b[\s<]*([\w-.@]+)?>?"/.exec(content) ?? []
  if (author[Nb.Second] !== undefined) data.userName = author[Nb.Second]
  if (author[Nb.Third] !== undefined) data.userMail = author[Nb.Third]
  data.isModule = content.includes('"type": "module"')
  data.useTailwind = content.includes('"tailwindcss"')
  data.useDependencyCruiser = content.includes('"dependency-cruiser"')
  data.useNyc = content.includes('"nyc"')
  data.useC8 = content.includes('"c8"')
  data.useEslint = content.includes('"eslint"')
  data.userId = /github\.com\/([\w-]+)\//.exec(content)?.[Nb.Second] ?? dataDefaults.userId
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
  const localDataExists = shouldLoadLocal ? await fileExists(path.join(folderPath, dataFileName)) : false
  if (localDataExists) { // local data overwrite the rest
    const { error, value } = parseJson<ProjectData>(await readFileInFolder(folderPath, dataFileName))
    /* c8 ignore next */
    if (error) log.error('error while parsing data file', folderPath, dataFileName, error)
    Object.assign(data, value)
  }
  return data
}

export async function getFileSizeInKo (filePath: string): Promise<number> {
  if (!await fileExists(filePath)) return Nb.Zero
  const statData = await statAsync(filePath)
  const kb = 1024
  const size = Math.round(statData.size / kb)
  log.debug('found that file', filePath, 'has a size of :', `${size}`, 'Ko')
  return size
}

export async function findStringInFolder (folderPath: string, pattern: string, ignored = ['node_modules', '.git'], count = Nb.None): Promise<string[]> {
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
    if (count > Nb.Thousand) throw new Error('too many files to scan, please reduce the scope')
    const target = path.join(folderPath, filePath)
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

export const jsToJson = (js: string): string => {
  return js.replace(/\/\*[^*]+\*\/\n?/g, '') // remove comments
    .replace('module.exports = ', '') // remove module.exports
    .replace(/ {2,}(\w+):/g, '  "$1":') // add quotes to keys
    .replace(/,\n}/g, '\n}') // remove last comma
    .replace(/'/g, '"') // replace single quotes with double quotes
}

export { rmdir as deleteFolder, unlink as deleteFile, writeFile } from 'fs/promises' // eslint-disable-line no-restricted-imports
export { join, resolve } from 'path' // eslint-disable-line no-restricted-imports

