const Test = require('../test')

class CheckReadme extends Test {
  async init () {
    await this.checkFile('README.md')
    this.shouldContains('a title', /^#\s\w+/)

    this.shouldContains('a badge with licence', /master\/LICENSE/)
    this.shouldContains('a badge with build status & associated thanks', /travis-ci\.org/g, 3)

    this.couldContains('a thanks section', /## Thanks\n/)
  }
}

module.exports = CheckReadme
