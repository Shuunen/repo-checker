import { spawn } from 'child_process'
import { File } from '../file'
import { log } from '../logger'

export class EsLintFile extends File {
  async start (): Promise<boolean> {
    const useXo = await this.fileExists('xo.config.js')
    if (useXo) return this.checkXo()
    return this.checkEslint()
  }

  async checkXo (): Promise<boolean> {
    await this.lintFolder()
    return true
  }

  async checkEslint (): Promise<boolean> {
    const filename = this.data.is_module ? '.eslintrc.cjs' : '.eslintrc.js'
    const exists = await this.fileExists(filename)
    if (!exists) return log.debug('skipping eslintrc checks')
    await this.inspectFile(filename)
    this.shouldContains('external rules', /\.eslintrc\.rules/)
    this.shouldContains('standard rules extend', /standard/)
    this.couldContains('unicorn rules extend', /plugin:unicorn\/recommended/)
    this.couldContains('unicorn plugin', /'unicorn'/)
    await this.checkTs()
    await this.checkVue()
    await this.lintFolder()
    return true
  }

  async checkTs (): Promise<boolean> {
    if (!this.data.use_typescript) return this.shouldContains('eslint recommended rules extend', /eslint:recommended/)
    if (this.data.use_vue) return this.shouldContains('vue typescript rules extend', /@vue\/typescript\/recommended/)
    return this.shouldContains('standard-with-typescript extend', /standard-with-typescript/)
  }

  async checkVue (): Promise<void> {
    if (!this.data.use_vue) return
    this.shouldContains('vue recommended rules', /plugin:vue\/recommended/)
    this.shouldContains('no easy vue essential rules set', /plugin:vue\/essential/, 0)
    const haveIt = this.couldContains('vue standard rules', /@vue\/standard/)
    if (!haveIt) log.info('^ this might not be necessary, should check a fresh vue app')
    await this.inspectFile('.eslintrc.rules.js')
    this.shouldContains('\'vue/max-attributes-per-line\': \'off\',')
    this.shouldContains('\'vue/singleline-html-element-content-newline\': \'off\',')
  }

  async lintFolder (): Promise<void> {
    if (this.nbFailed > 0) return
    const message = await new Promise(resolve => {
      const proc = spawn(process.platform.startsWith('win') ? 'npm.cmd' : 'npm', ['run', 'lint'], { cwd: this.folderPath })
      proc.stderr.on('data', (data: string) => {
        resolve(`stderr: ${data}`)
      })
      proc.on('error', error => {
        resolve(`error: ${String(error.message)}`)
      })
      proc.on('close', code => {
        resolve(`child process exited with code ${String(code)}`)
      })
    })
    const hasIssues = (message as string).includes('stderr')
    this.test(!hasIssues, 'has no lint issues')
  }
}
