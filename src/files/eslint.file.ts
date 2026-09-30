import { FileBase } from '../file.ts'

// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class EsLintFile extends FileBase {
  /* v8 ignore start -- @preserve */
  /**
   * Check if deprecated files are present
   */
  private async checkDeprecated() {
    await this.checkNoFileExists('xo.config.js')
    /* v8 ignore start -- @preserve */
    if (await this.fileExists('.eslintrc.json')) this.test(false, 'use eslint.config.js config file', true)
    else if (await this.fileExists('.eslintrc.js')) this.test(false, 'use eslint.config.js config file', true)
    /* v8 ignore stop -- @preserve */
  }
  /**
   * Start the eslint file check
   */
  // eslint-disable-next-line max-lines-per-function
  public async start() {
    if (!this.data.isUsingEslint) return
    await this.checkDeprecated()
    const filename = this.data.isModule ? 'eslint.config.js' : 'eslint.config.cjs'
    const isThere = await this.checkFileExists(filename)
    if (!isThere) return
    await this.inspectFile(filename)
    if (this.data.isUsingTailwind) this.shouldContains('browser config usage when using tailwind', /browser/u)
    // if (this.data.isUsingReact) this.shouldContains('react config usage', /react/u)
  }
  /* v8 ignore stop -- @preserve */
}
