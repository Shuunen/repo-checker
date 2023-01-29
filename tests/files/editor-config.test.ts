import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { EditorConfigFile } from '../../src/files'
import { log } from '../../src/logger'
import { promiseFalse, promiseTrue, promiseVoid } from '../utils'

test('editor config missing file', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
  const instance = new EditorConfigFile()
  instance.checkFileExists = promiseFalse
  await instance.start()
  await instance.end()
  equal(instance.passed, [])
  equal(instance.failed, [])
})

test('editor config file', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
  const instance = new EditorConfigFile()
  instance.checkFileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  equal(instance.passed, [
    'has-no-specific-html-indent-rule',
  ])
  equal(instance.failed, [
    'does-not-have-space-indent-indent-style-space',
    'does-not-have-indent-size-of-2-indent-size-2',
    'does-not-have-unix-style-line-endings-end-of-line-lf',
    'does-not-have-utf-8-encoding-charset-utf-8',
  ])
})

test.run()
