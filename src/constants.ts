import path from 'path'
import { fileURLToPath } from 'url'

export const home = process.env.HOME ?? '' // TODO: when does HOME is not defined ?
export const dataFileName = 'repo-checker.config.js'
export const repoCheckerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
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
  repo_id = 'a-great-repo'
  use_typescript = false
  use_vue = false
  user_id = 'Shuunen'
  user_id_lowercase = 'shuunen'
  user_mail = 'romain.racamier@gmail.com'
  user_name = 'Romain Racamier-Lafon'
  web_published = false
  web_url = 'https://my-website.com'
}

export const dataDefaults = new ProjectData()
