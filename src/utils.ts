import { readdir, stat } from 'fs'
import { pathExists, readFile } from 'fs-extra'
import { join } from 'path'
import * as requireFromString from 'require-from-string'
import { promisify } from 'util'
import { dataDefaults, dataFileName, ProjectData } from './constants'
import { log } from './logger'

const statAsync = promisify(stat)
const readDirectoryAsync = promisify(readdir)

export async function isGitFolder (folderPath: string): Promise<boolean> {
  const stat = await statAsync(folderPath)
  if (!stat.isDirectory()) return false
  return pathExists(join(folderPath, '.git', 'config'))
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
  const gitConfigContent = await readFileInFolder(join(folderPath, '.git'), 'config')
  const matches = /([\w-]+)\/([\w-]+)\.git/.exec(gitConfigContent) ?? []
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
  data.package_name = /"name": "([\w+/@-]+)"/.exec(content)?.[1] ?? dataDefaults.package_name
  data.license = /"license": "([\w+-.]+)"/.exec(content)?.[1] ?? dataDefaults.license
  const author = /"author": "([\s\w/@-]+)\b[\s<]*([\w-.@]+)?>?"/.exec(content) ?? []
  if (author.length === 3) {
    data.user_name = author[1]
    data.user_mail = author[2] ?? ''
  }
  data.is_module = content.includes('"type": "module"')
  data.user_id = /github\.com\/([\w-]+)\//.exec(content)?.[1] ?? dataDefaults.user_id
  data.user_id_lowercase = data.user_id.toLowerCase()
  if (content.includes('"vue"')) data.use_vue = true
  if (/(ts-node|typescript)/.test(content)) data.use_typescript = true
  if (content.includes('html') || data.use_vue) data.web_published = true
  if (content.includes('npm publish')) data.npm_package = true
  return data
}

export async function augmentData (folderPath: string, dataSource: ProjectData, shouldLoadLocal = false): Promise<ProjectData> {
  let data = new ProjectData(dataSource)
  data = await augmentDataWithGit(folderPath, data)
  data = await augmentDataWithPackageJson(folderPath, data)
  const localDataExists = shouldLoadLocal ? await pathExists(join(folderPath, dataFileName)) : false
  if (localDataExists) { // local data overwrite the rest
    // should use something else than requireFromString
    const localData = requireFromString(await readFileInFolder(folderPath, dataFileName))
    Object.assign(data, localData)
  }
  return data
}

export async function readFileInFolder (folderPath: string, fileName: string): Promise<string> {
  const filePath = join(folderPath, fileName)
  if (!await pathExists(filePath)) return ''
  return readFile(filePath, 'utf8')
}

export async function getFileSizeInKo (filePath: string): Promise<number> {
  const stat = await statAsync(filePath)
  const size = Math.round(stat.size / 1024)
  log.debug('found that file', filePath, 'has a size of :', `${size}`, 'Ko')
  return size
}

export function fillTemplate (template: string | Record<string, unknown>, data: Record<string, string> = {}): string {
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
