const { getGitFolders } = require('./utils')
const files = require('./files')
const log = require('./logger')

const Checkers = [].concat(files)

function check (folderPath, doFix) {
  return getGitFolders(folderPath)
    .then(async (folders) => {
      for (const folder of folders) {
        log.info('Checking :', folder)
        log.setIndentLevel(1)
        for (const Checker of Checkers) {
          await new Checker(folder, doFix)
        }
        log.line()
        log.setIndentLevel(0)
      }
    })
}

module.exports = check
