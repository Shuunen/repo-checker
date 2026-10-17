import { invariant } from 'es-toolkit'
import type { ScanEvent } from '../../shared/scan-event.ts'

/**
 * Parse one server-sent event block, like `event: project\ndata: {...}`, the event name is also in the data as `type`
 * @param block the lines of one event
 * @returns the event
 */
function parseBlock(block: string) {
  const data = block
    .split('\n')
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice('data:'.length).trimStart())
  return JSON.parse(data.join('\n')) as ScanEvent
}

/**
 * Read the scan events of a server-sent events body as they arrive, an event split across chunks is read once complete
 * @param body the response body of `GET /api/scan`
 * @yields {ScanEvent} each event, in order
 * @example for await (const event of readScanEvents(response.body)) console.log(event.type)
 */
export async function* readScanEvents(body: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const bytes of body) {
    const blocks = `${buffer}${decoder.decode(bytes, { stream: true })}`.split('\n\n')
    const rest = blocks.pop()
    invariant(rest !== undefined, 'split always gives at least one block')
    buffer = rest
    yield* blocks.filter(block => block.trim() !== '').map(block => parseBlock(block))
  }
}
