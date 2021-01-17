import { strictEqual as equal } from 'assert'
import { log } from '../src/logger'

describe('logger', () => {
  it('log correctly', () => {
    log.noConsole = true
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
    equal(log.end(), true)
  })

  it('can set indentation level', () => {
    equal(log.setIndentLevel(2), 2)
  })
})
