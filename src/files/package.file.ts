/* eslint-disable jsdoc/require-jsdoc */
import { ellipsis } from 'shuutils'
import packageJson from '../../package.json' with { type: 'json' }
import { dataDefaults } from '../constants.ts'
import { FileBase } from '../file.ts'
import { log } from '../logger.ts'
import { findInFolder, join } from '../utils.ts'

// eslint-disable-next-line no-restricted-syntax
export class PackageJsonFile extends FileBase {
  private async checkDependencies() {
    const hasDependencies = this.checkContains(this.regexForObjectProp('dependencies'))
    const hasDevelopmentDependencies = this.checkContains(this.regexForObjectProp('devDependencies'))
    /* c8 ignore next */
    if (!(hasDependencies || hasDevelopmentDependencies)) return
    this.checkDependenciesUnwanted()
    this.checkDependenciesPrecision()
    this.checkDependenciesTesting()
    this.checkDependenciesVersions()
    await this.checkDependenciesUsages()
    this.checkTasks()
  }

  private checkDependenciesPrecision() {
    const hasNoPatch = this.couldContains('no patch precision', /^\s{4}".+":\s"\^?\d+\.\d+\.\d+"/gmu, 0, 'patch precision is rarely useful', true)
    // eslint-disable-next-line prefer-named-capture-group
    if (!hasNoPatch && this.canFix) this.fileContent = this.fileContent.replaceAll(/(^\s{4}".+":\s"\^?\d+\.\d+)\.\d+/gmu, '$1')
  }

  private checkDependenciesTesting() {
    const useBunTest = this.fileContent.includes('bun test')
    const hasUt = /"(?<tool>mocha|uvu|vitest)"/u.exec(this.fileContent)?.groups?.tool !== undefined
    this.test(hasUt || useBunTest, 'should have one unit testing dependency from : vitest, mocha, uvu or use bun test', true)
    const useBunTestCoverage = this.fileContent.includes('bun test --coverage')
    const hasCoverage = /"(?<tool>c8|@vitest\/coverage-c8|@vitest\/coverage-v8|nyc|bun test)"/u.exec(this.fileContent)?.groups?.tool !== undefined
    this.test(hasCoverage || useBunTestCoverage, 'should have one coverage dependency from : nyc, c8, v8 or use bun test --coverage', true)
  }

  private checkDependenciesUnwanted() {
    if (this.data.shouldAvoidSass) this.shouldContains('no sass dependency (fat & useless)', /sass/u, 0)
    this.shouldContains('no cross-var dependency (old & deprecated)', /"cross-var"/u, 0)
    this.shouldContains('no tslint dependency (deprecated)', /tslint/u, 0)
    this.shouldContains('no eslint-plugin-promise 5 dependency (require eslint 7)', /"eslint-plugin-promise": "\^?5/u, 0)
  }

  private async checkDependenciesUsages() {
    if (this.data.isUsingEslint) this.checkDependenciesUsagesEslint()
    if (this.fileContent.includes('"uvu"')) await this.checkDependenciesUsagesUvu()
    if (this.fileContent.includes('ts-node')) await this.checkDependenciesUsagesNode()
  }

  // eslint-disable-next-line max-lines-per-function
  private checkDependenciesUsagesEslint() {
    this.shouldContains('an eslint dependency', /"eslint"/u)
    this.shouldContains('no eslint@8 dependency', /"eslint": ".?8/u, 0)
    const isUsingEslintCli = this.fileContent.includes('"eslint ')
    if (isUsingEslintCli) {
      const hasCacheFlag = this.couldContains('eslint cache flag', /eslint[^\n"&']+--cache/u, 1, 'like "eslint --cache ..."', true)
      if (!hasCacheFlag && this.canFix) this.fileContent = this.fileContent.replace('eslint ', 'eslint --cache ')
      this.couldContains(
        'no eslint ignore flag, solution 1 : just remove it (useless most of the time, check "DEBUG=eslint:cli-engine npx eslint ..." to see linted files) or solution 2 : use ignorePatterns inside .eslintrc.json. The objective here is to let the eslint cli & vscode eslint use the same config',
        /eslint[^\n"&']+--ignore-path/u,
        0,
      )
    }
  }

  private async checkDependenciesUsagesNode() {
    const badUsages = await findInFolder(this.folderPath, /ts-node(?:-esm)? (?:(?!transpileOnly).)*$/gmu)
    this.test(badUsages.length === 0, `ts-node without --transpileOnly detected in file(s) : ${badUsages.join(', ')}`, true)
  }

  private async checkDependenciesUsagesUvu() {
    const badAsserts = await findInFolder(join(this.folderPath, 'tests'), /from 'assert'/u)
    const logMaxLength = 50
    this.test(badAsserts.length === 0, `assert dependency used in "${ellipsis(badAsserts.join(','), logMaxLength)}", import { equal } from 'uvu/assert' instead (works also as deepEqual alternative)`)
  }

  private checkDependenciesVersionRepoCheck() {
    const { version } = packageJson
    const [major, minor] = version.split('.').map(Number)
    /* c8 ignore next 4 */
    if (minor === undefined || major === undefined) {
      this.test(false, 'should have a valid semver version in package.json')
      return
    }
    const hasLatestRegex = new RegExp(`"repo-check": "\\^?${major}.${minor}`, 'u')
    const hasLatest = this.couldContains('latest version of repo-checker', hasLatestRegex, 1, `like "repo-check": "^${major}.${minor}"`, true)
    if (!hasLatest && this.canFix) this.fileContent = this.fileContent.replace(/"repo-check": ".+"/u, `"repo-check": "${major}.${minor}"`)
  }

  private checkDependenciesVersions() {
    if (this.data.repoId !== 'repo-checker') this.checkDependenciesVersionRepoCheck()
  }

  private checkEchoes() {
    for (const task of ['build', 'check', 'lint', 'test']) {
      if (!this.fileContent.includes(`"${task}":`)) return
      this.couldContains(`a final echo for task "${task}"`, new RegExp(`"${task}": ".+ && echo [\\w\\s]*${task} \\w+"`, 'u'), 1, `like "${task}": "${task} && echo ${task} success"`)
    }
  }

  // eslint-disable-next-line max-lines-per-function
  private checkExports() {
    if (!this.data.isPublishedPackage) return
    this.couldContains('a type module declaration for modern practices', /"type": "module"/u, 1)
    if (!this.data.isCli && this.data.isUsingTypescript) this.shouldContains('a types field in exports', /"types": ".+\.d\.ts"/u, 1)
    if (this.data.isModule) {
      this.shouldContains('a main field pointing to an esm.js', /"main": ".+\.js"/u, 1, false, 'like "main": "./dist/index.js"')
      this.shouldContains('no module field', this.regexForStringProp('module'), 0)
      this.shouldContains('an exports field with import => esm.js / require => cjs.cjs', /"exports": \{\n +"\.": \{\n +"import": ".+\.js",\n +"require": ".+\.cjs"/u, 1, false, 'like "exports": { ".": { "import": "./dist/index.js", "require": "./dist/index.cjs" } }')
      return
    }
    this.shouldContains('a main field pointing to a cjs.cjs', /"main": ".+\.cjs"/u, 1, false, 'like "main": "./dist/index.cjs"')
    this.couldContains('a module field pointing to an esm.mjs', /"module": ".+\.mjs"/u, 1, 'like "module": "./dist/index.mjs"')
    this.couldContains('a exports field with import => esm.mjs / require => cjs.cjs', /"exports": \{\n +"\.": \{\n +"import": ".+\.mjs",\n +"require": ".+\.cjs"/u, 1, 'like "exports": { ".": { "import": "./dist/index.mjs", "require": "./dist/index.cjs" } }')
  }

  private async checkMainFile() {
    const mainFilePath = /"main": "(?<path>.*)"/u.exec(this.fileContent)?.groups?.path
    if (mainFilePath === undefined) {
      log.debug('no main file specified in package.json')
      return
    }
    await this.checkMaxSize(mainFilePath, this.data.maxSizeKo)
  }

  private async checkMaxSize(filePath: string, maxSizeKo: number) {
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

  // eslint-disable-next-line max-lines-per-function
  private checkProperties() {
    this.couldContainsSchema('https://json.schemastore.org/package')
    this.couldContains('a "bugs" property', this.regexForStringProp('bugs'))
    this.couldContains('a "description" property', this.regexForStringProp('description'))
    this.couldContains('a "files" property', this.regexForArrayProp('files'))
    this.couldContains('a "homepage" property', this.regexForStringProp('homepage'))
    this.couldContains('a "keywords" property', this.regexForArrayProp('keywords'))
    this.couldContains('a "private" property', this.regexForBooleanProp('private'))
    const hasRepository = this.couldContains('a "repository" property', this.regexForObjectProp('repository'))
    if (hasRepository) {
      const hasPlus = this.couldContains('a repository url starting with git plus', /"repository": [^u]+url": "git\+https/gu, 1, 'like "repository": "git+https..."', true)
      /* c8 ignore next */
      if (!hasPlus && this.canFix) this.fileContent = this.fileContent.replaceAll(/(?<base>"repository": [^u]+url": ")(?<url>[^"]+")/gu, '$<base>git+$<url>')
    }
    this.shouldContains('a "author" property', this.regexForStringProp('author'))
    this.shouldContains('a "name" property', this.regexForStringProp('name'))
    this.shouldContains('a "version" property', this.regexForStringProp('version'))
    const hasLicence = this.shouldContains('a "license" property', this.regexForStringProp('license'))
    if (hasLicence) this.shouldContains(`a ${this.data.license} license`, this.regexForStringValueProp('license', this.data.license))
  }

  private checkScripts() {
    this.checkScriptsTs()
    this.shouldContains('a script section', this.regexForObjectProp('scripts'))
    this.checkScriptsPrePost()
    if (this.fileContent.includes('watchlist')) this.couldContains('watchlist eager param', /-eager --/u, 1, 'like watchlist src tests -eager -- pnpm test')
    if (this.data.isUsingDependencyCruiser) this.shouldContains('a depcruise usage', /depcruise\s/u, 1, false, 'like "depcruise src --config"')
    if (this.fileContent.includes('"build": "') && this.data.isUsingShuutils) this.couldContains('a unique-mark task', /unique-mark/u, 1, 'like "mark": "unique-mark public/my-file && echo mark success",')
    const isOk = this.couldContains('pnpm instead of npm run', /npm run/u, 0, 'use pnpm instead of npm run for performance', true)
    if (!isOk && this.canFix) this.fileContent = this.fileContent.replaceAll('npm run', 'pnpm').replaceAll(/pnpm (?<task>[\w:]+) -- -/gu, 'pnpm $<task> -') // don't use -- for pnpm
    this.couldContains('a check script', /"check": "/u, 1, 'like "check": "pnpm build && pnpm lint ...')
    this.couldContains('no ci script', /"ci": "/u, 0, 'avoid using "ci" script, use "check" instead')
  }

  private checkScriptsPrePost() {
    this.couldContains('a pre-script for version automation', /"preversion": "/u, 1, 'like : "preversion": "pnpm check",')
    if (this.data.isPublishedPackage) this.couldContains('a post-script for version automation', /"postversion": "/u, 1, 'like : "postversion": "git push && git push --tags && npm publish",')
    else this.couldContains('a post-script for version automation', /"postversion": "/u, 1, 'like : "postversion": "git push && git push --tags",')
    if (this.fileContent.includes('"prepublish"')) this.shouldContains('"prepare" instead of "prepublish" (deprecated)', /"prepublish"/u, 0)
  }

  private checkScriptsTs() {
    if (!this.data.isUsingTypescript) return
    this.shouldContains('a typescript build or check', /\btsc\b/u, 1, false, 'like "build": "tsc" or "check": "tsc --noEmit"')
  }

  private checkTasks() {
    this.couldContains('no task run via npm', /\bnpm run/u, 0, 'use <pnpm|bun> my-task instead')
    this.couldContains('no npm test', /\bnpm test/u, 0, 'use <pnpm|bun> test instead')
    /* c8 ignore next */
    if (this.data.isUsingBun) this.shouldContains('no misleading bun test in check task', /"check": ".*bun test.*"/u, 0, false, 'use bun run test instead')
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  private regexForArrayProp(name = '') {
    return new RegExp(`"${name}": \\[\n`, 'u')
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  private regexForBooleanProp(name = '') {
    return new RegExp(`"${name}": (?:false|true),\n`, 'u')
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  private regexForObjectProp(name = '') {
    return new RegExp(`"${name}": \\{\n`, 'u')
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  private regexForStringProp(name = '') {
    return new RegExp(`"${name}": ".+"`, 'u')
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  private regexForStringValueProp(name = '', value = '') {
    return new RegExp(`"${name}": "${value}"`, 'u')
  }

  public async start() {
    const hasFile = await this.checkFileExists('package.json')
    if (!hasFile) return
    await this.inspectFile('package.json')
    await this.checkMainFile()
    this.checkProperties()
    this.checkScripts()
    this.checkEchoes()
    await this.checkDependencies()
    this.suggestAlternatives()
    this.checkExports()
  }

  private suggestAlternatives() {
    this.couldContains('no fat color dependency, use shuutils or nanocolors', /"(?:chalk|colorette|colors)"/u, 0)
    this.couldContains('no fat fs-extra dependency, use native fs', /"fs-extra"/u, 0)
    this.couldContains('no utopian shuunen-stack dependency', /"shuunen-stack"/u, 0)
    this.couldContains('no fat & slow jsdom dependency, use happy-dom instead', /jsdom/u, 0)
    this.couldContains('no fat task runner, use pnpm xyz && pnpm abc for sequential or zero-deps package : npm-parallel', /"npm-run-all"/u, 0)
    if (this.fileContent.includes('esbuild-plugin-run')) this.couldContains('not fat ts runner, use "typescript-run" like "dev": "ts-run src --watch" or "ts-run src -w src another-folder"')
  }
}
