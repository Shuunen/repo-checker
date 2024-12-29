import { FileBase } from '../file.ts'

// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class DependencyCruiserFile extends FileBase {
  /**
   * Start the dependency cruiser file check
   */
  public async start() {
    const isUsingDepCruiser = this.test(this.data.isUsingDependencyCruiser, 'use dependency cruiser', true)
    if (!isUsingDepCruiser) return
    const hasJsFile = await this.fileExists('.dependency-cruiser.js')
    const hasCjsFile = await this.fileExists('.dependency-cruiser.cjs')
    /* c8 ignore next */
    this.test(hasJsFile || hasCjsFile, 'has a .dependency-cruiser config file')
  }
}
