import arg from 'arg'
import { parseJson } from 'shuutils'
import { version } from '../package.json'
import { check } from './check'
import type { ProjectData } from './constants'
import { dataDefaults, dataFileName, home, templatePath } from './constants'
import { log } from './logger'
import { fileExists, join, readFileInFolder, resolve, writeFile } from './utils'

async function initDataFile (doForce = false): Promise<void> {
  const exists = await fileExists(dataFileName)
  if (exists && !doForce) {
    log.warn('repo-checker data file', dataFileName, 'already exists, use --force to overwrite it')
    return
  }
  const fileContent = await readFileInFolder(templatePath, dataFileName)
  const filePath = join(home, dataFileName)
  void writeFile(filePath, fileContent)
  log.info('repo-checker data file successfully init, you should edit :', dataFileName)
}

async function getDataPath (target = ''): Promise<string> {
  const dataFileTargetPath = join(target, dataFileName)
  if (await fileExists(dataFileTargetPath)) return dataFileTargetPath
  log.warn('you should use --init to prepare a data file to enhance fix')
  log.info('because no custom data file has been found, default data will be used')
  return ''
}

async function getData (target = ''): Promise<ProjectData> {
  const dataPath = await getDataPath(target)
  if (dataPath.length === 0) return dataDefaults
  log.info('loading data from', dataPath)
  const { error, value } = parseJson<ProjectData>(await readFileInFolder(dataPath, ''))
  if (error) log.error('error while parsing data file', dataPath, error)
  return value
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
  const options = arg({ '--init': Boolean, '--force': Boolean, '--target': String, '--fix': Boolean, '--quiet': Boolean, '--no-report': Boolean, '--version': Boolean, '-v': Boolean }, { argv: process.argv.slice(2) })
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
  const data = await getData(target)
  data.quiet = data.quiet || quiet
  data.noReport = data.noReport || noReport
  log.start(doFix)
  await check(target, data, doFix, doForce)
}
