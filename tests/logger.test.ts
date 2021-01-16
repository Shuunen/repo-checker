import test from 'ava'
import { log } from '../src/logger'

test('log correctly', t => {
  t.true(log.start())
  t.true(log.start(true))
  t.false(log.error('damn-err'))
  t.true(log.warn('damn-warn'))
  t.true(log.debug('damn-debug'))
  t.true(log.success(true, 'damn-success in console'))
  t.true(log.success(false, 'damn-success not in console'))
  /*
  t.true(log.test(true, 'damn-valid'))
  t.false(log.test(false, 'damn-invalid'))
  t.false(log.test(false, 'damn-invalid-ninja', true))
  */
  t.true(log.fix('damn-fix'))
  t.true(log.end())
})

test('can set indentation level', t => {
  t.is(log.setIndentLevel(2), 2)
})
