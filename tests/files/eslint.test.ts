import { expect, it } from 'vitest'
import { ProjectData } from '../../src/constants'
import { EsLintFile } from '../../src/files'
import { log } from '../../src/logger'
import { cleanInstanceForSnap, promiseFalse, promiseTrue, promiseVoid, tsProjectFolder, vueProjectFolder } from '../utils'

it('eslint A config missing file', async () => {
  log.disable()
  const instance = new EsLintFile()
  instance.fileExists = promiseFalse
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('eslint B config file empty', async () => {
  log.disable()
  const instance = new EsLintFile()
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('eslint C config file empty for ts project', async () => {
  log.disable()
  const instance = new EsLintFile('', new ProjectData({ isUsingTypescript: true }))
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('eslint D config file empty for vue ts project', async () => {
  log.disable()
  const instance = new EsLintFile('', new ProjectData({ isUsingVue: true, isUsingTypescript: true }))
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('eslint E config file empty for tailwind project', async () => {
  log.disable()
  const instance = new EsLintFile('', new ProjectData({ isUsingTailwind: true }))
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('eslint F config partial file for js project', async () => {
  log.disable()
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
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('eslint G config partial file for ts project', async () => {
  log.disable()
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
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('eslint H config partial file for vue ts project', async () => {
  log.disable()
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
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('eslint I up to date config file for vue ts project', async () => {
  log.disable()
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
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('eslint J config file with no rules', async () => {
  log.disable()
  const instance = new EsLintFile(vueProjectFolder, new ProjectData({}))
  instance.fileExists = promiseTrue
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('eslint K config file with just rules (no override)', async () => {
  log.disable()
  const instance = new EsLintFile(tsProjectFolder, new ProjectData({}))
  instance.fileExists = promiseTrue
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})
