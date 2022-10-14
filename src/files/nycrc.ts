import { File } from '../file'

/* c8 ignore start */
export class NycRcFile extends File {
  async start (): Promise<void> {
    if (!this.data.useNyc) return
    const exists = await this.checkFileExists('.nycrc')
    if (!exists) return
    await this.inspectFile('.nycrc')
    this.couldContainsSchema('https://json.schemastore.org/nycrc')
  }
}
/* c8 ignore stop */
