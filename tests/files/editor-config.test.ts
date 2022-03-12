import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData } from '../../src/constants'
import { EditorConfigFile } from '../../src/files'
import { log } from '../../src/logger'

test('editor config missing file', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EditorConfigFile('', new ProjectData({ quiet: true }), true)
  instance.checkFileExists = async () => false
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 0)
  equal(instance.nbFailed, 0)
})

test('editor config file', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new EditorConfigFile('', new ProjectData({ quiet: true }), true)
  instance.checkFileExists = async () => true
  instance.inspectFile = async () => void 0
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 1)
  equal(instance.nbFailed, 4)
})

test.run()
