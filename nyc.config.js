module.exports = {
  'reporter': ['text', 'lcovonly'],
  'check-coverage': true,
  'branches': 90,
  'functions': 90,
  'lines': 90,
  'statements': 90,
  'exclude': [
    'src/files/**/*',
    'tests/**',
  ],
}
