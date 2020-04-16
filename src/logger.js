/* eslint-disable no-console */
import { blueBright, green, redBright, yellowBright } from 'colorette'
import { createWriteStream } from 'fs'
import pkg from '../package.json'

class Logger {
  get indent () {
    return '    '.repeat(this.indentLevel)
  }

  get date () {
    return new Date().toISOString().replace('T', ' ').split('.')[0]
  }

  constructor (filePath) {
    this.file = createWriteStream(filePath, { flags: 'a' })
    this.indentLevel = 0
  }

  async _write (...args) {
    this.file.write(args.join(' ') + '\n')
  }

  async setIndentLevel (level) {
    this.indentLevel = level
  }

  debug (...args) {
    return this._write(this.indent, '🔹', ...args)
  }

  info (...args) {
    console.log(this.indent, '⬜ ', ...args)
    return this._write(this.indent, '⬜', ...args)
  }

  error (...args) {
    console.error(redBright([this.indent, '❌ ', ...args].join(' ')))
    return this._write(this.indent, '❌', ...args)
  }

  warn (...args) {
    console.log(yellowBright([this.indent, '⚠️ ', ...args].join(' ')))
    return this._write(this.indent, '⚠️', ...args)
  }

  success (outputToConsole, ...args) {
    if (outputToConsole) {
      console.log(green([this.indent, '✔️ ', ...args].join(' ')))
    }
    return this._write(this.indent, '✔️', ...args)
  }

  test (ok, msg, justWarn, outputToConsole) {
    if (ok) {
      this.success(outputToConsole, msg)
    } else if (justWarn) {
      this.warn(msg)
    } else {
      this.error(msg)
    }
  }

  fix (...args) {
    console.log(blueBright([this.indent, '⬜ ', ...args].join(' ')))
    return this._write(this.indent, '⬜', ...args)
  }

  line () {
    console.log('')
    return this._write('')
  }

  start (doFix = false) {
    this.line()
    this._write(`⬇️--- Entry from ${this.date} ---⬇️`)
    this.info(`${pkg.name} v${pkg.version} is starting ${doFix ? '(fix enabled)' : ''}`)
    return this.line()
  }

  end () {
    this.info(pkg.name, 'has finished')
    return this.line()
  }
}

export const log = new Logger(pkg.config.logFile)
