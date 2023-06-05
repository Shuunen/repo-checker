import arg from 'arg'
import { LogLevel, parseJson } from 'shuutils'
import { name } from '../package.json'
import { check } from './check'
import { ProjectData, dataDefaults, dataFileName, home, templatePath } from './constants' // eslint-disable-line @typescript-eslint/consistent-type-imports
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
  process.exit(0)
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
  log.info('no target specified via : --target=path/to/directory')
  log.info('targeting current directory...')
  return process.cwd()
}

function showVersion (): void {
  log.info(`${name} version : __unique-mark__`)
  process.exit(0)
}

function showHelp () {
  log.info(`usage : ${name} [options]
    options :
      --init        init a data file to enhance fix
      --force       force init or fix
      --target      target directory
      --fix         fix issues
      --fail-stop   stop process on first error
      --quiet       quiet mode
      --verbose     verbose mode
      -v --version  show version
      -h --help     show help`)
  process.exit(0)
}

function parseInputs () {
  const sliceAfter = 2
  const inputs = arg({ '--init': Boolean, '--fail-stop': Boolean, '--force': Boolean, '--target': String, '--fix': Boolean, '--quiet': Boolean, '--version': Boolean, '-v': Boolean, '--verbose': Boolean, '--help': Boolean, '-h': Boolean }, { argv: process.argv.slice(sliceAfter) })
  if (inputs['--version'] ?? inputs['-v'] ?? false) showVersion()
  if (inputs['--help'] ?? inputs['-h'] ?? false) showHelp()
  return inputs
}

// eslint-disable-next-line complexity
function parseOptions () {
  const inputs = parseInputs()
  return {
    canFailStop: inputs['--fail-stop'] ?? false,
    canFix: inputs['--fix'] ?? false,
    canForce: inputs['--force'] ?? false,
    isQuiet: inputs['--quiet'] ?? false,
    isVerbose: inputs['--verbose'] ?? false,
    target: getTarget(inputs['--target']),
    willInit: inputs['--init'] ?? false,
    willShowHelp: inputs['--help'] ?? inputs['-h'] ?? false,
    willShowVersion: inputs['--version'] ?? inputs['-v'] ?? false,
  }
}

export async function start (): Promise<void> {
  const { willInit, canForce, target, canFix, isQuiet, isVerbose, canFailStop } = parseOptions()
  if (willInit) void initDataFile()
  const data = await getData(target)
  log.options.isActive = !isQuiet
  log.options.minimumLevel = isVerbose ? LogLevel.Debug : LogLevel.Info
  log.info(`${String(name)} __unique-mark__ is starting ${canFix ? '(fix enabled)' : ''}`)
  await check({ folderPath: target, data, canFix, canForce, canFailStop })
}
