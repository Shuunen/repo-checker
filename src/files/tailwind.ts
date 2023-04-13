import { FileBase } from '../file'

export class TailwindFile extends FileBase {
  public async start (): Promise<void> {
    if (!this.data.isUsingTailwind) return
    const { fileName, hasTsFile } = await this.detectContext()
    await this.checkFileExists(fileName)
    await this.inspectFile(fileName)
    if (!hasTsFile) {
      const hasTypes = this.shouldContains('type definitions', /@type/u, 1, true, 'like : /** @type {import(\'tailwindcss\').Config} */', true)
      if (!hasTypes && this.canFix) this.fileContent = `/** @type {import('tailwindcss').Config} */\n${this.fileContent}`
    }
    this.shouldContains('a content (previously named purge) option', /content/u, 1, false, 'like : content: [\'./src/**/*.{vue,js,ts,jsx,tsx}\']')
  }

  private async detectContext (): Promise<{ fileName: string; hasTsFile: boolean }> {
    const hasJsFile = await this.fileExists('tailwind.config.js')
    const hasTsFile = await this.fileExists('tailwind.config.ts')
    const hasMjsFile = await this.fileExists('tailwind.config.mjs')
    /* c8 ignore next 2 */
    // eslint-disable-next-line no-nested-ternary
    const fileName = `tailwind.config.${hasMjsFile ? 'mjs' : hasTsFile ? 'ts' : hasJsFile ? 'js' : 'cjs'}`
    return { fileName, hasTsFile }
  }
}
