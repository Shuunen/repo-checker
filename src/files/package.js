const Test = require('../test')

class CheckPackage extends Test {
  constructor (...args) {
    super(...args)
    return this.hasFile('package.json')
  }
}

module.exports = CheckPackage
