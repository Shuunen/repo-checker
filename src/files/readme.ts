/* eslint-disable regexp/no-unused-capturing-group */
/* eslint-disable regexp/prefer-named-capture-group */
/* eslint-disable prefer-named-capture-group */
/* eslint-disable max-classes-per-file */
import { dataDefaults } from '../constants'
import { FileBase } from '../file'
import { log } from '../logger'
import { fileExists, join, readFile } from '../utils'

class Thanks {
  public markdown = ''

  // eslint-disable-next-line max-params, @typescript-eslint/parameter-properties
  public constructor (public label = '', public link = '', public description = '', public expected = false, public fixable = true) {
    this.markdown = `- [${label}](${link}) : ${description}`
  }
}

class Badge {
  public markdown = ''

  // eslint-disable-next-line max-params, @typescript-eslint/parameter-properties
  public constructor (public label = '', public link = '', public image = '', public expected = true, public fixable = true) {
    this.markdown = `[![${label}](${image})](${link})`
  }
}

const deprecatedBadges = [
  'bettercodehub.com',
  'david-dm.org',
  'lgtm.com',
]

/* c8 ignore start */
export class ReadmeFile extends FileBase {
  private checkMarkdown (): void {
    let hasNoCrLf = this.shouldContains('no CRLF Windows carriage return', /\r/u, 0, false, 'prefer Unix LF', true)
    if (!hasNoCrLf && this.canFix) this.fileContent = this.fileContent.replace(/\r\n/gu, '\n')
    const starLists = /\n\*\s[\w[]/gu
    hasNoCrLf = this.couldContains('no star flavored list', starLists, 0, 'should use dash flavor', true)
    if (!hasNoCrLf && this.canFix) this.fileContent = this.fileContent.replace(/\n\*\s(?=[\w[])/gu, '\n- ')
  }

  private addBadge (line = ''): void {
    // just after project title
    this.fileContent = this.fileContent.replace(/^(# [\s\w-]+)/u, `$1${line}\n`)
  }

  private checkBadgesDeprecated (): void {
    for (const badge of deprecatedBadges) {
      // eslint-disable-next-line security/detect-non-literal-regexp
      const isOk = this.shouldContains(`no deprecated ${badge} badge`, new RegExp(badge, 'u'), 0, false, `${badge} does not exist anymore`, true)
      // eslint-disable-next-line security/detect-non-literal-regexp
      if (!isOk && this.canFix) this.fileContent = this.fileContent.replace(new RegExp(`.*${badge}.*\n`, 'giu'), '')
    }
  }

  private checkBadgesRecommended (): void {
    const badges = this.getBadgesRecommended()
    for (const badge of badges) {
      const message = `${badge.expected ? 'a' : 'no'} "${badge.label}" badge`
      // eslint-disable-next-line security/detect-non-literal-regexp
      const regex = new RegExp(`\\(${badge.link.replace('?', '\\?')}\\)`, 'u')
      const isOk = this.couldContains(message, regex, badge.expected ? 1 : 0, badge.markdown, badge.expected)
      if (!isOk && badge.expected && badge.fixable && this.canFix) this.addBadge(badge.markdown)
    }
  }

  private checkBadges (): void {
    this.checkBadgesRecommended()
    this.checkBadgesDeprecated()
  }

  private getBadgesRecommended (): Badge[] {
    const userRepo = `${this.data.userId}/${this.data.repoId}`
    const list = [
      new Badge('Project license', `https://github.com/${userRepo}/blob/master/LICENSE`, `https://img.shields.io/github/license/${userRepo}.svg?color=informational`),
      new Badge('Code Climate maintainability', `https://codeclimate.com/github/${userRepo}`, `https://img.shields.io/codeclimate/maintainability/${userRepo}?style=flat`),
    ]
    if (this.data.isWebPublished && !this.fileContent.includes('shields.io/website/'))
      list.push(new Badge('Website up', this.data.webUrl, `https://img.shields.io/website/https/${this.data.webUrl.replace('https://', '')}.svg`, true, this.data.webUrl !== dataDefaults.webUrl))
    if (this.data.isPublishedPackage) list.push(
      new Badge('Npm monthly downloads', `https://www.npmjs.com/package/${this.data.packageName}`, `https://img.shields.io/npm/dm/${this.data.packageName}.svg?color=informational`),
      new Badge('Npm version', `https://www.npmjs.com/package/${this.data.packageName}`, `https://img.shields.io/npm/v/${this.data.packageName}.svg?color=informational`),
      new Badge('Publish size', `https://bundlephobia.com/package/${this.data.packageName}`, `https://img.shields.io/bundlephobia/min/${this.data.packageName}?label=publish%20size`),
      new Badge('Install size', `https://packagephobia.com/result?p=${this.data.packageName}`, `https://badgen.net/packagephobia/install/${this.data.packageName}`),
    )
    return list
  }

  private addThanks (line = ''): void {
    // just after Thank title
    this.fileContent = this.fileContent.replace(/(## Thank.*\n{2})/u, `$1${line}\n`)
    log.debug('added line', line)
  }

  private checkTodos (): void {
    const matches = this.fileContent.match(/- \[ \] (.*)/gu)
    if (matches === null) return
    for (const line of matches) {
      // a todo line in markdown is like "- [ ] add some fancy gifs"
      const todo = line.replace('- [ ] ', '')
      log.info(`TODO : ${todo}`)
    }
  }

  // eslint-disable-next-line max-statements
  public async start (): Promise<void> {
    const hasREADMEFile = await this.fileExists('README.md')
    const hasReadmeFile = await this.fileExists('readme.md')
    if (!hasREADMEFile && !hasReadmeFile) {
      this.test(false, 'no README.md or readme.md file found')
      return
    }
    await this.inspectFile(hasREADMEFile ? 'README.md' : 'readme.md')
    this.shouldContains('a title', /^#\s\w+/u)
    this.couldContains('a logo image', /!\[logo\]\(.*\.\w{3,4}\)/u, 1, '![logo](folder/logo.svg)')
    this.couldContains('a demo image or gif', /!\[demo\]\(.*\.\w{3,4}\)/u, 1, '![demo](folder/demo.gif)')
    this.shouldContains('no link to deprecated *.netlify.com', /\.netlify\.com/u, 0)
    this.shouldContains('no links without https scheme', /[^:]\/\/[\w-]+\.\w+/u, 0) // https://stackoverflow.com/questions/9161769/url-without-httphttps
    this.checkMarkdown()
    this.checkTodos()
    this.checkBadges()
    await this.checkThanks()
  }

  private async checkThanks (): Promise<void> {
    const hasSection = this.couldContains('a thanks section', /## Thanks/u)
    if (!hasSection) return
    const thanks = await this.getThanks()
    for (const thank of thanks) {
      const message = `${thank.expected ? 'a' : 'no remaining'} thanks to ${thank.label}`
      // eslint-disable-next-line security/detect-non-literal-regexp
      const regex = new RegExp(`\\[${thank.label}\\]`, 'iu')
      const hasThanks = this.couldContains(message, regex, thank.expected ? 1 : 0, thank.markdown, thank.expected)
      const shouldAdd = !hasThanks && thank.expected && thank.fixable && this.canFix
      if (shouldAdd) this.addThanks(thank.markdown)
    }
  }

  private async getThanks (): Promise<Thanks[]> {
    const list = [
      new Thanks('Shields.io', 'https://shields.io', 'for the nice badges on top of this readme', this.fileContent.includes('shields')),
      new Thanks('Travis-ci.com', 'https://travis-ci.com', 'for providing free continuous deployments', this.fileContent.includes('travis-ci')),
      new Thanks('Github', 'https://github.com', 'for all their great work year after year, pushing OSS forward', this.fileContent.includes('github')),
      new Thanks('Netlify', 'https://netlify.com', 'awesome company that offers free CI & hosting for OSS projects', this.fileContent.includes('netlify')),
    ]
    const filePath = join(this.folderPath, 'package.json')
    if (!(await fileExists(filePath))) return list
    const json = await readFile(filePath)
    if (json === '') return list
    list.push(
      new Thanks('Arg', 'https://github.com/vercel/arg', 'un-opinionated, no-frills CLI argument parser', json.includes('"arg":')),
      new Thanks('Ava', 'https://github.com/avajs/ava', 'great test runner easy to setup & use', json.includes('ava"')),
      new Thanks('C8', 'https://github.com/bcoe/c8', 'simple & effective cli for code coverage', this.data.isUsingC8),
      new Thanks('Chokidar', 'https://github.com/paulmillr/chokidar', 'minimal and efficient cross-platform file watching library', json.includes('"chokidar"')),
      new Thanks('Cypress.io', 'https://www.cypress.io', 'cool E2E testing framework', json.includes('cypress')),
      new Thanks('Dependency-cruiser', 'https://github.com/sverweij/dependency-cruiser', 'handy tool to validate and visualize dependencies', this.data.isUsingDependencyCruiser),
      new Thanks('Esbuild', 'https://github.com/evanw/esbuild', 'an extremely fast JavaScript bundler and minifier', json.includes('esbuild')),
      new Thanks('Eslint', 'https://eslint.org', 'super tool to find & fix problems', this.data.isUsingEslint),
      new Thanks('Mocha', 'https://github.com/mochajs/mocha', 'great test runner easy to setup & use', json.includes('mocha"')),
      new Thanks('Npm-run-all', 'https://github.com/mysticatea/npm-run-all', 'to keep my npm scripts clean & readable', json.includes('npm-run-all"')),
      new Thanks('Npm-parallel', 'https://github.com/spion/npm-parallel', 'to keep my npm scripts clean & readable', json.includes('npm-parallel"')),
      new Thanks('Nuxt', 'https://github.com/nuxt/nuxt.js', 'minimalist framework for server-rendered Vue.js applications', json.includes('"nuxt"')),
      new Thanks('Nyc', 'https://github.com/istanbuljs/nyc', 'simple & effective cli for code coverage', this.data.isUsingNyc),
      new Thanks('Reef', 'https://github.com/cferdinandi/reef', 'a lightweight library for creating reactive, state-based components and UI', json.includes('reefjs"')),
      new Thanks('Repo-checker', 'https://github.com/Shuunen/repo-checker', 'eslint cover /src code and this tool the rest ^^', json.includes('repo-check"')),
      new Thanks('Rollup', 'https://rollupjs.org', 'a fast & efficient js module bundler', json.includes('rollup"')),
      new Thanks('Servor', 'https://github.com/lukejacksonn/servor', 'dependency free dev server for single page app development', json.includes('"servor"')),
      new Thanks('Showdown', 'https://github.com/showdownjs/showdown', 'a Markdown to HTML converter written in Javascript', json.includes('"showdown"')),
      new Thanks('Shuutils', 'https://github.com/Shuunen/shuutils', 'collection of pure JS utils', this.data.isUsingShuutils),
      new Thanks('TailwindCss', 'https://tailwindcss.com', 'awesome lib to produce maintainable style', this.data.isUsingTailwind),
      new Thanks('Tsup', 'https://github.com/egoist/tsup', 'super fast js/ts bundler with no config, powered by esbuild <3', json.includes('tsup"')),
      new Thanks('UvU', 'https://github.com/lukeed/uvu', 'extremely fast and lightweight test runner for Node.js and the browser', json.includes('"uvu":')),
      new Thanks('V8', 'https://github.com/demurgos/v8-coverage', 'simple & effective cli for code coverage', this.data.isUsingV8),
      new Thanks('Vitest', 'https://github.com/vitest-dev/vitest', 'super fast vite-native testing framework', json.includes('"vitest"')),
      new Thanks('Vite', 'https://github.com/vitejs/vite', 'super fast frontend tooling', json.includes('vitejs') || json.includes('"vite"')),
      new Thanks('Vue', 'https://vuejs.org', 'when I need a front framework, this is the one I choose <3', this.data.isUsingVue),
      new Thanks('Watchlist', 'https://github.com/lukeed/watchlist', 'recursively watch a list of directories & run a command on any file system', json.includes('"watchlist"')),
      new Thanks('Xo', 'https://github.com/xojs/xo', 'super tool to find & fix problems', json.includes('"xo"')),
      // new Thanks('name', 'url', 'desc', json.includes('"xxx":')),
    )
    return list
  }
}
/* c8 ignore stop */

