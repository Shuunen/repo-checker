const Test = require('../test')

class CheckReadme extends Test {
  constructor (folderPath) {
    super(folderPath)
    return this.hasFile('readme.md')
  }
}

module.exports = CheckReadme
