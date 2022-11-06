import { existsSync, unlinkSync } from 'fs'
import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { config } from '../package.json'
import { log } from '../src/logger'

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
  equal(log.setIndentLevel(2), 2)
})

test('logger can prevent log file generation', function () {
  log.fileLog = false
  log.consoleLog = false
  unlinkSync(config.logFile)
  equal(log.start(), false)
  equal(log.write('damn-write'), false)
  equal(log.error('damn-err'), false)
  equal(log.warn('damn-warn'), false)
  equal(log.success(false, 'damn-success not in console'), false)
  equal(log.fix('damn-fix'), false)
  equal(existsSync(config.logFile), false)
})

test('logger can log unknown errors', function () {
  log.fileLog = false
  log.consoleLog = false
  equal(log.unknownError('damn-err'), false)
  equal(log.unknownError(new Error('damn-err')), false)
  equal(log.unknownError({}), false)
  equal(log.unknownError([]), false)
  equal(log.unknownError(0), false)
})

test.run()
