/* c8 ignore next */
import { ellipsis, green, Nb, red, yellow } from 'shuutils'
import type { ProjectData } from './constants'
import { DependencyCruiserFile, EditorConfigFile, EsLintFile, GitFile, GithubWorkflowFile, LicenseFile, NvmrcFile, NycRcFile, PackageJsonFile, ReadmeFile, RenovateFile, RepoCheckerConfigFile, TailwindFile, TravisFile, TsConfigFile } from './files/index.js'
import { log } from './logger'
import { augmentData, getProjectFolders } from './utils'
import { NpmRcFile } from './files/npmrc.file'

interface Indicators { passed: string[]; warnings: string[]; failed: string[] }

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
  log.info(count === Nb.None ? line : color(line))
}

interface CheckOptions {
  folderPath: string
  data: ProjectData
  canFix?: boolean
  canForce?: boolean
  canThrow?: boolean
}

export function report ({ passed = [], warnings = [], failed = [] }: Indicators): void {
  log.info('Report :')
  reportLog(green, passed.length, 'are successful')
  reportLog(yellow, warnings.length, 'triggered warnings')
  reportLog(red, failed.length, 'are problematic')
  /* c8 ignore next */
}

// eslint-disable-next-line max-statements
export async function check ({ folderPath, data, canFix = false, canForce = false, canThrow = true }: CheckOptions): Promise<Indicators> {
  const folders = await getProjectFolders(folderPath)
  let passed: string[] = []
  let warnings: string[] = []
  let failed: string[] = []
  log.options.isActive = !data.isQuiet
  /* c8 ignore next */
  if (folders.length === Nb.Zero) log.warn('no folder to check', folderPath)
  /* eslint-disable no-await-in-loop */
  for (const folder of folders) {
    log.info('Checking folder :', folder)
    const dataFolder = await augmentData(folder, data, folders.length > Nb.One)
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
  report({ passed, warnings, failed })
  if (canThrow && failed.length > Nb.None) throw new Error(`failed at validating at least one rule in one folder : ${ellipsis(failed.join(', '), Nb.Hundred)}`)
  return { passed, warnings, failed }
}
