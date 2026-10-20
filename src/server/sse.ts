import type { SSEStreamingApi } from 'hono/streaming'

/**
 * Send events in order: they are sent from callbacks that do not wait, so each write waits for the previous one. The event name is the `type` of the event
 * @template Event the events, each one has a `type`
 * @param stream the server-sent events stream
 * @returns the sender, it resolves once that event is written
 * @example const send = eventSender<ScanEvent>(stream)
 */
export function eventSender<Event extends { type: string }>(stream: Readonly<SSEStreamingApi>) {
  let queue = Promise.resolve()
  return (event: Readonly<Event>) => {
    queue = queue.then(() => stream.writeSSE({ data: JSON.stringify(event), event: event.type }))
    return queue
  }
}
