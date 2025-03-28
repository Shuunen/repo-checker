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
    const { fileName, hasFile, hasTsFile } = await this.detectContext()
    /* c8 ignore next */
    if (!hasFile) return
    await this.inspectFile(fileName)
    if (!hasTsFile) {
      const hasTypes = this.shouldContains('type definitions', /@type/u, 1, true, "like : /** @type {import('tailwindcss').Config} */", true)
      if (!hasTypes && this.canFix) this.fileContent = `/** @type {import('tailwindcss').Config} */\n${this.fileContent}`
    }
    this.shouldContains('a content (previously named purge) option', /content/u, 1, false, "like : content: ['./src/**/*.{vue,js,ts,jsx,tsx}']")
  }
}
