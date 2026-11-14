/** The ports a vite config sets */
export interface VitePorts {
  /** The port of the `preview` section, undefined when it sets none */
  preview?: number | undefined
  /** The port of the `server` section, undefined when it sets none */
  server?: number | undefined
}

/** Ports of the scheme are 51NN and 41NN, the project number is what the hundreds leave */
const numberBase = 100

/**
 * Get the project number of a port of the scheme
 * @param port the port, like 5105
 * @returns the number, like 5
 */
export function projectNumber(port: number) {
  return port % numberBase
}

/**
 * Read the port of a section of a vite config
 * @param text the text of the config
 * @param section the section, `server` or `preview`
 * @returns the port, undefined when the section sets none
 */
function portOf(text: string, section: string) {
  const body = new RegExp(String.raw`\b${section}:\s*\{(?<body>[^{}]*)\}`, 'u').exec(text)?.groups?.body ?? ''
  const port = /\bport:\s*(?<port>\d+)/u.exec(body)?.groups?.port
  return port === undefined ? undefined : Number(port)
}

/**
 * Read the dev and preview ports of a vite config
 * @param text the text of the config
 * @returns the ports, a section without port is left out
 * @example readVitePorts('server: { port: 5105 }, preview: { port: 4105 }') // { preview: 4105, server: 5105 }
 */
export function readVitePorts(text: string): VitePorts {
  return { preview: portOf(text, 'preview'), server: portOf(text, 'server') }
}
