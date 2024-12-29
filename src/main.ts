/* eslint-disable jsdoc/require-jsdoc */
import arg from 'arg'
import { type LoggerOptions, blue, gray, parseJson } from 'shuutils'
import { check } from './check.ts'
import { type ProjectData, dataDefaults, dataFileName, templatePath } from './constants.ts'
import { log } from './logger.ts'
import { fileExists, join, readFileInFolder, resolve, writeFile } from './utils.ts'

const name = 'repo-check'

function getLogLevel(flags: Flags) {
  const logLevel = flags['--log-level']
  if (flags['--verbose'] !== undefined || flags['--debug'] !== undefined || logLevel === 'debug') return '1-debug' as const satisfies LoggerOptions['minimumLevel']
  if (flags['--warn'] !== undefined || logLevel === 'warn') return '5-warn' as const satisfies LoggerOptions['minimumLevel']
  if (flags['--error'] !== undefined || logLevel === 'error') return '7-error' as const satisfies LoggerOptions['minimumLevel']
  return '3-info' as const satisfies LoggerOptions['minimumLevel']
}

function getTarget(argument = '') {
  if (argument.length > 0) return resolve(argument)
  log.info('no target specified via : --target=path/to/directory')
  log.info('targeting current directory...')
  return process.cwd()
}

function showVersion() {
  log.info(`${name} version : __unique-mark__`)
  return { failed: [], passed: ['show-version'], warnings: [] }
}

function showHelp() {
  log.info(`usage : ${name} [options]
    options :
      --init        init a data file to enhance fix
      --force       force init or fix
      --target      target directory
      --fix         fix issues
      --fail-stop   stop process on first error
      --log-level   the log level to use, info by default, possible values : debug, info, warn, error
      --debug       or --verbose, equivalent to --log-level=debug
      --warn        equivalent to --log-level=warn
      --error       equivalent to --log-level=error
      -v --version  show version
      -h --help     show this help`)
  return { failed: [], passed: ['show-help'], warnings: [] }
}

const availableFlags = {
  '--debug': Boolean,
  '--error': Boolean,
  '--fail-stop': Boolean,
  '--fix': Boolean,
  '--force': Boolean,
  '--help': Boolean,
  '--init': Boolean,
  '--log-level': String,
  '--target': String,
  '--verbose': Boolean,
  '--version': Boolean,
  '--warn': Boolean,
  '-h': Boolean,
  '-v': Boolean,
}

type Flags = { readonly [Key in keyof typeof availableFlags]?: ReturnType<(typeof availableFlags)[Key]> }

export async function initDataFile(directoryPath = '', shouldForce = false) {
  const dataPath = join(directoryPath, dataFileName)
  const isPresent = await fileExists(dataPath)
  if (isPresent && !shouldForce) {
    log.warn('repo-checker data file', dataPath, 'already exists, use --force to overwrite it')
    return { failed: [], passed: [], warnings: ['data-file-already-exists'] }
  }
  const fileContent = await readFileInFolder(templatePath, dataFileName)
  void writeFile(dataPath, fileContent)
  log.info('repo-checker data file successfully init, you should edit :', dataPath)
  return { failed: [], passed: ['init-data-file'], warnings: [] }
}

export async function getData(directoryPath = '') {
  const dataPath = join(directoryPath, dataFileName)
  const isPresent = await fileExists(dataPath)
  if (!isPresent) {
    log.warn('you should use --init to prepare a data file to enhance fix')
    log.info('because no custom data file has been found, default data will be used')
    return dataDefaults
  }
  log.info('loading data from', dataPath)
  const { error, value } = parseJson<ProjectData>(await readFileInFolder(dataPath, ''))
  if (error) throw new Error(`error at getting data, target "${directoryPath}", dataPath "${dataPath}", error "${error}"`)
  return value
}

export const defaultOptions = {
  canFailStop: false,
  canFix: false,
  canForce: false,
  logLevel: getLogLevel({}),
  target: '.',
  willInit: false,
  willShowHelp: false,
  willShowVersion: false,
}

export function getFlags() {
  const sliceAfter = 2
  const flags = arg(availableFlags, { argv: process.argv.slice(sliceAfter) })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return flags as Flags
}

export function getOptions(flags: Flags) {
  return {
    canFailStop: flags['--fail-stop'] ?? defaultOptions.canFailStop,
    canFix: flags['--fix'] ?? defaultOptions.canFix,
    canForce: flags['--force'] ?? defaultOptions.canForce,
    logLevel: getLogLevel(flags),
    target: getTarget(flags['--target']),
    willInit: flags['--init'] ?? defaultOptions.willInit,
    willShowHelp: flags['--help'] ?? flags['-h'] ?? defaultOptions.willShowHelp,
    willShowVersion: flags['--version'] ?? flags['-v'] ?? defaultOptions.willShowVersion,
  }
}

export async function start(options: Readonly<ReturnType<typeof getOptions>> = defaultOptions) {
  const { canFailStop, canFix, canForce, logLevel, target, willInit, willShowHelp, willShowVersion } = options
  if (willShowVersion) return showVersion()
  if (willShowHelp) return showHelp()
  if (willInit) return initDataFile(target, canForce)
  /* c8 ignore next 4 */
  const data = await getData(target)
  log.options.minimumLevel = logLevel
  log.forceInfo([`${name} __unique-mark__ is starting`, canFix ? blue('fix active') : gray('fix inactive'), `log level is ${blue(logLevel.split('-')[1] ?? '')}`].join(', '))
  return check({ canFailStop, canFix, canForce, data, folderPath: target })
}
