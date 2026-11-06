import type { Server } from 'node:http'
import { serve } from '@hono/node-server'

/** A running server */
interface RunningServer {
  /** Stop listening */
  close: () => Promise<void>
  /** The base URL, like `http://127.0.0.1:4747` */
  url: string
}

/** Start an HTTP server on 127.0.0.1, so CliEnvironment can swap it in tests */
export type StartServer = (fetch: (request: Request) => Promise<Response> | Response, port: number) => Promise<RunningServer>

/**
 * Close a server, ending its open connections such as the scan stream
 * @param server the node server
 * @returns resolves once closed
 */
function closeServer(server: Readonly<ReturnType<typeof serve>>) {
  return new Promise<void>(resolve => {
    server.close(() => resolve())
    ;(server as Server).closeAllConnections()
  })
}

/**
 * Start the HTTP server, on 127.0.0.1 only because its actions can delete things
 * @param fetch handles each request, like a Hono app's `fetch`
 * @param port the port, 0 picks a free one
 * @returns the running server
 * @throws {Error} when the port is taken
 * @example const { url } = await startServer(app.fetch, 4747)
 */
export const startServer: StartServer = (fetch, port) =>
  new Promise((resolve, reject) => {
    const server = serve({ fetch, hostname: '127.0.0.1', port }, info => resolve({ close: () => closeServer(server), url: `http://127.0.0.1:${info.port}` }))
    server.once('error', reject)
  })
