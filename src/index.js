/* eslint-disable unicorn/no-process-exit */
import arg from 'arg'
import path from 'path'
import requireFromString from 'require-from-string'
import { version } from '../package.json'
import { check } from './check'
import { dataDefaults, dataFileHomePath, dataFileName, home, templatePath } from './constants'
import { log } from './logger'
import { checkFileExists, createFile, readFileInFolder } from './utils'

async function initDataFile (doForce) {
  log.line()
  const fileExists = await checkFileExists(dataFileHomePath)
  if (fileExists && !doForce) return log.warn('repo-checker data file', dataFileHomePath, 'already exists, use --force to overwrite it')
  const fileContent = await readFileInFolder(templatePath, dataFileName)
  const fileCreated = await createFile(home, dataFileName, fileContent)
  if (fileCreated) return log.info('repo-checker data file successfully init, you should edit :', dataFileHomePath)
  log.error('repo-checker failed at creating this file :', dataFileHomePath)
}
async function getData (argument, target) {
  const dataPath = await getDataPath(argument, target)
  if (!dataPath) return dataDefaults
  log.info('loading data from', dataPath)
  return requireFromString(await readFileInFolder(dataPath, ''))
}
async function getDataPath (argument, target) {
  if (argument && await checkFileExists(path.join(__dirname, '..', argument))) return path.join(__dirname, '..', argument)
  const dataFileTargetPath = path.join(target, dataFileName)
  if (await checkFileExists(dataFileTargetPath)) return dataFileTargetPath
  if (await checkFileExists(dataFileHomePath)) return dataFileHomePath
  log.warn('you should use --init to prepare a data file to enhance fix')
  log.info('because no custom data file has been found, default data will be used')
  return false
}

function getTarget (argument) {
  if (argument) return path.resolve(argument)
  log.line()
  log.info('no target specified via : --target=path/to/directory')
  log.info('targeting current directory...')
  return process.cwd()
}

async function start () {
  const options = arg({ '--init': Boolean, '--force': Boolean, '--target': String, '--data': String, '--fix': Boolean, '--version': Boolean, '-v': Boolean }, { argv: process.argv.slice(2) })
  // eslint-disable-next-line no-console
  if (options['--version'] || options['-v']) return (console.log(version) && process.exit(0))
  const doForce = options['--force']
  if (options['--init']) return initDataFile(doForce).catch(error => log.error(error))
  const doFix = options['--fix']
  const target = getTarget(options['--target'])
  const data = await getData(options['--data'], target)
  log.start(doFix)
    .then(() => check(target, data, doFix, doForce))
    .catch(error => {
      log.error(error)
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
