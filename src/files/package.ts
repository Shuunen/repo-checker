import { ellipsis } from 'shuutils/dist/strings'
import { dataDefaults } from '../constants'
import { File } from '../file'
import { log } from '../logger'
import { findStringInFolder, join } from '../utils'

/* c8 ignore start */
export class PackageJsonFile extends File {
  public async start (): Promise<void> {
    const exists = await this.checkFileExists('package.json')
    if (!exists) return
    await this.inspectFile('package.json')
    await this.checkMainFile()
    this.checkProperties()
    this.checkScripts()
    this.checkBuild()
    await this.checkDependencies()
    this.suggestAlternatives()
  }

  private checkProperties (): void {
    this.couldContainsSchema('https://json.schemastore.org/package')
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

  private async checkMainFile (): Promise<void> {
    const mainFilePath = /"main": "(.*)"/.exec(this.fileContent)?.[1] ?? ''
    if (mainFilePath.length === 0) {
      log.debug('no main file specified in package.json')
      return
    }
    const maxSizeKo = this.data.maxSizeKo
    const ok = this.test(maxSizeKo !== dataDefaults.maxSizeKo, 'main file maximum size is specified in data file (ex: maxSizeKo: 100)', true)
    if (!ok) return
    const exists = await this.checkFileExists(mainFilePath)
    this.test(exists, `main file specified in package.json (${mainFilePath}) exists on disk (be sure to build before run repo-check)`)
    if (!exists) return
    const sizeKo = await this.getFileSizeInKo(mainFilePath)
    const sizeOk = sizeKo <= maxSizeKo
    log.debug(`main file size is ${sizeKo}ko (max ${maxSizeKo}ko)`)
    this.test(sizeOk, `main file size should be less or equal to max size allowed (${maxSizeKo}Ko)`)
  }

  private checkScripts (): void {
    this.shouldContains('a script section', this.regexForObjectProp('scripts'))
    this.couldContains('a pre-script for version automation', /"preversion": "/, 1, 'like : "preversion": "npm run ci",')
    if (this.data.npmPackage) this.couldContains('a post-script for version automation', /"postversion": "/, 1, 'like : "postversion": "git push && git push --tags && npm publish",')
    else this.couldContains('a post-script for version automation', /"postversion": "/, 1, 'like : "postversion": "git push && git push --tags",')
    if (this.fileContent.includes('"prepublish"')) this.shouldContains('"prepare" instead of "prepublish" (deprecated)', /"prepublish"/, 0)
    if (this.data.useTypescript) this.shouldContains('a typescript build or check', /(tsc)|(tsc --noEmit)/)
    if (this.fileContent.includes('watchlist')) this.couldContains('watchlist eager param', /-eager --/, 1, 'like watchlist src tests -eager -- npm run test')
    if (!this.fileContent.includes('github.com/Shuunen')) return
    if (this.data.packageName !== 'repo-check') this.couldContains('a repo-check script', /"check": "repo-check"/, 1, '(don\'t forget to npm i repo-check)')
    this.couldContains('a ci script', /"ci": "/, 1, 'like "ci": "npm run build && npm run lint ...')
  }

  private checkBuild (): void {
    if (!this.fileContent.includes('"build":')) return
    if (this.fileContent.includes('parcel build')) this.shouldContains('a parcel build with report enabled', /"parcel build.*--detailed-report",/)
  }

  private async checkDependencies (): Promise<void> {
    const hasDependencies = this.checkContains(this.regexForObjectProp('dependencies'))
    const hasDevelopmentDependencies = this.checkContains(this.regexForObjectProp('devDependencies'))
    if (!hasDependencies && !hasDevelopmentDependencies) return
    /* annoying deps */
    if (this.data.banSass) this.shouldContains('no sass dependency (fat & useless)', /sass/, 0)
    this.shouldContains('no cross-var dependency (old & deprecated)', /"cross-var"/, 0)
    this.shouldContains('no tslint dependency (deprecated)', /tslint/, 0)
    this.shouldContains('no eslint-plugin-promise 5 dependency (require eslint 7)', /"eslint-plugin-promise": "\^?5/, 0)
    /* useless precision in deps versions */
    const ok = this.couldContains('no patch precision', /\s{4}".+":\s"\^?\d+\.\d+\.\d+"/g, 0, 'patch precision is rarely useful', true)
    if (!ok && this.doFix) this.fileContent = this.fileContent.replace(/(\s{4}".+":\s"\^?\d+\.\d+)(\.\d+)/g, '$1')
    /* duplicates */
    const hasUt = /"(mocha|uvu)"/.exec(this.fileContent)?.[1] !== undefined
    this.test(hasUt, 'one unit testing dependency from : mocha, uvu', true)
    const hasCoverage = /"(nyc|c8)"/.exec(this.fileContent)?.[1] !== undefined
    this.test(hasCoverage, 'one coverage dependency from : nyc, c8', true)
    /* usages */
    if (this.data.useEslint) this.checkEslintUsages()
    if (this.fileContent.includes('"uvu"')) await this.checkUvuUsages()
  }

  private checkEslintUsages (): void {
    if (this.data.useTailwind) this.couldContains('an eslint tailwindcss plugin', /"eslint-plugin-tailwindcss"/)
    const ok = this.couldContains('eslint cache flag', /eslint[^\n"&']+--cache/, 1, 'like "eslint --cache ..."', true)
    if (!ok && this.doFix) this.fileContent = this.fileContent.replace('eslint ', 'eslint --cache ')
  }

  private async checkUvuUsages (): Promise<void> {
    const badAssert = await findStringInFolder(join(this.folderPath, 'tests'), 'from \'assert\'')
    this.test(badAssert.length === 0, `assert dependency used in "${ellipsis(badAssert.join(','), 50)}", import { equal } from 'uvu/assert' instead (works also as deepEqual alternative)`)
  }

  private suggestAlternatives (): void {
    this.couldContains('no fat color dependency, use shuutils or nanocolors', /"(colorette|chalk|colors)"/, 0)
    this.couldContains('no fat fs-extra dependency, use native fs', /"fs-extra"/, 0)
    this.couldContains('no utopian shuunen-stack dependency', /"shuunen-stack"/, 0)
    this.couldContains('no fat task runner, use npm run xyz && npm run abc for sequential or zero-deps package : npm-parallel', /"npm-run-all"/, 0)
    if (this.fileContent.includes('esbuild-plugin-run')) this.couldContains('not fat ts runner, use "typescript-run" like "dev": "ts-run src --watch" or "ts-run src -w src another-folder"')
  }

  private regexForStringProp (name = ''): RegExp {
    return new RegExp(`"${name}":\\s".+"`)
  }

  private regexForStringValueProp (name = '', value = ''): RegExp {
    return new RegExp(`"${name}":\\s"${value}"`)
  }

  private regexForObjectProp (name = ''): RegExp {
    return new RegExp(`"${name}":\\s{\n`)
  }

  private regexForArrayProp (name = ''): RegExp {
    return new RegExp(`"${name}":\\s\\[\n`)
  }

  private regexForBooleanProp (name = ''): RegExp {
    return new RegExp(`"${name}":\\s(?:false|true),\n`)
  }
}
/* c8 ignore stop */
