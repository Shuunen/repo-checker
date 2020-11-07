import { repoCheckerPath } from '../constants'
import { File } from '../file'
import { log } from '../logger'
const { spawn } = require('child_process')

export class EsLintFile extends File {
  async start () {
    const exists = await this.checkFileExists('.eslintrc.js', true)
    if (!exists) return log.debug('skipping eslintrc checks')
    await this.inspectFile('.eslintrc.js')
    this.shouldContains('external rules', /\.eslintrc\.rules/)
    this.shouldContains('eslint recommended rules extend', /eslint:recommended/)
    this.shouldContains('standard rules extend', /standard/)
    this.couldContains('unicorn rules extend', /plugin:unicorn\/recommended/)
    this.couldContains('unicorn plugin', /'unicorn'/)
    await this.checkTs()
    await this.checkVue()
    await this.lintFolder()
  }

  async checkTs () {
    if (!this.data.use_typescript) return
    if (this.data.use_vue) this.shouldContains('vue typescript rules extend', '@vue/typescript/recommended')
    else this.shouldContains('typescript eslint plugin', /'@typescript-eslint'/)
  }

  async checkVue () {
    if (!this.data.use_vue) return
    this.shouldContains('vue recommended rules', /plugin:vue\/recommended/)
    this.shouldContains('no easy vue essential rules set', /plugin:vue\/essential/, 0)
    this.shouldContains('vue standard rules', /@vue\/standard/)
    await this.inspectFile('.eslintrc.rules.js')
    this.shouldContains("'vue/max-attributes-per-line': 'off',")
    this.shouldContains("'vue/singleline-html-element-content-newline': 'off',")
  }

  lintFolder () {
    if (this.nbFailed > 0) return
    return new Promise(resolve => {
      const proc = spawn(process.platform.startsWith('win') ? 'npx.cmd' : 'npx', ['eslint', '--ignore-path .gitignore', '--ext .js,.ts,.vue,.html', this.folderPath], { cwd: repoCheckerPath })
      proc.stdout.on('data', data => { resolve(`stdout: ${data}`) })
      proc.stderr.on('data', data => { resolve(`stderr: ${data}`) })
      proc.on('error', (error) => { resolve(`error: ${error.message}`) })
      proc.on('close', code => { resolve(`child process exited with code ${code}`) })
    }).then(message => {
      const hasIssues = message !== 'child process exited with code 0'
      if (hasIssues) log.error(message)
      this.test(!hasIssues, 'has no lint issues')
    })
  }
}
