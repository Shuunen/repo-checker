import { File } from '../file'

/* c8 ignore start */
export class NvmrcFile extends File {
  public async start (): Promise<void> {
    const exists = await this.checkFileExists('.nvmrc')
    if (!exists) return
    await this.inspectFile('.nvmrc')
    this.couldContains('a recent lts node version', /1(6|8)\.\d+\.\d+/)
  }
}
/* c8 ignore stop */
