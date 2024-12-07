import { FileBase } from '../file'

/* c8 ignore start */
// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class NvmrcFile extends FileBase {
  /**
   * Start the nvmrc file check
   */
  public async start() {
    const hasFile = await this.checkFileExists('.nvmrc')
    if (!hasFile) return
    await this.inspectFile('.nvmrc')
    this.couldContains('a recent lts node version', /22\.\d+\.\d+/u)
  }
}
/* c8 ignore stop */
