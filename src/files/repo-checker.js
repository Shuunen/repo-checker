import { Test } from '../test'

export class CheckRepoCheckerConfig extends Test {
  async start () {
    await this.checkNoFileExists('.repo-checker.js')
    await this.checkFileExists('repo-checker.config.js', true)
  }
}
