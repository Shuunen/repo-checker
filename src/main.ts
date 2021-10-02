/* eslint-disable unicorn/no-process-exit */
import arg from 'arg'
import { existsSync, writeFileSync } from 'fs'
import requireFromString from 'require-from-string'
import { version } from '../package.json'
import { check } from './check'
import { dataDefaults, dataFileHomePath, dataFileName, home, ProjectData, repoCheckerPath, templatePath } from './constants'
import { log } from './logger'
import { join, readFileInFolder, resolve } from './utils'

async function initDataFile (doForce = false): Promise<void> {
  log.line()
  const fileExists = existsSync(dataFileHomePath)
  if (fileExists && !doForce) {
    log.warn('repo-checker data file', dataFileHomePath, 'already exists, use --force to overwrite it')
    return
  }
  const fileContent = await readFileInFolder(templatePath, dataFileName)
  const filePath = join(home, dataFileName)
  writeFileSync(filePath, fileContent)
  if (existsSync(filePath)) log.info('repo-checker data file successfully init, you should edit :', dataFileHomePath)
  else log.error('repo-checker failed at creating this file :', dataFileHomePath)
}

async function getData (argument = '', target = ''): Promise<ProjectData> {
  const dataPath = await getDataPath(argument, target)
  if (dataPath.length === 0) return dataDefaults
  log.info('loading data from', dataPath)
  return requireFromString(await readFileInFolder(dataPath, ''))
}

async function getDataPath (argument = '', target = ''): Promise<string> {
  const fileExists = existsSync(join(repoCheckerPath, argument))
  if (argument.length > 0 && fileExists) return join(repoCheckerPath, argument)
  const dataFileTargetPath = join(target, dataFileName)
  if (existsSync(dataFileTargetPath)) return dataFileTargetPath
  if (existsSync(dataFileHomePath)) return dataFileHomePath
  log.warn('you should use --init to prepare a data file to enhance fix')
  log.info('because no custom data file has been found, default data will be used')
  return ''
}

function getTarget (argument = ''): string {
  if (argument.length > 0) return resolve(argument)
  log.line()
  log.info('no target specified via : --target=path/to/directory')
  log.info('targeting current directory...')
  return process.cwd()
}

export async function start (): Promise<void> {
  const options = arg({ '--init': Boolean, '--force': Boolean, '--target': String, '--data': String, '--fix': Boolean, '--quiet': Boolean, '--version': Boolean, '-v': Boolean }, { argv: process.argv.slice(2) })
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
  const quiet = options['--quiet'] ?? false
  log.noConsole = quiet
  const target = getTarget(options['--target'])
  const data = await getData(options['--data'], target)
  data.quiet = data.quiet || quiet
  log.start(doFix)
  await check(target, data, doFix, doForce)
}
