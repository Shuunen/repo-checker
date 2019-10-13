const path = require('path')

const constants = {
  home: process.env.HOME,
  dataFileName: '.repo-checker.js',
  defaultDataFileName: 'data.sample.js',
  repoCheckerPath: path.join(__dirname, '..'),
}

constants.defaultDataFilePath = path.join(constants.repoCheckerPath, constants.defaultDataFileName)
constants.dataFileHomePath = path.join(constants.home, constants.dataFileName)

module.exports = constants
