import { existsSync, writeFileSync } from 'fs'
import { bgYellow, black, fillTemplate } from 'shuutils'
import { ProjectData, templatePath } from './constants'
import { log } from './logger'
import { getFileSizeInKo, join, readFileInFolder } from './utils'

const MORE_THAN_ONE = 99

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

  async inspectFile (fileName: string): Promise<void> {
    this.fileName = fileName
    this.originalFileContent = await readFileInFolder(this.folderPath, fileName)
    this.fileContent = this.originalFileContent
  }

  async updateFile (): Promise<boolean> {
    if (!this.doFix) return log.debug('cant update file if fix not active')
    if (this.originalFileContent === this.fileContent) return log.debug('avoid file update when updated content is the same')
    if (this.nbFailed > 0 && !this.doForce) return log.debug('cant update file without force if some checks failed')
    writeFileSync(join(this.folderPath, this.fileName), this.fileContent)
    return log.debug('updated', this.fileName, 'with the new content')
  }

  async fileExists (fileName: string): Promise<boolean> {
    return existsSync(join(this.folderPath, fileName))
  }

  async checkFileExists (fileName: string, justWarn = false): Promise<boolean> {
    let fileExists = await this.fileExists(fileName)
    if (!fileExists && this.doFix) {
      const fileContent = await this.initFile(fileName)
      fileExists = fileContent.length > 0
    }
    this.test(fileExists, `has a ${fileName} file`, justWarn)
    return Boolean(fileExists)
  }

  async checkNoFileExists (fileName: string): Promise<void> {
    const fileExists = await this.fileExists(fileName)
    this.test(!fileExists, `has no ${fileName} file`)
  }

  async initFile (fileName: string): Promise<string> {
    const template = await readFileInFolder(templatePath, fileName)
    if (template === '') {
      log.debug(`found no template ${fileName}, using a empty string instead`)
      return ''
    }
    const data = this.data as unknown
    const fileContent = fillTemplate(template, data as Record<string, string>)
    if (!fileContent.includes('{{')) this.createFile(fileName, fileContent)
    else log.warn(`please provide a data file to be able to fix a "${fileName}" file`)
    return fileContent
  }

  async createFile (fileName: string, fileContent: string): Promise<void> {
    writeFileSync(join(this.folderPath, fileName), fileContent)
    log.fix('created', fileName)
  }

  async checkIssues (): Promise<void> {
    if (this.nbFailed > 0 && this.doFix) {
      if (this.doForce) {
        await this.initFile(this.fileName)
        return
      }
      log.info('this file has at least one issue, if you want repo-checker to overwrite this file use --force')
    }
  }

  async getFileSizeInKo (filePath: string): Promise<number> {
    return getFileSizeInKo(join(this.folderPath, filePath))
  }

  // eslint-disable-next-line max-params
  shouldContains (name: string, regex?: RegExp, nbMatchExpected = MORE_THAN_ONE, justWarn = false, helpMessage = '', canFix = false): boolean {
    if (regex === undefined) regex = new RegExp(name)
    const ok = this.checkContains(regex, nbMatchExpected)
    const fix = this.doFix && canFix && !ok
    // console.table({ doFix: this.doFix, doForce: this.doForce, canFix, ok, fix })
    name += (ok || fix) ? '' : ` -- ${helpMessage.length > 0 ? helpMessage : regex.toString().replace(/\\/g, '')} ${(canFix && !fix) ? bgYellow(black('[ fixable ]')) : ''}`
    const message = `${this.fileName} ${ok ? 'has' : (justWarn ? 'could have' : 'does not have')} ${name} `
    if (fix) log.fix(message)
    else this.test(ok, message, justWarn)
    return ok
  }

  // eslint-disable-next-line max-params
  couldContains (name: string, regex?: RegExp, nbMatchExpected = MORE_THAN_ONE, helpMessage = '', canFix = false): boolean {
    return this.shouldContains(name, regex, nbMatchExpected, true, helpMessage, canFix)
  }

  checkContains (regex: RegExp, nbMatchExpected = MORE_THAN_ONE): boolean {
    const matches = this.fileContent.match(regex) ?? [] // eslint-disable-line @typescript-eslint/prefer-regexp-exec
    const ok = nbMatchExpected === MORE_THAN_ONE ? (matches.length > 0) : nbMatchExpected === matches.length
    if (!ok) log.debug(regex.toString().replace('\n', ''), `matched ${matches.length} instead of ${nbMatchExpected === MORE_THAN_ONE ? 'one or more' : nbMatchExpected}`)
    return ok
  }

  test (isValid: boolean, message: string, justWarn = false): boolean {
    if (isValid) this.nbPassed++
    else if (!justWarn) this.nbFailed++
    log.test(isValid, message, justWarn)
    return isValid
  }
}
