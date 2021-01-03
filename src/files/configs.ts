import { File } from '../file'

export class ConfigsFile extends File {
  async start (): Promise<void> {
    await this.checkFileExists('.gitignore')
  }
}
