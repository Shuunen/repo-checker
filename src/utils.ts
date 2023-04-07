/* c8 ignore next */
/* eslint-disable no-restricted-imports */
import { readFile as nodeReadFile, readdir as readDirectoryAsync, stat as statAsync } from 'fs/promises'
import path from 'path'
import { Nb, arrayUnique, parseJson, slugify } from 'shuutils'
import { ProjectData, dataDefaults, dataFileName } from './constants'
import { log } from './logger'

export async function fileExists (filePath: string): Promise<boolean> {
  return await statAsync(filePath).then(() => true).catch(() => false)
}

export async function readFile (filePath: string): Promise<string> {
  const fileContent = await nodeReadFile(filePath, { encoding: 'utf8' })
  return Buffer.from(fileContent).toString()
}

export async function isProjectFolder (folderPath: string): Promise<boolean> {
  const statData = await statAsync(folderPath)
  if (!statData.isDirectory()) return false
  const hasGitConfig = await fileExists(path.join(folderPath, '.git', 'config'))
  if (hasGitConfig) return true
  return await fileExists(path.join(folderPath, 'package.json'))
}

export async function getProjectFolders (folderPath: string): Promise<string[]> {
  if (await isProjectFolder(folderPath)) return [folderPath]
  const filePaths = await readDirectoryAsync(folderPath)
  const gitDirectories: string[] = []
  for (const filePath of filePaths) {
    const folder = path.join(folderPath, filePath)
    if (await isProjectFolder(folder)) gitDirectories.push(folder) // eslint-disable-line no-await-in-loop
  }
  return gitDirectories
}

export async function readFileInFolder (folderPath: string, fileName: string): Promise<string> {
  const filePath = path.join(folderPath, fileName)
  if (!await fileExists(filePath)) throw new Error(`file "${filePath}" does not exists`)
  const statData = await statAsync(filePath)
  if (statData.isDirectory()) throw new Error(`filepath "${filePath}" is a directory`)
  return await readFile(filePath)
}

// eslint-disable-next-line max-statements
export async function augmentDataWithGit (folderPath: string, dataSource: ProjectData): Promise<ProjectData> {
  const data = new ProjectData(dataSource)
  const gitFolder = path.join(folderPath, '.git')
  if (!await fileExists(path.join(gitFolder, 'config'))) return data
  const gitConfigContent = await readFileInFolder(gitFolder, 'config')
  data.hasMainBranch = gitConfigContent.includes('branch "main"')
  const matches = /url = .*[/:](?<userId>[\w-]+)\/(?<repoId>[\w-]+)/u.exec(gitConfigContent)
  if (matches?.groups?.userId !== undefined) {
    data.userId = matches.groups.userId
    log.debug('found userId in git config :', data.userId)
    data.userIdLowercase = data.userId.toLowerCase()
  }
  if (matches?.groups?.repoId !== undefined) {
    data.repoId = matches.groups.repoId
    log.debug('found repoId in git config :', data.repoId)
  }
  return data
}

