// eslint-disable-next-line no-restricted-imports, @typescript-eslint/consistent-type-imports
import { createWriteStream, WriteStream } from 'fs'
import { bgBlue, black, blue, green, Nb, red, yellow } from 'shuutils'
import { config, name, version } from '../package.json'  

class Logger {

  public canConsoleLog = true

  public willLogToFile = true

  private readonly willForceLog = false

  private indentLevel = Nb.None

  private file?: WriteStream

  private readonly filePath: string

  public constructor (filePath: string) {
    this.filePath = filePath
  }

  private get indent (): string {
    return '    '.repeat(this.indentLevel)
  }

  public write (...stuff: string[]): boolean {
    if (!this.willLogToFile) return false
    if (this.file === undefined) this.file = createWriteStream(this.filePath, { flags: 'a' })
    this.file.write(`${stuff.join(' ')}\n`)
    return true
  }

  public setIndentLevel (level: number): number {
    this.indentLevel = level
    return level
  }

  public debug (...stuff: string[]): boolean {
    if (this.willLogToFile) return this.write(this.indent, '🔹', ...stuff)
    return false
  }

  public info (...stuff: string[]): boolean {
    /* c8 ignore next */
    if (this.canConsoleLog) console.log(this.indent, '⬜', ...stuff) // eslint-disable-line no-console
    if (this.willLogToFile) return this.write(this.indent, '⬜', ...stuff)
    return false
  }

  public error (...stuff: string[]): boolean {
    /* c8 ignore next */
    if (this.canConsoleLog) console.error(red([this.indent, '❌ ', ...stuff].join(' '))) // eslint-disable-line no-console
    if (this.willLogToFile) this.write(this.indent, '❌', ...stuff)
    return false
  }

  public unknownError (error: unknown): boolean {
    if (error instanceof Error) return this.error(error.message)
    if (typeof error === 'string') return this.error(error)
    return this.error('Unknown error format, could not log it')
  }

  public warn (...stuff: string[]): boolean {
    /* c8 ignore next */
    if (this.canConsoleLog) console.log(yellow([this.indent, '⚠️ ', ...stuff].join(' '))) // eslint-disable-line no-console
    if (this.willLogToFile) return this.write(this.indent, '⚠️', ...stuff)
    return false
  }

  public success (canOutputToConsole: boolean, ...stuff: string[]): boolean {
    /* c8 ignore next */
    if (canOutputToConsole && this.canConsoleLog) console.log(green([this.indent, '✔️ ', ...stuff].join(' '))) // eslint-disable-line no-console
    if (this.willLogToFile) return this.write(this.indent, '✔️', ...stuff)
    return false
  }

  // eslint-disable-next-line max-params
  public test (isOk: boolean, message: string, willJustWarn = false, willOutputToConsole = false): boolean {
    if (isOk) this.success(willOutputToConsole || this.willForceLog, message)
    else if (willJustWarn) this.warn(message)
    else this.error(message)
    return isOk
  }

  public fix (...stuff: string[]): boolean {
    stuff.push(bgBlue(black('[ fixed ]')))
    /* c8 ignore next */
    if (this.canConsoleLog) console.log(blue([this.indent, '⬜', ...stuff].join(' '))) // eslint-disable-line no-console
    if (this.willLogToFile) return this.write(this.indent, '⬜', ...stuff)
    return false
  }

  public line (): boolean {
    /* c8 ignore next */
    if (this.canConsoleLog) console.log('') // eslint-disable-line no-console
    if (this.willLogToFile) return this.write('')
    return false
  }

  public start (canFix = false): boolean {
    this.line()
    if (this.willLogToFile) this.write(`⬇️--- Entry from ${new Date().toISOString()} ---⬇️`)
    this.info(`${String(name)} v${String(version)} is starting ${canFix ? '(fix enabled)' : ''}`)
    return this.line()
  }
}

export const log = new Logger(config.logFile)



