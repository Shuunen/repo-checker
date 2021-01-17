import { blueBright, green, redBright, yellowBright } from 'colorette'
import { createWriteStream, WriteStream } from 'fs'
import { config, name, version } from '../package.json'

class Logger {
  indentLevel = 0
  file: WriteStream

  get indent (): string {
    return '    '.repeat(this.indentLevel)
  }

  get date (): string {
    return new Date().toISOString().replace('T', ' ').split('.')[0]
  }

  constructor (filePath = '') {
    this.file = createWriteStream(filePath, { flags: 'a' })
  }

  _write (...stuff: string[]): boolean {
    this.file.write(stuff.join(' ') + '\n')
    return true
  }

  setIndentLevel (level = 0): number {
    this.indentLevel = level
    return level
  }

  debug (...stuff: string[]): boolean {
    return this._write(this.indent, '🔹', ...stuff)
  }

  info (...stuff: string[]): boolean {
    console.log(this.indent, '⬜', ...stuff)
    return this._write(this.indent, '⬜', ...stuff)
  }

  error (...stuff: string[]): boolean {
    console.error(redBright([this.indent, '❌ ', ...stuff].join(' ')))
    this._write(this.indent, '❌', ...stuff)
    return false
  }

  warn (...stuff: string[]): boolean {
    console.log(yellowBright([this.indent, '⚠️ ', ...stuff].join(' ')))
    return this._write(this.indent, '⚠️', ...stuff)
  }

  success (outputToConsole = false, ...stuff: string[]): boolean {
    if (outputToConsole) console.log(green([this.indent, '✔️ ', ...stuff].join(' ')))
    return this._write(this.indent, '✔️', ...stuff)
  }

  test (ok = false, message = '', justWarn = false, outputToConsole = false): boolean {
    if (ok) this.success(outputToConsole, message)
    else if (justWarn) this.warn(message)
    else this.error(message)
    return ok
  }

  fix (...stuff: string[]): boolean {
    stuff.push('(fixed)')
    console.log(blueBright([this.indent, '⬜', ...stuff].join(' ')))
    return this._write(this.indent, '⬜', ...stuff)
  }

  line (): boolean {
    console.log('')
    return this._write('')
  }

  start (doFix = false): boolean {
    this.line()
    this._write(`⬇️--- Entry from ${this.date} ---⬇️`)
    this.info(`${String(name)} v${String(version)} is starting ${doFix ? '(fix enabled)' : ''}`)
    return this.line()
  }

  end (): boolean {
    this.info(name, 'has finished')
    return this.line()
  }
}

export const log = new Logger(config.logFile)
