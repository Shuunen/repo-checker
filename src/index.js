
const arg = require('arg')
const path = require('path')

const check = require('./check')
const log = require('./logger')

function init () {
  const args = arg({ '--target': String, '--data': String, '--fix': Boolean }, { argv: process.argv.slice(2) })
  const target = args['--target']
  const doFix = args['--fix']
  if (!target) {
    log.info(`please specify a target with : --target=path/to/directory`)
    return process.exit(-1)
  }
  let data = {}
  if (args['--data']) {
    const p = path.join(__dirname, '..', args['--data'])
    log.info('loading data from', p, '\n')
    data = require(p)
  } else if (doFix) {
    log.info('you should provide data to enhance fix\n')
  }
  log.start()
    .then(() => check(target, data, doFix))
    .catch(err => log.error(err))
    .then(() => log.end())
}

init()
