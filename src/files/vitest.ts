import { FileBase } from '../file.ts'

// eslint-disable-next-line no-export
export class VitestFile extends FileBase {
  // eslint-disable-next-line jsdoc/require-jsdoc
  // eslint-disable-next-line max-lines-per-function
  public async start() {
    if (!this.data.isUsingVitest) return
    const hasMtsFile = await this.fileExists('vitest.config.mts')
    const hasJsFile = await this.fileExists('vitest.config.js')
    const hasTsFile = await this.fileExists('vitest.config.ts')
    const hasMjsFile = await this.fileExists('vitest.config.mjs')
    if (hasMtsFile) await this.inspectFile('vitest.config.mts')
    /* c8 ignore next 3 */
    if (hasJsFile) await this.inspectFile('vitest.config.js')
    if (hasTsFile) await this.inspectFile('vitest.config.ts')
    if (hasMjsFile) await this.inspectFile('vitest.config.mjs')
    this.couldContains('a pool thread setting', /pool: 'threads'/u)
  }
}
