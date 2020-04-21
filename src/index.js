import arg from 'arg'
import { join, resolve } from 'path'
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
async function getData (arg, target) {
  const dataPath = await getDataPath(arg, target)
  if (!dataPath) return dataDefaults
  log.info('loading data from', dataPath)
  return requireFromString(await readFileInFolder(dataPath, ''))
}
async function getDataPath (arg = '', target) {
  if (arg && await checkFileExists(join(__dirname, '..', arg))) return join(__dirname, '..', arg)
  const dataFileTargetPath = join(target, dataFileName)
  if (await checkFileExists(dataFileTargetPath)) return dataFileTargetPath
  if (await checkFileExists(dataFileHomePath)) return dataFileHomePath
  log.warn('you should use --init to prepare a data file to enhance fix')
  log.info('because no custom data file has been found, default data will be used')
  return false
}

function getTarget (arg) {
  if (arg) return resolve(arg)
  log.line()
  log.info('no target specified via : --target=path/to/directory')
  log.info('targeting current directory...')
  return process.cwd()
}

async function start () {
  const args = arg({ '--init': Boolean, '--force': Boolean, '--target': String, '--data': String, '--fix': Boolean, '--version': Boolean, '-v': Boolean }, { argv: process.argv.slice(2) })
  // eslint-disable-next-line no-console
  if (args['--version'] || args['-v']) return (console.log(version) && process.exit(0))
  const doForce = args['--force']
  if (args['--init']) return initDataFile(doForce).catch(err => log.error(err))
  const doFix = args['--fix']
  const target = getTarget(args['--target'])
  const data = await getData(args['--data'], target)
  log.start(doFix)
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
