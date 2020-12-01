import { File } from '../file'

export class RepoCheckerConfigFile extends File {
  async start (): Promise<void> {
    await this.checkNoFileExists('.repo-checker.js')
    await this.checkFileExists('repo-checker.config.js', true)
  }
}
