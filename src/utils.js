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

function createFile (folderPath, fileName) {
  fs.closeSync(fs.openSync(path.join(folderPath, fileName), 'w'))
}

module.exports = { log, getGitFolders, folderContainsFile, createFile }
