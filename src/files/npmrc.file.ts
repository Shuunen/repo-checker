import { FileBase } from '../file'

export class NpmRcFile extends FileBase {
  public async start (): Promise<void> {
    if (!this.data.hasTaskPrefix) return
    const hasFile = await this.checkFileExists('.npmrc', true)
    this.test(hasFile, '.npmrc is present (needed when using pre/post task in package.json, need to set enable-pre-post-scripts option)', true)
    if (!hasFile) return
    await this.inspectFile('.npmrc')
    this.couldContains('enable-pre-post-scripts option', /enable-pre-post-scripts=true/u)
  }
}

