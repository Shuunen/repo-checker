import { Nb } from 'shuutils'
import { expect, it } from 'vitest'
import { log } from '../src/logger'

it('logger can log unknown errors', () => {
  log.disable()
  log.unknownError('damn-err')
  log.unknownError(new Error('damn-err'))
  log.unknownError({})
  log.unknownError([])
  log.unknownError(Nb.Zero)
  expect(log.inMemoryLogs).toStrictEqual([])
})
