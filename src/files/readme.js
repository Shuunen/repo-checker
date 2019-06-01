const Test = require('../test')

class CheckReadme extends Test {
  constructor (...args) {
    super(...args)
    return this.hasFile('readme.md')
  }
}

module.exports = CheckReadme
