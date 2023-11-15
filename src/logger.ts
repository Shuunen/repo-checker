import { bgBlue, black, Logger } from 'shuutils'

class ExtendedLogger extends Logger {
  public fix (...stuff: readonly string[]): void {
    const items = Array.from(stuff)
    items.push(bgBlue(black('[ fixed ]')))
    this.info(...items)
  }

  public unknownError (error: unknown): void {
    if (error instanceof Error) { this.error(error.message); return }
    if (typeof error === 'string') { this.error(error); return }
    this.error('Unknown error format, could not log it')
  }
}

export const log = new ExtendedLogger()
