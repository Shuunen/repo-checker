import { File } from '../file'

export class ConfigsFile extends File {
  async start () {
    await this.checkFileExists('.gitignore')
    await this.checkFileExists('.csscomb.json', true)
  }
}
