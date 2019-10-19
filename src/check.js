const { getGitFolders, augmentData } = require('./utils')
const files = require('./files')
const log = require('./logger')

const Checkers = [].concat(files)

function report (nbPassed, nbFailed) {
  log.info('Report :')
  log.setIndentLevel(1)
  log.test(nbPassed > 0, `${nbPassed} test(s) passed successfully`, false, true)
  log.test(nbFailed === 0, `${nbFailed} test(s) failed`, false, true)
  log.line()
  log.setIndentLevel(0)
  if (nbFailed > 0) {
    throw new Error('failed at validating at least one rule in one folder')
  }
}

function check (folderPath, data, doFix, doForce) {
  return getGitFolders(folderPath)
    .then(async (folders) => {
      let nbPassed = 0
      let nbFailed = 0
      for (const folder of folders) {
        log.info('Checking folder :', folder)
        log.setIndentLevel(1)
        const dataFolder = await augmentData(folder, data)
        for (const Checker of Checkers) {
          const instance = new Checker(folder, dataFolder, doFix, doForce)
          await instance.start()
          await instance.end()
          nbPassed += instance.nbPassed
          nbFailed += instance.nbFailed
        }
        log.line()
        log.setIndentLevel(0)
      }
      report(nbPassed, nbFailed)
    })
    .catch(err => {
      log.setIndentLevel(0)
      throw err
    })
}

module.exports = check
