const CheckConfigs = require('./configs')
const CheckReadme = require('./readme')
const CheckPackage = require('./package')
const CheckLicense = require('./license')
const CheckTravis = require('./travis')
const CheckRenovate = require('./renovate')

module.exports = [CheckConfigs, CheckReadme, CheckPackage, CheckLicense, CheckTravis, CheckRenovate]
