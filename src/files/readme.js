import { File } from '../file'
import { log } from '../logger'
import { readFileInFolder } from '../utils'

const thanks = (label, link, description) => {
  const markdown = `- [${label}](${link}) : ${description}`
  return { label, link, description, markdown }
}

export class ReadmeFile extends File {
  async start () {
    const exists = await this.checkFileExists('README.md')
    if (!exists) return
    await this.inspectFile('README.md')
    this.shouldContains('a title', /^#\s\w+/)
    this.couldContains('a demo gif', /docs\/demo.gif\)/, 1, '![demo](docs/demo.gif)')
    this.shouldContains('no link to deprecated *.netlify.com', /(.*)\.netlify\.com/, 0)
    this.shouldContains('no links without https scheme', /[^:]\/\/[\w-]+\.\w+/, 0) // https://stackoverflow.com/questions/9161769/url-without-httphttps
    await this.checkBadges()
    await this.checkThanks()
    await this.checkTodos()
  }

  async checkBadges () {
    this.shouldContains('a badge with project licence', /shields\.io\/github\/license/)
    this.shouldContains('a badge with build status', /]\(https:\/\/travis-ci.org\//)
    if (this.data.web_published) this.couldContains('a badge with website link', /shields\.io\/website/, 1, '[![Website Up](https://img.shields.io/website/https/my-website.com.svg)](https://my-website.com)')
    if (!this.data.npm_package) return
    this.couldContains('a badge with package quality', /npm\.packagequality\.com\/shield/, 1, `[![Package Quality](https://npm.packagequality.com/shield/${this.data.package_name}.svg)](https://packagequality.com/#?package=${this.data.package_name})`)
    this.couldContains('a badge with package version', /shields\.io\/npm\/v/, 1, `[![npm version](https://img.shields.io/npm/v/${this.data.package_name}.svg?color=informational)](https://www.npmjs.com/package/${this.data.package_name})`)
    this.couldContains('a badge with package downloads per month', /shields\.io\/npm\/dm/, 1, `[![npm monthly downloads](https://img.shields.io/npm/dm/${this.data.package_name}.svg?color=informational)](https://www.npmjs.com/package/${this.data.package_name})`)
  }

  async checkThanks () {
    const hasThanks = this.couldContains('a thanks section', /## Thanks/)
    if (!hasThanks) return
    const expected = await this.getExpectedThanks()
    expected.forEach(thank => this.couldContains(`a thanks to ${thank.label}`, new RegExp(`\\[${thank.label}]`), 1, thank.markdown))
  }

  async getExpectedThanks () {
    const list = []
    if (this.fileContent.includes('shields.io')) list.push(thanks('Shields.io', 'https://shields.io', 'for the nice badges on top of this readme'))
    if (this.fileContent.includes('travis-ci')) list.push(thanks('Travis-ci.org', 'https://travis-ci.org', 'for providing free continuous deployments'))
    if (this.fileContent.includes('github')) list.push(thanks('Github', 'https://github.com', 'for all their great work year after year, pushing OSS forward'))
    if (this.fileContent.includes('netlify')) list.push(thanks('Netlify', 'https://netlify.com', 'awesome company that offers free CI & hosting for OSS projects'))
    const json = await readFileInFolder(this.folderPath, 'package.json', true)
    if (json === '') return list
    if (json.includes('rollup"')) list.push(thanks('Rollup', 'https://rollupjs.org', 'a fast & efficient js module bundler'))
    if (json.includes('ava"')) list.push(thanks('Ava', 'https://github.com/avajs/ava', 'great test runner easy to setup & use'))
    if (json.includes('npm-run-all"')) list.push(thanks('Npm-run-all', 'https://github.com/mysticatea/npm-run-all', 'to keep my npm scripts clean & readable'))
    if (json.includes('nyc"')) list.push(thanks('Nyc', 'https://github.com/istanbuljs/nyc', 'an Istanbul cli easy to setup & use along Ava'))
    if (json.includes('repo-check')) list.push(thanks('Repo-checker', 'https://github.com/Shuunen/repo-checker', 'eslint cover /src code and this tool the rest ^^'))
    if (json.includes('vue"')) list.push(thanks('Vue', 'https://vuejs.org', 'when I need a front framework, this is the one I choose <3'))
    if (json.includes('eslint"')) list.push(thanks('Eslint', 'https://eslint.org', 'super tool to find & fix problems'))
    if (json.includes('reefjs"')) list.push(thanks('Reef', 'https://reefjs.com', 'a lightweight library for creating reactive, state-based components and UI'))
    if (json.includes('tailwindcss"')) list.push(thanks('TailwindCss', 'https://tailwindcss.com', 'awesome lib to produce maintainable style'))
    if (json.includes('cypress"')) list.push(thanks('Cypress.io', 'https://www.cypress.io', 'cool E2E testing framework'))
    return list
  }

  async checkTodos () {
    (this.fileContent.match(/- \[ ] (.*)/g) || []).forEach(line => {
      // a todo line in markdown is like "- [ ] add some fancy gifs"
      const todo = line.replace('- [ ] ', '')
      log.info('TODO : ' + todo)
    })
  }
}
