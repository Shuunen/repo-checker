#!/usr/bin/env node

import { log } from './logger'
import { start } from './main'

start().then(() => {
  log.end()
  process.exit(0)
}).catch(error => {
  log.error(error.message)
  log.line()
  log.end()
  process.exit(1)
})
