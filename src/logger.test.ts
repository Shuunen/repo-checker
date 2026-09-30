import { log } from './logger'

describe('logger', () => {
  it('logger can log unknown errors', async () => {
    expect.hasAssertions()
    log.disable()
    log.unknownError('damn-err')
    log.unknownError(new Error('damn-err'))
    log.unknownError({})
    log.unknownError([])
    log.unknownError(0)
    await expect(log.getLogs()).resolves.toStrictEqual([])
  })
})
