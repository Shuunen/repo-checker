const { getGitFolders, augmentData } = require('./utils')
const files = require('./files')
const log = require('./logger')

const Checkers = [].concat(files)

function check (folderPath, data, doFix) {
  return getGitFolders(folderPath)
    .then(async (folders) => {
      for (const folder of folders) {
        log.info('Checking folder :', folder)
        log.setIndentLevel(1)
        const dataFolder = await augmentData(folder, data)
        for (const Checker of Checkers) {
          await new Checker(folder, dataFolder, doFix).init()
        }
        log.line()
        log.setIndentLevel(0)
      }
    })
}

module.exports = check
