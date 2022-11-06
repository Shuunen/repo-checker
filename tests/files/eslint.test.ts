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
  equal(instance.nbPassed, 1, 'nbPassed')
  equal(instance.nbFailed, 0, 'nbFailed')
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
  equal(instance.nbPassed, 2, 'nbPassed')
  equal(instance.nbFailed, 1, 'nbFailed')
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
  equal(instance.nbPassed, 3, 'nbPassed')
  equal(instance.nbFailed, 2, 'nbFailed')
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
  equal(instance.nbPassed, 6, 'nbPassed')
  equal(instance.nbFailed, 0, 'nbFailed')
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
    "plugins": [
      "@typescript-eslint",
      "unicorn"
    ],
    "rules": {}
  }`
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 7, 'nbPassed')
  equal(instance.nbFailed, 0, 'nbFailed')
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
  equal(instance.nbPassed, 7, 'nbPassed')
  equal(instance.nbFailed, 1, 'nbFailed')
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
  equal(instance.nbPassed, 8, 'nbPassed')
  equal(instance.nbFailed, 0, 'nbFailed')
})

test('eslint config file with no rules', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile(vueProjectFolder, new ProjectData({}))
  instance.fileExists = promiseTrue
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 2, 'nbPassed')
  equal(instance.nbFailed, 1, 'nbFailed')
})

test('eslint config file with just rules (no override)', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile(tsProjectFolder, new ProjectData({}))
  instance.fileExists = promiseTrue
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 2, 'nbPassed')
  equal(instance.nbFailed, 1, 'nbFailed')
})

test.run()
