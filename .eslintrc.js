module.exports = {
  extends: [
    'eslint:recommended',
    'standard',
  ],
  rules: {
    'no-console': 'off',
    'comma-dangle': ['error', 'always-multiline'],
  },
  parserOptions: {
    parser: 'babel-eslint',
  },
}
