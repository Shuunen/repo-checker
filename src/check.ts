import { ellipsis, LogLevel, Nb } from 'shuutils'
import type { ProjectData } from './constants'
import { DependencyCruiserFile, EditorConfigFile, EsLintFile, GitFile, GithubWorkflowFile, LicenseFile, NvmrcFile, NycRcFile, PackageJsonFile, ReadmeFile, RenovateFile, RepoCheckerConfigFile, TailwindFile, TravisFile, TsConfigFile } from './files/index.js'
import { log } from './logger'
import { augmentData, getGitFolders } from './utils'

const checkers = [
  DependencyCruiserFile,
  EditorConfigFile,
  EsLintFile,
  GitFile,
  GithubWorkflowFile,
  LicenseFile,
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

export function report (passed: string[] = [], failed: string[] = []): void {
  const nbPassed = passed.length
  const nbFailed = failed.length
  const initialLevel = log.options.minimumLevel
  log.options.minimumLevel = LogLevel.Test
  log.info('Report :')
  log.test(nbPassed > Nb.None, `${nbPassed.toString().padStart(Nb.Three)} test${nbPassed > 1 ? 's' : ''} passed successfully`)
  /* c8 ignore next */
  log.test(nbFailed === Nb.None, `${nbFailed.toString().padStart(Nb.Three)} test${nbFailed > 1 ? 's' : ''} failed`)
  log.options.minimumLevel = initialLevel
  if (nbFailed > Nb.None) throw new Error(`failed at validating at least one rule in one folder : ${ellipsis(failed.join(', '), Nb.Hundred)}`)
}

// eslint-disable-next-line max-params, max-statements
export async function check (folderPath: string, data: ProjectData, canFix = false, canForce = false): Promise<{ passed: string[]; failed: string[] }> {
  const folders = await getGitFolders(folderPath)
  let passed: string[] = []
  let failed: string[] = []
  log.options.isActive = !data.isQuiet
  /* eslint-disable no-await-in-loop */
  for (const folder of folders) {
    log.info('Checking folder :', folder)
    const dataFolder = await augmentData(folder, data, folders.length > Nb.One)
    for (const Checker of checkers) { // eslint-disable-line @typescript-eslint/naming-convention
      const instance = new Checker(folder, dataFolder, canFix, canForce)
      await instance.start()
      await instance.end()
      passed = [...passed, ...instance.passed]
      failed = [...failed, ...instance.failed]
    }
  }
  /* eslint-enable no-await-in-loop */
  report(passed, failed)
  return { passed, failed }
}
