import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { EditorConfigFile } from '../../src/files'
import { log } from '../../src/logger'

test('editor config missing file', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EditorConfigFile()
  instance.checkFileExists = async (): Promise<false> => false
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 0)
  equal(instance.nbFailed, 0)
})

test('editor config file', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EditorConfigFile()
  instance.checkFileExists = async (): Promise<true> => true
  instance.inspectFile = async (): Promise<undefined> => void 0
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 1)
  equal(instance.nbFailed, 4)
})

test.run()
