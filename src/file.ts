import { Result, bgYellow, black, fillTemplate, sleep } from 'shuutils'
import { ProjectData, templatePath } from './constants.ts'
import { log } from './logger.ts'
import { fileExists, getFileSizeInKo, join, messageToCode, readFileInFolder, readableRegex, writeFile } from './utils.ts'

const defaultAmount = 99

// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class FileBase {
  /** The file can be fixed and written to the disk */
  public canFix = false

  public canForce = false

  public data = new ProjectData()

  public failed: string[] = []

  public fileContent = ''

  public fileName = ''

  public folderPath = ''

  private originalFileContent = ''

  public passed: string[] = []

  public warnings: string[] = []

  /**
   * Create a new file checker
   * @param folderPath the folder path to check
   * @param data the project data to use
   * @param canFix if the file can be fixed
   * @param canForce if the file can be forced
   */
  // eslint-disable-next-line @typescript-eslint/max-params
  public constructor(folderPath = '', data: Readonly<ProjectData> = new ProjectData(), canFix = false, canForce = false) {
    this.folderPath = folderPath
    this.data = data
    this.canFix = canFix
    this.canForce = canForce
  }

  /**
   * Check if a file contains a regex
   * @param regex the regex to check
   * @param nbMatchExpected the number of match expected
   * @returns true if the file contains the regex
   */
  public checkContains(regex: Readonly<RegExp>, nbMatchExpected = defaultAmount) {
    const matches = this.fileContent.match(regex) ?? []
    const hasExpectedMatches = nbMatchExpected === defaultAmount ? matches.length > 0 : nbMatchExpected === matches.length
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    if (!hasExpectedMatches) log.debug(regex.toString().replace('\n', ''), `matched ${matches.length} instead of ${nbMatchExpected === defaultAmount ? 'one or more' : nbMatchExpected}`)
    return hasExpectedMatches
  }

  /**
   * Check if a file exists, create a file if fix enabled, trigger a success or fail
   * @param fileName the file name to check
   * @param willJustWarn just warn if the file is not found
   * @returns true if the file is found
   */
  public async checkFileExists(fileName: string, willJustWarn = false) {
    let hasFile = await this.fileExists(fileName)
    if (!hasFile && this.canFix) {
      const fileContent = await this.initFile(fileName)
      hasFile = fileContent.length > 0
    }
    this.test(hasFile, `has a ${fileName} file`, willJustWarn)
    return hasFile
  }

  /**
   * Check if a file has at least one issue
   */
  private async checkIssues() {
    if (this.failed.length > 0 && this.canFix) {
      if (this.canForce) {
        await this.initFile(this.fileName)
        return
      }
      log.info('this file has at least one issue, if you want repo-checker to overwrite this file use --force')
    }
  }

  /**
   * Check if there is no file
   * @param fileName the file name to check
   * @returns true if there is no file
   */
  public async checkNoFileExists(fileName: string) {
    const hasFile = await this.fileExists(fileName)
    this.test(!hasFile, `has no ${fileName} file`)
  }

  /**
   * Check if a file contains a regex
   * @param name the name of the test
   * @param regex the regex to check
   * @param nbMatchExpected the number of match expected
   * @param helpMessage the help message to display
   * @param canFix if the file can be auto-fixed
   * @returns true if the file contains the regex
   */
  // eslint-disable-next-line @typescript-eslint/max-params
  public couldContains(name: string, regex?: Readonly<RegExp>, nbMatchExpected = defaultAmount, helpMessage = '', canFix = false) {
    return this.shouldContains(name, regex, nbMatchExpected, true, helpMessage, canFix)
  }

  /**
   * Check if a file contains a schema
   * @param url the schema url to check
   * @returns true if the file contains the schema
   */
  public couldContainsSchema(url: string) {
    const line = `"$schema": "${url}",`
    const hasSchema = this.couldContains('a $schema declaration', /"\$schema": "/u, 1, `like ${line}`, true)
    if (hasSchema) return true
    if (!this.canFix) return hasSchema
    // eslint-disable-next-line prefer-named-capture-group
    this.fileContent = this.fileContent.replace(/(^\{\n)(\s+)/u, `$1$2${line}\n$2`)
    return true
  }

  /**
   * Create a file with a given content
   * @param fileName the file name
   * @param fileContent the file content
   */
  private async createFile(fileName: string, fileContent: string) {
    void writeFile(join(this.folderPath, fileName), fileContent)
    await sleep(1)
    log.fix('created', fileName)
  }

  /**
   *
   */
  public async end() {
    await this.updateFile()
    await this.checkIssues()
  }

  /**
   * Check if a file exists
   * @param fileName the file name to check
   * @returns true if the file exists
   */
  public async fileExists(fileName: string) {
    return fileExists(join(this.folderPath, fileName))
  }

  /**
   * Get the file size in Ko
   * @param filePath the file path to check
   * @returns the file size in Ko
   */
  public async getFileSizeInKo(filePath: string) {
    return getFileSizeInKo(join(this.folderPath, filePath))
  }

  /**
   * Initialize a file with a template
   * @param fileName the file name to initialize
   * @returns the file content
   */
  public async initFile(fileName: string) {
    const template = Result.unwrap(await readFileInFolder(templatePath, fileName)).value ?? ''
    if (template === '') {
      log.debug(`found no template ${fileName}, using a empty string instead`)
      return ''
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion
    const fileContent = fillTemplate(template, this.data as unknown as Record<string, unknown>)
    if (fileContent.includes('{{')) log.warn(`please provide a data file to be able to fix a "${fileName}" file`)
    else void this.createFile(fileName, fileContent)
    return fileContent
  }

  /**
   * Inspect a file
   * @param fileName the file name to inspect
   */
  public async inspectFile(fileName: string) {
    this.fileName = fileName
    const result = await readFileInFolder(this.folderPath, fileName)
    if (!result.ok) return
    this.originalFileContent = result.value
    this.fileContent = this.originalFileContent
  }

  /**
   * Check if a file contains a regex
   * @param name the name of the test
   * @param regex the regex to check
   * @param nbMatchExpected the number of match expected
   * @param willJustWarn if the test will just warn
   * @param helpMessage the help message to display
   * @param canFix if the file can be auto-fixed
   * @returns true if the file contains the regex
   */
  // eslint-disable-next-line @typescript-eslint/max-params, complexity
  public shouldContains(name: string, regex?: Readonly<RegExp>, nbMatchExpected = defaultAmount, willJustWarn = false, helpMessage = '', canFix = false) {
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

  /**
   * Test a condition
   * @param isValid the condition to test
   * @param message the message to display
   * @param willJustWarn if the test will just warn
   * @returns true if the condition is valid
   */
  public test(isValid: boolean, message: string, willJustWarn = false) {
    const finalMessage = message.startsWith(this.fileName) ? message : `${this.fileName} ${message}`
    const code = messageToCode(finalMessage)
    if (isValid) {
      this.passed.push(code)
      log.test(isValid, finalMessage)
    } else if (willJustWarn) {
      this.warnings.push(code)
      log.warn(finalMessage)
    } else {
      this.failed.push(code)
      log.error(finalMessage)
    }
    return isValid
  }

  /**
   * Update a file with a new content
   */
  // eslint-disable-next-line max-statements
  public async updateFile() {
    if (this.originalFileContent.trim() === this.fileContent.trim()) {
      log.debug('avoid file update when updated content is the same')
      return
    }
    if (!this.canFix) {
      log.debug('cant update file if fix not active')
      return
    }
    if (this.failed.length > 0 && !this.canForce) {
      log.debug('cant update file without force if some checks failed')
      return
    }
    if (this.fileName.length === 0) {
      log.debug('cant update file without a file name, probably running tests')
      return
    }
    await writeFile(join(this.folderPath, this.fileName), this.fileContent) // if you don't await, the file is updated after the end of the process and tests are failing
    log.debug('updated', this.fileName, 'with the new content')
  }
}
