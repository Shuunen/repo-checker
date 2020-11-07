/* eslint-disable no-console */
import { blueBright, green, redBright, yellowBright } from 'colorette'
import { createWriteStream } from 'fs'
import { config, name, version } from '../package.json'

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

  async _write (...stuff) {
    this.file.write(stuff.join(' ') + '\n')
    return true
  }

  async setIndentLevel (level) {
    this.indentLevel = level
    return level
  }

  debug (...stuff) {
    return this._write(this.indent, '🔹', ...stuff)
  }

  info (...stuff) {
    console.log(this.indent, '⬜', ...stuff)
    return this._write(this.indent, '⬜', ...stuff)
  }

  async error (...stuff) {
    console.error(redBright([this.indent, '❌ ', ...stuff].join(' ')))
    await this._write(this.indent, '❌', ...stuff)
    return false
  }

  warn (...stuff) {
    console.log(yellowBright([this.indent, '⚠️ ', ...stuff].join(' ')))
    return this._write(this.indent, '⚠️', ...stuff)
  }

  success (outputToConsole, ...stuff) {
    if (outputToConsole) {
      console.log(green([this.indent, '✔️ ', ...stuff].join(' ')))
    }
    return this._write(this.indent, '✔️', ...stuff)
  }

  test (ok, message, justWarn, outputToConsole) {
    if (ok) {
      this.success(outputToConsole, message)
    } else if (justWarn) {
      this.warn(message)
    } else {
      this.error(message)
    }
    return ok
  }

  fix (...stuff) {
    console.log(blueBright([this.indent, '⬜ ', ...stuff].join(' ')))
    return this._write(this.indent, '⬜', ...stuff)
  }

  line () {
    console.log('')
    return this._write('')
  }

  start (doFix = false) {
    this.line()
    this._write(`⬇️--- Entry from ${this.date} ---⬇️`)
    this.info(`${name} v${version} is starting ${doFix ? '(fix enabled)' : ''}`)
    return this.line()
  }

  end () {
    this.info(name, 'has finished')
    return this.line()
  }
}

export const log = new Logger(config.logFile)
