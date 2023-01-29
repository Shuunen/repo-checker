import { Nb } from 'shuutils'
import { test } from 'uvu'
import { log } from '../src/logger'


test('logger can log unknown errors', function () {
  log.disable()
  log.unknownError('damn-err')
  log.unknownError(new Error('damn-err'))
  log.unknownError({})
  log.unknownError([])
  log.unknownError(Nb.Zero)
})

test.run()
