import type { WriteStream } from 'fs'
import { createWriteStream } from 'fs'
import { bgBlue, black, blue, green, red, yellow } from 'shuutils/dist/colors'
import { config, name, version } from '../package.json'

class Logger {

  public consoleLog = true

  public fileLog = true

  private readonly forceLog = false

  private indentLevel = 0

  private file?: WriteStream

  private readonly filePath: string

  public constructor (filePath: string) {
    this.filePath = filePath
  }

  private get indent (): string {
    return '    '.repeat(this.indentLevel)
  }

  public write (...stuff: string[]): boolean {
    if (!this.fileLog) return false
    if (this.file === undefined) this.file = createWriteStream(this.filePath, { flags: 'a' })
    this.file.write(stuff.join(' ') + '\n')
    return true
  }

  public setIndentLevel (level: number): number {
    this.indentLevel = level
    return level
  }

  public debug (...stuff: string[]): boolean {
    if (this.fileLog) return this.write(this.indent, '🔹', ...stuff)
    return false
  }

  public info (...stuff: string[]): boolean {
    /* c8 ignore next */
    if (this.consoleLog) console.log(this.indent, '⬜', ...stuff)
    if (this.fileLog) return this.write(this.indent, '⬜', ...stuff)
    return false
  }

  public error (...stuff: string[]): boolean {
    /* c8 ignore next */
    if (this.consoleLog) console.error(red([this.indent, '❌ ', ...stuff].join(' ')))
    if (this.fileLog) this.write(this.indent, '❌', ...stuff)
    return false
  }

  public unknownError (error: unknown): boolean {
    if (error instanceof Error) return this.error(error.message)
    if (typeof error === 'string') return this.error(error)
    return this.error('Unknown error format, could not log it')
  }

  public warn (...stuff: string[]): boolean {
    /* c8 ignore next */
    if (this.consoleLog) console.log(yellow([this.indent, '⚠️ ', ...stuff].join(' ')))
    if (this.fileLog) return this.write(this.indent, '⚠️', ...stuff)
    return false
  }

  public success (outputToConsole: boolean, ...stuff: string[]): boolean {
    /* c8 ignore next */
    if (outputToConsole && this.consoleLog) console.log(green([this.indent, '✔️ ', ...stuff].join(' ')))
    if (this.fileLog) return this.write(this.indent, '✔️', ...stuff)
    return false
  }

  public test (ok: boolean, message: string, justWarn = false, outputToConsole = false): boolean {
    if (ok) this.success(outputToConsole || this.forceLog, message)
    else if (justWarn) this.warn(message)
    else this.error(message)
    return ok
  }

  public fix (...stuff: string[]): boolean {
    stuff.push(bgBlue(black('[ fixed ]')))
    /* c8 ignore next */
    if (this.consoleLog) console.log(blue([this.indent, '⬜', ...stuff].join(' ')))
    if (this.fileLog) return this.write(this.indent, '⬜', ...stuff)
    return false
  }

  public line (): boolean {
    /* c8 ignore next */
    if (this.consoleLog) console.log('')
    if (this.fileLog) return this.write('')
    return false
  }

  public start (doFix = false): boolean {
    this.line()
    if (this.fileLog) this.write(`⬇️--- Entry from ${new Date().toISOString()} ---⬇️`)
    this.info(`${String(name)} v${String(version)} is starting ${doFix ? '(fix enabled)' : ''}`)
    return this.line()
  }
}

export const log = new Logger(config.logFile)
