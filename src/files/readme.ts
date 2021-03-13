import { pathExists, readFile } from 'fs-extra'
import { join } from 'path'
import { dataDefaults } from '../constants'
import { File } from '../file'
import { log } from '../logger'

class Thanks {
  markdown = ''
  // eslint-disable-next-line max-params
  constructor (public label = '', public link = '', public description = '', public expected = false, public fixable = true) {
    this.markdown = `- [${label}](${link}) : ${description}`
  }
}

class Badge {
  markdown = ''
  // eslint-disable-next-line max-params
  constructor (public label = '', public link = '', public image = '', public expected = true, public fixable = true) {
    this.markdown = `[![${label}](${image})](${link})`
  }
}

export class ReadmeFile extends File {
  async start (): Promise<void> {
    const exists = await this.checkFileExists('README.md')
    if (!exists) return
    await this.inspectFile('README.md')
    this.shouldContains('a title', /^#\s\w+/)
    this.couldContains('a logo', /docs\/logo.svg\)/, 1, '![logo](docs/logo.svg)')
    this.couldContains('a demo screen or gif', /docs\/demo/, 1, '![demo](docs/demo.gif)')
    this.shouldContains('no link to deprecated *.netlify.com', /(.*)\.netlify\.com/, 0)
    this.shouldContains('no links without https scheme', /[^:]\/\/[\w-]+\.\w+/, 0) // https://stackoverflow.com/questions/9161769/url-without-httphttps
    this.checkMarkdown()
    this.checkTodos()
    await this.checkBadges()
    await this.checkThanks()
  }

