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
  auto_merge = true
  ban_sass = true
  dev_deps_only = true
  is_module = false
  license = 'GPL-3.0'
  max_size_ko = 1
  npm_package = false
  package_name = ''
  quiet = false
  /**
   * Tells repo-checker to generate a report for the given project
   */
  noReport = false
  repo_id = 'a-great-repo'
  useTailwind = false
  useNyc = false
  useC8 = false
  use_typescript = false
  use_vue = false
  user_id = 'Shuunen'
  user_id_lowercase = 'shuunen'
  user_mail = 'romain.racamier@gmail.com'
  user_name = 'Romain Racamier-Lafon'
  web_published = false
  web_url = 'https://my-website.com'

  constructor (data: Partial<ProjectData> = {}) {
    Object.assign(this, data)
  }
}

export const dataDefaults = new ProjectData()
