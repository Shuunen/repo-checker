#!/usr/bin/env node
import { log } from './logger'
import { getFlags, getOptions, start } from './main'

const options = getOptions(getFlags())

// eslint-disable-next-line unicorn/prefer-top-level-await
start(options).catch((error: unknown) => {
  log.unknownError(error)
  process.exit(1)
})
