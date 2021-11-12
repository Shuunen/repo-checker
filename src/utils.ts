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
  const gitConfigContent = await readFileInFolder(join(folderPath, '.git'), 'config')
  const matches = /url = .*[/:]([\w-]+)\/([\w-]+)/.exec(gitConfigContent) ?? []
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
  if (!existsSync(filePath)) return ''
  return readFileSync(filePath, 'utf8')
}

export async function getFileSizeInKo (filePath: string): Promise<number> {
  if (!existsSync(filePath)) return 0
  const stat = await statAsync(filePath)
  const size = Math.round(stat.size / 1024)
  log.debug('found that file', filePath, 'has a size of :', `${size}`, 'Ko')
  return size
}
