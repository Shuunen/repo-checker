import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData } from '../../src/constants'
import { EsLintFile } from '../../src/files'
import { log } from '../../src/logger'
import { join } from '../../src/utils'
import { promiseFalse, promiseTrue, promiseVoid } from '../utils'

const testFolder = join(__dirname, '..')
const vueProjectFolder = join(testFolder, 'data', 'vueProject')
const tsProjectFolder = join(testFolder, 'data', 'tsProject')

test('eslint config missing file', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile()
  instance.fileExists = promiseFalse
  await instance.start()
  await instance.end()
  equal(instance.passed, ['has-no-xo-config-js-file'], 'passed')
  equal(instance.failed, [], 'failed')
})

test('eslint config file empty', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile()
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  equal(instance.passed, [
    'has-no-promise-plugin-require-eslint-7',
    'has-no-plugin-section-since-plugin-are-included-by-extends',
  ], 'passed')
  equal(instance.failed, [
    'has-no-xo-config-js-file',
    'does-not-have-eslint-recommended-rules-extend-eslint-recommended',
  ], 'failed')
})

test('eslint config file empty for ts project', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile('', new ProjectData({ useTypescript: true }))
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  equal(instance.passed, [
    'has-no-promise-plugin-require-eslint-7',
    'has-no-plugin-section-since-plugin-are-included-by-extends',
  ], 'passed')
  equal(instance.failed, [
    'has-no-xo-config-js-file',
    'does-not-have-typescript-eslint-extend-plugin-typescript-eslint-recommended',
  ], 'failed')
})

test('eslint config file empty for vue ts project', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile('', new ProjectData({ useVue: true, useTypescript: true }))
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  equal(instance.passed, [
    'has-no-promise-plugin-require-eslint-7',
    'has-no-plugin-section-since-plugin-are-included-by-extends',
    'has-no-easy-vue-essential-rules-set',
  ], 'passed')
  equal(instance.failed, [
    'has-no-xo-config-js-file',
    'does-not-have-vue-recommended-rules-extends-plugin-vue-vue3-recommended',
    'does-not-have-vue-ts-recommended-rules-extends-vue-typescript-recommended',
  ], 'failed')
})

test('eslint config file empty for tailwind project', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile('', new ProjectData({ useTailwind: true }))
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  equal(instance.passed, [
    'has-no-promise-plugin-require-eslint-7',
    'has-no-plugin-section-since-plugin-are-included-by-extends',
  ], 'passed')
  equal(instance.failed, [
    'has-no-xo-config-js-file',
    'does-not-have-tailwind-rules-extend-plugin-tailwindcss-recommended',
    'does-not-have-eslint-recommended-rules-extend-eslint-recommended',
  ], 'failed')
})

test('eslint config partial file for js project', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile()
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = `{
    "extends": [
      "eslint:recommended",
      "plugin:unicorn/recommended"
    ],
    "plugins": [
      "unicorn"
    ],
    "rules": {}
  }`
  await instance.start()
  await instance.end()
  equal(instance.passed, [
    'has-eslint-recommended-rules-extend',
    'has-no-promise-plugin-require-eslint-7',
    'has-eslint-recommended-rules-extend',
  ], 'passed')
  equal(instance.failed, ['has-no-xo-config-js-file'], 'failed')
})

test('eslint config partial file for ts project', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile('', new ProjectData({ useTypescript: true }))
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = `{
    "extends": [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:unicorn/recommended"
    ],
    "rules": {}
  }`
  await instance.start()
  await instance.end()
  equal(instance.passed, [
    'has-eslint-recommended-rules-extend',
    'has-no-promise-plugin-require-eslint-7',
    'has-no-plugin-section-since-plugin-are-included-by-extends',
  ], 'passed')
  equal(instance.failed, ['has-no-xo-config-js-file'], 'failed')
})

test('eslint config partial file for vue ts project', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile('', new ProjectData({ useVue: true, useTypescript: true }))
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = `{
    "extends": [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:unicorn/recommended",
      "plugin:vue/vue3-recommended"
    ],
    "parser": "vue-eslint-parser",
    "parserOptions": {
      "parser": "@typescript-eslint/parser",
      "ecmaVersion": 2021,
      "sourceType": "module"
    },
    "plugins": [
      "@typescript-eslint",
      "unicorn"
    ],
    "rules": {}
  }`
  await instance.start()
  await instance.end()
  equal(instance.passed, [
    'has-eslint-recommended-rules-extend',
    'has-no-promise-plugin-require-eslint-7',
    'has-vue-recommended-rules-extends',
    'has-no-easy-vue-essential-rules-set',
  ], 'passed')
  equal(instance.failed, [
    'has-no-xo-config-js-file',
    'does-not-have-vue-ts-recommended-rules-extends-vue-typescript-recommended',
  ], 'failed')
})

test('eslint up to date config file for vue ts project', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile('', new ProjectData({ useVue: true, useTypescript: true }))
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = `{
    "extends": [
      "plugin:vue/vue3-recommended",
      "eslint:recommended",
      "@vue/typescript/recommended",
      "plugin:unicorn/recommended"
    ],
    "parserOptions": {
      "ecmaVersion": 2021
    },
    "plugins": [
      "html",
      "unicorn"
    ],
  }`
  await instance.start()
  await instance.end()
  equal(instance.passed, [
    'has-eslint-recommended-rules-extend',
    'has-no-promise-plugin-require-eslint-7',
    'has-vue-recommended-rules-extends',
    'has-no-easy-vue-essential-rules-set',
    'has-vue-ts-recommended-rules-extends',
  ], 'passed')
  equal(instance.failed, ['has-no-xo-config-js-file'], 'failed')
})

test('eslint config file with no rules', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile(vueProjectFolder, new ProjectData({}))
  instance.fileExists = promiseTrue
  await instance.start()
  await instance.end()
  equal(instance.passed, [
    'eslintrc-json-has-no-promise-plugin-require-eslint-7',
    'eslintrc-json-has-no-plugin-section-since-plugin-are-included-by-extends',
  ], 'passed')
  equal(instance.failed, [
    'has-no-xo-config-js-file',
    'eslintrc-json-does-not-have-eslint-recommended-rules-extend-eslint-recommended',
  ], 'failed')
})

test('eslint config file with just rules (no override)', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile(tsProjectFolder, new ProjectData({}))
  instance.fileExists = promiseTrue
  await instance.start()
  await instance.end()
  equal(instance.passed, [
    'eslintrc-json-has-no-promise-plugin-require-eslint-7',
    'eslintrc-json-has-no-plugin-section-since-plugin-are-included-by-extends',
  ], 'passed')
  equal(instance.failed, [
    'has-no-xo-config-js-file',
    'eslintrc-json-does-not-have-eslint-recommended-rules-extend-eslint-recommended',
  ], 'failed')
})

test.run()
