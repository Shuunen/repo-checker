import { Test } from '../test'

export class CheckNvmRc extends Test {
  async start () {
    const exists = await this.checkFileExists('.nvmrc')
    if (!exists) return
    await this.inspectFile('.nvmrc')
    if (!this.fileContent.includes('v12.')) {
      const ok = this.shouldContains('at least last lts node version', /10\.\d+\.\d+/)
      if (ok) this.couldContains('a recent lts node version', /v12\.16\.\d+/)
    }
  }
}
