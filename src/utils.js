const fs = require('fs')
const path = require('path')
const log = require('./logger')
const Git = require('simple-git/promise')

async function isGitFolder (folderPath) {
  if (!fs.statSync(folderPath).isDirectory()) {
    return false
  }
  return Git(folderPath).checkIsRepo().then(isRepo => {
    log.debug(`${isRepo ? 'is' : 'NOT'} a git repo : ${folderPath}`)
    return isRepo
  }).catch(err => {
    log.error(`failed at testing git repo : ${folderPath}`, err)
    throw err
  })
}

async function getGitFolders (folderPath) {
  if (await isGitFolder(folderPath)) {
    return [folderPath]
  }
  return new Promise((resolve, reject) => {
    fs.readdir(folderPath, async (err, filePaths) => {
      if (err) {
        log.error(`failed at reading dir : ${folderPath}`, err)
        reject(err)
      }
      let gitDirectories = []
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

function augmentData (folderPath, dataSource) {
  const data = Object.assign({}, dataSource)
  return Git(folderPath).getRemotes(true).then(remotes => {
    const matches = JSON.stringify(remotes).match(/([\w-]+)\/([\w-]+)\.git/)
    if (matches.length === 3) {
      data.user_id = matches[1]
      data.user_id_lowercase = data.user_id.toLowerCase()
      data.repo_id = matches[2]
    }
    return data
  })
}

function folderContainsFile (folderPath, fileName) {
  if (!folderPath || !fileName) {
    return log.error('folderContainsFile miss arguments')
  }
  return checkFileExists(path.join(folderPath, fileName))
}

function checkFileExists (filePath) {
  return new Promise((resolve, reject) => {
    fs.access(filePath, fs.F_OK, (err) => {
      if (err) {
        resolve(false)
      }
      resolve(true)
    })
  })
}

function createFile (folderPath, fileName, fileContent) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(folderPath, fileName), fileContent, 'utf8', (err) => {
      if (err) {
        log.error(err)
        resolve(false)
      }
      resolve(true)
    })
  })
}

function readFile (folderPath, fileName, returnEmptyIfNotExists) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(folderPath, fileName), 'utf8', (err, content) => {
      if (err) {
        if (returnEmptyIfNotExists) {
          log.debug(path.join(folderPath, fileName), 'does not exists, returning empty')
          resolve('')
        }
        reject(err)
      }
      resolve(content)
    })
  })
}

function fillTemplate (template, data) {
  let str = (typeof template === 'object' ? JSON.stringify(template, null, 2) : template) || ''
  if (!str) {
    return str
  }
  const tokens = str.match(/\{{\s?([^}\s]+)\s?}\}/g)
  if (!tokens) {
    return str
  }
  for (let token of tokens) {
    const key = token.replace(/[{\s}]/g, '')
    let value = data && data[key]
    if (!value || !value.length) {
      log.warn(`cannot fill variable "${key}"`)
      return ''
    }
    str = str.replace(token, value)
  }
  return str
}

module.exports = { log, getGitFolders, fillTemplate, checkFileExists, folderContainsFile, createFile, readFile, augmentData }
