import { dataFileName } from '../constants'
import { FileBase } from '../file'
import { deleteFile, join, jsToJson, readFileInFolder, writeFile } from '../utils'

// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class RepoCheckerConfigFile extends FileBase {
  /**
   * Migrate old config file to new one
   * @param fileName - The file name to migrate
   */
  private async migrateOldConfig(fileName: string) {
    const hasFile = await this.fileExists(fileName)
    /* c8 ignore next 4 */
    if (!hasFile) return
    const oldConfig = await readFileInFolder(this.folderPath, fileName)
    await writeFile(join(this.folderPath, dataFileName), jsToJson(oldConfig))
    await deleteFile(join(this.folderPath, fileName))
  }

  // eslint-disable-next-line jsdoc/require-jsdoc
  public async start() {
    await this.migrateOldConfig('.repo-checker.js')
    await this.migrateOldConfig('repo-checker.config.js')
    await this.checkFileExists(dataFileName, true)
    await this.inspectFile(dataFileName)
  }
}
