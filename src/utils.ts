import { access, existsSync, lstatSync, readdir, readdirSync, readFile, rmdirSync, stat, unlinkSync, writeFile } from 'fs'
import path from 'path'
import requireFromString from 'require-from-string'
import { promisify } from 'util'
import { dataDefaults, dataFileName, ProjectData } from './constants'
import { log } from './logger'

const readFileAsync = promisify(readFile)
const statAsync = promisify(stat)
const readDirectoryAsync = promisify(readdir)

export async function isGitFolder (folderPath = ''): Promise<boolean> {
  const stat = await statAsync(folderPath)
  if (!stat.isDirectory()) return false
  return await checkFileExists(path.join(folderPath, '.git', 'config'))
}

export async function getGitFolders (folderPath = ''): Promise<string[]> {
  if (await isGitFolder(folderPath)) return [folderPath]
  const filePaths = await readDirectoryAsync(folderPath)
  const gitDirectories = []
  for (const filePath of filePaths) {
    const p = path.join(folderPath, filePath)
    if (await isGitFolder(p)) gitDirectories.push(p)
  }
  return gitDirectories
}

export async function augmentDataWithGit (folderPath: string, dataSource: ProjectData): Promise<ProjectData> {
  const data = new ProjectData(dataSource)
  const gitConfigContent = await readFileInFolder(path.join(folderPath, '.git'), 'config')
  const matches = gitConfigContent.match(/([\w-]+)\/([\w-]+)\.git/) ?? []
  if (matches.length !== 3) return data
  data.user_id = matches[1]
  data.user_id_lowercase = data.user_id.toLowerCase()
  data.repo_id = matches[2]
  log.debug('found user_id in git config :', data.user_id)
  log.debug('found repo_id in git config :', data.repo_id)
  return data
}

export async function augmentDataWithPackageJson (folderPath: string, dataSource: ProjectData): Promise<ProjectData> {
  const data = new ProjectData(dataSource)
  const content = await readFileInFolder(folderPath, 'package.json')
  if (content.length === 0) return data
  data.package_name = content.match(/"name": "([\w+/@-]+)"/)?.[1] ?? dataDefaults.package_name
  data.license = content.match(/"license": "([\w+-.]+)"/)?.[1] ?? dataDefaults.license
  const author = content.match(/"author": "([\s\w/@-]+)\b[\s<]*([\w-.@]+)?>?"/) ?? []
  if (author.length === 3) {
    data.user_name = author[1]
    data.user_mail = author[2] ?? ''
  }
  data.is_module = content.includes('"type": "module"')
  data.user_id = content.match(/github\.com\/([\w-]+)\//)?.[1] ?? dataDefaults.user_id
  data.user_id_lowercase = data.user_id.toLowerCase()
  if (content.includes('"vue"')) data.use_vue = true
  if (content.includes('typescript')) data.use_typescript = true
  if (content.includes('html') || data.use_vue) data.web_published = true
  if (content.includes('npm publish')) data.npm_package = true
  return data
}

export async function augmentData (folderPath: string, dataSource: ProjectData, shouldLoadLocal = false): Promise<ProjectData> {
  let data = new ProjectData(dataSource)
  data = await augmentDataWithGit(folderPath, data)
  data = await augmentDataWithPackageJson(folderPath, data)
  const localDataExists = shouldLoadLocal ? await checkFileExists(path.join(folderPath, dataFileName)) : false
  if (localDataExists) { // local data overwrite the rest
    const localData = requireFromString(await readFileInFolder(folderPath, dataFileName))
    Object.assign(data, localData)
  }
  return data
}

export async function folderContainsFile (folderPath = '', fileName = ''): Promise<boolean> {
  if (folderPath.length === 0) return log.error('folderContainsFile need a folderPath argument')
  if (fileName.length === 0) return log.error('folderContainsFile need a fileName argument')
  return await checkFileExists(path.join(folderPath, fileName))
}

export async function checkFileExists (filePath = ''): Promise<boolean> {
  return await new Promise(resolve => {
    access(filePath, (error) => {
      if (error !== null) return resolve(false)
      resolve(true)
    })
  })
}

export async function createFile (folderPath = '', fileName = '', fileContent = ''): Promise<boolean> {
  if (folderPath.length === 0) return log.error('createFile need a folderPath argument')
  if (fileName.length === 0) return log.error('createFile need a fileName argument')
  return await new Promise(resolve => {
    writeFile(path.join(folderPath, fileName), fileContent, 'utf8', (error) => {
      if (error !== null) {
        log.error(error.message)
        resolve(false)
      }
      resolve(true)
    })
  })
}

export async function readFileInFolder (folderPath = '', fileName = ''): Promise<string> {
  const filePath = path.join(folderPath, fileName)
  const content = await readFileAsync(filePath, 'utf8').catch(error => console.error(error.message))
  return typeof content === 'string' ? content : ''
}

export async function getFileSizeInKo (filePath = ''): Promise<number> {
  const stat = await statAsync(filePath)
  const size = Math.round(stat.size / 1024)
  log.debug('found that file', filePath, 'has a size of :', `${size}`, 'Ko')
  return size
}

export function fillTemplate (template: string | object, data: { [key: string]: string } = {}): string {
  let string = (typeof template === 'object' ? JSON.stringify(template, undefined, 2) : template)
  if (string.length === 0) return string
  const tokens = string.match(/{{\s?([^\s}]+)\s?}}/g)
  if (tokens === null || tokens.length === 0) return string
  for (const token of tokens) {
    const key = token.replace(/[\s{}]/g, '')
    const value = data[key] ?? ''
    if (value.length === 0) {
      log.warn(`cannot fill variable "${key}"`)
      return ''
    }
    string = string.replace(token, value)
  }
  return string
}

// from https://geedew.com/remove-a-directory-that-is-not-empty-in-nodejs/
export function deleteFolderRecursive (path = ''): void {
  if (!existsSync(path)) return
  readdirSync(path).forEach(function (file) {
    const currentPath = path + '/' + file
    if (lstatSync(currentPath).isDirectory()) deleteFolderRecursive(currentPath)
    else unlinkSync(currentPath)
  })
  rmdirSync(path)
}
