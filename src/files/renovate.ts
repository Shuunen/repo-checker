import { File } from '../file'

export class RenovateFile extends File {
  async start (): Promise<void> {
    const exists = await this.checkFileExists('renovate.json', true)
    if (!exists) return
    await this.inspectFile('renovate.json')
    this.shouldContains('an extends section', /"extends"/)
    this.shouldContains('a base config', /"config:base"/)
    this.shouldContains('a dashboard setting to true or false', /"dependencyDashboard"/)
    if (this.data.auto_merge === undefined || this.data.auto_merge) this.shouldContains('an auto merge config', /":automergeAll"/)
  }
}
