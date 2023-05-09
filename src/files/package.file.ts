/* eslint-disable security/detect-non-literal-regexp */
import { ellipsis } from 'shuutils'
import { dataDefaults } from '../constants'
import { FileBase } from '../file'
import { log } from '../logger'
import { findInFolder, join } from '../utils'

export class PackageJsonFile extends FileBase {

  // eslint-disable-next-line max-statements
  private checkProperties () {
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

  private checkEchoes () {
    ['build', 'check', 'lint', 'test'].forEach(task => {
      if (!this.fileContent.includes(`"${task}":`)) return
      this.couldContains(`a final echo for task "${task}"`, new RegExp(`"${task}": ".+ && echo [\\w\\s]*${task} \\w+"`, 'u'))
    })
  }

  private checkScriptsTs () {
    if (!this.data.isUsingTypescript) return
    this.shouldContains('a typescript build or check', /\btsc\b/u)
    if (!this.fileContent.includes('vue-cli-service lint')) this.shouldContains('a typescript lint', /eslint [^"]+\.ts/u)
  }

  private checkScriptsPrePost () {
    this.couldContains('a pre-script for version automation', /"preversion": "/u, 1, 'like : "preversion": "pnpm check",')
    if (this.data.isPublishedPackage) this.couldContains('a post-script for version automation', /"postversion": "/u, 1, 'like : "postversion": "git push && git push --tags && npm publish",')
    else this.couldContains('a post-script for version automation', /"postversion": "/u, 1, 'like : "postversion": "git push && git push --tags",')
    if (this.fileContent.includes('"prepublish"')) this.shouldContains('"prepare" instead of "prepublish" (deprecated)', /"prepublish"/u, 0)
  }

  private checkScripts () {
    this.checkScriptsTs()
    this.shouldContains('a script section', this.regexForObjectProp('scripts'))
    this.checkScriptsPrePost()
    if (this.fileContent.includes('watchlist')) this.couldContains('watchlist eager param', /-eager --/u, 1, 'like watchlist src tests -eager -- pnpm test')
    if (this.data.isUsingDependencyCruiser) this.shouldContains('a depcruise usage', /depcruise\s/u, 1, false, 'like "depcruise src --config"')
    if (this.data.isUsingShuutils) this.couldContains('a unique-mark task', /unique-mark/u, 1, 'like "mark": "unique-mark public/my-file && echo mark success",')
    const isOk = this.couldContains('pnpm instead of npm run', /npm run/u, 0, 'use pnpm instead of npm run for performance', true)
    if (!isOk && this.canFix) this.fileContent = this.fileContent.replace(/npm run/gu, 'pnpm').replace(/pnpm (?<task>[\w:]+) -- -/gu, 'pnpm $<task> -') // don't use -- for pnpm
    this.couldContains('a check script', /"check": "/u, 1, 'like "check": "pnpm build && pnpm lint ...')
    this.couldContains('no ci script', /"ci": "/u, 0, 'avoid using "ci" script, use "check" instead')
  }

  private suggestAlternatives () {
    this.couldContains('no fat color dependency, use shuutils or nanocolors', /"(?:chalk|colorette|colors)"/u, 0)
    this.couldContains('no fat fs-extra dependency, use native fs', /"fs-extra"/u, 0)
    this.couldContains('no utopian shuunen-stack dependency', /"shuunen-stack"/u, 0)
    this.couldContains('no fat & slow jsdom dependency, use happy-dom instead', /jsdom/u, 0)
    this.couldContains('no fat task runner, use pnpm xyz && pnpm abc for sequential or zero-deps package : npm-parallel', /"npm-run-all"/u, 0)
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

  private checkDependenciesTesting () {
    const hasUt = /"(?<tool>mocha|uvu|vitest)"/u.exec(this.fileContent)?.groups?.tool !== undefined
    this.test(hasUt, 'one unit testing dependency from : vitest, mocha, uvu', true)
    const hasCoverage = /"(?<tool>c8|nyc|@vitest\/coverage-c8)"/u.exec(this.fileContent)?.groups?.tool !== undefined
    this.test(hasCoverage, 'one coverage dependency from : nyc, c8', true)
  }

  private checkDependenciesUnwanted () {
    if (this.data.shouldAvoidSass) this.shouldContains('no sass dependency (fat & useless)', /sass/u, 0)
    this.shouldContains('no cross-var dependency (old & deprecated)', /"cross-var"/u, 0)
    this.shouldContains('no tslint dependency (deprecated)', /tslint/u, 0)
    this.shouldContains('no eslint-plugin-promise 5 dependency (require eslint 7)', /"eslint-plugin-promise": "\^?5/u, 0)
  }

  private checkDependenciesPrecision () {
    const hasNoPatch = this.couldContains('no patch precision', /\s{4}".+":\s"\^?\d+\.\d+\.\d+"/gu, 0, 'patch precision is rarely useful', true)
    // eslint-disable-next-line prefer-named-capture-group, regexp/prefer-named-capture-group
    if (!hasNoPatch && this.canFix) this.fileContent = this.fileContent.replace(/(\s{4}".+":\s"\^?\d+\.\d+)\.\d+/gu, '$1')
  }

  private checkDependenciesUsagesEslint () {
    if (this.data.isUsingTailwind) this.couldContains('an eslint tailwindcss plugin', /"eslint-plugin-tailwindcss"/u)
    const isUsingEslintCli = this.fileContent.includes('eslint ')
    if (isUsingEslintCli) {
      const hasCacheFlag = this.couldContains('eslint cache flag', /eslint[^\n"&']+--cache/u, 1, 'like "eslint --cache ..."', true)
      if (!hasCacheFlag && this.canFix) this.fileContent = this.fileContent.replace('eslint ', 'eslint --cache ')
      this.couldContains('no eslint ignore flag, solution 1 : just remove it (useless most of the time, check "DEBUG=eslint:cli-engine npx eslint ..." to see linted files) or solution 2 : use ignorePatterns inside .eslintrc.json. The objective here is to let the eslint cli & vscode eslint use the same config', /eslint[^\n"&']+--ignore-path/u, 0)
    }
  }

  public async start (): Promise<void> {
    const hasFile = await this.checkFileExists('package.json')
    if (!hasFile) return
    await this.inspectFile('package.json')
    await this.checkMainFile()
    this.checkProperties()
    this.checkScripts()
    this.checkEchoes()
    await this.checkDependencies()
    this.suggestAlternatives()
  }

  private async checkMaxSize (filePath: string, maxSizeKo: number): Promise<void> {
    const hasMaxSize = this.test(maxSizeKo !== dataDefaults.maxSizeKo, 'main file maximum size is specified in data file (ex: maxSizeKo: 100)', true)
    if (!hasMaxSize) return
    const hasFile = await this.checkFileExists(filePath)
    this.test(hasFile, `main file specified in package.json (${filePath}) exists on disk (be sure to build before run repo-check)`)
    /* c8 ignore next */
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
    await this.checkMaxSize(mainFilePath, this.data.maxSizeKo)
  }

  private async checkDependenciesUsagesUvu (): Promise<void> {
    const badAsserts = await findInFolder(join(this.folderPath, 'tests'), /from 'assert'/u)
    const logMaxLength = 50
    this.test(badAsserts.length === 0, `assert dependency used in "${ellipsis(badAsserts.join(','), logMaxLength)}", import { equal } from 'uvu/assert' instead (works also as deepEqual alternative)`)
  }

  private async checkDependenciesUsagesNode () {
    const badUsages = await findInFolder(this.folderPath, /ts-node(?:-esm)? (?:(?!transpileOnly).)*$/gmu)
    this.test(badUsages.length === 0, `ts-node without --transpileOnly detected in file(s) : ${badUsages.join(', ')}`, true)
  }

  private async checkDependenciesUsages () {
    if (this.data.isUsingEslint) this.checkDependenciesUsagesEslint()
    if (this.fileContent.includes('"uvu"')) await this.checkDependenciesUsagesUvu()
    if (this.fileContent.includes('ts-node')) await this.checkDependenciesUsagesNode()
  }

  private async checkDependencies (): Promise<void> {
    const hasDependencies = this.checkContains(this.regexForObjectProp('dependencies'))
    const hasDevelopmentDependencies = this.checkContains(this.regexForObjectProp('devDependencies'))
    /* c8 ignore next */
    if (!hasDependencies && !hasDevelopmentDependencies) return
    this.checkDependenciesUnwanted()
    this.checkDependenciesPrecision()
    this.checkDependenciesTesting()
    await this.checkDependenciesUsages()
  }

}
