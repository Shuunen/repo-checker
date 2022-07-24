import { createWriteStream, WriteStream } from 'fs'
import { bgBlue, black, blue, green, red, yellow } from 'shuutils/dist/colors'
import { config, name, version } from '../package.json'

class Logger {
  consoleLog = true
  fileLog = true
  indentLevel = 0
  file?: WriteStream

  get indent (): string {
    return '    '.repeat(this.indentLevel)
  }

  constructor (private filePath: string) {}

  write (...stuff: string[]): boolean {
    if (!this.fileLog) return false
    if (this.file === undefined) this.file = createWriteStream(this.filePath, { flags: 'a' })
    this.file.write(stuff.join(' ') + '\n')
    return true
  }

  setIndentLevel (level: number): number {
    this.indentLevel = level
    return level
  }

  debug (...stuff: string[]): boolean {
    if (this.fileLog) return this.write(this.indent, '🔹', ...stuff)
    return false
  }

  info (...stuff: string[]): boolean {
    /* c8 ignore next */
    if (this.consoleLog) console.log(this.indent, '⬜', ...stuff)
    if (this.fileLog) return this.write(this.indent, '⬜', ...stuff)
    return false
  }

  error (...stuff: string[]): boolean {
    /* c8 ignore next */
    if (this.consoleLog) console.error(red([this.indent, '❌ ', ...stuff].join(' ')))
    if (this.fileLog) this.write(this.indent, '❌', ...stuff)
    return false
  }

  warn (...stuff: string[]): boolean {
    /* c8 ignore next */
    if (this.consoleLog) console.log(yellow([this.indent, '⚠️ ', ...stuff].join(' ')))
    if (this.fileLog) return this.write(this.indent, '⚠️', ...stuff)
    return false
  }

  success (outputToConsole: boolean, ...stuff: string[]): boolean {
    /* c8 ignore next */
    if (outputToConsole && this.consoleLog) console.log(green([this.indent, '✔️ ', ...stuff].join(' ')))
    if (this.fileLog) return this.write(this.indent, '✔️', ...stuff)
    return false
  }

  test (ok: boolean, message: string, justWarn = false, outputToConsole = false): boolean {
    if (ok) this.success(outputToConsole, message)
    else if (justWarn) this.warn(message)
    else this.error(message)
    return ok
  }

  fix (...stuff: string[]): boolean {
    stuff.push(bgBlue(black('[ fixed ]')))
    /* c8 ignore next */
    if (this.consoleLog) console.log(blue([this.indent, '⬜', ...stuff].join(' ')))
    if (this.fileLog) return this.write(this.indent, '⬜', ...stuff)
    return false
  }

  line (): boolean {
    /* c8 ignore next */
    if (this.consoleLog) console.log('')
    if (this.fileLog) return this.write('')
    return false
  }

  start (doFix = false): boolean {
    this.line()
    if (this.fileLog) this.write(`⬇️--- Entry from ${new Date().toISOString()} ---⬇️`)
    this.info(`${String(name)} v${String(version)} is starting ${doFix ? '(fix enabled)' : ''}`)
    return this.line()
  }
}

export const log = new Logger(config.logFile)
