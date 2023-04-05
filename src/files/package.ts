/* eslint-disable security/detect-non-literal-regexp */
import { ellipsis, Nb } from 'shuutils'
import { dataDefaults } from '../constants'
import { FileBase } from '../file'
import { log } from '../logger'
import { findStringInFolder, join } from '../utils'

/* c8 ignore start */
export class PackageJsonFile extends FileBase {

  // eslint-disable-next-line max-statements
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
  }

  private checkEchoes (): void {
    ['build', 'check', 'lint', 'test'].forEach(task => {
      if (!this.fileContent.includes(`"${task}":`)) return
      this.couldContains(`a final echo for task "${task}"`, new RegExp(`"${task}": ".+ && echo [\\w\\s]*${task} \\w+"`, 'u'))
    })
  }

  private checkTsScripts (): void {
    if (!this.data.isUsingTypescript) return
    this.shouldContains('a typescript build or check', /\btsc\b/u)
    this.shouldContains('a typescript lint', /eslint [^"]+\.ts/u)
  }

  private checkScripts (): void {
    this.checkTsScripts()
    this.shouldContains('a script section', this.regexForObjectProp('scripts'))
    this.couldContains('a pre-script for version automation', /"preversion": "/u, Nb.One, 'like : "preversion": "npm run check",')
    if (this.data.isPublishedPackage) this.couldContains('a post-script for version automation', /"postversion": "/u, Nb.One, 'like : "postversion": "git push && git push --tags && npm publish",')
    else this.couldContains('a post-script for version automation', /"postversion": "/u, Nb.One, 'like : "postversion": "git push && git push --tags",')
    if (this.fileContent.includes('"prepublish"')) this.shouldContains('"prepare" instead of "prepublish" (deprecated)', /"prepublish"/u, Nb.None)
    if (this.fileContent.includes('watchlist')) this.couldContains('watchlist eager param', /-eager --/u, Nb.One, 'like watchlist src tests -eager -- npm run test')
    if (this.data.isUsingDependencyCruiser) this.shouldContains('a depcruise usage', /depcruise\s/u, Nb.One, false, 'like "depcruise src --config"')
    if (!this.fileContent.includes('github.com/Shuunen')) return
    this.couldContains('a check script', /"check": "/u, Nb.One, 'like "check": "npm run build && npm run lint ...')
  }

  private checkBuild (): void {
    if (!this.fileContent.includes('"build":')) return
    if (this.fileContent.includes('parcel build')) this.shouldContains('a parcel build with report enabled', /"parcel build.*--detailed-report",/u)
  }

  private checkEslintUsages (): void {
    if (this.data.isUsingTailwind) this.couldContains('an eslint tailwindcss plugin', /"eslint-plugin-tailwindcss"/u)
    const hasCacheFlag = this.couldContains('eslint cache flag', /eslint[^\n"&']+--cache/u, Nb.One, 'like "eslint --cache ..."', true)
    if (!hasCacheFlag && this.canFix) this.fileContent = this.fileContent.replace('eslint ', 'eslint --cache ')
  }

  private suggestAlternatives (): void {
    this.couldContains('no fat color dependency, use shuutils or nanocolors', /"(?:chalk|colorette|colors)"/u, Nb.None)
    this.couldContains('no fat fs-extra dependency, use native fs', /"fs-extra"/u, Nb.None)
    this.couldContains('no utopian shuunen-stack dependency', /"shuunen-stack"/u, Nb.None)
    this.couldContains('no fat task runner, use npm run xyz && npm run abc for sequential or zero-deps package : npm-parallel', /"npm-run-all"/u, Nb.None)
    if (this.fileContent.includes('esbuild-plugin-run')) this.couldContains('not fat ts runner, use "typescript-run" like "dev": "ts-run src --watch" or "ts-run src -w src another-folder"')
  }

  private regexForStringProp (name = ''): RegExp {
    return new RegExp(`"${name}": ".+"`, 'u')
  }

  private regexForStringValueProp (name = '', value = ''): RegExp {
    return new RegExp(`"${name}": "${value}"`, 'u')
  }

  private regexForObjectProp (name = ''): RegExp {
    return new RegExp(`"${name}": \\{\n`, 'u')
  }

  private regexForArrayProp (name = ''): RegExp {
    return new RegExp(`"${name}": \\[\n`, 'u')
  }

  private regexForBooleanProp (name = ''): RegExp {
    return new RegExp(`"${name}": (?:false|true),\n`, 'u')
  }

  public async start (): Promise<void> {
    const hasFile = await this.checkFileExists('package.json')
    if (!hasFile) return
    await this.inspectFile('package.json')
    await this.checkMainFile()
    this.checkProperties()
    this.checkScripts()
    this.checkEchoes()
    this.checkBuild()
    await this.checkDependencies()
    this.suggestAlternatives()
  }

  private async checkMaxSize (filePath: string, maxSizeKo: number): Promise<void> {
    const hasMaxSize = this.test(maxSizeKo !== dataDefaults.maxSizeKo, 'main file maximum size is specified in data file (ex: maxSizeKo: 100)', true)
    if (!hasMaxSize) return
    const hasFile = await this.checkFileExists(filePath)
    this.test(hasFile, `main file specified in package.json (${filePath}) exists on disk (be sure to build before run repo-check)`)
    if (!hasFile) return
    const sizeKo = await this.getFileSizeInKo(filePath)
    const isSizeOk = sizeKo <= maxSizeKo
    this.test(isSizeOk, `main file size (${sizeKo}ko) should be less or equal to max size allowed (${maxSizeKo}Ko)`)
  }

  private async checkMainFile (): Promise<void> {
    const mainFilePath = /"main": "(?<path>.*)"/u.exec(this.fileContent)?.groups?.path
    if (mainFilePath === undefined) {
      log.debug('no main file specified in package.json')
      return
    }
    const { maxSizeKo } = this.data
    await this.checkMaxSize(mainFilePath, maxSizeKo)
  }

  // eslint-disable-next-line max-statements
  private async checkDependencies (): Promise<void> {
    const hasDependencies = this.checkContains(this.regexForObjectProp('dependencies'))
    const hasDevelopmentDependencies = this.checkContains(this.regexForObjectProp('devDependencies'))
    if (!hasDependencies && !hasDevelopmentDependencies) return
    /* annoying deps */
    if (this.data.shouldAvoidSass) this.shouldContains('no sass dependency (fat & useless)', /sass/u, Nb.None)
    this.shouldContains('no cross-var dependency (old & deprecated)', /"cross-var"/u, Nb.None)
    this.shouldContains('no tslint dependency (deprecated)', /tslint/u, Nb.None)
    this.shouldContains('no eslint-plugin-promise 5 dependency (require eslint 7)', /"eslint-plugin-promise": "\^?5/u, Nb.None)
    /* useless precision in deps versions */
    const hasNoPatch = this.couldContains('no patch precision', /\s{4}".+":\s"\^?\d+\.\d+\.\d+"/gu, Nb.None, 'patch precision is rarely useful', true)
    // eslint-disable-next-line prefer-named-capture-group, regexp/prefer-named-capture-group
    if (!hasNoPatch && this.canFix) this.fileContent = this.fileContent.replace(/(\s{4}".+":\s"\^?\d+\.\d+)\.\d+/gu, '$1')
    /* duplicates */
    const hasUt = /"(?<tool>mocha|uvu)"/u.exec(this.fileContent)?.groups?.tool !== undefined
    this.test(hasUt, 'one unit testing dependency from : mocha, uvu', true)
    const hasCoverage = /"(?<tool>c8|nyc)"/u.exec(this.fileContent)?.groups?.tool !== undefined
    this.test(hasCoverage, 'one coverage dependency from : nyc, c8', true)
    /* usages */
    if (this.data.isUsingEslint) this.checkEslintUsages()
    if (this.fileContent.includes('"uvu"')) await this.checkUvuUsages()
  }

  private async checkUvuUsages (): Promise<void> {
    const badAssert = await findStringInFolder(join(this.folderPath, 'tests'), 'from \'assert\'')
    this.test(badAssert.length === Nb.Zero, `assert dependency used in "${ellipsis(badAssert.join(','), Nb.OneHalf * Nb.Hundred)}", import { equal } from 'uvu/assert' instead (works also as deepEqual alternative)`)
  }
}

/* c8 ignore stop */
