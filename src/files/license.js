const Test = require('../test')

class CheckLicense extends Test {
  async start () {
    await this.checkFile('LICENSE')
    if (this.data.license === 'GPL-3.0') {
      this.shouldContains('a GPL title', /GNU GENERAL PUBLIC LICENSE/)
      this.shouldContains('a version 3 subtitle', /Version 3, 29 June 2007/)
    }
  }
}

module.exports = CheckLicense
