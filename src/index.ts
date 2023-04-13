#!/usr/bin/env node
import { log } from './logger'
import { start } from './main'

// eslint-disable-next-line unicorn/prefer-top-level-await
start().catch((error: unknown) => {
  log.unknownError(error)
  process.exit(1)
})
