import { dataFileName } from '../constants'
import { File } from '../file'

export class RepoCheckerConfigFile extends File {
  public async start (): Promise<void> {
    await this.checkNoFileExists('.repo-checker.js')
    await this.checkFileExists(dataFileName, true)
    await this.inspectFile(dataFileName)
    this.couldContains('no more snake case', /[a-z]+_[a-z]+/, 0, 'use camelCase instead')
  }
}
