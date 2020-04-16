import { log } from '../logger'
import { Test } from '../test'
import { checkFileExists, getFileSizeInKo } from '../utils'

export class CheckPackage extends Test {
  get props () {
    return {
      required: {
        author: String,
        description: String,
        homepage: String,
        license: String,
        name: String,
        version: String,
      },
      optional: {
        bugs: String,
        keywords: Array,
        private: Boolean,
        files: Array,
        repository: Object,
      },
    }
  }

  get scripts () {
    return {
      required: ['ci', 'start', 'test'],
    }
  }

  async start () {
    const exists = await this.checkFileExists('package.json')
    await this.checkFileExists('package-lock.json')
    await this.checkNoFileExists('yarn.lock')
    if (!exists) return
    await this.inspectFile('package.json')
    await this.checkMainFile()
    this.checkProperties()
    this.checkScripts()
    this.checkDependencies()
  }

  checkProperties () {
    for (const flag in this.props) {
      const isRequired = flag === 'required'
      const testFunc = isRequired ? 'shouldContains' : 'couldContains'
      for (const [prop, type] of Object.entries(this.props[flag])) {
        const message = `a property ${prop}`
        const regex = this.regexForProp(type.name, prop)
        // generic equivalent of : this.shouldContains(`a property ${prop}`, this.regexForStringProp(prop))
        this[testFunc](message, regex)
      }
    }
    this.shouldContains(`a ${this.data.license} license`, this.regexForStringValueProp('license', this.data.license))
    this.couldContains('no engines section', /"engines"/, 0)
  }

  async checkMainFile () {
    const mainFilePath = (this.fileContent.match(/"main": "(.*)"/) || [])[1] || ''
    if (!mainFilePath.length) return log.debug('no main file specified in package.json')
    const maxSizeKo = this.data.max_size_ko
    this.test(maxSizeKo, 'main file maximum size is specified in data file (ex: maxSizeKo: 100)')
    if (!maxSizeKo) return
    const exists = await checkFileExists(mainFilePath)
    this.test(exists, `main file specified in package.json (${mainFilePath}) exists on disk (be sure to build before run repo-check)`)
    if (!exists) return
    const sizeKo = await getFileSizeInKo(mainFilePath)
    const sizeOk = sizeKo < maxSizeKo
    this.test(sizeOk, `main file size (${sizeKo}Ko) should be less or equal to max size allowed (${this.data.maxSizeKo}Ko)`)
  }

  checkScripts () {
    const hasScripts = this.shouldContains('a script section', this.regexForObjectProp('scripts'))
    if (hasScripts) {
      this.scripts.required.forEach(name => {
        this.shouldContains(`a ${name} script`, this.regexForStringProp(name))
      })
    }
    if (!this.fileContent.includes('Shuunen/repo-checker')) {
      this.couldContains('a check script that does not rely on npx', /"check": "repo-check"/, 1)
    }
    this.couldContains('a pre-script for version automation', /"preversion": "npm run ci"/, 1)
    this.couldContains('a post-script for version automation', /"postversion": "git push && git push --tags/, 1)
    this.couldContains('an update script to help maintain deps to latest version', /"update": "npx npm-check-updates -u"/, 1)
    const hasUt = this.couldContains('unit testing', /"ava"/, 1)
    if (hasUt) this.couldContains('code coverage', /"nyc"/, 1)
    if (!this.fileContent.includes('vue-cli-service lint') && this.fileContent.includes('lint')) {
      this.couldContains('an eslint task that use ignore rule and ext syntax', /"lint": "eslint --fix --ignore-path \.gitignore --ext/)
    }
  }

  checkDependencies () {
    const hasDependencies = this.checkContains(this.regexForObjectProp('dependencies'))
    const hasDevDependencies = this.checkContains(this.regexForObjectProp('devDependencies'))
    if (hasDependencies || hasDevDependencies) {
      this.shouldContains('pinned dependencies', /":\s"\^[\d+.]+"/, 0)
      if (!this.fileContent.includes('Shuunen/repo-checker')) {
        this.shouldContains('repo-check dependency', /"repo-check":\s"[\d+.]+"/, 1)
      }
      /* annoying deps */
      if (!this.data.sass || this.data.sass !== 'ignore') {
        this.shouldContains('no sass dependency (fat & useless)', /sass/, 0)
      }
      this.shouldContains('no cross-var dependency (old & deprecated)', /"cross-var"/, 0)
      this.shouldContains('no tslint dependency (deprecated)', /tslint/, 0)
    }
  }

  regexForProp (type, name) {
    switch (type) {
      case 'String':
        return this.regexForStringProp(name)
      case 'Boolean':
        return this.regexForBooleanProp(name)
      case 'Array':
        return this.regexForArrayProp(name)
      case 'Object':
        return this.regexForObjectProp(name)
      default:
        throw new Error('missing regex constructor for type : ' + type)
    }
  }

  regexForStringProp (name) {
    return new RegExp(`"${name}":\\s".+"`)
  }

  regexForStringValueProp (name, value) {
    return new RegExp(`"${name}":\\s"${value}"`)
  }

  regexForObjectProp (name) {
    return new RegExp(`"${name}":\\s{\n`)
  }

  regexForArrayProp (name) {
    return new RegExp(`"${name}":\\s\\[\n`)
  }

  regexForBooleanProp (name) {
    return new RegExp(`"${name}":\\s(?:false|true),\n`)
  }
}
