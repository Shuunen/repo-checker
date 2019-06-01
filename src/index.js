
const path = require('path')

const check = require('./check')
const log = require('./logger')

function init () {
  if (process.argv.length <= 2) {
    log.info(`use me via : node ${path.basename(__filename)} path/to/directory`)
    return process.exit(-1)
  }
  const workingPath = process.argv[2].replace('\\', '//')
  log.start()
    .then(() => check(workingPath))
    .catch(err => log.error(err))
    .then(() => log.end())
}

init()
