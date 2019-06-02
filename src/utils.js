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
  return new Promise((resolve, reject) => {
    fs.access(path.join(folderPath, fileName), fs.F_OK, (err) => {
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
  return tokens.reduce(
    (acc, token) => {
      const key = token.replace(/[{\s}]/g, '')
      let value = data && data[key]
      if (!value) {
        log.error(`please provide variable "${key}"`)
      }
      acc = acc.replace(token, value || '')
      return acc
    },
    str
  )
}

module.exports = { log, getGitFolders, fillTemplate, folderContainsFile, createFile, readFile, augmentData }
