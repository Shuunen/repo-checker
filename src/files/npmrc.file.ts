import { FileBase } from '../file'

export class NpmRcFile extends FileBase {

  private checkPrePost () {
    if (!this.data.hasTaskPrefix) return
    const isOk = this.couldContains('enable-pre-post-scripts option', /enable-pre-post-scripts=true/u)
    if (!isOk && this.canFix) this.fileContent += '\nenable-pre-post-scripts=true'
  }

  private checkStrictPeerDependencies () {
    const isOk = this.couldContains('no strict-peer-dependencies option', /strict-peer-dependencies=false/u, 0, undefined, true)
    /* c8 ignore next */
    if (!isOk && this.canFix) this.fileContent = this.fileContent.replace('\nstrict-peer-dependencies=false', '')
  }

  public async start (): Promise<void> {
    const hasFile = await this.checkFileExists('.npmrc', true)
    if (!hasFile) return
    await this.inspectFile('.npmrc')
    this.checkPrePost()
    this.checkStrictPeerDependencies()
  }

}

