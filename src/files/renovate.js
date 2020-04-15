import { Test } from '../test'

export class CheckRenovate extends Test {
  async start () {
    const exists = await this.checkFileExists('renovate.json')
    if (!exists) return
    await this.inspectFile('renovate.json')
    this.shouldContains('an extends section', /"extends"/)
    this.shouldContains('a base config', /"config:base"/)
    this.shouldContains('an auto merge config', /":automergeAll"/)
  }
}
