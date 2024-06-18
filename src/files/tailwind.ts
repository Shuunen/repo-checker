import { FileBase } from '../file'

// eslint-disable-next-line no-restricted-syntax
export class TailwindFile extends FileBase {
  public async start() {
    if (!this.data.isUsingTailwind) return
    const { fileName, hasTsFile } = await this.detectContext()
    await this.checkFileExists(fileName)
    await this.inspectFile(fileName)
    if (!hasTsFile) {
      // eslint-disable-next-line @stylistic/quotes
      const hasTypes = this.shouldContains('type definitions', /@type/u, 1, true, "like : /** @type {import('tailwindcss').Config} */", true)
      if (!hasTypes && this.canFix) this.fileContent = `/** @type {import('tailwindcss').Config} */\n${this.fileContent}`
    }
    // eslint-disable-next-line @stylistic/quotes
    this.shouldContains('a content (previously named purge) option', /content/u, 1, false, "like : content: ['./src/**/*.{vue,js,ts,jsx,tsx}']")
  }

  private async detectContext() {
    const hasJsFile = await this.fileExists('tailwind.config.js')
    const hasTsFile = await this.fileExists('tailwind.config.ts')
    const hasMjsFile = await this.fileExists('tailwind.config.mjs')
    /* c8 ignore next 2 */
    // eslint-disable-next-line no-nested-ternary
    const fileName = `tailwind.config.${hasMjsFile ? 'mjs' : hasTsFile ? 'ts' : hasJsFile ? 'js' : 'cjs'}`
    return { fileName, hasTsFile }
  }
}
