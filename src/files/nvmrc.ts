import { FileBase } from '../file'

/* c8 ignore start */
export class NvmrcFile extends FileBase {
  public async start (): Promise<void> {
    const hasFile = await this.checkFileExists('.nvmrc')
    if (!hasFile) return
    await this.inspectFile('.nvmrc')
    this.couldContains('a recent lts node version', /1[68]\.\d+\.\d+/u)
  }
}
/* c8 ignore stop */

