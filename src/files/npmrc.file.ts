import { FileBase } from '../file'

export class NpmRcFile extends FileBase {
  public async start (): Promise<void> {
    const hasFile = await this.fileExists('.npmrc')
    this.test(this.data.hasTaskPrefix && hasFile, '.npmrc file should be present when using pre/post task in package.json to set enable-pre-post-scripts option')
    if (!hasFile) return
    await this.inspectFile('.npmrc')
    this.shouldContains('enable-pre-post-scripts option', /enable-pre-post-scripts=true/u)
  }
}

