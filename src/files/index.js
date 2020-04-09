const CheckConfigs = require('./configs')
const CheckReadme = require('./readme')
const CheckPackage = require('./package')
const CheckLicense = require('./license')
const CheckTravis = require('./travis')
const CheckRenovate = require('./renovate')
const CheckEditorConfig = require('./editor-config')
const CheckNvmRc = require('./nvmrc')

module.exports = [CheckConfigs, CheckNvmRc, CheckReadme, CheckPackage, CheckLicense, CheckTravis, CheckRenovate, CheckEditorConfig]
