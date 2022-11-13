import arg from 'arg'
import requireFromString from 'require-from-string'
import { version } from '../package.json'
import { check } from './check'
import type { ProjectData } from './constants'
import { dataDefaults, dataFileHomePath, dataFileName, home, repoCheckerPath, templatePath } from './constants'
import { log } from './logger'
import { fileExists, join, readFileInFolder, resolve, writeFile } from './utils'

async function initDataFile (doForce = false): Promise<void> {
  log.line()
  const exists = await fileExists(dataFileHomePath)
  if (exists && !doForce) {
    log.warn('repo-checker data file', dataFileHomePath, 'already exists, use --force to overwrite it')
    return
  }
  const fileContent = await readFileInFolder(templatePath, dataFileName)
  const filePath = join(home, dataFileName)
  void writeFile(filePath, fileContent)
  log.info('repo-checker data file successfully init, you should edit :', dataFileHomePath)
}

async function getDataPath (argument = '', target = ''): Promise<string> {
  const exists = await fileExists(join(repoCheckerPath, argument))
  if (argument.length > 0 && exists) return join(repoCheckerPath, argument)
  const dataFileTargetPath = join(target, dataFileName)
  if (await fileExists(dataFileTargetPath)) return dataFileTargetPath
  if (await fileExists(dataFileHomePath)) return dataFileHomePath
  log.warn('you should use --init to prepare a data file to enhance fix')
  log.info('because no custom data file has been found, default data will be used')
  return ''
}

async function getData (argument = '', target = ''): Promise<ProjectData> {
  const dataPath = await getDataPath(argument, target)
  if (dataPath.length === 0) return dataDefaults
  log.info('loading data from', dataPath)
  return requireFromString(await readFileInFolder(dataPath, '')) as ProjectData
}

function getTarget (argument = ''): string {
  if (argument.length > 0) return resolve(argument)
  log.line()
  log.info('no target specified via : --target=path/to/directory')
  log.info('targeting current directory...')
  return process.cwd()
}

export async function start (): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const options = arg({ '--init': Boolean, '--force': Boolean, '--target': String, '--data': String, '--fix': Boolean, '--quiet': Boolean, '--no-report': Boolean, '--version': Boolean, '-v': Boolean }, { argv: process.argv.slice(2) })
  if ((options['--version'] ?? false) || (options['-v'] ?? false)) {
    console.log(version)
    process.exit(0)
  }
  const doForce = options['--force']
  if (options['--init'] ?? false) {
    await initDataFile(doForce).catch(error => log.unknownError(error))
    return
  }
  const doFix = options['--fix']
  const quiet = options['--quiet'] ?? false
  const noReport = options['--no-report'] ?? false
  log.consoleLog = !quiet
  log.fileLog = !noReport
  const target = getTarget(options['--target'])
  const data = await getData(options['--data'], target)
  data.quiet = data.quiet || quiet
  data.noReport = data.noReport || noReport
  log.start(doFix)
  await check(target, data, doFix, doForce)
}
