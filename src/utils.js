import fs from 'fs'
import path from 'path'
import { copy } from 'shuutils/dist/objects'
import git from 'simple-git/promise'
import { promisify } from 'util'
import { log } from './logger'

const readFileAsync = promisify(fs.readFile)
const statAsync = promisify(fs.stat)
// const accessAsync = promisify(fs.access)

export async function isGitFolder (folderPath) {
  if (!fs.statSync(folderPath).isDirectory()) {
    return false
  }
  return git(folderPath).checkIsRepo().then(isRepo => {
    log.debug(`${isRepo ? 'is' : 'NOT'} a git repo : ${folderPath}`)
    return isRepo
  }).catch(err => {
    log.error(`failed at testing git repo : ${folderPath}`, err)
    throw err
  })
}

export async function getGitFolders (folderPath) {
  if (await isGitFolder(folderPath)) {
    return [folderPath]
  }
  return new Promise((resolve, reject) => {
    fs.readdir(folderPath, async (err, filePaths) => {
      if (err) {
        log.error(`failed at reading dir : ${folderPath}`, err)
        reject(err)
      }
      const gitDirectories = []
      for (const filePath of filePaths) {
        const p = path.join(folderPath, filePath)
        if (await isGitFolder(p)) {
          gitDirectories.push(p)
        }
      }
      resolve(gitDirectories)
    })
  })
}

export async function augmentData (folderPath, dataSource) {
  const data = copy(dataSource)
  const remotes = await git(folderPath).getRemotes(true)
  const matches = JSON.stringify(remotes).match(/([\w-]+)\/([\w-]+)\.git/) || []
  if (matches.length !== 3) return data
  data.user_id = matches[1]
  data.user_id_lowercase = data.user_id.toLowerCase()
  data.repo_id = matches[2]
  return data
}

export function folderContainsFile (folderPath, fileName) {
  if (!folderPath || !fileName) return log.error('folderContainsFile miss arguments')
  return checkFileExists(path.join(folderPath, fileName))
}

export function checkFileExists (filePath) {
  return new Promise(resolve => {
    fs.access(filePath, fs.F_OK, (err) => {
      if (err) return resolve(false)
      resolve(true)
    })
  })
}

export function createFile (folderPath, fileName, fileContent) {
  return new Promise(resolve => {
    fs.writeFile(path.join(folderPath, fileName), fileContent, 'utf8', (err) => {
      if (err) {
        log.error(err)
        resolve(false)
      }
      resolve(true)
    })
  })
}

export async function readFile (folderPath, fileName, returnEmptyIfNotExists) {
  const filePath = path.join(folderPath, fileName)
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
