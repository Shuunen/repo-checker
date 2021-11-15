import { dataDefaults } from '../constants'
import { File } from '../file'
import { log } from '../logger'

export class PackageJsonFile extends File {
  async start (): Promise<void> {
    const exists = await this.checkFileExists('package.json')
    // await this.checkFileExists('package-lock.json')
    await this.checkNoFileExists('yarn.lock')
    if (!exists) return
    await this.inspectFile('package.json')
    await this.checkMainFile()
    this.checkProperties()
    this.checkScripts()
    this.checkBuild()
    this.checkDependencies()
    this.suggestAlternatives()
  }

  checkProperties (): void {
    this.couldContains('a "bugs" property', this.regexForStringProp('bugs'))
    this.couldContains('a "description" property', this.regexForStringProp('description'))
    this.couldContains('a "files" property', this.regexForArrayProp('files'))
    this.couldContains('a "homepage" property', this.regexForStringProp('homepage'))
    this.couldContains('a "keywords" property', this.regexForArrayProp('keywords'))
    this.couldContains('a "private" property', this.regexForBooleanProp('private'))
    this.couldContains('a "repository" property', this.regexForObjectProp('repository'))
    this.shouldContains('a "author" property', this.regexForStringProp('author'))
    this.shouldContains('a "name" property', this.regexForStringProp('name'))
    this.shouldContains('a "version" property', this.regexForStringProp('version'))
    const hasLicence = this.shouldContains('a "license" property', this.regexForStringProp('license'))
    if (hasLicence) this.shouldContains(`a ${this.data.license} license`, this.regexForStringValueProp('license', this.data.license))
    this.couldContains('no engines section', /"engines"/, 0)
  }

  async checkMainFile (): Promise<void> {
    const mainFilePath = /"main": "(.*)"/.exec(this.fileContent)?.[1] ?? ''
    if (mainFilePath.length === 0) {
      log.debug('no main file specified in package.json')
      return
    }
    const maxSizeKo = this.data.max_size_ko
    const ok = this.test(maxSizeKo !== dataDefaults.max_size_ko, 'main file maximum size is specified in data file (ex: max_size_ko: 100)', true)
    if (!ok) return
    const exists = await this.checkFileExists(mainFilePath)
    this.test(exists, `main file specified in package.json (${mainFilePath}) exists on disk (be sure to build before run repo-check)`)
    if (!exists) return
    const sizeKo = await this.getFileSizeInKo(mainFilePath)
    const sizeOk = sizeKo <= maxSizeKo
    this.test(sizeOk, `main file size (${sizeKo}Ko) should be less or equal to max size allowed (${maxSizeKo}Ko)`)
  }

  checkScripts (): void {
    this.shouldContains('a script section', this.regexForObjectProp('scripts'))
    this.couldContains('a pre-script for version automation', /"preversion": "/, 1, 'like : "preversion": "npm run ci",')
    if (this.data.npm_package) this.couldContains('a post-script for version automation', /"postversion": "/, 1, 'like : "postversion": "git push && git push --tags && npm publish",')
    else this.couldContains('a post-script for version automation', /"postversion": "/, 1, 'like : "postversion": "git push && git push --tags",')
    if (this.fileContent.includes('"prepublish"')) this.shouldContains('"prepare" instead of "prepublish" (deprecated)', /"prepublish"/, 0)
    if (!this.fileContent.includes('github.com/Shuunen')) return
    this.couldContains('a repo-check script', /"check": "repo-check"/, 1, '(don\'t forget to npm i repo-check)')
    this.couldContains('a ci script', /"ci": "/, 1, 'like "ci": "run-s build lint check test" (don\'t forget to npm i npm-run-all)')
  }

  checkBuild (): void {
    if (!this.fileContent.includes('"build":')) return
    if (this.data.dev_deps_only) this.shouldContains('only dev dependencies for build-able projects', this.regexForObjectProp('dependencies'), 0)
    if (this.fileContent.includes('parcel build')) this.shouldContains('a parcel build with report enabled', /"parcel build.*--detailed-report",/)
  }

  checkDependencies (): void {
    const hasDependencies = this.checkContains(this.regexForObjectProp('dependencies'))
    const hasDevelopmentDependencies = this.checkContains(this.regexForObjectProp('devDependencies'))
    if (!hasDependencies && !hasDevelopmentDependencies) return
    /* annoying deps */
    if (this.data.ban_sass === undefined || this.data.ban_sass) this.shouldContains('no sass dependency (fat & useless)', /sass/, 0)
    this.shouldContains('no cross-var dependency (old & deprecated)', /"cross-var"/, 0)
    this.shouldContains('no tslint dependency (deprecated)', /tslint/, 0)
    const ok = this.couldContains('no patch precision', /\s{4}".+":\s"\^?\d+\.\d+\.\d+/g, 0, 'patch precision is rarely useful', true)
    if (!ok && this.doFix) this.fileContent = this.fileContent.replace(/(\s{4}".+":\s"\^?\d+\.\d+)(\.\d+)/g, '$1')
  }

  suggestAlternatives (): void {
    this.couldContains('no fat color dependency, use shuutils or nanocolors', /"(colorette|chalk|colors)"/, 0)
    this.couldContains('no fat fs-extra dependency, use native fs', /"fs-extra"/, 0)
    this.couldContains('no utopian shuunen-stack dependency', /"shuunen-stack"/, 0)
  }

  regexForStringProp (name = ''): RegExp {
    return new RegExp(`"${name}":\\s".+"`)
  }

  regexForStringValueProp (name = '', value = ''): RegExp {
    return new RegExp(`"${name}":\\s"${value}"`)
  }

  regexForObjectProp (name = ''): RegExp {
    return new RegExp(`"${name}":\\s{\n`)
  }

  regexForArrayProp (name = ''): RegExp {
    return new RegExp(`"${name}":\\s\\[\n`)
  }

  regexForBooleanProp (name = ''): RegExp {
    return new RegExp(`"${name}":\\s(?:false|true),\n`)
  }
}
