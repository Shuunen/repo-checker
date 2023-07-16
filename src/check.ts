/* c8 ignore next */
import { ellipsis, green, red, yellow } from 'shuutils'
import type { ProjectData } from './constants'
import { DependencyCruiserFile, EditorConfigFile, EsLintFile, GitFile, GithubWorkflowFile, LicenseFile, NpmRcFile, NvmrcFile, NycRcFile, PackageJsonFile, ReadmeFile, RenovateFile, RepoCheckerConfigFile, TailwindFile, TravisFile, TsConfigFile } from './files/index.js'
import { log } from './logger'
import { augmentData, getProjectFolders } from './utils'

interface Indicators { failed: string[]; passed: string[]; warnings: string[] }

const checkers = [
  DependencyCruiserFile,
  EditorConfigFile,
  EsLintFile,
  GitFile,
  GithubWorkflowFile,
  LicenseFile,
  NpmRcFile,
  NvmrcFile,
  NycRcFile,
  PackageJsonFile,
  ReadmeFile,
  RenovateFile,
  RepoCheckerConfigFile,
  TailwindFile,
  TravisFile,
  TsConfigFile,
]

function reportLog (color: (string: string) => string, count: number, message: string): void {
  const line = `‣ ${count} check${count > 1 ? 's' : ''} ${message}`
  /* c8 ignore next */
  log.info(count === 0 ? line : color(line))
}

interface CheckOptions {
  canFailStop?: boolean
  canFix?: boolean
  canForce?: boolean
  canThrow?: boolean
  data: ProjectData
  folderPath: string
}

function report ({ failed = [], passed = [], warnings = [] }: Indicators): void {
  log.info('Report :')
  reportLog(green, passed.length, 'are successful')
  reportLog(yellow, warnings.length, 'triggered warnings')
  reportLog(red, failed.length, 'are problematic')
  /* c8 ignore next */
}

// eslint-disable-next-line max-statements
export async function check ({ canFailStop = false, canFix = false, canForce = false, canThrow = true, data, folderPath }: CheckOptions): Promise<Indicators> {
  const folders = await getProjectFolders(folderPath)
  let passed: string[] = []
  let warnings: string[] = []
  let failed: string[] = []
  log.options.isActive = !data.isQuiet
  /* c8 ignore next */
  if (folders.length === 0) log.warn('no folder to check', folderPath)
  /* eslint-disable no-await-in-loop */
  for (const folder of folders) {
    if (canFailStop && failed.length > 0) {
      log.warn('stop checking other folders because of failures & --fail-stop option')
      break
    }
    log.info('Checking folder :', folder)
    const dataFolder = await augmentData(folder, data, folders.length > 1)
    for (const Checker of checkers) { // eslint-disable-line @typescript-eslint/naming-convention
      const instance = new Checker(folder, dataFolder, canFix, canForce)
      await instance.start()
      await instance.end()
      passed = [...passed, ...instance.passed]
      warnings = [...warnings, ...instance.warnings]
      failed = [...failed, ...instance.failed]
    }
  }
  /* eslint-enable no-await-in-loop */
  report({ failed, passed, warnings })
  const maxLogLength = 100
  if (canThrow && failed.length > 0) throw new Error(`failed at validating at least one rule in one folder : ${ellipsis(failed.join(', '), maxLogLength)}`)
  return { failed, passed, warnings }
}
