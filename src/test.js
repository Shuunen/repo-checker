import { join } from 'path'
import { log } from './logger'
import { createFile, fillTemplate, folderContainsFile, readFile } from './utils'

export class Test {
  constructor (folderPath, data, doFix, doForce) {
    this.folderPath = folderPath
    this.data = data
    this.doFix = doFix
    this.doForce = doForce
    this.fileContent = ''
    this.fileName = ''
    this.nbPassed = 0
    this.nbFailed = 0
  }

  async start () {
    log.error('start is not implemented in child class', this.constructor.name)
  }

  async end () {
    return this.checkIssues()
  }

  async inspectFile (fileName) {
    this.fileName = fileName
    this.fileContent = await readFile(this.folderPath, fileName, true)
  }

  async checkFileExists (fileName, justWarn) {
    let fileExists = await folderContainsFile(this.folderPath, fileName)
    if (!fileExists && this.doFix) {
      const fileContent = await this.createFile(fileName)
      fileExists = fileContent.length > 0
    }
    this.test(fileExists, `has a ${fileName} file`, justWarn)
    return fileExists
  }

  async checkNoFileExists (fileName, justWarn) {
    const fileExists = await folderContainsFile(this.folderPath, fileName)
    this.test(!fileExists, `has no ${fileName} file`, justWarn)
  }

  async createFile (fileName) {
    const templatePath = join(__dirname, '../templates')
    const template = await readFile(templatePath, fileName, true)
    const fileContent = fillTemplate(template, this.data)
    if (fileContent.length) {
      await createFile(this.folderPath, fileName, fileContent)
      log.fix('created', fileName)
    } else {
      log.warn(`please provide a data file to be able to fix a "${fileName}" file`)
    }
    return fileContent
  }

  async checkIssues () {
    if (this.nbFailed > 0 && this.doFix) {
      if (this.doForce) return this.createFile(this.fileName)
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
    name += contentExists ? '' : ` -- ${regex}`
    const message = `${this.fileName} ${!contentExists ? justWarn ? 'could have' : 'does not have' : 'has'} ${name} `
    this.test(contentExists, message, justWarn)
    return contentExists
  }

  couldContains (name, regex, nbMatchExpected) {
    return this.shouldContains(name, regex, nbMatchExpected, true)
  }

  checkContains (regex, nbMatchExpected = 1) {
    const matches = this.fileContent.match(regex)
    const nbMatch = (matches && matches.length) || 0
    if (nbMatch !== nbMatchExpected) {
      log.debug(regex.toString().replace('\n', ''), 'matched', nbMatch, 'instead of', nbMatchExpected)
    }
    return (nbMatch === nbMatchExpected)
  }

  test (isValid, message, justWarn) {
    if (!isValid && !justWarn) {
      this.nbFailed++
    } else {
      this.nbPassed++
    }
    log.test(isValid, message, justWarn)
  }
}
