/* c8 ignore next */
import { ellipsis, green, red, yellow } from 'shuutils'
import type { ProjectData } from './constants.ts'
import { DependencyCruiserFile } from './files/dependency-cruiser.ts'
import { EditorConfigFile } from './files/editor-config.ts'
import { EsLintFile } from './files/eslint.file.ts'
import { GithubWorkflowFile } from './files/gh-workflow.ts'
import { GitFile } from './files/git.ts'
import { LicenseFile } from './files/license.ts'
import { NpmRcFile } from './files/npmrc.file.ts'
import { NvmrcFile } from './files/nvmrc.ts'
import { NycRcFile } from './files/nycrc.ts'
import { PackageJsonFile } from './files/package.file.ts'
import { ReadmeFile } from './files/readme.ts'
import { RenovateFile } from './files/renovate.ts'
import { RepoCheckerConfigFile } from './files/repo-checker.ts'
import { TailwindFile } from './files/tailwind.ts'
import { TravisFile } from './files/travis.ts'
import { TsConfigFile } from './files/ts-config.ts'
import { log } from './logger.ts'
import { augmentData, getProjectFolders } from './utils.ts'

interface Indicators {
  failed: readonly string[]
  passed: readonly string[]
  warnings: readonly string[]
}

const checkers = [DependencyCruiserFile, EditorConfigFile, EsLintFile, GitFile, GithubWorkflowFile, LicenseFile, NpmRcFile, NvmrcFile, NycRcFile, PackageJsonFile, ReadmeFile, RenovateFile, RepoCheckerConfigFile, TailwindFile, TravisFile, TsConfigFile]

/**
 * Report a log
 * @param color the color to use
 * @param count the count of the message
 * @param message the message to report
 */
function reportLog(color: (string: string) => string, count: number, message: string) {
  const line = `‣ ${count} check${count > 1 ? 's' : ''} ${message}`
  /* c8 ignore next */
  log.info(count === 0 ? line : color(line))
}

interface CheckOptions {
  canFailStop?: boolean
  canFix?: boolean
  canForce?: boolean
  canThrow?: boolean
  data: Readonly<ProjectData>
  folderPath: string
}

/**
 * Report the results of the checks
 * @param options the options to report
 * @param options.failed the failed checks
 * @param options.passed the passed checks
 * @param options.warnings the warnings checks
 */
function report({ failed = [], passed = [], warnings = [] }: Readonly<Indicators>) {
  log.info('Report :')
  reportLog(green, passed.length, 'are successful')
  reportLog(yellow, warnings.length, 'triggered warnings')
  reportLog(red, failed.length, 'are problematic')
  /* c8 ignore next */
}

/**
 * Check the project
 * @param options the options
 * @param options.canFailStop true if the check should stop at the first failure
 * @param options.canFix true if the check can fix the issues
 * @param options.canForce true if the check can force the fix
 * @param options.canThrow true if the check should throw an error
 * @param options.data the project data
 * @param options.folderPath the folder path to check
 * @returns the indicators of the check
 */
// eslint-disable-next-line max-statements, complexity
export async function check({ canFailStop = false, canFix = false, canForce = false, canThrow = true, data, folderPath }: Readonly<CheckOptions>) {
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
    log.forceInfo('Checking folder :', folder)
    const dataFolder = await augmentData(folder, data, folders.length > 1)
    // eslint-disable-next-line @typescript-eslint/naming-convention
    for (const Checker of checkers) {
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
