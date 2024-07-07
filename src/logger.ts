/* eslint-disable jsdoc/require-jsdoc */
import { Logger } from 'shuutils'

// eslint-disable-next-line no-restricted-syntax
class ExtendedLogger extends Logger {
  public unknownError(error: unknown) {
    if (error instanceof Error) {
      this.error(error.message)
      return
    }
    if (typeof error === 'string') {
      this.error(error)
      return
    }
    this.error('Unknown error format, could not log it')
  }
}

export const log = new ExtendedLogger()
