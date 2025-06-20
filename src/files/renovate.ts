import { FileBase } from '../file.ts'

/* c8 ignore start */
// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class RenovateFile extends FileBase {
  // eslint-disable-next-line jsdoc/require-jsdoc
  public async start() {
    const hasFile = await this.checkFileExists('renovate.json', true)
    if (!hasFile) return
    await this.inspectFile('renovate.json')
    this.couldContainsSchema('https://docs.renovatebot.com/renovate-schema.json')
    this.shouldContains('an extends section', /"extends"/u)
    this.shouldContains('no deprecated base config, use config:semverAllMonthly instead', /"config:base"/u, 0)
    this.shouldContains('a dashboard setting to false', /"dependencyDashboard": false/u)
    if (this.data.canAutoMergeDeps) this.shouldContains('an auto merge preset', /":automergeAll"/u)
  }
}
/* c8 ignore stop */
