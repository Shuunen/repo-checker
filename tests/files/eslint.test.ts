import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData } from '../../src/constants'
import { EsLintFile } from '../../src/files'
import { log } from '../../src/logger'

const fileExists = async (path: string): Promise<boolean> => {
  if (path === '.eslintrc.json') return true
  return false
}

test('eslint config missing file', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile()
  instance.fileExists = async () => false
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 1)
  equal(instance.nbFailed, 0)
})

test('eslint config file empty', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile()
  instance.fileExists = fileExists
  instance.inspectFile = async () => void 0
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 2)
  equal(instance.nbFailed, 1)
})

test('eslint config file empty for vue ts project', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile('', new ProjectData({ use_vue: true, use_typescript: true }))
  instance.fileExists = fileExists
  instance.inspectFile = async () => void 0
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 3)
  equal(instance.nbFailed, 2)
})

test('eslint config partial file for js project', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile()
  instance.fileExists = fileExists
  instance.inspectFile = async () => void 0
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
  equal(instance.nbPassed, 6)
  equal(instance.nbFailed, 0)
})

test('eslint config partial file for ts project', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile('', new ProjectData({ use_typescript: true }))
  instance.fileExists = fileExists
  instance.inspectFile = async () => void 0
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
  equal(instance.nbPassed, 7)
  equal(instance.nbFailed, 0)
})

test('eslint config partial file for vue ts project', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile('', new ProjectData({ use_vue: true, use_typescript: true }))
  instance.fileExists = fileExists
  instance.inspectFile = async () => void 0
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
  equal(instance.nbPassed, 7)
  equal(instance.nbFailed, 1)
})

test('eslint up to date config file for vue ts project', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile('', new ProjectData({ use_vue: true, use_typescript: true }))
  instance.fileExists = fileExists
  instance.inspectFile = async () => void 0
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
  equal(instance.nbPassed, 8)
  equal(instance.nbFailed, 0)
})

test.run()