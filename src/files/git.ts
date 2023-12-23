import { FileBase } from '../file'

// eslint-disable-next-line no-restricted-syntax
export class GitFile extends FileBase {
  public async start (): Promise<void> {
    this.test(!this.data.hasMainBranch, 'avoid "main" branch reference, use master instead & git bclean', true)
    const hasFile = await this.checkFileExists('.gitignore')
    /* c8 ignore next */
    if (!hasFile) return
    await this.inspectFile('.gitignore')
    this.couldContains('node_modules', /node_modules/u)
    this.couldContains('no pnpm-lock exclusion', /pnpm-lock\.yaml/u, 0)
  }
}
