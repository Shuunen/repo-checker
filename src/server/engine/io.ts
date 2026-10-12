/**
 * Access to the files of one project: on disk for real scans, in memory for tests. Paths are always relative to the project folder.
 * @module
 */
import { Buffer } from 'node:buffer'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

/** The number of bytes in one Ko */
const bytesPerKo = 1024

/** Read-only access to the files of one project, the only way rules see the disk */
export interface FileReader {
  /** Read a file as utf8 text, undefined when it does not exist */
  readText: (file: string) => Promise<string | undefined>
  /** Get the size of a file in Ko, rounded, undefined when it does not exist */
  sizeKo: (file: string) => Promise<number | undefined>
}

/** Read and write access, what the runner needs. Rules only get the `FileReader` part */
export interface Io extends FileReader {
  /** Write a file as utf8 text, creating or replacing it */
  writeText: (file: string, text: string) => Promise<void>
}

/**
 * Convert a size in bytes to Ko, rounded like the old tool
 * @param bytes the size in bytes
 * @returns the size in Ko
 */
function toKo(bytes: number) {
  return Math.round(bytes / bytesPerKo)
}

/**
 * Cache the reads of an io, so many rules can read the same file for the cost of one read. Writes update the cache
 * @param io the io to cache
 * @returns the cached io
 */
function withCache(io: Readonly<Io>): Io {
  const cache = new Map<string, Promise<string | undefined>>()
  const readText = (file: string) => {
    const text = cache.get(file) ?? io.readText(file)
    cache.set(file, text)
    return text
  }
  const writeText = (file: string, text: string) => io.writeText(file, text).then(() => void cache.set(file, Promise.resolve(text)))
  return { readText, sizeKo: io.sizeKo, writeText }
}

/**
 * The files of a project folder on disk, reads are cached
 * @param folder the absolute path of the project folder
 * @returns the io
 * @example const io = diskIo('/home/me/projects/my-app')
 */
export function diskIo(folder: string) {
  const fullPath = (file: string) => path.join(folder, file)
  return withCache({
    readText: file => readFile(fullPath(file), 'utf8').catch(() => undefined),
    sizeKo: file =>
      stat(fullPath(file)).then(
        stats => toKo(stats.size),
        () => undefined,
      ),
    writeText: (file, text) => writeFile(fullPath(file), text),
  })
}

/**
 * The files of a fake project in memory, for tests
 * @param files the file contents by path, it is changed in place by writes so tests can read the result from it
 * @returns the io
 * @example
 * const files = { 'package.json': '{}' }
 * const io = memoryIo(files)
 */
export function memoryIo(files: Record<string, string> = {}): Io {
  return {
    readText: file => Promise.resolve(files[file]),
    sizeKo: file => Promise.resolve(files[file] === undefined ? undefined : toKo(Buffer.byteLength(files[file]))),
    writeText(file, text) {
      files[file] = text
      return Promise.resolve()
    },
  }
}
