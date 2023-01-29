import { dataFileName } from '../constants'
import { FileBase } from '../file'
import { deleteFile, join, jsToJson, readFileInFolder, writeFile } from '../utils'

export class RepoCheckerConfigFile extends FileBase {
  public async start (): Promise<void> {
    await this.migrateOldConfig('.repo-checker.js')
    await this.migrateOldConfig('repo-checker.config.js')
    await this.checkFileExists(dataFileName, true)
    await this.inspectFile(dataFileName)
  }

  private async migrateOldConfig (fileName: string): Promise<void> {
    const hasFile = await this.fileExists(fileName)
    /* c8 ignore next 4 */
    if (!hasFile) return
    const oldConfig = await readFileInFolder(this.folderPath, fileName)
    await writeFile(join(this.folderPath, dataFileName), jsToJson(oldConfig))
    await deleteFile(join(this.folderPath, fileName))
  }
}
