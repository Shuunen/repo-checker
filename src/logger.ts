import { createWriteStream, WriteStream } from 'fs'
import { blue, green, red, yellow } from 'shuutils'
import { config, name, version } from '../package.json'

class Logger {
  noConsole = false
  indentLevel = 0
  file: WriteStream

  get indent (): string {
    return '    '.repeat(this.indentLevel)
  }

  get date (): string {
    return new Date().toISOString().replace('T', ' ').split('.')[0]
  }

  constructor (filePath: string) {
    this.file = createWriteStream(filePath, { flags: 'a' })
  }

  _write (...stuff: string[]): boolean {
    this.file.write(stuff.join(' ') + '\n')
    return true
  }

  setIndentLevel (level: number): number {
    this.indentLevel = level
    return level
  }

  debug (...stuff: string[]): boolean {
    return this._write(this.indent, '🔹', ...stuff)
  }

  info (...stuff: string[]): boolean {
    /* istanbul ignore if */
    if (!this.noConsole) console.log(this.indent, '⬜', ...stuff)
    return this._write(this.indent, '⬜', ...stuff)
  }

  error (...stuff: string[]): boolean {
    /* istanbul ignore if */
    if (!this.noConsole) console.error(red([this.indent, '❌ ', ...stuff].join(' ')))
    this._write(this.indent, '❌', ...stuff)
    return false
  }

  warn (...stuff: string[]): boolean {
    /* istanbul ignore if */
    if (!this.noConsole) console.log(yellow([this.indent, '⚠️ ', ...stuff].join(' ')))
    return this._write(this.indent, '⚠️', ...stuff)
  }

  success (outputToConsole: boolean, ...stuff: string[]): boolean {
    /* istanbul ignore if */
    if (outputToConsole && !this.noConsole) console.log(green([this.indent, '✔️ ', ...stuff].join(' ')))
    return this._write(this.indent, '✔️', ...stuff)
  }

  test (ok: boolean, message: string, justWarn = false, outputToConsole = false): boolean {
    if (ok) this.success(outputToConsole, message)
    else if (justWarn) this.warn(message)
    else this.error(message)
    return ok
  }

  fix (...stuff: string[]): boolean {
    stuff.push('(fixed)')
    /* istanbul ignore if */
    if (!this.noConsole) console.log(blue([this.indent, '⬜', ...stuff].join(' ')))
    return this._write(this.indent, '⬜', ...stuff)
  }

  line (): boolean {
    /* istanbul ignore if */
    if (!this.noConsole) console.log('')
    return this._write('')
  }

  start (doFix = false): boolean {
    this.line()
    this._write(`⬇️--- Entry from ${this.date} ---⬇️`)
    this.info(`${String(name)} v${String(version)} is starting ${doFix ? '(fix enabled)' : ''}`)
    return this.line()
  }
}

export const log = new Logger(config.logFile)
