import { access, existsSync, F_OK, lstatSync, readdir, readdirSync, readFile, rmdirSync, stat, unlinkSync, writeFile } from 'fs'
import path from 'path'
import requireFromString from 'require-from-string'
import { copy } from 'shuutils/dist/objects'
import { promisify } from 'util'
import { dataDefaults, dataFileName } from './constants'
import { log } from './logger'

const readFileAsync = promisify(readFile)
const statAsync = promisify(stat)
const readDirectoryAsync = promisify(readdir)

export async function isGitFolder (folderPath) {
  const stat = await statAsync(folderPath)
  if (!stat.isDirectory()) return false
  return checkFileExists(path.join(folderPath, '.git', 'config'))
}

export async function getGitFolders (folderPath) {
  if (await isGitFolder(folderPath)) return [folderPath]
  const filePaths = await readDirectoryAsync(folderPath)
  const gitDirectories = []
  for (const filePath of filePaths) {
    const p = path.join(folderPath, filePath)
    if (await isGitFolder(p)) gitDirectories.push(p)
  }
  return gitDirectories
}

export async function augmentDataWithGit (folderPath, data) {
  const gitConfigContent = await readFileInFolder(path.join(folderPath, '.git'), 'config', true)
  const matches = gitConfigContent.match(/([\w-]+)\/([\w-]+)\.git/) || []
  if (matches.length !== 3) return data
  data.user_id = matches[1]
  data.user_id_lowercase = data.user_id.toLowerCase()
  data.repo_id = matches[2]
  log.debug('found user_id in git config :', data.user_id)
  log.debug('found repo_id in git config :', data.repo_id)
  return data
}

export async function augmentDataWithPackageJson (folderPath, data) {
  const content = await readFileInFolder(folderPath, 'package.json', true)
  if (content.length === 0) return data
  data.package_name = (content.match(/"name": "([\w+/@-]+)"/) || [])[1] || dataDefaults.package_name
  data.license = (content.match(/"license": "([\w+-]+)"/) || [])[1] || dataDefaults.license
  const author = (content.match(/"author": "([\s\w/@-]+)\b[\s<]*([\w-.@]+)?>?"/)) || []
  if (author.length === 3) {
    data.user_name = author[1]
    data.user_mail = author[2] || ''
  }
  data.user_id = (content.match(/github\.com\/([\w-]+)\//) || [])[1] || dataDefaults.user_id
  data.user_id_lowercase = data.user_id.toLowerCase()
  if (content.includes('"vue"')) data.use_vue = true
  if (content.includes('"typescript"')) data.use_typescript = true
  if (content.includes('html') || data.use_vue) data.web_published = true
  if (content.includes('npm publish')) data.npm_package = true
  return data
}

export async function augmentData (folderPath, dataSource, shouldLoadLocal = false) {
  let data = copy(dataSource)
  data = Object.assign({}, dataDefaults, data)
  data = await augmentDataWithGit(folderPath, data)
  data = await augmentDataWithPackageJson(folderPath, data)
  const localDataExists = shouldLoadLocal ? await checkFileExists(path.join(folderPath, dataFileName)) : false
  if (localDataExists) { // local data overwrite the rest
    const localData = requireFromString(await readFileInFolder(folderPath, dataFileName))
    Object.assign(data, localData)
  }
  return data
}

export function folderContainsFile (folderPath, fileName) {
  if (!folderPath || !fileName) return log.error('folderContainsFile miss arguments')
  return checkFileExists(path.join(folderPath, fileName))
}

export function checkFileExists (filePath) {
  return new Promise(resolve => {
    access(filePath, F_OK, (error) => {
      if (error) return resolve(false)
      resolve(true)
    })
  })
}

export function createFile (folderPath, fileName, fileContent = '') {
  return new Promise(resolve => {
    writeFile(path.join(folderPath, fileName), fileContent, 'utf8', (error) => {
      if (error) {
        log.error(error)
        resolve(false)
      }
      resolve(true)
    })
  })
}

/**
 * Read a file content inside a folder
 * @param {string} folderPath
 * @param {string} fileName
 * @param {boolean} returnEmptyIfNotExists if true & file does not exists, will not complain and return an empty string ''
 */
export async function readFileInFolder (folderPath, fileName, returnEmptyIfNotExists = false) {
  const filePath = path.join(folderPath, fileName)
  const content = await readFileAsync(filePath, 'utf8').catch(error => {
    if (!returnEmptyIfNotExists) throw error
  })
  if (!content && returnEmptyIfNotExists) return ''
  return content
}

export async function getFileSizeInKo (filePath) {
  const stat = await statAsync(filePath)
  const size = Math.round(stat.size / 1024)
  log.debug('found that file', filePath, 'has a size of :', size, 'Ko')
  return size
}

export function fillTemplate (template, data) {
  let string = (typeof template === 'object' ? JSON.stringify(template, undefined, 2) : template) || ''
  if (!string) return string
  const tokens = string.match(/{{\s?([^\s}]+)\s?}}/g)
  if (!tokens) return string
  for (const token of tokens) {
    const key = token.replace(/[\s{}]/g, '')
    const value = data && data[key]
    if (!value || value.length === 0) {
      log.warn(`cannot fill variable "${key}"`)
      return ''
    }
    string = string.replace(token, value)
  }
  return string
}

// from https://geedew.com/remove-a-directory-that-is-not-empty-in-nodejs/
export function deleteFolderRecursive (path) {
  if (!existsSync(path)) return
  readdirSync(path).forEach(function (file) {
    const currentPath = path + '/' + file
    if (lstatSync(currentPath).isDirectory()) deleteFolderRecursive(currentPath)
    else unlinkSync(currentPath)
  })
  rmdirSync(path)
}
