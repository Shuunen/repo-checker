import { FileBase } from '../file'
import { log } from '../logger'

// eslint-disable-next-line no-restricted-syntax
export class NycRcFile extends FileBase {

  private async getConfigFileName (): Promise<string> {
    const hasRc = await this.fileExists('.nycrc')
    const hasRcJson = await this.fileExists('.nycrc.json')
    const hasConfigFile = hasRc || hasRcJson
    this.test(hasConfigFile, 'nycrc file exists')
    if (!hasConfigFile) return ''
    /* c8 ignore next */
    return hasRc ? '.nycrc' : '.nycrc.json'
  }

  public async start (): Promise<void> {
    if (!this.data.isUsingNyc) { log.debug('does not use nyc'); return }
    const fileName = await this.getConfigFileName()
    if (fileName === '') return
    await this.checkFileExists(fileName)
    await this.inspectFile(fileName)
    this.couldContainsSchema('https://json.schemastore.org/nycrc')
  }
}
