/* c8 ignore next 2 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const home = process.env.HOME ?? '' // when does HOME is not defined ?
/**
 * The name of the file that contains the configuration for repo-checker
 */
export const dataFileName = '.repo-checker.json'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

/**
 * The path to the repo-checker project folder
 */
export const repoCheckerPath = path.join(currentDirectory, '..')

/**
 * The path to the templates folder
 */
export const templatePath = path.join(repoCheckerPath, 'templates')

/**
 * The project data/configuration for repo-checker
 */
// eslint-disable-next-line no-restricted-syntax
export class ProjectData {
  /** Renovate auto-merge feature */
  public canAutoMergeDeps = true

  public hasMainBranch = false

  public hasTaskPrefix = false

  /** If the project is a cli, meant to be run in a terminal */
  public isCli = false

  /** If the project is has a "type": "module" in its package.json */
  public isModule = false

  /** If the project is being published via npm publish for example */
  public isPublishedPackage = false

  public isQuiet = false

  public isUsingC8 = false

  public isUsingDependencyCruiser = false

  public isUsingEslint = false

  public isUsingNyc = false

  public isUsingShuutils = false

  public isUsingTailwind = false

  public isUsingTypescript = false

  public isUsingV8 = false

  public isUsingVue = false

  public isWebPublished = false

  public license = 'GPL-3.0'

  public maxSizeKo = 1

  public packageName = ''

  public repoId = 'a-great-repo'

  public shouldAvoidSass = true

  public userId = 'Shuunen'

  public userIdLowercase = 'shuunen'

  public userMail = 'romain.racamier@gmail.com'

  public userName = 'Romain Racamier-Lafon'

  public webUrl = 'https://my-website.com'

  public willGenerateReport = true

  /**
   * Create a new project data
   * @param data the data to use
   */
  public constructor(data: Readonly<Partial<ProjectData>> = {}) {
    Object.assign(this, data)
  }
}

export const dataDefaults = new ProjectData()
