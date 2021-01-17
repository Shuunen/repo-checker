import { join } from 'path'

/* istanbul ignore next */
export const home = process.env.HOME ?? '' // when does HOME is not defined ?
export const dataFileName = 'repo-checker.config.js'
/* istanbul ignore next */
export const repoCheckerPath = process.env.pwd ?? process.cwd()
export const templatePath = join(repoCheckerPath, 'templates')
export const dataFileHomePath = join(home, dataFileName)

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
  repo_id = 'a-great-repo'
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
