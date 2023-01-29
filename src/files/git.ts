import { Nb } from 'shuutils'
import { FileBase } from '../file'

export class GitFile extends FileBase {
  public async start (): Promise<void> {
    const hasFile = await this.checkFileExists('.gitignore')
    /* c8 ignore next */
    if (!hasFile) return
    await this.inspectFile('.gitignore')
    this.couldContains('node_modules', /node_modules/u)
    this.couldContains('no pnpm-lock exclusion', /pnpm-lock\.yaml/u, Nb.None)
  }
}
