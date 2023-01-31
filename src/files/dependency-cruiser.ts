import { FileBase } from '../file'

export class DependencyCruiserFile extends FileBase {
  public async start (): Promise<void> {
    const isUsingDepCruiser = this.test(this.data.isUsingDependencyCruiser, 'use dependency cruiser', true)
    if (!isUsingDepCruiser) return
    const hasJsFile = await this.fileExists('.dependency-cruiser.js')
    const hasCjsFile = await this.fileExists('.dependency-cruiser.cjs')
    /* c8 ignore next */
    this.test(hasJsFile || hasCjsFile, 'has a .dependency-cruiser config file')
  }
}
