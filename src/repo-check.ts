#!/usr/bin/env node
import { log } from './logger.ts'
import { getFlags, getOptions, start } from './main.ts'

const options = getOptions(getFlags())

start(options)
  // eslint-disable-next-line max-nested-callbacks
  .then(result => {
    if (!result.ok) {
      log.error(result.error)
      process.exit(1) // eslint-disable-line no-undef
    }
  })
  // eslint-disable-next-line max-nested-callbacks
  .catch((error: unknown) => {
    log.unknownError(error)
    process.exit(1) // eslint-disable-line no-undef
  })
