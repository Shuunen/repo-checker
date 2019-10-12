const CheckConfigs = require('./configs')
const CheckReadme = require('./readme')
const CheckPackage = require('./package')
const CheckLicense = require('./license')
const CheckTravis = require('./travis')

module.exports = [CheckConfigs, CheckReadme, CheckPackage, CheckLicense, CheckTravis]
