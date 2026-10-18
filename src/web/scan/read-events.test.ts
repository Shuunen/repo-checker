import type { ScanEvent } from '../../shared/scan-event.ts'
import { sseResponse } from '../fixtures.ts'
import { readScanEvents } from './read-events.ts'

const events: ScanEvent[] = [
  { isNitpick: false, target: '/projects', type: 'started' },
  { line: 'checking 1 project — ünïcode', type: 'progress' },
  { durationMs: 1200, isSingle: false, owner: 'owner', type: 'done' },
]

/**
 * Read every event of a response
 * @param response the response
 * @returns the events
 */
async function readAll(response: Readonly<Response>) {
  const read: ScanEvent[] = []
  if (response.body === null) throw new Error('no body')
  for await (const event of readScanEvents(response.body)) read.push(event)
  return read
}

describe(readScanEvents, () => {
  it('reads every event of a body', async () => {
    expect.hasAssertions()
    await expect(readAll(sseResponse(events))).resolves.toStrictEqual(events)
  })

  it.each([1, 7, 50])('reads events split in chunks of %i characters', async size => {
    expect.hasAssertions()
    await expect(readAll(sseResponse(events, size))).resolves.toStrictEqual(events)
  })

  it('reads nothing from an empty body', async () => {
    expect.hasAssertions()
    await expect(readAll(sseResponse([]))).resolves.toStrictEqual([])
  })
})
