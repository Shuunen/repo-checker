import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { EditorConfigFile } from '../../src/files'
import { log } from '../../src/logger'
import { promiseFalse, promiseTrue, promiseVoid } from '../utils'

test('editor config missing file', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EditorConfigFile()
  instance.checkFileExists = promiseFalse
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 0)
  equal(instance.nbFailed, 0)
})

test('editor config file', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EditorConfigFile()
  instance.checkFileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 1)
  equal(instance.nbFailed, 4)
})

test.run()
