import { join } from 'path'

export const home = process.env.HOME
export const dataFileName = 'repo-checker.config.js'
export const defaultDataFileName = 'data.sample.js'
export const repoCheckerPath = join(__dirname, '..')
export const defaultDataFilePath = join(repoCheckerPath, defaultDataFileName)
export const dataFileHomePath = join(home, dataFileName)
