const Test = require('../test')

const requiredProps = ['author', 'description', 'homepage', 'license', 'name', 'version']
const requiredScripts = ['start', 'test']

const optionalProps = ['bugs', 'keywords']
const optionalScripts = ['lint']

class CheckPackage extends Test {
  async init () {
    await this.checkFile('package.json')
    /* properties */
    requiredProps.forEach(prop => {
      this.shouldContains(`a property ${prop}`, this.regexForStringProp(prop))
    })
    optionalProps.forEach(prop => {
      this.couldContains(`a property ${prop}`, this.regexForStringProp(prop))
    })
    /* scripts */
    const hasScripts = this.shouldContains('a script section', this.regexForObjectProp('scripts'))
    if (hasScripts) {
      requiredScripts.forEach(prop => {
        this.shouldContains(`a ${prop} script`, this.regexForStringProp(prop))
      })
      optionalScripts.forEach(prop => {
        this.couldContains(`a ${prop} script`, this.regexForStringProp(prop))
      })
    }
    /* repository */
    this.couldContains('a repository section', this.regexForObjectProp('repository'))
    /* dependencies */
    const hasDependencies = this.checkContains(this.regexForObjectProp('dependencies'))
    const hasDevDependencies = this.checkContains(this.regexForObjectProp('devDependencies'))
    if (hasDependencies || hasDevDependencies) {
      this.shouldContains('pinned dependencies', /":\s"\^[\d+.]+"/, 0)
    }
  }
  regexForStringProp (name) {
    return new RegExp(`"${name}":\\s".+"`)
  }
  regexForObjectProp (name) {
    return new RegExp(`"${name}":\\s{\n`)
  }
}

module.exports = CheckPackage
