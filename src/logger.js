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
    console.log(this.indent, ...args)
    return this._write(this.indent, '🔹', ...args)
  }
  error (...args) {
    console.error(chalk.red(this.indent, 'error :', ...args))
    return this._write(this.indent, '🔸', ...args)
  }
  test (ok, msg) {
    const str = this.indent + (ok ? '✔️' : '❌') + '  ' + msg
    console.error(ok ? chalk.green(str) : chalk.redBright(str))
    return this._write(str)
  }
  line () {
    console.log('')
    return this._write('')
  }
  start () {
    this._write(`\n⬇️--- Entry from ${this.date} ---⬇️\n`)
    return this.info(pkg.name, 'is starting', '\n')
  }
  end () {
    return this.info(pkg.name, 'has finished', '\n')
  }
}

const log = new Logger(pkg.config.logFile)

module.exports = log
