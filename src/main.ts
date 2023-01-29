import arg from 'arg'
import { Nb, parseJson } from 'shuutils'
import { version } from '../package.json'  
import { check } from './check'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { dataDefaults, dataFileName, home, templatePath, ProjectData } from './constants'
import { log } from './logger'
import { fileExists, join, readFileInFolder, resolve, writeFile } from './utils'

async function initDataFile (shouldForce = false): Promise<void> {
  const isPresent = await fileExists(dataFileName)
  if (isPresent && !shouldForce) {
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
  if (dataPath.length === Nb.Zero) return dataDefaults
  log.info('loading data from', dataPath)
  const { error, value } = parseJson<ProjectData>(await readFileInFolder(dataPath, ''))
  if (error) log.error('error while parsing data file', dataPath, error)
  return value
}

function getTarget (argument = ''): string {
  if (argument.length > Nb.Zero) return resolve(argument)
  log.line()
  log.info('no target specified via : --target=path/to/directory')
  log.info('targeting current directory...')
  return process.cwd()
}

// eslint-disable-next-line max-statements, complexity
export async function start (): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const options = arg({ '--init': Boolean, '--force': Boolean, '--target': String, '--fix': Boolean, '--quiet': Boolean, '--no-report': Boolean, '--version': Boolean, '-v': Boolean }, { argv: process.argv.slice(Nb.Two) })
  if ((options['--version'] ?? false) || (options['-v'] ?? false)) {
    // eslint-disable-next-line no-console
    console.log(version)
    process.exit(Nb.Zero)
  }
  const shouldForce = options['--force']
  if (options['--init'] ?? false) {
    await initDataFile(shouldForce) // .catch(error => log.unknownError(error))
    return
  }
  const willFix = options['--fix']
  const isQuiet = options['--quiet'] ?? false
  const isReportDisabled = options['--no-report'] ?? false
  log.canConsoleLog = !isQuiet
  log.willLogToFile = !isReportDisabled
  const target = getTarget(options['--target'])
  const data = await getData(target)
  data.isQuiet = data.isQuiet || isQuiet
  if (isReportDisabled) data.willGenerateReport = false
  log.start(willFix)
  await check(target, data, willFix, shouldForce)
}

