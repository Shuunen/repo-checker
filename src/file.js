import path from 'path'
import { templatePath } from './constants'
import { log } from './logger'
import { createFile, fillTemplate, folderContainsFile, getFileSizeInKo, readFileInFolder } from './utils'

export class File {
  constructor (folderPath, data, doFix, doForce) {
    this.folderPath = folderPath
    this.data = data
    this.doFix = doFix
    this.doForce = doForce
    this.fileContent = ''
    this.originalFileContent = ''
    this.fileName = ''
    this.nbPassed = 0
    this.nbFailed = 0
  }

  async end () {
    await this.updateFile()
    await this.checkIssues()
  }

  async inspectFile (fileName) {
    this.fileName = fileName
    this.originalFileContent = this.fileContent = await readFileInFolder(this.folderPath, fileName, true)
  }

  async updateFile () {
    if (!this.doFix) return
    if (this.originalFileContent === this.fileContent) return
    return createFile(this.folderPath, this.fileName, this.fileContent)
  }

  async checkFileExists (fileName, justWarn = false) {
    let fileExists = await folderContainsFile(this.folderPath, fileName)
    if (!fileExists && this.doFix) {
      const fileContent = await this.createFile(fileName)
      fileExists = fileContent.length > 0
    }
    this.test(fileExists, `has a ${fileName} file`, justWarn)
    return !!fileExists
  }

  async checkNoFileExists (fileName, justWarn = false) {
    const fileExists = await folderContainsFile(this.folderPath, fileName)
    this.test(!fileExists, `has no ${fileName} file`, justWarn)
  }

  async createFile (fileName) {
    const template = await readFileInFolder(templatePath, fileName, true)
    const fileContent = fillTemplate(template, this.data)
    if (fileContent.length > 0) {
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

  async getFileSizeInKo (filePath) {
    return getFileSizeInKo(path.join(this.folderPath, filePath))
  }

  /**
   * shouldContains verify that the target file contains specific strings
   * @param {string} name The name of the test
   * @param {regex} regex The regex that should validate the test
   * @param {number} nbMatchExpected The number of matches expected
   * @param {boolean} justWarn If this test is optional
   * @return a boolean which indicate if the content exists
   */
  shouldContains (name, regex, nbMatchExpected = 1, justWarn = false, helpMessage = '', canFix = false) {
    if (!regex) regex = new RegExp(name)
    const contentExists = this.checkContains(regex, nbMatchExpected)
    const fix = this.doFix && canFix && !contentExists
    name += (contentExists || fix) ? '' : ` -- ${helpMessage || regex.toString().replace(/\\/g, '')}`
    const message = `${this.fileName} ${!contentExists ? (justWarn ? 'could have' : 'does not have') : 'has'} ${name} `
    if (fix) {
      log.fix(message)
    } else {
      this.test(contentExists, message, justWarn)
    }
    return contentExists
  }

  couldContains (name, regex, nbMatchExpected = 1, helpMessage = '', canFix = false) {
    return this.shouldContains(name, regex, nbMatchExpected, true, helpMessage, canFix)
  }

  checkContains (regex, nbMatchExpected) {
    const matches = this.fileContent.match(regex)
    const nbMatch = (matches && matches.length) || 0
    if (nbMatchExpected && nbMatch !== nbMatchExpected) {
      log.debug(regex.toString().replace('\n', ''), 'matched', nbMatch, 'instead of', nbMatchExpected)
    }
    return (nbMatch === nbMatchExpected)
  }

  test (isValid, message, justWarn = false) {
    if (!isValid && !justWarn) {
      this.nbFailed++
    } else {
      this.nbPassed++
    }
    log.test(isValid, message, justWarn)
  }
}
