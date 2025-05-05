/* eslint-disable jsdoc/require-jsdoc */
import { FileBase } from '../file.ts'

// eslint-disable-next-line no-restricted-syntax
export class TailwindFile extends FileBase {
  private async detectContext() {
    const hasJsFile = await this.fileExists('tailwind.config.js')
    const hasTsFile = await this.fileExists('tailwind.config.ts')
    const hasMjsFile = await this.fileExists('tailwind.config.mjs')
    /* c8 ignore next 3 */
    // eslint-disable-next-line unicorn/no-nested-ternary
    const fileName = `tailwind.config.${hasMjsFile ? 'mjs' : hasTsFile ? 'ts' : hasJsFile ? 'js' : 'cjs'}`
    return { fileName, hasFile: hasJsFile || hasTsFile || hasMjsFile, hasTsFile }
  }

  public async start() {
    if (!this.data.isUsingTailwind) return
    const { fileName, hasFile } = await this.detectContext()
    /* c8 ignore next */
    if (!hasFile) return
    await this.inspectFile(fileName)
    this.shouldContains('a content (previously named purge) option', /content/u, 1, false, "like : content: ['./src/**/*.{vue,js,ts,jsx,tsx}']")
  }
}
