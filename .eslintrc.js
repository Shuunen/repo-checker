const rules = require('./.eslintrc.rules.js')

module.exports = {
  extends: [
    'eslint:recommended',
    'standard',
  ],
  rules,
  parserOptions: {
    parser: 'babel-eslint',
  },
}
