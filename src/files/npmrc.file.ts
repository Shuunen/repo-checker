import { FileBase } from '../file.ts'

// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class NpmRcFile extends FileBase {
  /**
   * Check if the file contains the pre-post scripts
   */
  private checkPrePost() {
    if (!this.data.hasTaskPrefix) return
    const isOk = this.couldContains('enable-pre-post-scripts option', /enable-pre-post-scripts=true/u)
    if (!isOk && this.canFix) this.fileContent += '\nenable-pre-post-scripts=true'
  }
  /**
   * Start the npmrc file check
   */
  public async start() {
    const hasFile = await this.checkFileExists('.npmrc', true)
    if (!hasFile) return
    await this.inspectFile('.npmrc')
    this.checkPrePost()
  }
}
