#!/usr/bin/env node
import { log } from './logger.ts'
import { getFlags, getOptions, start } from './main.ts'

const options = getOptions(getFlags())

start(options)
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  .then(result => {
    if (!result.ok) {
      log.error(result.error)
      process.exit(1)
    }
  })
  // eslint-disable-next-line unicorn/prefer-top-level-await
  .catch((error: unknown) => {
    log.unknownError(error)
    process.exit(1)
  })
