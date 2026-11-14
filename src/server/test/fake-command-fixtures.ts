import { chmod, writeFile } from 'node:fs/promises'
import path from 'node:path'

/** The mode of a launcher the shell can run */
const executable = 0o755

/**
 * Write a fake command in a folder, a node script behind a thin launcher so it runs the same on every platform: a `.cmd` on Windows, a `sh` script elsewhere
 * @param folder the folder to put it in
 * @param name the command name, like `pnpm`
 * @param source the javascript the command runs, as an ES module
 */
export async function writeFakeCommand(folder: string, name: string, source: string) {
  await writeFile(path.join(folder, `${name}.mjs`), source)
  if (process.platform === 'win32') {
    await writeFile(path.join(folder, `${name}.cmd`), `@node "%~dp0${name}.mjs" %*\r\n`)
    return
  }
  const launcher = path.join(folder, name)
  await writeFile(launcher, `#!/bin/sh\nexec node "$(dirname "$0")/${name}.mjs" "$@"\n`)
  await chmod(launcher, executable)
}

/**
 * Put folders first in the PATH, with the separator of the platform
 * @param folders the folders
 * @returns the new PATH value
 */
export function pathWith(...folders: readonly string[]) {
  return [...folders, process.env.PATH ?? ''].join(path.delimiter)
}

/**
 * Write a fake command that records its arguments, space separated and followed by a newline, in a file, and put the folder first in the PATH
 * @param folder the folder to put it in
 * @param name the command name, like `pnpm`
 * @param argsFile the file that receives the arguments
 * @returns when it is written
 */
export async function writeArgsRecorder(folder: string, name: string, argsFile: string) {
  await writeFakeCommand(folder, name, `import { writeFileSync } from 'node:fs'\nwriteFileSync(${JSON.stringify(argsFile)}, process.argv.slice(2).join(' ') + '\\n')\n`)
  vi.stubEnv('PATH', pathWith(folder))
}
