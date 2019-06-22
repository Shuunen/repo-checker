#!/usr/bin/env node

const arg = require('arg')
const path = require('path')

const check = require('./check')
const log = require('./logger')

function init () {
  const args = arg({ '--target': String, '--data': String, '--fix': Boolean }, { argv: process.argv.slice(2) })
  let target = args['--target']
  const doFix = args['--fix']
  if (!target) {
    log.info('\n', `no target specified via : --target=path/to/directory`)
    log.info(`targeting current directory...`, '\n')
    target = '.'
  }
  let data = {}
  if (args['--data']) {
    const p = path.join(__dirname, '..', args['--data'])
    log.info('loading data from', p)
    data = require(p)
  } else if (doFix) {
    log.warn('you should provide data to enhance fix')
  }
  log.start()
    .then(() => check(target, data, doFix))
    .catch(err => log.error(err))
    .then(() => log.end())
}

init()
