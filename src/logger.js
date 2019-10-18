/* eslint-disable no-console */
const fs = require('fs')
const chalk = require('chalk')

const pkg = require('../package.json')

class Logger {
  get indent () {
    return '    '.repeat(this.indentLevel)
  }

  get date () {
    return new Date().toISOString().replace('T', ' ').split('.')[0]
  }

  constructor (filePath) {
    this.file = fs.createWriteStream(filePath, { flags: 'a' })
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
    console.error(chalk.redBright(this.indent, '❌ ', ...args))
    return this._write(this.indent, '❌', ...args)
  }

  warn (...args) {
    console.log(chalk.yellowBright(this.indent, '⚠️ ', ...args))
    return this._write(this.indent, '⚠️', ...args)
  }

  success (...args) {
    console.log(chalk.green(this.indent, '✔️ ', ...args))
    return this._write(this.indent, '✔️', ...args)
  }

  test (ok, msg, justWarn) {
    if (ok) {
      this.success(msg)
    } else if (justWarn) {
      this.warn(msg)
    } else {
      this.error(msg)
    }
  }

  fix (...args) {
    console.log(chalk.blueBright(this.indent, '⬜ ', ...args))
    return this._write(this.indent, '⬜', ...args)
  }

  line () {
    console.log('')
    return this._write('')
  }

  start () {
    this.line()
    this._write(`⬇️--- Entry from ${this.date} ---⬇️`)
    this.info(`${pkg.name} v${pkg.version} is starting`)
    return this.line()
  }

  end () {
    this.line()
    this.info(pkg.name, 'has finished')
    return this.line()
  }
}

const log = new Logger(pkg.config.logFile)

module.exports = log
