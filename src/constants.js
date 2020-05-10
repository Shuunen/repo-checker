import { join } from 'path'

export const home = process.env.HOME
export const dataFileName = 'repo-checker.config.js'
export const repoCheckerPath = join(__dirname, '..')
export const templatePath = join(repoCheckerPath, 'templates')
export const dataFileHomePath = join(home, dataFileName)

export const dataDefaults = {
  auto_merge: true,
  ban_sass: true,
  dev_deps_only: true,
  license: 'GPL-3.0',
  max_size_ko: 10,
  user_mail: 'romain.racamier@gmail.com',
  user_name: 'Romain Racamier-Lafon',
}
