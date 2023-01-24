import { bgYellow, black, fillTemplate } from 'shuutils'
import { ProjectData, templatePath } from './constants'
import { log } from './logger'
import { fileExists, getFileSizeInKo, join, messageToCode, readFileInFolder, writeFile } from './utils'

const MORE_THAN_ONE = 99

export class File {

  public passed: string[] = []

  public failed: string[] = []

  public folderPath = ''

  public data = new ProjectData()

  public doFix = false

  public doForce = false

  public fileContent = ''

  public fileName = ''

  private originalFileContent = ''

  public constructor (folderPath = '', data = new ProjectData(), doFix = false, doForce = false) {
    this.folderPath = folderPath
    this.data = data
    this.doFix = doFix
    this.doForce = doForce
  }

  public async end (): Promise<void> {
    await this.updateFile()
    await this.checkIssues()
  }

  public async inspectFile (fileName: string): Promise<void> {
    this.fileName = fileName
    this.originalFileContent = await readFileInFolder(this.folderPath, fileName).catch(() => '')
    this.fileContent = this.originalFileContent
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async updateFile (): Promise<boolean> {
    if (this.originalFileContent.trim() === this.fileContent.trim()) return log.debug('avoid file update when updated content is the same')
    if (!this.doFix) return log.debug('cant update file if fix not active')
    if (this.failed.length > 0 && !this.doForce) return log.debug('cant update file without force if some checks failed')
    if (this.fileName.length === 0) return log.debug('cant update file without a file name, probably running tests')
    await writeFile(join(this.folderPath, this.fileName), this.fileContent) // if you don't await, the file is updated after the end of the process and tests are failing
    return log.debug('updated', this.fileName, 'with the new content')
  }

  public async fileExists (fileName: string): Promise<boolean> {
    return fileExists(join(this.folderPath, fileName))
  }

  /**
   * Check if a file exists, create a file if fix enabled, trigger a success or fail
   * @param fileName the file name to check
   * @param justWarn just warn if the file is not found
   * @returns true if the file is found
   */
  public async checkFileExists (fileName: string, justWarn = false): Promise<boolean> {
    let exists = await this.fileExists(fileName)
    if (!exists && this.doFix) {
      const fileContent = await this.initFile(fileName)
      exists = fileContent.length > 0
    }
    this.test(exists, `has a ${fileName} file`, justWarn)
    return Boolean(fileExists)
  }

  public async checkNoFileExists (fileName: string): Promise<void> {
    const exists = await this.fileExists(fileName)
    this.test(!exists, `has no ${fileName} file`)
  }

  public async getFileSizeInKo (filePath: string): Promise<number> {
    return getFileSizeInKo(join(this.folderPath, filePath))
  }

  // eslint-disable-next-line max-params
  public shouldContains (name: string, regex?: RegExp, nbMatchExpected = MORE_THAN_ONE, justWarn = false, helpMessage = '', canFix = false): boolean {
    if (regex === undefined) regex = new RegExp(name)
    const ok = this.checkContains(regex, nbMatchExpected)
    const fix = this.doFix && canFix && !ok
    // console.table({ doFix: this.doFix, doForce: this.doForce, canFix, ok, fix })
    const regexString = regex.toString().replace(/\\/g, '') // eslint-disable-line unicorn/prefer-string-replace-all
    name += ok || fix ? '' : ` -- ${helpMessage.length > 0 ? helpMessage : regexString} ${canFix ? bgYellow(black('[ fixable ]')) : ''}`
    const have = justWarn ? 'could have' : 'does not have'
    const message = `${this.fileName} ${ok ? 'has' : have} ${name} `
    if (fix) log.fix(message)
    else this.test(ok, message, justWarn)
    return ok
  }

  // eslint-disable-next-line max-params
  public couldContains (name: string, regex?: RegExp, nbMatchExpected = MORE_THAN_ONE, helpMessage = '', canFix = false): boolean {
    return this.shouldContains(name, regex, nbMatchExpected, true, helpMessage, canFix)
  }

  public checkContains (regex: RegExp, nbMatchExpected = MORE_THAN_ONE): boolean {
    const matches = this.fileContent.match(regex) ?? [] // eslint-disable-line @typescript-eslint/prefer-regexp-exec
    const ok = nbMatchExpected === MORE_THAN_ONE ? matches.length > 0 : nbMatchExpected === matches.length
    if (!ok) log.debug(regex.toString().replace('\n', ''), `matched ${matches.length} instead of ${nbMatchExpected === MORE_THAN_ONE ? 'one or more' : nbMatchExpected}`)
    return ok
  }

  public test (isValid: boolean, message: string, justWarn = false): boolean {
    const finalMessage = message.startsWith(this.fileName) ? message : `${this.fileName} ${message}`
    const code = messageToCode(finalMessage)
    if (isValid) this.passed.push(code)
    else if (!justWarn) this.failed.push(code)
    log.test(isValid, finalMessage, justWarn)
    return isValid
  }

  public couldContainsSchema (url: string): boolean {
    const line = `"$schema": "${url}",`
    const ok = this.couldContains('a $schema declaration', /"\$schema": "/, 1, `like ${line}`, true)
    if (ok) return true
    if (!this.doFix) return ok
    this.fileContent = this.fileContent.replace(/(^{\n)(\s+)/, `$1$2${line}\n$2`)
    return true
  }

  public async initFile (fileName: string): Promise<string> {
    const template = await readFileInFolder(templatePath, fileName).catch(() => '')
    if (template === '') {
      log.debug(`found no template ${fileName}, using a empty string instead`)
      return ''
    }
    const fileContent = fillTemplate(template, this.data as unknown as Record<string, string>)
    if (fileContent.includes('{{')) log.warn(`please provide a data file to be able to fix a "${fileName}" file`)
    else void this.createFile(fileName, fileContent)
    return fileContent
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async createFile (fileName: string, fileContent: string): Promise<void> {
    void writeFile(join(this.folderPath, fileName), fileContent)
    log.fix('created', fileName)
  }

  private async checkIssues (): Promise<void> {
    if (this.failed.length > 0 && this.doFix) {
      if (this.doForce) {
        await this.initFile(this.fileName)
        return
      }
      log.info('this file has at least one issue, if you want repo-checker to overwrite this file use --force')
    }
  }
}
