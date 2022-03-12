import { File } from '../file'

/* c8 ignore start */
export class RenovateFile extends File {
  async start (): Promise<void> {
    const exists = await this.checkFileExists('renovate.json', true)
    if (!exists) return
    await this.inspectFile('renovate.json')
    this.shouldContains('an extends section', /"extends"/)
    this.shouldContains('a base config', /"config:base"/)
    this.shouldContains('a dashboard setting to false', /"dependencyDashboard": false/)
    if (this.data.auto_merge === undefined || this.data.auto_merge) this.shouldContains('an auto merge preset', /":automergeAll"/)
    const ok = this.shouldContains('a preserve semver ranges preset', /":preserveSemverRanges"/, 1, true, undefined, true)
    if (!ok && this.doFix) this.fileContent = this.fileContent.replace('":automergeAll"', '":automergeAll",\n    ":preserveSemverRanges"')
  }
}
/* c8 ignore stop */
