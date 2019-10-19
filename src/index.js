#!/usr/bin/env node

const arg = require('arg')
const path = require('path')

const check = require('./check')
const log = require('./logger')
const { createFile, readFile, checkFileExists } = require('./utils')
const { dataFileName, home, dataFileHomePath, repoCheckerPath, defaultDataFileName, defaultDataFilePath } = require('./constants')

async function initDataFile (doForce) {
  log.line()
  const fileExists = await checkFileExists(dataFileHomePath)
  if (fileExists && !doForce) {
    log.warn('repo-checker data file already init :', dataFileHomePath)
    log.info('use --force to overwrite it')
    return
  }
  const fileContent = await readFile(repoCheckerPath, defaultDataFileName)
  const fileCreated = await createFile(home, dataFileName, fileContent)
  if (fileCreated) {
    log.info('repo-checker data file successfully init, you should edit :', dataFileHomePath)
  } else {
    log.error('repo-checker failed at creating this file :', dataFileHomePath)
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
    log.info('no target specified via : --target=path/to/directory')
    log.info('targeting current directory...')
    target = process.cwd()
  } else {
    target = path.resolve(target)
  }
  let data = {}
  log.line()
  let fileExists = await checkFileExists(dataPath)
  if (!fileExists) {
    log.warn('you should use --init to prepare a data file to enhance fix\n')
    dataPath = defaultDataFilePath
    fileExists = await checkFileExists(dataPath)
  }
  if (fileExists) {
    log.info('loading data from', dataPath)
    data = require(dataPath)
  } else {
    log.warn('cannot access data file at :', dataPath)
  }
  log.start()
    .then(() => check(target, data, doFix, doForce))
    .catch(err => {
      log.error(err)
      log.line()
      log.end()
      process.exit(1)
    })
    .then(() => {
      log.end()
      process.exit(0)
    })
}

start()
