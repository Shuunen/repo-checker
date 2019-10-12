const Test = require('../test')

class CheckTravis extends Test {
  async start () {
    await this.checkFile('.travis.yml')
    this.shouldContains('a language', /language: node_js/)
    this.shouldContains('a production flag', /env: NODE_ENV=production/)
    this.shouldContains('an install with dev dependencies', /install: npm install --production=false/)
    this.shouldContains('a "run ci" task', /script: npm run ci/)
  }
}

module.exports = CheckTravis
