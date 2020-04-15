import { Test } from '../test'

export class CheckTravis extends Test {
  async start () {
    const exists = await this.checkFileExists('.travis.yml')
    if (!exists) return
    await this.inspectFile('.travis.yml')
    this.shouldContains('a language', /language: node_js/)
    this.couldContains('a production flag', /env: NODE_ENV=production/)
    this.couldContains('an install with dev dependencies', /npm install --production=false/)
    this.shouldContains('a "run ci" task', /npm run ci/)
  }
}
