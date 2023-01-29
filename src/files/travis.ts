import { FileBase } from '../file'

/* c8 ignore start */
export class TravisFile extends FileBase {
  public async start (): Promise<void> {
    const hasFile = await this.fileExists('.travis.yml')
    if (!hasFile) return
    await this.inspectFile('.travis.yml')
    this.shouldContains('a language', /language: node_js/u)
    this.shouldContains('a "npm ci" task', /npm ci/u) // npm ci install all dependencies
    this.shouldContains('a "run ci" task', /npm run ci/u)
  }
}
/* c8 ignore stop */
