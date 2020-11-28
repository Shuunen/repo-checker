import path from 'path'

export const home = process.env.HOME
export const dataFileName = 'repo-checker.config.js'
export const repoCheckerPath = path.join(__dirname, '..')
export const templatePath = path.join(repoCheckerPath, 'templates')
export const dataFileHomePath = path.join(home, dataFileName)

export const dataDefaults = {
  auto_merge: true,
  ban_sass: true,
  dev_deps_only: true,
  license: 'GPL-3.0',
  max_size_ko: 10,
  npm_package: false,
  package_name: '',
  repo_id: 'a-great-repo',
  use_typescript: false,
  use_vue: false,
  user_id_lowercase: 'shuunen',
  user_id: 'Shuunen',
  user_mail: 'romain.racamier@gmail.com',
  user_name: 'Romain Racamier-Lafon',
  web_published: false,
  web_url: 'https://my-website.com',
}
