const path = require('path')

const constants = {
  home: process.env.HOME,
  dataFileName: '.repo-checker.js',
}

constants.dataFileHomePath = path.join(constants.home, constants.dataFileName)

module.exports = constants
