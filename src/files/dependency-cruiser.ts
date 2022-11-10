import { File } from '../file'

export class DependencyCruiserFile extends File {
  public async start (): Promise<void> {
    const ok = this.test(this.data.useDependencyCruiser, 'use dependency cruiser', true)
    if (!ok) return
    await this.checkFileExists('.dependency-cruiser.js')
  }
}
