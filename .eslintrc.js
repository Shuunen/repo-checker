module.exports = {
  extends: [
    'eslint:recommended',
    'standard',
  ],
  rules: {
    'no-console': 'error',
    'comma-dangle': ['error', 'always-multiline'],
  },
  parserOptions: {
    parser: 'babel-eslint',
  },
}
