/* c8 ignore next 4 */
import path from 'path' // eslint-disable-line no-restricted-imports
import { Nb } from 'shuutils'

export const home = process.env.HOME ?? '' // when does HOME is not defined ?
/**
 * The name of the file that contains the configuration for repo-checker
 */
export const dataFileName = '.repo-checker.json'
// eslint-disable-next-line putout/putout
export const repoCheckerPath = path.join(__dirname, '..')
export const templatePath = path.join(repoCheckerPath, 'templates')

export class ProjectData {

  /**
   * Renovate auto-merge feature
   */
  public canAutoMergeDeps = true

  public shouldAvoidSass = true

  public isModule = false

  public license = 'GPL-3.0'

  public maxSizeKo = Nb.One

  /**
   * Tells repo-checker to generate a report for the given project
   */
  public willGenerateReport = true

  public isPublishedPackage = false

  public packageName = ''

  public isQuiet = false

  public repoId = 'a-great-repo'

  /**
   * C8 is a code coverage tool that is used to generate the coverage report based on the unit tests
   */
  public isUsingC8 = false

  public isUsingDependencyCruiser = false

  public isUsingEslint = false

  public isUsingNyc = false

  public userId = 'Shuunen'

  public userIdLowercase = 'shuunen'

  public userMail = 'romain.racamier@gmail.com'

  public userName = 'Romain Racamier-Lafon'

  public isUsingTailwind = false

  public isUsingTypescript = false

  public isUsingVue = false

  public isWebPublished = false

  public webUrl = 'https://my-website.com'

  public constructor (data: Partial<ProjectData> = {}) {
    Object.assign(this, data)
  }
}

export const dataDefaults = new ProjectData()
