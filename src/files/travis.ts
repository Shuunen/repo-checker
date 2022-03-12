import { File } from '../file'

/* c8 ignore start */
export class TravisFile extends File {
  async start (): Promise<void> {
    const exists = await this.fileExists('.travis.yml')
    if (!exists) return
    await this.inspectFile('.travis.yml')
    this.shouldContains('a language', /language: node_js/)
    this.shouldContains('a "npm ci" task', /npm ci/) // npm ci install all dependencies
    this.shouldContains('a "run ci" task', /npm run ci/)
  }
}
/* c8 ignore stop */
