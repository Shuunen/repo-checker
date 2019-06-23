const { getGitFolders, augmentData } = require('./utils')
const files = require('./files')
const log = require('./logger')

const Checkers = [].concat(files)

function check (folderPath, data, doFix, doForce) {
  return getGitFolders(folderPath)
    .then(async (folders) => {
      let hasIssues = false
      for (const folder of folders) {
        log.info('Checking folder :', folder)
        log.setIndentLevel(1)
        const dataFolder = await augmentData(folder, data)
        for (const Checker of Checkers) {
          const instance = new Checker(folder, dataFolder, doFix, doForce)
          await instance.start()
          await instance.end()
          // if only one checker fail at some point at validating things, hasIssues will stay at true
          hasIssues = hasIssues || instance.hasIssues
        }
        log.line()
        log.setIndentLevel(0)
      }
      if (hasIssues) {
        throw new Error('failed at validating at least one rule in one folder')
      }
    })
    .catch(err => {
      log.setIndentLevel(0)
      throw err
    })
}

module.exports = check
