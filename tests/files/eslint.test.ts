import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData } from '../../src/constants'
import { EsLintFile } from '../../src/files'
import { log } from '../../src/logger'

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
  instance.fileExists = async () => true
  instance.inspectFile = async () => void 0
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 1)
  equal(instance.nbFailed, 2)
})

test('eslint vue ts config file empty', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EsLintFile('', new ProjectData({ use_vue:true, use_typescript: true, quiet: true }), true)
  instance.fileExists = async () => true
  instance.inspectFile = async () => void 0
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 2)
  equal(instance.nbFailed, 5)
})

test.run()
