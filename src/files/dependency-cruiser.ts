import { blue, green } from 'shuutils'
import { FileBase } from '../file.ts'

// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class DependencyCruiserFile extends FileBase {
  /**
   * Start the dependency cruiser file check
   */
  public async start() {
    if (this.data.isUsingKnip) return
    const isUsingDepCruiser = this.test(this.data.isUsingDependencyCruiser, `use ${green('https://knip.dev')} or ${blue('https://www.npmjs.com/package/dependency-cruiser')}`, true)
    /* c8 ignore next 4 */
    if (!isUsingDepCruiser) return
    const hasJsFile = await this.fileExists('.dependency-cruiser.js')
    const hasCjsFile = await this.fileExists('.dependency-cruiser.cjs')
    this.test(hasJsFile || hasCjsFile, 'has a .dependency-cruiser config file')
  }
}
