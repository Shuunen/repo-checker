import { bgYellow, black, fillTemplate } from 'shuutils'
import { ProjectData, templatePath } from './constants'
import { log } from './logger'
import { fileExists, getFileSizeInKo, join, messageToCode, readFileInFolder, readableRegex, writeFile } from './utils'

const defaultAmount = 99

// eslint-disable-next-line no-restricted-syntax
export class FileBase {

  public passed: string[] = []

  public warnings: string[] = []

  public failed: string[] = []

  public folderPath = ''

  public data = new ProjectData()

  public canFix = false

  public canForce = false

  public fileContent = ''

  public fileName = ''

  private originalFileContent = ''

  // eslint-disable-next-line @typescript-eslint/max-params
  public constructor (folderPath = '', data: Readonly<ProjectData> = new ProjectData(), canFix = false, canForce = false) {
    this.folderPath = folderPath
    this.data = data
    this.canFix = canFix
    this.canForce = canForce
  }

  // eslint-disable-next-line complexity, sonarjs/cognitive-complexity, @typescript-eslint/max-params
  public shouldContains (name: string, regex?: Readonly<RegExp>, nbMatchExpected = defaultAmount, willJustWarn = false, helpMessage = '', canFix = false): boolean {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regexp = regex ?? new RegExp(name, 'u')
    const isOk = this.checkContains(regexp, nbMatchExpected)
    const willFix = this.canFix && canFix && !isOk
    let finalName = name
    finalName += isOk || willFix ? '' : ` -- ${helpMessage.length > 0 ? helpMessage : readableRegex(regexp)} ${canFix ? bgYellow(black('[ fixable ]')) : ''}`
    const have = willJustWarn ? 'could have' : 'does not have'
    const message = `${this.fileName} ${isOk ? 'has' : have} ${finalName} `
    if (willFix) log.fix(message)
    else this.test(isOk, message, willJustWarn)
    return isOk
  }

  // eslint-disable-next-line @typescript-eslint/max-params
  public couldContains (name: string, regex?: Readonly<RegExp>, nbMatchExpected = defaultAmount, helpMessage = '', canFix = false): boolean {
    return this.shouldContains(name, regex, nbMatchExpected, true, helpMessage, canFix)
  }

  public checkContains (regex: Readonly<RegExp>, nbMatchExpected = defaultAmount): boolean {
    // eslint-disable-next-line regexp/prefer-regexp-exec
    const matches = this.fileContent.match(regex) ?? []
    const hasExpectedMatches = nbMatchExpected === defaultAmount ? matches.length > 0 : nbMatchExpected === matches.length
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    if (!hasExpectedMatches) log.debug(regex.toString().replace('\n', ''), `matched ${matches.length} instead of ${nbMatchExpected === defaultAmount ? 'one or more' : nbMatchExpected}`)
    return hasExpectedMatches
  }

  public test (isValid: boolean, message: string, willJustWarn = false): boolean {
    const finalMessage = message.startsWith(this.fileName) ? message : `${this.fileName} ${message}`
    const code = messageToCode(finalMessage)
    if (isValid) { this.passed.push(code); log.test(isValid, finalMessage) }
    else if (willJustWarn) { this.warnings.push(code); log.warn(finalMessage) }
    else { this.failed.push(code); log.error(finalMessage) }
    return isValid
  }

  public couldContainsSchema (url: string): boolean {
    const line = `"$schema": "${url}",`
    const hasSchema = this.couldContains('a $schema declaration', /"\$schema": "/u, 1, `like ${line}`, true)
    if (hasSchema) return true
    if (!this.canFix) return hasSchema
    // eslint-disable-next-line prefer-named-capture-group, regexp/prefer-named-capture-group
    this.fileContent = this.fileContent.replace(/(^\{\n)(\s+)/u, `$1$2${line}\n$2`)
    return true
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

  // eslint-disable-next-line max-statements
  public async updateFile (): Promise<void> {
    if (this.originalFileContent.trim() === this.fileContent.trim()) { log.debug('avoid file update when updated content is the same'); return }
    if (!this.canFix) { log.debug('cant update file if fix not active'); return }
    if (this.failed.length > 0 && !this.canForce) { log.debug('cant update file without force if some checks failed'); return }
    if (this.fileName.length === 0) { log.debug('cant update file without a file name, probably running tests'); return }
    await writeFile(join(this.folderPath, this.fileName), this.fileContent) // if you don't await, the file is updated after the end of the process and tests are failing
    log.debug('updated', this.fileName, 'with the new content')
  }

  public async fileExists (fileName: string): Promise<boolean> {
    return await fileExists(join(this.folderPath, fileName))
  }

  /**
   * Check if a file exists, create a file if fix enabled, trigger a success or fail
   * @param fileName the file name to check
   * @param willJustWarn just warn if the file is not found
   * @returns true if the file is found
   */
  public async checkFileExists (fileName: string, willJustWarn = false): Promise<boolean> {
    let hasFile = await this.fileExists(fileName)
    if (!hasFile && this.canFix) {
      const fileContent = await this.initFile(fileName)
      hasFile = fileContent.length > 0
    }
    this.test(hasFile, `has a ${fileName} file`, willJustWarn)
    return hasFile
  }

  public async checkNoFileExists (fileName: string): Promise<void> {
    const hasFile = await this.fileExists(fileName)
    this.test(!hasFile, `has no ${fileName} file`)
  }

  public async getFileSizeInKo (filePath: string): Promise<number> {
    return await getFileSizeInKo(join(this.folderPath, filePath))
  }

  public async initFile (fileName: string): Promise<string> {
    const template = await readFileInFolder(templatePath, fileName).catch(() => '')
    if (template === '') {
      log.debug(`found no template ${fileName}, using a empty string instead`)
      return ''
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const fileContent = fillTemplate(template, this.data as unknown as Record<string, unknown>)
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
    if (this.failed.length > 0 && this.canFix) {
      if (this.canForce) {
        await this.initFile(this.fileName)
        return
      }
      log.info('this file has at least one issue, if you want repo-checker to overwrite this file use --force')
    }
  }
}
