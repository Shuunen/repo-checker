import { FileBase } from '../file'

/* c8 ignore start */
export class GithubWorkflowFile extends FileBase {

  private checkPnpm (): void {
    const hasPnpmStep = this.couldContains('a pnpm setup step', /pnpm\/action-setup/u)
    if (!hasPnpmStep) return
    const hasRecentVersion = this.shouldContains('a recent pnpm version 8', /uses: pnpm\/action-setup@v\d\n +with:\n +version: 8/u, 1, false, undefined, true)
    if (!hasRecentVersion && this.canFix) this.fileContent = this.fileContent.replace(/(?<step>uses: pnpm\/action-setup@v\d\n +with:\n +version:) \d/u, '$<step> 8')
    const hasNoFrozenFlag = this.shouldContains('no frozen lockfile flag', /--no-frozen-lockfile/u, 0, false, undefined, true)
    if (!hasNoFrozenFlag && this.canFix) this.fileContent = this.fileContent.replace(' --no-frozen-lockfile', '')
  }

  public async start (): Promise<void> {
    const filePath = '.github/workflows/ci.yml'
    const hasFile = await this.fileExists(filePath)
    if (!hasFile) return
    await this.inspectFile(filePath)
    this.shouldContains('a checkout step in ci workflow', /actions\/checkout/u)
    this.shouldContains('a node step in ci workflow', /actions\/setup-node/u)
    this.checkPnpm()
    this.couldContains('no main branch reference', /- main/u, 0)
  }

}
/* c8 ignore stop */
