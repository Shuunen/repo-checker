const rules = require('./.eslintrc.rules.js')

module.exports = {
  extends: [
    'eslint:recommended',
    'standard',
    'plugin:unicorn/recommended',
  ],
  rules,
  parserOptions: {
    parser: 'babel-eslint',
  },
  plugins: [
    'unicorn',
  ],
}
