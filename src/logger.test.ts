import { expect, it } from 'vitest'
import { log } from './logger'

it('logger can log unknown errors', () => {
  log.disable()
  log.unknownError('damn-err')
  log.unknownError(new Error('damn-err'))
  log.unknownError({})
  log.unknownError([])
  log.unknownError(0)
  expect(log.inMemoryLogs).toStrictEqual([])
})
