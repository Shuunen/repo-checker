/* c8 ignore next 3 */
import path from 'path'

export const home = process.env['HOME'] ?? '' // when does HOME is not defined ?
/**
 * The name of the file that contains the configuration for repo-checker
 */
export const dataFileName = 'repo-checker.config.js'
export const repoCheckerPath = path.join(__dirname, '..')
export const templatePath = path.join(repoCheckerPath, 'templates')
export const dataFileHomePath = path.join(home, dataFileName)

export class ProjectData {

  public autoMerge = true

  public banSass = true

  public devDepsOnly = true

  public isModule = false

  public license = 'GPL-3.0'

  public maxSizeKo = 1

  public npmPackage = false

  public packageName = ''

  public quiet = false

  /**
   * Tells repo-checker to generate a report for the given project
   */
  public noReport = false

  public repoId = 'a-great-repo'

  public useTailwind = false

  public useNyc = false

  public useC8 = false

  public useEslint = false

  public useTypescript = false

  public useVue = false

  public userId = 'Shuunen'

  public userIdLowercase = 'shuunen'

  public userMail = 'romain.racamier@gmail.com'

  public userName = 'Romain Racamier-Lafon'

  public webPublished = false

  public webUrl = 'https://my-website.com'

  public constructor (data: Partial<ProjectData> = {}) {
    Object.assign(this, data)
  }
}

export const dataDefaults = new ProjectData()
