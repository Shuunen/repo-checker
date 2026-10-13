/** Opens a page in the default browser, the real one starts a command, tests use a fake */
export type OpenBrowser = (url: string) => void

/**
 * The command that opens a url in the default browser of a platform, as the program and its arguments
 * @param platform `process.platform`
 * @param url the address to open
 * @returns the program and its arguments, to run without a shell
 * @example browserCommand('linux', 'http://127.0.0.1:4747') // ['xdg-open', 'http://127.0.0.1:4747']
 */
export function browserCommand(platform: string, url: string) {
  if (platform === 'darwin') return ['open', url]
  if (platform === 'win32') return ['cmd', '/c', 'start', '""', url]
  return ['xdg-open', url]
}
