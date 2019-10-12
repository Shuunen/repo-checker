const Test = require('../test')

class CheckLicense extends Test {
  async start () {
    await this.checkFileExists('LICENSE')
    await this.inspectFile('LICENSE')
    const { license } = this.data
    if (license === 'GPL-3.0') {
      this.shouldContains('a GPL title', /GNU GENERAL PUBLIC LICENSE/)
      this.shouldContains('a version 3 subtitle', /Version 3, 29 June 2007/)
      return
    }
    if (license === 'MIT') {
      this.shouldContains('a MIT title', /MIT License/)
    }
  }
}

module.exports = CheckLicense
