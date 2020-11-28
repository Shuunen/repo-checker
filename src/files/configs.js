import { File } from '../file'

export class ConfigsFile extends File {
  async start () {
    await this.checkFileExists('.gitignore')
    if (this.data.web_published) await this.checkFileExists('.csscomb.json', true)
  }
}
