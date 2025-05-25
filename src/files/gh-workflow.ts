import { FileBase } from '../file.ts'

/* c8 ignore start */
// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class GithubWorkflowFile extends FileBase {
  /**
   * Check checkout step
   */
  private checkCheckout() {
    const hasCheckout = this.shouldContains('a checkout step in ci workflow', /actions\/checkout/u)
    if (!hasCheckout) return
    const hasRecentVersion = this.shouldContains('a recent checkout version', /uses: actions\/checkout@v[456]/u, 1, false, undefined, true)
    if (!hasRecentVersion && this.canFix) this.fileContent = this.fileContent.replace(/(?<=uses: actions\/checkout@)v\d/u, 'latest')
  }

  /**
   * Check pnpm setup
   */
  private checkPnpm() {
    const hasPnpmStep = this.couldContains('a pnpm setup step', /pnpm\/action-setup/u)
    if (!hasPnpmStep) return
    const hasRecentVersion = this.couldContains('a recent pnpm version', /uses: pnpm\/action-setup@v\d\n +with:\n +version: 10/u, 1, undefined, true)
    if (!hasRecentVersion && this.canFix) this.fileContent = this.fileContent.replace(/(?<step>uses: pnpm\/action-setup@v\d\n +with:\n +version:) \d/u, '$<step> 10')
    const hasNoFrozenFlag = this.shouldContains('no frozen lockfile flag', /--no-frozen-lockfile/u, 0, false, undefined, true)
    if (!hasNoFrozenFlag && this.canFix) this.fileContent = this.fileContent.replace(' --no-frozen-lockfile', '')
  }

  /**
   * Check Bun setup
   */
  // eslint-disable-next-line max-lines-per-function
  private checkBun() {
    const noPnpmUsage = this.couldContains('no pnpm use', /pnpm/u, 0, undefined, true)
    if (!noPnpmUsage && this.canFix) {
      const setupRegex = /Setup (pnpm[\s\S\n]+version: \d)/
      const setupBun = 'Setup bun\n        uses: oven-sh/setup-bun@v2'
      this.fileContent = this.fileContent.replace(setupRegex, setupBun).replace('pnpm run check', 'bun run check')
    }
    if (!noPnpmUsage) return
    const hasBunStep = this.couldContains('a bun setup step', /oven-sh\/setup-bun/u)
    if (!hasBunStep) return
    const hasRecentVersion = this.couldContains('a recent setup bun action', /uses: oven-sh\/setup-bun@v2/u, 1, undefined, true)
    if (!hasRecentVersion && this.canFix) this.fileContent = this.fileContent.replace(/(?<=uses: oven-sh\/setup-bun@)\w+/u, 'v2')
  }

  /**
   * Check runtime setup (Pnpm or Bun)
   */
  private checkRuntime() {
    if (this.data.isUsingBun) this.checkBun()
    else this.checkPnpm()
  }

  /**
   * Check node version
   */
  private checkNodeVersion() {
    this.couldContains('no main branch reference', /- main/u, 0)
    this.shouldContains('a node step in ci workflow', /actions\/setup-node/u)
    this.couldContains('a recent node version', /node: \[22\]|node-version: 22/u, 1)
  }

  /**
   * Start the ci workflow file check
   */
  public async start() {
    const filePath = '.github/workflows/ci.yml'
    const hasFile = await this.fileExists(filePath)
    if (!hasFile) return
    await this.inspectFile(filePath)
    this.checkCheckout()
    this.checkRuntime()
    this.checkNodeVersion()
  }
}
/* c8 ignore stop */
