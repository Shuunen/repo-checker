/* eslint-disable jsdoc/require-jsdoc */
import { isTestEnvironment, Logger } from 'shuutils'

// eslint-disable-next-line no-restricted-syntax
class ExtendedLogger extends Logger {
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  public forceInfo(...stuff: unknown[]) {
    const previousLogLevel = this.options.minimumLevel
    this.options.minimumLevel = '3-info'
    this.info(...stuff)
    this.options.minimumLevel = previousLogLevel
  }
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

/* c8 ignore next */
export const log = new ExtendedLogger({ minimumLevel: isTestEnvironment() ? '7-error' : '3-info' })
