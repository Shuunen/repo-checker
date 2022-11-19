import { File } from '../file'

/* c8 ignore start */
export class GithubWorkflowFile extends File {
  public async start (): Promise<void> {
    const filePath = '.github/workflows/ci.yml'
    const exists = await this.fileExists(filePath)
    if (!exists) return
    await this.inspectFile(filePath)
    this.shouldContains('a checkout step in ci workflow', /actions\/checkout/)
    this.shouldContains('a node step in ci workflow', /actions\/setup-node/)
    this.couldContains('a pnpm setup step', /pnpm\/action-setup/)
  }
}
/* c8 ignore stop */
