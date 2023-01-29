import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData } from '../../src/constants'
import { EsLintFile } from '../../src/files'
import { log } from '../../src/logger'
import { promiseFalse, promiseTrue, promiseVoid, tsProjectFolder, vueProjectFolder } from '../utils'

test('eslint A config missing file', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
  const instance = new EsLintFile()
  instance.fileExists = promiseFalse
  await instance.start()
  await instance.end()
  equal(instance.passed, ['has-no-xo-config-js-file'], 'passed')
  equal(instance.failed, [], 'failed')
})

test('eslint B config file empty', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
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

test('eslint C config file empty for ts project', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
  const instance = new EsLintFile('', new ProjectData({ isUsingTypescript: true }))
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
    'does-not-have-hardcore-typescript-rules-extend-hardcore-ts',
  ], 'failed')
})

test('eslint D config file empty for vue ts project', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
  const instance = new EsLintFile('', new ProjectData({ isUsingVue: true, isUsingTypescript: true }))
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
    'does-not-have-hardcore-typescript-rules-extend-hardcore-ts',
    'does-not-have-hardcore-vue-rules-extend-hardcore-vue',
  ], 'failed')
})

test('eslint E config file empty for tailwind project', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
  const instance = new EsLintFile('', new ProjectData({ isUsingTailwind: true }))
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

test('eslint F config partial file for js project', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
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

test('eslint G config partial file for ts project', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
  const instance = new EsLintFile('', new ProjectData({ isUsingTypescript: true }))
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
  equal(instance.failed, [
    'has-no-xo-config-js-file',
    'does-not-have-hardcore-typescript-rules-extend-hardcore-ts',
  ], 'failed')
})

test('eslint H config partial file for vue ts project', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
  const instance = new EsLintFile('', new ProjectData({ isUsingVue: true, isUsingTypescript: true }))
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
  ], 'passed')
  equal(instance.failed, [
    'has-no-xo-config-js-file',
    'does-not-have-hardcore-typescript-rules-extend-hardcore-ts',
    'does-not-have-hardcore-vue-rules-extend-hardcore-vue',
  ], 'failed')
})

test('eslint I up to date config file for vue ts project', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
  const instance = new EsLintFile('', new ProjectData({ isUsingVue: true, isUsingTypescript: true }))
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
  ], 'passed')
  equal(instance.failed, [
    'has-no-xo-config-js-file',
    'does-not-have-hardcore-typescript-rules-extend-hardcore-ts',
    'does-not-have-hardcore-vue-rules-extend-hardcore-vue',
  ], 'failed')
})

test('eslint J config file with no rules', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
  const instance = new EsLintFile(vueProjectFolder, new ProjectData({}))
  instance.fileExists = promiseTrue
  await instance.start()
  await instance.end()
  equal(instance.passed, [
    'eslintrc-json-has-hardcore-rules-extend',
    'eslintrc-json-has-no-promise-plugin-require-eslint-7',
    'eslintrc-json-has-no-plugin-section-since-plugin-are-included-by-extends',
  ], 'passed')
  equal(instance.failed, [
    'has-no-xo-config-js-file',
    'eslintrc-json-does-not-have-eslint-recommended-rules-extend-eslint-recommended',
  ], 'failed')
})

test('eslint K config file with just rules (no override)', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
  const instance = new EsLintFile(tsProjectFolder, new ProjectData({}))
  instance.fileExists = promiseTrue
  await instance.start()
  await instance.end()
  equal(instance.passed, [
    'eslintrc-json-has-hardcore-rules-extend',
    'eslintrc-json-has-no-promise-plugin-require-eslint-7',
    'eslintrc-json-has-no-plugin-section-since-plugin-are-included-by-extends',
  ], 'passed')
  equal(instance.failed, [
    'has-no-xo-config-js-file',
    'eslintrc-json-does-not-have-eslint-recommended-rules-extend-eslint-recommended',
  ], 'failed')
})

test.run()
