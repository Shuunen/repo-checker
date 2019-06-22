const Test = require('../test')

class CheckPackage extends Test {
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
      required: ['start', 'test'],
      optional: ['lint'],
    }
  }
  async start () {
    await this.checkFile('package.json')
    this.checkProperties()
    this.checkScripts()
    this.checkDependencies()
  }
  checkProperties () {
    for (let flag in this.props) {
      const isRequired = flag === 'required'
      const testFunc = isRequired ? 'shouldContains' : 'couldContains'
      for (let [prop, type] of Object.entries(this.props[flag])) {
        const message = `a property ${prop}`
        const regex = this.regexForProp(type.name, prop)
        // generic equivalent of : this.shouldContains(`a property ${prop}`, this.regexForStringProp(prop))
        this[testFunc](message, regex)
      }
    }
  }
  checkScripts () {
    const hasScripts = this.shouldContains('a script section', this.regexForObjectProp('scripts'))
    if (hasScripts) {
      this.scripts.required.forEach(name => {
        this.shouldContains(`a ${name} script`, this.regexForStringProp(name))
      })
      this.scripts.optional.forEach(name => {
        this.couldContains(`a ${name} script`, this.regexForStringProp(name))
      })
    }
  }
  checkDependencies () {
    const hasDependencies = this.checkContains(this.regexForObjectProp('dependencies'))
    const hasDevDependencies = this.checkContains(this.regexForObjectProp('devDependencies'))
    if (hasDependencies || hasDevDependencies) {
      this.shouldContains('pinned dependencies', /":\s"\^[\d+.]+"/, 0)
      /* annoying deps */
      this.shouldContains('no sass dependency', /sass"/, 0)
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

module.exports = CheckPackage
