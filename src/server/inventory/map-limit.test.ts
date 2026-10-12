import { setTimeout as wait } from 'node:timers/promises'
import { mapLimit } from './map-limit.ts'

describe('bounded map', () => {
  it('keeps the items order whatever the finishing order', async () => {
    expect.hasAssertions()
    await expect(mapLimit([30, 10, 20], 2, delay => wait(delay).then(() => delay * 2))).resolves.toStrictEqual([60, 20, 40])
  })

  it('never runs more than the limit at the same time', async () => {
    expect.hasAssertions()
    let running = 0
    let maxRunning = 0
    await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async () => {
      running += 1
      maxRunning = Math.max(maxRunning, running)
      await wait(5)
      running -= 1
    })
    expect(maxRunning).toBe(3)
  })

  it('lets a free slot take the next item without waiting for a slow one', async () => {
    expect.hasAssertions()
    const started: number[] = []
    await mapLimit([50, 1, 1, 1], 2, async delay => {
      started.push(delay)
      await wait(delay)
    })
    expect(started).toStrictEqual([50, 1, 1, 1])
  })

  it('maps nothing for no items', async () => {
    expect.hasAssertions()
    await expect(mapLimit([], 4, item => item)).resolves.toStrictEqual([])
  })
})
