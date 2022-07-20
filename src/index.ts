#!/usr/bin/env node

import { log } from './logger'
import { start } from './main'

// eslint-disable-next-line unicorn/prefer-top-level-await
start().catch(error => {
  log.error(error.message)
  log.line()
  process.exit(1)
})
