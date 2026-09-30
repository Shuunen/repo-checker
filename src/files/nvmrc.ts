import { FileBase } from '../file.ts'

/* v8 ignore start -- @preserve */
// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class NvmrcFile extends FileBase {
  /**
   * Start the nvmrc file check
   */
  public async start() {
    const hasFile = await this.checkFileExists('.nvmrc')
    if (!hasFile) return
    await this.inspectFile('.nvmrc')
    this.couldContains('a recent lts node version', /24\.\d+\.\d+/u)
  }
}
/* v8 ignore stop -- @preserve */
