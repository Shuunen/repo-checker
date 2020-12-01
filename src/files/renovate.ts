import { File } from '../file'

export class RenovateFile extends File {
  async start (): Promise<void> {
    const exists = await this.checkFileExists('renovate.json')
    if (!exists) return
    await this.inspectFile('renovate.json')
    this.shouldContains('an extends section', /"extends"/)
    this.shouldContains('a base config', /"config:base"/)
    if (this.data.auto_merge === undefined || this.data.auto_merge) this.shouldContains('an auto merge config', /":automergeAll"/)
  }
}
