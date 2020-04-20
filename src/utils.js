import { access, F_OK, readdir, readFile, stat, writeFile } from 'fs'
import { join } from 'path'
import requireFromString from 'require-from-string'
import { copy } from 'shuutils/dist/objects'
import { promisify } from 'util'
import { defaultDataFileName, repoCheckerPath } from './constants'
import { log } from './logger'

const readFileAsync = promisify(readFile)
const statAsync = promisify(stat)
const readDirAsync = promisify(readdir)

export async function isGitFolder (folderPath) {
  const stat = await statAsync(folderPath)
  if (!stat.isDirectory()) return false
  return checkFileExists(join(folderPath, '.git', 'config'))
}

export async function getGitFolders (folderPath) {
  if (await isGitFolder(folderPath)) return [folderPath]
  const filePaths = await readDirAsync(folderPath)
  const gitDirectories = []
  for (const filePath of filePaths) {
    const p = join(folderPath, filePath)
    if (await isGitFolder(p)) gitDirectories.push(p)
  }
  return gitDirectories
}

async function augmentDataWithGit (folderPath, data) {
  const gitConfigContent = await readFileInFolder(join(folderPath, '.git'), 'config', true)
  if (gitConfigContent === '') return log.debug('did not found git config file')
  const matches = gitConfigContent.match(/([\w-]+)\/([\w-]+)\.git/) || []
  if (matches.length !== 3) return data
  data.user_id = matches[1]
  data.user_id_lowercase = data.user_id.toLowerCase()
  data.repo_id = matches[2]
  log.debug('found user_id in git config :', data.user_id)
  log.debug('found repo_id in git config :', data.repo_id)
  return data
}

export async function augmentData (folderPath, dataSource) {
  let data = copy(dataSource)
  const defaults = requireFromString(await readFileInFolder(repoCheckerPath, defaultDataFileName))
  data = Object.assign({}, defaults, data)
  data = await augmentDataWithGit(folderPath, data)
  return data
}

export function folderContainsFile (folderPath, fileName) {
  if (!folderPath || !fileName) return log.error('folderContainsFile miss arguments')
  return checkFileExists(join(folderPath, fileName))
}

export function checkFileExists (filePath) {
  return new Promise(resolve => {
    access(filePath, F_OK, (err) => {
      if (err) return resolve(false)
      resolve(true)
    })
  })
}

export function createFile (folderPath, fileName, fileContent) {
  return new Promise(resolve => {
    writeFile(join(folderPath, fileName), fileContent, 'utf8', (err) => {
      if (err) {
        log.error(err)
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
 * @param {boolean} returnEmptyIfNotExists if set to true & file does not exists, will return an empty string ''
 */
export async function readFileInFolder (folderPath, fileName, returnEmptyIfNotExists = false) {
  const filePath = join(folderPath, fileName)
  const content = await readFileAsync(filePath, 'utf8')
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
  let str = (typeof template === 'object' ? JSON.stringify(template, null, 2) : template) || ''
  if (!str) return str
  const tokens = str.match(/\{{\s?([^}\s]+)\s?}\}/g)
  if (!tokens) return str
  for (const token of tokens) {
    const key = token.replace(/[{\s}]/g, '')
    const value = data && data[key]
    if (!value || !value.length) {
      log.warn(`cannot fill variable "${key}"`)
      return ''
    }
    str = str.replace(token, value)
  }
  return str
}
