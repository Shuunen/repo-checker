import { Test } from '../test'

export class CheckReadme extends Test {
  async start () {
    const exists = await this.checkFileExists('README.md')
    if (!exists) return
    await this.inspectFile('README.md')
    this.shouldContains('a title', /^#\s\w+/)
    this.shouldContains('a badge with licence', /master\/LICENSE/)
    this.shouldContains('a badge with build status & associated thanks', /travis-ci\.org/g, 3)
    this.couldContains('a thanks section', /## Thanks/)
  }
}