// eslint-disable-next-line max-statements, complexity, sonarjs/cognitive-complexity
export async function augmentDataWithPackageJson (folderPath: string, dataSource: ProjectData): Promise<ProjectData> {
  const data = new ProjectData(dataSource)
  if (!await fileExists(path.join(folderPath, 'package.json'))) {
    log.debug('cannot augment, no package.json found in', folderPath)
    return data
  }
  const content = await readFileInFolder(folderPath, 'package.json')
  data.packageName = /"name": "(?<packageName>[\w+/@-]+)"/u.exec(content)?.groups?.packageName ?? dataDefaults.packageName
  data.license = /"license": "(?<license>[\w+\-.]+)"/u.exec(content)?.groups?.license ?? dataDefaults.license
  // eslint-disable-next-line unicorn/no-unsafe-regex, security/detect-unsafe-regex
  const author = /"author": "(?<userName>[\s\w/@-]+)\b[\s<]*(?<userMail>[\w.@-]+)?>?"/u.exec(content)
  data.userName = author?.groups?.userName ?? data.userName
  data.userMail = author?.groups?.userMail ?? data.userMail
  data.isModule = content.includes('"type": "module"')
  data.isUsingTailwind = content.includes('"tailwindcss"')
  data.isUsingDependencyCruiser = content.includes('"dependency-cruiser"')
  data.isUsingNyc = content.includes('"nyc"')
  data.isUsingC8 = content.includes('"c8"') || content.includes('coverage-c8')
  data.isUsingEslint = content.includes('"eslint"')
  data.isUsingShuutils = content.includes('"shuutils"')
  data.userId = /github\.com\/(?<userId>[\w-]+)\//u.exec(content)?.groups?.userId ?? dataDefaults.userId
  data.userIdLowercase = data.userId.toLowerCase()
  if (/ "(?:post|pre)[^"]+": "[^"]+"/u.test(content)) data.hasTaskPrefix = true
  if (/"(?:nuxt|vitepress|vue)"/u.test(content)) data.isUsingVue = true
  if (/ts-node|typescript|@types/u.test(content)) data.isUsingTypescript = true
  if (/css|webapp|webcomponent|website/u.test(content) || data.isUsingVue) data.isWebPublished = true
  if (content.includes('npm publish')) data.isPublishedPackage = true
  return data
}

export async function augmentData (folderPath: string, dataSource: ProjectData, shouldLoadLocal = false): Promise<ProjectData> {
  let data = new ProjectData(dataSource)
  data = await augmentDataWithGit(folderPath, data)
  data = await augmentDataWithPackageJson(folderPath, data)
  const hasLocalData = shouldLoadLocal ? await fileExists(path.join(folderPath, dataFileName)) : false
  if (hasLocalData) { // local data overwrite the rest
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
  log.debug('found that file', filePath, 'has a size of :', String(size), 'Ko')
  return size
}

// eslint-disable-next-line max-params, max-statements, sonarjs/cognitive-complexity
export async function findInFolder (folderPath: string, pattern: RegExp, ignoredInput = ['node_modules', '.git'], count = Nb.None): Promise<string[]> {
  const filePaths = await readDirectoryAsync(folderPath)
  const matches: string[] = []
  let ignored = arrayUnique(ignoredInput)
  if (filePaths.includes('.gitignore')) {
    const content = await readFileInFolder(folderPath, '.gitignore')
    ignored = arrayUnique([...ignored, ...content.split('\n')])
  }
  for (const filePath of filePaths) {
    if (ignored.includes(filePath)) continue  // eslint-disable-line no-continue
    /* c8 ignore next */
    if (count > Nb.Thousand) throw new Error('too many files to scan, please reduce the scope')
    const target = path.join(folderPath, filePath)
    const statData = await statAsync(target).catch(() => null) // eslint-disable-line unicorn/no-null, no-await-in-loop
    /* c8 ignore next */
    if (!statData) continue  // eslint-disable-line no-continue
    if (statData.isDirectory()) {
      matches.push(...await findInFolder(target, pattern, ignored, count + 1)) // eslint-disable-line no-await-in-loop, total-functions/no-unsafe-enum-assignment
      continue  // eslint-disable-line no-continue
    }
    // eslint-disable-next-line no-await-in-loop
    const content = await readFileInFolder(folderPath, filePath)
    if (pattern.test(content)) matches.push(filePath)
  }
  return matches
}

export function messageToCode (message: string): string {
  return slugify(message.replace(/[,./:\\_]/gu, '-').replace(/(?<=[a-z])(?=[A-Z])/gu, '-'))
}

export function jsToJson (js: string): string {
  return js.replace(/\/\*[^*]+\*\/\n?/gu, '') // remove comments
    .replace('module.exports = ', '') // remove module.exports
    .replace(/ {2,4}(?<key>\w+):/gu, '  "$<key>":') // add quotes to keys
    .replace(/,\n\}/gu, '\n}') // remove last comma
    .replace(/'/gu, '"') // replace single quotes with double quotes
}

export function readableRegex (regex: RegExp): string {
  return regex.toString()
    .replace(/\/[gui]\b/giu, '')
    .replace(/\\/gu, '')
}

export { unlink as deleteFile, writeFile } from 'fs/promises'
export { join, resolve } from 'path'

