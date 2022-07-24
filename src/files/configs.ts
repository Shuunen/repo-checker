import { File } from '../file'

export class ConfigsFile extends File {
  async start (): Promise<void> {
    await this.checkFileExists('.gitignore')
    /* c8 ignore next */
    if (this.data.useTailwind) await this.checkFileExists('tailwind.config.js', true)
  }
}
