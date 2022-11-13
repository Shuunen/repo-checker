import { File } from '../file'

export class GitFile extends File {
  public async start (): Promise<void> {
    const ok = await this.checkFileExists('.gitignore')
    /* c8 ignore next */
    if (!ok) return
    await this.inspectFile('.gitignore')
    this.couldContains('node_modules', /node_modules/)
  }
}
