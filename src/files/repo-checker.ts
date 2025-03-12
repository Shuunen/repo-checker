import { dataFileName } from '../constants.ts'
import { FileBase } from '../file.ts'
import { deleteFile, join, jsToJson, readFileInFolder, writeFile } from '../utils.ts'

// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class RepoCheckerConfigFile extends FileBase {
  /**
   * Migrate old config file to new one
   * @param fileName - The file name to migrate
   */
  private async migrateOldConfig(fileName: string) {
    const oldConfig = await readFileInFolder(this.folderPath, fileName)
    /* c8 ignore next 3 */
    if (!oldConfig.ok) return
    await writeFile(join(this.folderPath, dataFileName), jsToJson(oldConfig.value))
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