  checkMarkdown (): void {
    let ok = this.shouldContains('no CRLF Windows carriage return', /\r/, 0, false, 'prefer Unix LF', true)
    if (!ok && this.doFix) this.fileContent = this.fileContent.replace(/\r\n/g, '\n')
    const starLists = /\n\*\s([\w[])/g
    ok = this.couldContains('no star flavored list', starLists, 0, 'should use dash flavor', true)
    if (!ok && this.doFix) this.fileContent = this.fileContent.replace(/\n\*\s([\w[])/g, '\n- $1')
  }

  addBadge (line = ''): void {
    // just after project title
    this.fileContent = this.fileContent.replace(/^(# [\s\w-]+)/, `$1${line}\n`)
  }

  async checkBadges (): Promise<void> {
    const badges = await this.getBadges()
    for (const badge of badges) {
      const message = `${badge.expected ? 'a' : 'no'} "${badge.label}" badge`
      const regex = new RegExp(`\\(${badge.link.replace('?', '\\?')}\\)`)
      const ok = this.couldContains(message, regex, badge.expected ? 1 : 0, badge.markdown, badge.expected)
      if (!ok && badge.expected && badge.fixable && this.doFix) this.addBadge(badge.markdown)
    }
  }

  async getBadges (): Promise<Badge[]> {
    const userRepo = `${this.data.user_id}/${this.data.repo_id}`
    const list = [
      new Badge('Project license', `https://github.com/${userRepo}/blob/master/LICENSE`, `https://img.shields.io/github/license/${userRepo}.svg?color=informational`),
      new Badge('Build status', `https://travis-ci.com/${userRepo}`, `https://travis-ci.com/${userRepo}.svg?branch=master`),
    ]
    if (this.data.web_published && !this.fileContent.includes('shields.io/website/'))
      list.push(new Badge('Website up', this.data.web_url, `https://img.shields.io/website/https/${this.data.web_url.replace('https://', '')}.svg`, true, this.data.web_url !== dataDefaults.web_url))
    if (this.data.npm_package) list.push(
      new Badge('Package Quality', `https://packagequality.com/#?package=${this.data.package_name}`, `https://npm.packagequality.com/shield/${this.data.package_name}.svg`),
      new Badge('Npm monthly downloads', `https://www.npmjs.com/package/${this.data.package_name}`, `https://img.shields.io/npm/dm/${this.data.package_name}.svg?color=informational`),
      new Badge('Npm version', `https://www.npmjs.com/package/${this.data.package_name}`, `https://img.shields.io/npm/v/${this.data.package_name}.svg?color=informational`),
    )
    return list
  }

  addThanks (line = ''): void {
    // just after Thank title
    this.fileContent = this.fileContent.replace(/(## Thank.*\n\n)/, `$1${line}\n`)
    log.debug('added line', line)
  }

  async checkThanks (): Promise<void> {
    const hasSection = this.couldContains('a thanks section', /## Thanks/)
    if (!hasSection) return
    const thanks = await this.getThanks()
    for (const thank of thanks) {
      const message = `${thank.expected ? 'a' : 'no remaining'} thanks to ${thank.label}`
      const regex = new RegExp(`\\[${thank.label}]`, 'i')
      const ok = this.couldContains(message, regex, thank.expected ? 1 : 0, thank.markdown, thank.expected)
      const shouldAdd = !ok && thank.expected && thank.fixable && this.doFix
      // if (thank.label === 'Mocha') console.table({ ok, expected: thank.expected, fixable: thank.fixable, doFix: this.doFix, shouldAdd })
      if (shouldAdd) this.addThanks(thank.markdown)
    }
  }

  async getThanks (): Promise<Thanks[]> {
    const list = [
      new Thanks('Shields.io', 'https://shields.io', 'for the nice badges on top of this readme', this.fileContent.includes('shields')),
      new Thanks('Travis-ci.com', 'https://travis-ci.com', 'for providing free continuous deployments', this.fileContent.includes('travis-ci')),
      new Thanks('Github', 'https://github.com', 'for all their great work year after year, pushing OSS forward', this.fileContent.includes('github')),
      new Thanks('Netlify', 'https://netlify.com', 'awesome company that offers free CI & hosting for OSS projects', this.fileContent.includes('netlify')),
    ]
    const filePath = join(this.folderPath, 'package.json')
    if (!await pathExists(filePath)) return list
    const json = await readFile(filePath, 'utf-8')
    if (json === '') return list
    list.push(
      new Thanks('Rollup', 'https://rollupjs.org', 'a fast & efficient js module bundler', json.includes('rollup"')),
      new Thanks('Tsup', 'https://github.com/egoist/tsup', 'super fast js/ts bundler with no config, powered by esbuild <3', json.includes('tsup"')),
      new Thanks('Ava', 'https://github.com/avajs/ava', 'great test runner easy to setup & use', json.includes('ava"')),
      new Thanks('Mocha', 'https://github.com/mochajs/mocha', 'great test runner easy to setup & use', json.includes('mocha"')),
      new Thanks('Npm-run-all', 'https://github.com/mysticatea/npm-run-all', 'to keep my npm scripts clean & readable', json.includes('npm-run-all"')),
      new Thanks('C8', 'https://github.com/bcoe/c8', 'simple & effective cli for code coverage', json.includes('c8"')),
      new Thanks('Nyc', 'https://github.com/istanbuljs/nyc', 'simple & effective cli for code coverage', json.includes('nyc"')),
      new Thanks('Repo-checker', 'https://github.com/Shuunen/repo-checker', 'eslint cover /src code and this tool the rest ^^', json.includes('repo-check')),
      new Thanks('Vue', 'https://vuejs.org', 'when I need a front framework, this is the one I choose <3', json.includes('vue"')),
      new Thanks('Eslint', 'https://eslint.org', 'super tool to find & fix problems', json.includes('eslint"')),
      new Thanks('Xo', 'https://github.com/xojs/xo', 'super tool to find & fix problems', json.includes('"xo"')),
      new Thanks('Reef', 'https://reefjs.com', 'a lightweight library for creating reactive, state-based components and UI', json.includes('reefjs"')),
      new Thanks('TailwindCss', 'https://tailwindcss.com', 'awesome lib to produce maintainable style', json.includes('tailwindcss"')),
      new Thanks('Cypress.io', 'https://www.cypress.io', 'cool E2E testing framework', json.includes('cypress"')),
    )
    return list
  }

  checkTodos (): void {
    const matches = this.fileContent.match(/- \[ ] (.*)/g)
    if (matches === null) return
    for (const line of matches) {
      // a todo line in markdown is like "- [ ] add some fancy gifs"
      const todo = line.replace('- [ ] ', '')
      log.info('TODO : ' + todo)
    }
  }
}
