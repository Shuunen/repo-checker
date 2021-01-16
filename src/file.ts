import path from 'path'
import { ProjectData, templatePath } from './constants'
import { log } from './logger'
import { createFile, fillTemplate, folderContainsFile, getFileSizeInKo, readFileInFolder } from './utils'

export class File {
  fileContent = ''
  originalFileContent = ''
  fileName = ''
  nbPassed = 0
  nbFailed = 0

  constructor (public folderPath: string, public data: ProjectData, public doFix = false, public doForce = false) {}

  async end (): Promise<void> {
    await this.updateFile()
    await this.checkIssues()
  }

  async inspectFile (fileName = ''): Promise<void> {
    this.fileName = fileName
    this.originalFileContent = await readFileInFolder(this.folderPath, fileName)
    this.fileContent = this.originalFileContent
  }

  async updateFile (): Promise<void> {
    if (!this.doFix) return
    if (this.originalFileContent === this.fileContent) return
    await createFile(this.folderPath, this.fileName, this.fileContent)
  }

  async fileExists (fileName: string): Promise<boolean> {
    return folderContainsFile(this.folderPath, fileName)
  }

  async checkFileExists (fileName = '', justWarn = false): Promise<boolean> {
    let fileExists = await this.fileExists(fileName)
    if (!fileExists && this.doFix) {
      const fileContent = await this.createFile(fileName)
      fileExists = fileContent.length > 0
    }
    this.test(fileExists, `has a ${fileName} file`, justWarn)
    return Boolean(fileExists)
  }

  async checkNoFileExists (fileName = '', justWarn = false): Promise<void> {
    const fileExists = await folderContainsFile(this.folderPath, fileName)
    this.test(!fileExists, `has no ${fileName} file`, justWarn)
  }

  async createFile (fileName = ''): Promise<string> {
    const template = await readFileInFolder(templatePath, fileName)
    const data = this.data as unknown
    const fileContent = fillTemplate(template, data as Record<string, string>)
    if (fileContent.length > 0) {
      await createFile(this.folderPath, fileName, fileContent)
      log.fix('created', fileName)
    } else log.warn(`please provide a data file to be able to fix a "${fileName}" file`)
    return fileContent
  }

  async checkIssues () {
    if (this.nbFailed > 0 && this.doFix) {
      if (this.doForce) {
        await this.createFile(this.fileName)
        return
      }
      log.info('this file has at least one issue, if you want repo-checker to overwrite this file use --force')
    }
  }

  async getFileSizeInKo (filePath = ''): Promise<number> {
    return getFileSizeInKo(path.join(this.folderPath, filePath))
  }

  // eslint-disable-next-line max-params
  shouldContains (name: string, regex?: RegExp, nbMatchExpected = 1, justWarn = false, helpMessage = '', canFix = false): boolean {
    if (regex === undefined) regex = new RegExp(name)
    const contentExists = this.checkContains(regex, nbMatchExpected)
    const fix = this.doFix && canFix && !contentExists
    name += (contentExists || fix) ? '' : ` -- ${helpMessage.length > 0 ? helpMessage : regex.toString().replace(/\\/g, '')}`
    const message = `${this.fileName} ${contentExists ? 'has' : (justWarn ? 'could have' : 'does not have')} ${name} `
    if (fix) log.fix(message)
    else this.test(contentExists, message, justWarn)
    return contentExists
  }

  // eslint-disable-next-line max-params
  couldContains (name: string, regex?: RegExp, nbMatchExpected = 1, helpMessage = '', canFix = false): boolean {
    return this.shouldContains(name, regex, nbMatchExpected, true, helpMessage, canFix)
  }

  checkContains (regex: RegExp, nbMatchExpected = 1): boolean {
    const matches = this.fileContent.match(regex) ?? [] // eslint-disable-line @typescript-eslint/prefer-regexp-exec
    const ok = nbMatchExpected === matches.length
    if (!ok) log.debug(regex.toString().replace('\n', ''), `matched ${matches.length} instead of ${nbMatchExpected}`)
    return ok
  }

  test (isValid = false, message = '', justWarn = false): boolean {
    if (isValid) this.nbPassed++
    else if (!justWarn) this.nbFailed++
    log.test(isValid, message, justWarn)
    return isValid
  }
}
