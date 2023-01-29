import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { DependencyCruiserFile } from '../../src/files'
import { log } from '../../src/logger'
import { promiseFalse } from '../utils'

test('dependency cruiser config missing file', async function () {
  log.canConsoleLog = false
  log.willLogToFile = false
  const instance = new DependencyCruiserFile()
  instance.checkFileExists = promiseFalse
  await instance.start()
  await instance.end()
  equal(instance.passed, [])
  equal(instance.failed, [])
})
