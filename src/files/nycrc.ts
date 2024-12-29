import { FileBase } from '../file.ts'
import { log } from '../logger.ts'

// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class NycRcFile extends FileBase {
  // eslint-disable-next-line jsdoc/require-jsdoc
  private async getConfigFileName() {
    const hasRc = await this.fileExists('.nycrc')
    const hasRcJson = await this.fileExists('.nycrc.json')
    const hasConfigFile = hasRc || hasRcJson
    this.test(hasConfigFile, 'nycrc file exists')
    if (!hasConfigFile) return ''
    /* c8 ignore next */
    return hasRc ? '.nycrc' : '.nycrc.json'
  }

  // eslint-disable-next-line jsdoc/require-jsdoc
  public async start() {
    if (!this.data.isUsingNyc) {
      log.debug('does not use nyc')
      return
    }
    const fileName = await this.getConfigFileName()
    if (fileName === '') return
    await this.checkFileExists(fileName)
    await this.inspectFile(fileName)
    this.couldContainsSchema('https://json.schemastore.org/nycrc')
  }
}
