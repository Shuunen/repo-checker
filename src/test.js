const path = require('path')

const log = require('./logger')
const { createFile, fillTemplate, readFile } = require('./utils')

class Test {
  constructor (folderPath, data, doFix, doForce) {
    this.folderPath = folderPath
    this.data = data
    this.doFix = doFix
    this.doForce = doForce
    this.fileContent = ''
    this.fileName = ''
    this.hasIssues = false
  }
  async start () {
    log.error('start is not implemented in child class', this.constructor.name)
  }
  async end () {
    return this.checkIssues()
  }
  async checkFile (fileName) {
    this.fileName = fileName
    this.fileContent = await readFile(this.folderPath, fileName, true)
    const fileExists = this.fileContent !== ''
    if (!fileExists && this.doFix) {
      this.fileContent = await this.createFile()
    } else {
      log.test(fileExists, `has a ${fileName} file`)
    }
  }
  async createFile () {
    const template = await readFile(path.join(__dirname, 'templates'), this.fileName, true)
    const fileContent = fillTemplate(template, this.data)
    if (fileContent.length) {
      await createFile(this.folderPath, this.fileName, fileContent)
      log.fix(this.hasIssues ? 'updated' : 'created', this.fileName)
    } else {
      log.warn('please provide a data file to be able to fix this file')
    }
    return fileContent
  }
  async checkIssues () {
    if (this.hasIssues && this.doFix) {
      if (this.doForce) {
        return this.createFile()
      }
      log.info('this file has at least one issue, if you want repo-checker to overwrite this file use --force')
    }
  }
  /**
   * shouldContains verify that the target file contains specific strings
   * @param {string} name The name of the test
   * @param {regex} regex The regex that should validate the test
   * @param {number} nbMatchExpected The number of matches expected
   * @param {boolean} justWarn If this test is optional
   * @return a boolean which indicate if the content exists
   */
  shouldContains (name, regex, nbMatchExpected, justWarn) {
    const contentExists = this.checkContains(regex, nbMatchExpected)
    log.test(contentExists, `${this.fileName} ${!contentExists ? justWarn ? 'could have' : 'does not have' : 'has'} ${name} `, justWarn)
    if (!contentExists && !justWarn) {
      this.hasIssues = true
    }
    return contentExists
  }
  couldContains (name, regex, nbMatchExpected) {
    return this.shouldContains(name, regex, nbMatchExpected, true)
  }
  checkContains (regex, nbMatchExpected) {
    nbMatchExpected = nbMatchExpected === undefined ? 1 : nbMatchExpected
    const matches = this.fileContent.match(regex)
    const nbMatch = (matches && matches.length) || 0
    if (nbMatch !== nbMatchExpected) {
      log.debug(regex.toString().replace('\n', ''), 'matched', nbMatch, 'instead of', nbMatchExpected)
    }
    return (nbMatch === nbMatchExpected)
  }
}

module.exports = Test
