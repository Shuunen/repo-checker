const Test = require('../test')

class CheckTravis extends Test {
  async start () {
    await this.checkFileExists('.travis.yml')
    await this.inspectFile('.travis.yml')
    this.shouldContains('a language', /language: node_js/)
    this.couldContains('a production flag', /env: NODE_ENV=production/)
    this.couldContains('an install with dev dependencies', /npm install --production=false/)
    this.shouldContains('a "run ci" task', /npm run ci/)
  }
}

module.exports = CheckTravis
