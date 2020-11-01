import test from 'ava'
import { log } from '../src/logger'

test('log correctly', async (t) => {
  t.true(await log.start())
  t.true(await log.start(true))
  t.false(await log.error('damn-err'))
  t.true(await log.warn('damn-warn'))
  t.true(await log.success('damn-success'))
  t.true(await log.test(true, 'damn-valid'))
  t.false(await log.test(false, 'damn-invalid'))
  t.false(await log.test(false, 'damn-invalid-ninja', true))
  t.true(await log.fix('damn-fix'))
  t.true(await log.end())
})

test('can set indentation level', async (t) => {
  t.is(await log.setIndentLevel(2), 2)
})
