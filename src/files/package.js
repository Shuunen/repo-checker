const Test = require('../test')

class CheckPackage extends Test {
  constructor (folderPath) {
    super(folderPath)
    return this.hasFile('package.json')
  }
}

module.exports = CheckPackage
