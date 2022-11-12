import { File } from '../file'
import { log } from '../logger'

export class TailwindFile extends File {
  public async start (): Promise<void> {
    if (!this.data.useTailwind) return
    const jsExists = await this.fileExists('tailwind.config.js')
    const tsExists = await this.fileExists('tailwind.config.ts')
    const mjsExists = await this.fileExists('tailwind.config.mjs')
    /* c8 ignore next 2 */
    // eslint-disable-next-line unicorn/no-nested-ternary
    const fileName = 'tailwind.config.' + (mjsExists ? 'mjs' : tsExists ? 'ts' : jsExists ? 'js' : 'cjs')
    await this.checkFileExists(fileName)
    log.debug('found tailwind config file :', fileName)
    await this.inspectFile(fileName)
    if (!tsExists) {
      const ok = this.shouldContains('type definitions', /@type/, 1, true, 'like : /** @type {import(\'tailwindcss\').Config} */', true)
      if (!ok && this.doFix) this.fileContent = `/** @type {import('tailwindcss').Config} */\n${this.fileContent}`
    }
    this.shouldContains('a content (previously named purge) option', /content/, 1, false, 'like : content: [\'./src/**/*.{vue,js,ts,jsx,tsx}\']')
  }
}
