#!/usr/bin/env node

const arg = require('arg')
const path = require('path')

const check = require('./check')
const log = require('./logger')
const { createFile, readFile, checkFileExists } = require('./utils')

const home = process.env.HOME
const dataFileName = '.repo-checker.js'
const dataFileHomePath = path.join(home, dataFileName)

async function initDataFile (doForce) {
  log.line()
  const fileExists = await checkFileExists(dataFileHomePath)
  if (fileExists && !doForce) {
    log.warn('repo-checker data file already init :', path.join(home, dataFileName))
    log.info('use --force to overwrite it')
    return
  }
  const fileContent = await readFile(path.join(__dirname, '..'), 'data.sample.js')
  const fileCreated = await createFile(home, dataFileName, fileContent)
  if (fileCreated) {
    log.info('repo-checker data file successfully init, you should edit :', path.join(home, dataFileName))
  } else {
    log.error('repo-checker failed at creating this file :', path.join(home, dataFileName))
  }
}

async function start () {
  const args = arg({ '--init': Boolean, '--force': Boolean, '--target': String, '--data': String, '--fix': Boolean }, { argv: process.argv.slice(2) })
  let target = args['--target']
  let dataPath = args['--data'] ? path.join(__dirname, '..', args['--data']) : dataFileHomePath
  const doFix = args['--fix']
  const doInit = args['--init']
  const doForce = args['--force']
  if (doInit) {
    return initDataFile(doForce).catch(err => log.error(err))
  }
  if (!target) {
    log.line()
    log.info(`no target specified via : --target=path/to/directory`)
    log.info(`targeting current directory...`)
    target = '.'
  }
  let data = {}
  if (doFix) {
    log.line()
    const fileExists = await checkFileExists(dataPath)
    if (fileExists) {
      log.info('loading data from', dataPath)
      data = require(dataPath)
    } else if (dataPath === dataFileHomePath) {
      log.warn('you should use --init to prepare a data file to enhance fix')
    } else {
      log.warn('cannot access data file at :', dataPath)
    }
  }
  log.start()
    .then(() => check(target, data, doFix, doForce))
    .catch(err => log.error(err))
    .then(() => log.end())
}

start()
