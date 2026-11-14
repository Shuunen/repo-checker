import path from 'node:path'

/**
 * Show a folder the way a person writes it: the home folder becomes `~`. Only for display, the server keeps the real path
 * @param folder the absolute folder
 * @param home the home folder
 * @returns like `~/Projects/github`, the folder itself when it is not inside the home folder
 * @example homePath('/home/me/Projects', '/home/me') // '~/Projects'
 */
export function homePath(folder: string, home: string) {
  const relative = path.relative(home, folder)
  if (relative === '') return '~'
  return relative.startsWith('..') || path.isAbsolute(relative) ? folder : `~/${relative.split(path.sep).join('/')}`
}
