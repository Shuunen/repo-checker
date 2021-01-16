import { dataDefaults } from '../constants'
import { File } from '../file'
import { log } from '../logger'
import { readFileInFolder } from '../utils'

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
    badges.forEach(badge => {
      const ok = this.couldContains(`${badge.expected ? 'a' : 'no'} "${badge.label}" badge`, new RegExp(`\\(${badge.link}\\)`), badge.expected ? 1 : 0, badge.markdown, badge.expected)
      if (!ok && badge.expected && badge.fixable && this.doFix) this.addBadge(badge.markdown)
    })
  }

  async getBadges (): Promise<Badge[]> {
    const userRepo = `${this.data.user_id}/${this.data.repo_id}`
    const list = [
      new Badge('Project license', `https://github.com/${userRepo}/blob/master/LICENSE`, `https://img.shields.io/github/license/${userRepo}.svg?color=informational`),
      new Badge('Build status', `https://travis-ci.com/${userRepo}`, `https://travis-ci.com/${userRepo}.svg?branch=master`),
    ]
    if (this.data.web_published && !this.fileContent.includes('shields.io/website/'))
      list.push(new Badge('Website up', this.data.web_url, `https://img.shields.io/website/https/${this.data.web_url.replace('https://', '')}.svg`, true, this.data.web_url !== dataDefaults.web_url))
    if (this.data.npm_package) {
      list.push(new Badge('Package Quality', `https://packagequality.com/#?package=${this.data.package_name}`, `https://npm.packagequality.com/shield/${this.data.package_name}.svg`))
      list.push(new Badge('Npm monthly downloads', `https://www.npmjs.com/package/${this.data.package_name}`, `https://img.shields.io/npm/dm/${this.data.package_name}.svg?color=informational`))
      list.push(new Badge('Npm version', `https://www.npmjs.com/package/${this.data.package_name}`, `https://img.shields.io/npm/v/${this.data.package_name}.svg?color=informational`))
    }
    return list
  }

  addThanks (line = ''): void {
    // just after Thank title
    this.fileContent = this.fileContent.replace(/(## Thank.*\n\n)/, `$1${line}\n`)
  }

  async checkThanks (): Promise<void> {
    const hasSection = this.couldContains('a thanks section', /## Thanks/)
    if (!hasSection) return
    const thanks = await this.getThanks()
    thanks.forEach(thank => {
      const ok = this.couldContains(`${thank.expected ? 'a' : 'no remaining'} thanks to ${thank.label}`, new RegExp(`\\[${thank.label}]`, 'i'), thank.expected ? 1 : 0, thank.markdown, thank.expected)
      if (!ok && thank.expected && thank.fixable && this.doFix) this.addThanks(thank.markdown)
    })
  }

  async getThanks (): Promise<Thanks[]> {
    const list = [
      new Thanks('Shields.io', 'https://shields.io', 'for the nice badges on top of this readme', this.fileContent.includes('shields')),
      new Thanks('Travis-ci.com', 'https://travis-ci.com', 'for providing free continuous deployments', this.fileContent.includes('travis-ci')),
      new Thanks('Github', 'https://github.com', 'for all their great work year after year, pushing OSS forward', this.fileContent.includes('github')),
      new Thanks('Netlify', 'https://netlify.com', 'awesome company that offers free CI & hosting for OSS projects', this.fileContent.includes('netlify')),
    ]
    const json = await readFileInFolder(this.folderPath, 'package.json')
    if (json === '') return list
    list.push(new Thanks('Rollup', 'https://rollupjs.org', 'a fast & efficient js module bundler', json.includes('rollup"')))
    list.push(new Thanks('Ava', 'https://github.com/avajs/ava', 'great test runner easy to setup & use', json.includes('ava"')))
    list.push(new Thanks('Mocha', 'https://github.com/mochajs/mocha', 'great test runner easy to setup & use', json.includes('mocha"')))
    list.push(new Thanks('Npm-run-all', 'https://github.com/mysticatea/npm-run-all', 'to keep my npm scripts clean & readable', json.includes('npm-run-all"')))
    list.push(new Thanks('C8', 'https://github.com/bcoe/c8', 'simple & effective cli for code coverage', json.includes('c8"')))
    list.push(new Thanks('Nyc', 'https://github.com/istanbuljs/nyc', 'simple & effective cli for code coverage', json.includes('nyc"')))
    list.push(new Thanks('Repo-checker', 'https://github.com/Shuunen/repo-checker', 'eslint cover /src code and this tool the rest ^^', json.includes('repo-check')))
    list.push(new Thanks('Vue', 'https://vuejs.org', 'when I need a front framework, this is the one I choose <3', json.includes('vue"')))
    list.push(new Thanks('Eslint', 'https://eslint.org', 'super tool to find & fix problems', json.includes('eslint"')))
    list.push(new Thanks('Reef', 'https://reefjs.com', 'a lightweight library for creating reactive, state-based components and UI', json.includes('reefjs"')))
    list.push(new Thanks('TailwindCss', 'https://tailwindcss.com', 'awesome lib to produce maintainable style', json.includes('tailwindcss"')))
    list.push(new Thanks('Cypress.io', 'https://www.cypress.io', 'cool E2E testing framework', json.includes('cypress"')))
    return list
  }

  checkTodos (): void {
    const matches = this.fileContent.match(/- \[ ] (.*)/g)
    if (matches === null) return
    matches.forEach(line => {
      // a todo line in markdown is like "- [ ] add some fancy gifs"
      const todo = line.replace('- [ ] ', '')
      log.info('TODO : ' + todo)
    })
  }
}
