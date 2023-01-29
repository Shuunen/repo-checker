import { FileBase } from '../file'
import { log } from '../logger'

export class NycRcFile extends FileBase {

  private async getConfigFileName (): Promise<string> {
    const hasRc = await this.fileExists('.nycrc')
    const hasRcJson = await this.fileExists('.nycrc.json')
    const hasConfigFile = hasRc || hasRcJson
    this.test(hasConfigFile, 'nycrc file exists')
    if (!hasConfigFile) return ''
    return hasRc ? '.nycrc' : '.nycrc.json'
  }

  public async start (): Promise<boolean> {
    if (!this.data.isUsingNyc && !this.data.isUsingC8) return log.debug('does not use nyc/c8')
    const fileName = await this.getConfigFileName()
    if (fileName === '') return false
    await this.checkFileExists(fileName)
    await this.inspectFile(fileName)
    this.couldContainsSchema('https://json.schemastore.org/nycrc')
    return true
  }
}
