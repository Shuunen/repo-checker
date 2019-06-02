const Test = require('../test')

class CheckReadme extends Test {
  constructor (...args) {
    super(...args)
    return this.hasFile('README.md')
  }
}

module.exports = CheckReadme
