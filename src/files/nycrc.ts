import { File } from '../file'
import { log } from '../logger'

export class NycRcFile extends File {
  async start (): Promise<boolean> {
    if (!this.data.useNyc && !this.data.useC8) return log.debug('does not use nyc/c8')
    const hasRc = await this.fileExists('.nycrc')
    const hasRcJson = await this.fileExists('.nycrc.json')
    const exists = hasRc || hasRcJson
    const ok = this.test(exists, 'nycrc file exists')
    if (!ok) return false
    /* c8 ignore next */
    await this.inspectFile(hasRc ? '.nycrc' : '.nycrc.json')
    this.couldContainsSchema('https://json.schemastore.org/nycrc')
    return true
  }
}
