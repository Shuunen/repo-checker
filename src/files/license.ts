import { FileBase } from '../file.ts'

/* c8 ignore start */
// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class LicenseFile extends FileBase {
  /**
   * Start the license file check
   */
  public async start() {
    const hasFile = await this.checkFileExists('LICENSE')
    if (!hasFile) return
    await this.inspectFile('LICENSE')
    const { license } = this.data
    if (license === 'GPL-3.0') {
      this.shouldContains('a GPL title', /GNU GENERAL PUBLIC LICENSE/u)
      this.shouldContains('a version 3 subtitle', /Version 3, 29 June 2007/u)
      return
    }
    if (license === 'MIT') this.shouldContains('a MIT title', /MIT License/u)
  }
}
/* c8 ignore stop */
