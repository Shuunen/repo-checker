import { ProjectData } from './constants'
import { ConfigsFile, EditorConfigFile, EsLintFile, GithubWorkflowFile, LicenseFile, NvmrcFile, PackageJsonFile, ReadmeFile, RenovateFile, RepoCheckerConfigFile, TravisFile, TsConfigFile } from './files'
import { log } from './logger'
import { augmentData, getGitFolders } from './utils'

const Checkers = [ConfigsFile, EditorConfigFile, EsLintFile, GithubWorkflowFile, LicenseFile, NvmrcFile, PackageJsonFile, ReadmeFile, RenovateFile, RepoCheckerConfigFile, TravisFile, TsConfigFile]

export function report (nbPassed = 0, nbFailed = 0): void {
  log.info('Report :')
  log.setIndentLevel(1)
  log.test(nbPassed > 0, `${nbPassed} test(s) passed successfully`, false, true)
  log.test(nbFailed === 0, `${nbFailed} test(s) failed`, false, true)
  log.line()
  log.setIndentLevel(0)
  if (nbFailed > 0) throw new Error('failed at validating at least one rule in one folder')
}

export async function check (folderPath: string, data: ProjectData, doFix = false, doForce = false): Promise<{ nbPassed: number; nbFailed: number }> {
  const folders = await getGitFolders(folderPath)
  let nbPassed = 0
  let nbFailed = 0
  log.noConsole = data.quiet
  /* eslint-disable no-await-in-loop */
  for (const folder of folders) {
    log.info('Checking folder :', folder)
    log.setIndentLevel(1)
    const dataFolder = await augmentData(folder, data, folders.length > 1)
    for (const Checker of Checkers) {
      const instance = new Checker(folder, dataFolder, doFix, doForce)
      await instance.start()
      await instance.end()
      nbPassed += instance.nbPassed
      nbFailed += instance.nbFailed
    }
    log.line()
    log.setIndentLevel(0)
  }
  /* eslint-enable no-await-in-loop */
  report(nbPassed, nbFailed)
  return { nbPassed, nbFailed }
}
