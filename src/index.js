
const arg = require('arg')

const check = require('./check')
const log = require('./logger')

function init () {
  const args = arg({ '--target': String, '--fix': Boolean }, { argv: process.argv.slice(2) })
  const target = args['--target']
  const doFix = args['--fix']
  if (!target) {
    log.info(`please specify a target with : --target=path/to/directory`)
    return process.exit(-1)
  }
  log.start()
    .then(() => check(target, doFix))
    .catch(err => log.error(err))
    .then(() => log.end())
}

init()
