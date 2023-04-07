import arg from 'arg'
import { LogLevel, Nb, parseJson } from 'shuutils'
import { name } from '../package.json'
import { check } from './check'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { dataDefaults, dataFileName, home, ProjectData, templatePath } from './constants'
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
  process.exit(Nb.Zero)
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
  log.info('no target specified via : --target=path/to/directory')
  log.info('targeting current directory...')
  return process.cwd()
}

function showVersion (): void {
  log.info(`${name} version : __unique-mark__`)
  process.exit(Nb.Zero)
}

function parseOptions (): { willShowVersion: boolean; willInit: boolean; willForce: boolean; target: string; willFix: boolean; isQuiet: boolean; isVerbose: boolean } {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const input = arg({ '--init': Boolean, '--force': Boolean, '--target': String, '--fix': Boolean, '--quiet': Boolean, '--version': Boolean, '-v': Boolean, '--verbose': Boolean }, { argv: process.argv.slice(Nb.Two) })
  const options = {
    willShowVersion: (input['--version'] ?? false) || (input['-v'] ?? false),
    willInit: input['--init'] ?? false,
    willForce: input['--force'] ?? false,
    target: '',
    willFix: input['--fix'] ?? false,
    isQuiet: input['--quiet'] ?? false,
    isVerbose: input['--verbose'] ?? false,
  }
  if (options.willShowVersion) showVersion()
  options.target = getTarget(input['--target'])
  return options
}

export async function start (): Promise<void> {
  const { willInit, willForce, target, willFix, isQuiet, isVerbose } = parseOptions()
  if (willInit) void initDataFile()
  const data = await getData(target)
  log.options.isActive = !isQuiet
  log.options.minimumLevel = isVerbose ? LogLevel.Debug : LogLevel.Info
  log.info(`${String(name)} __unique-mark__ is starting ${willFix ? '(fix enabled)' : ''}`)
  await check({ folderPath: target, data, canFix: willFix, canForce: willForce })
}

