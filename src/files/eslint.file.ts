import { FileBase } from '../file'

// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class EsLintFile extends FileBase {
  /**
   * Check if deprecated files are present
   */
  private async checkDeprecated() {
    await this.checkNoFileExists('xo.config.js')
    /* c8 ignore next 2 */
    if (await this.fileExists('.eslintrc.json')) this.test(false, 'use eslint.config.js config file', true)
    else if (await this.fileExists('.eslintrc.js')) this.test(false, 'use eslint.config.js config file', true)
  }
  /**
   * Start the eslint file check
   */
  public async start() {
    if (!this.data.isUsingEslint) return
    await this.checkDeprecated()
    /* c8 ignore next */
    const filename = this.data.isModule ? 'eslint.config.js' : 'eslint.config.cjs'
    await this.checkFileExists(filename)
    /* c8 ignore next */
    if (this.data.isUsingTailwind) this.shouldContains('browser config usage when using tailwind', /browser/u)
    // if (this.data.isUsingReact) this.shouldContains('react config usage', /react/u)
  }
}
