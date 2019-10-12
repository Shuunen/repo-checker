const CheckConfigs = require('./configs')
const CheckReadme = require('./readme')
const CheckPackage = require('./package')
const CheckLicense = require('./license')

module.exports = [CheckConfigs, CheckReadme, CheckPackage, CheckLicense]
