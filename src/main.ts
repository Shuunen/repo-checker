/* eslint-disable unicorn/no-process-exit */
import arg from 'arg'
import path from 'path'
import requireFromString from 'require-from-string'
import { version } from '../package.json'
import { check } from './check'
import { dataDefaults, dataFileHomePath, dataFileName, home, ProjectData, repoCheckerPath, templatePath } from './constants'
import { log } from './logger'
import { checkFileExists, createFile, readFileInFolder } from './utils'

async function initDataFile (doForce = false): Promise<void> {
  log.line()
  const fileExists = await checkFileExists(dataFileHomePath)
  if (fileExists && !doForce) {
    log.warn('repo-checker data file', dataFileHomePath, 'already exists, use --force to overwrite it')
    return
  }
  const fileContent = await readFileInFolder(templatePath, dataFileName)
  const fileCreated = await createFile(home, dataFileName, fileContent)
  if (fileCreated) {
    log.info('repo-checker data file successfully init, you should edit :', dataFileHomePath)
    return
  }
  log.error('repo-checker failed at creating this file :', dataFileHomePath)
}

async function getData (argument = '', target = ''): Promise<ProjectData> {
  const dataPath = await getDataPath(argument, target)
  if (dataPath.length === 0) return dataDefaults
  log.info('loading data from', dataPath)
  return requireFromString(await readFileInFolder(dataPath, ''))
}

async function getDataPath (argument = '', target = ''): Promise<string> {
  const fileExists = await checkFileExists(path.join(repoCheckerPath, argument))
  if (argument.length > 0 && fileExists) return path.join(repoCheckerPath, argument)
  const dataFileTargetPath = path.join(target, dataFileName)
  if (await checkFileExists(dataFileTargetPath)) return dataFileTargetPath
  if (await checkFileExists(dataFileHomePath)) return dataFileHomePath
  log.warn('you should use --init to prepare a data file to enhance fix')
  log.info('because no custom data file has been found, default data will be used')
  return ''
}

function getTarget (argument = ''): string {
  if (argument.length > 0) return path.resolve(argument)
  log.line()
  log.info('no target specified via : --target=path/to/directory')
  log.info('targeting current directory...')
  return process.cwd()
}

export async function start (): Promise<void> {
  const options = arg({ '--init': Boolean, '--force': Boolean, '--target': String, '--data': String, '--fix': Boolean, '--version': Boolean, '-v': Boolean }, { argv: process.argv.slice(2) })
  if ((options['--version'] ?? false) || (options['-v'] ?? false)) {
    console.log(version)
    process.exit(0)
  }
  const doForce = options['--force']
  if (options['--init'] ?? false) {
    await initDataFile(doForce).catch(error => log.error(error))
    return
  }
  const doFix = options['--fix']
  const target = getTarget(options['--target'])
  const data = await getData(options['--data'], target)
  log.start(doFix)
  await check(target, data, doFix, doForce)
}
