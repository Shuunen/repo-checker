#!/usr/bin/env node

import { log } from './logger'
import { start } from './main'

start().catch(error => {
  log.error(error.message)
  log.line()
  process.exit(1)
})
