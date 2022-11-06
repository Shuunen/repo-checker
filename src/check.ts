import type { ProjectData } from './constants'
import { ConfigsFile, EditorConfigFile, EsLintFile, GithubWorkflowFile, LicenseFile, NvmrcFile, NycRcFile, PackageJsonFile, ReadmeFile, RenovateFile, RepoCheckerConfigFile, TravisFile, TsConfigFile } from './files'
import { log } from './logger'
import { augmentData, getGitFolders } from './utils'

const CHECKERS = [ConfigsFile, EditorConfigFile, EsLintFile, GithubWorkflowFile, LicenseFile, NvmrcFile, NycRcFile, PackageJsonFile, ReadmeFile, RenovateFile, RepoCheckerConfigFile, TravisFile, TsConfigFile]

export function report (passed = 0, failed = 0): void {
  log.info('Report :')
  log.setIndentLevel(1)
  log.test(passed > 0, `${passed} test(s) passed successfully`, false, true)
  log.test(failed === 0, `${failed} test(s) failed`, false, true)
  log.line()
  log.setIndentLevel(0)
  if (failed > 0) throw new Error('failed at validating at least one rule in one folder')
}

export async function check (folderPath: string, data: ProjectData, doFix = false, doForce = false): Promise<{ passed: string[]; failed: string[] }> {
  const folders = await getGitFolders(folderPath)
  let passed: string[] = []
  let failed: string[] = []
  log.consoleLog = !data.quiet
  log.fileLog = !data.noReport
  /* eslint-disable no-await-in-loop */
  for (const folder of folders) {
    log.info('Checking folder :', folder)
    log.setIndentLevel(1)
    const dataFolder = await augmentData(folder, data, folders.length > 1)
    for (const checker of CHECKERS) {
      const instance = new checker(folder, dataFolder, doFix, doForce)
      await instance.start()
      await instance.end()
      passed = [...passed, ...instance.passed]
      failed = [...failed, ...instance.failed]
    }
    log.line()
    log.setIndentLevel(0)
  }
  /* eslint-enable no-await-in-loop */
  report(passed.length, failed.length)
  return { passed, failed }
}
