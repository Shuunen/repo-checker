import { File } from '../file'

export class NvmrcFile extends File {
  async start (): Promise<void> {
    const exists = await this.checkFileExists('.nvmrc')
    if (!exists) return
    await this.inspectFile('.nvmrc')
    this.couldContains('a recent lts node version', /14\.\d+\.\d+/)
  }
}
