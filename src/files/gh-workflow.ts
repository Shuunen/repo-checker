import { File } from '../file'

export class GithubWorkflowFile extends File {
  async start (): Promise<void> {
    const filePath = '.github/workflows/ci.yml'
    const exists = await this.fileExists(filePath)
    if (!exists) return
    await this.inspectFile(filePath)
    this.shouldContains('a checkout step in ci workflow', /actions\/checkout/)
    this.shouldContains('a node step in ci workflow', /actions\/setup-node/)
    const hasInstall = this.fileContent.includes('npm install') || this.fileContent.includes('npm ci')
    this.test(hasInstall, 'a install step in ci workflow')
    const hasTests = this.fileContent.includes('npm run test') || this.fileContent.includes('npm run ci')
    this.test(hasTests, 'at least one test step in ci workflow')
  }
}
