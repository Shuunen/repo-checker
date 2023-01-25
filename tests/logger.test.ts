import { Nb } from 'shuutils'
import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { config } from '../package.json'
import { log } from '../src/logger'
import { deleteFile, fileExists } from '../src/utils'

test('logger log correctly', function () {
  log.consoleLog = false
  log.fileLog = true
  equal(log.start(), true)
  equal(log.start(true), true)
  equal(log.error('damn-err'), false)
  equal(log.warn('damn-warn'), true)
  equal(log.debug('damn-debug'), true)
  equal(log.success(true, 'damn-success in console'), true)
  equal(log.success(false, 'damn-success not in console'), true)
  equal(log.test(true, 'damn-valid'), true)
  equal(log.test(false, 'damn-invalid'), false)
  equal(log.test(false, 'damn-invalid-ninja', true), false)
  equal(log.fix('damn-fix'), true)
})

test('logger can set indentation level', function () {
  equal(log.setIndentLevel(Nb.Two), Nb.Two)
})

test('logger can prevent log file generation', async function () {
  log.fileLog = false
  log.consoleLog = false
  await deleteFile(config.logFile)
  equal(log.start(), false)
  equal(log.write('damn-write'), false)
  equal(log.error('damn-err'), false)
  equal(log.warn('damn-warn'), false)
  equal(log.success(false, 'damn-success not in console'), false)
  equal(log.fix('damn-fix'), false)
  equal(await fileExists(config.logFile), false)
})

test('logger can log unknown errors', function () {
  log.fileLog = false
  log.consoleLog = false
  equal(log.unknownError('damn-err'), false)
  equal(log.unknownError(new Error('damn-err')), false)
  equal(log.unknownError({}), false)
  equal(log.unknownError([]), false)
  equal(log.unknownError(Nb.Zero), false)
})

test.run()
