import { FileBase } from '../file'

/* c8 ignore start */
export class GithubWorkflowFile extends FileBase {
  public async start (): Promise<void> {
    const filePath = '.github/workflows/ci.yml'
    const hasFile = await this.fileExists(filePath)
    if (!hasFile) return
    await this.inspectFile(filePath)
    this.shouldContains('a checkout step in ci workflow', /actions\/checkout/u)
    this.shouldContains('a node step in ci workflow', /actions\/setup-node/u)
    this.couldContains('a pnpm setup step', /pnpm\/action-setup/u)
  }
}
/* c8 ignore stop */
