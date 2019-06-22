const { getGitFolders, augmentData } = require('./utils')
const files = require('./files')
const log = require('./logger')

const Checkers = [].concat(files)

function check (folderPath, data, doFix, doForce) {
  return getGitFolders(folderPath)
    .then(async (folders) => {
      for (const folder of folders) {
        log.info('Checking folder :', folder)
        log.setIndentLevel(1)
        const dataFolder = await augmentData(folder, data)
        for (const Checker of Checkers) {
          const instance = new Checker(folder, dataFolder, doFix, doForce)
          await instance.start()
          await instance.end()
        }
        log.line()
        log.setIndentLevel(0)
      }
    })
    .catch(err => {
      log.setIndentLevel(0)
      throw err
    })
}

module.exports = check
