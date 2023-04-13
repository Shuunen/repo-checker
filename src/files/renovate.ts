import { FileBase } from '../file'

/* c8 ignore start */
export class RenovateFile extends FileBase {
  public async start (): Promise<void> {
    const hasFile = await this.checkFileExists('renovate.json', true)
    if (!hasFile) return
    await this.inspectFile('renovate.json')
    this.couldContainsSchema('https://docs.renovatebot.com/renovate-schema.json')
    this.shouldContains('an extends section', /"extends"/u)
    this.shouldContains('a base config', /"config:base"/u)
    this.shouldContains('a dashboard setting to false', /"dependencyDashboard": false/u)
    if (this.data.canAutoMergeDeps) this.shouldContains('an auto merge preset', /":automergeAll"/u)
    const hasPreserveSemver = this.shouldContains('a preserve semver ranges preset', /":preserveSemverRanges"/u, 1, true, undefined, true)
    if (!hasPreserveSemver && this.canFix) this.fileContent = this.fileContent.replace('":automergeAll"', '":automergeAll",\n    ":preserveSemverRanges"')
  }
}
/* c8 ignore stop */
