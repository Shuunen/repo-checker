import { FileBase } from '../file'

export class DependencyCruiserFile extends FileBase {
  public async start (): Promise<void> {
    const hasFile = this.test(this.data.isUsingDependencyCruiser, 'use dependency cruiser', true)
    if (!hasFile) return
    await this.checkFileExists('.dependency-cruiser.js')
  }
}
