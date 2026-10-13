/**
 * Access to the files of one project: on disk for real scans, in memory for tests. Paths are always relative to the project folder.
 * @module
 */
import { Buffer } from 'node:buffer'
import { glob, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

/** The number of bytes in one Ko */
const bytesPerKo = 1024

/** Folders `search` never looks into: dependencies, git internals and build outputs */
const ignoredFolders = new Set(['.git', 'coverage', 'dist', 'node_modules'])

/** Read-only access to the files of one project, the only way rules see the disk */
export interface FileReader {
  /** Read a file as utf8 text, undefined when it does not exist */
  readText: (file: string) => Promise<string | undefined>
  /** Find the files whose text matches a pattern, under a folder (the whole project when omitted), skipping `ignoredFolders`. Returns sorted paths */
  search: (pattern: Readonly<RegExp>, folder?: string) => Promise<string[]>
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
 * Tell if a path goes through an ignored folder
 * @param file the path, relative to the project folder
 * @returns true when `search` must skip it
 */
function isIgnored(file: string) {
  return file.split('/').some(part => ignoredFolders.has(part))
}

/**
 * Keep the files whose text matches a pattern, outside `ignoredFolders`
 * @param files the candidate paths, relative to the project folder
 * @param read how to read a file
 * @param pattern the pattern, its `g` flag does not matter
 * @returns the matching paths, sorted
 */
async function searchIn(files: readonly string[], read: FileReader['readText'], pattern: Readonly<RegExp>) {
  const candidates = files.filter(file => !isIgnored(file))
  const texts = await Promise.all(candidates.map(file => read(file)))
  return candidates.filter((_file, index) => (texts[index] ?? '').search(pattern) !== -1).toSorted()
}

/**
 * Get the size of a file on disk
 * @param file the absolute path of the file
 * @returns the size in Ko, undefined when the file does not exist
 */
async function sizeOnDisk(file: string) {
  const stats = await stat(file).catch(() => undefined)
  return stats === undefined ? undefined : toKo(stats.size)
}

/**
 * List the files under a folder on disk, skipping `ignoredFolders`
 * @param root the absolute path of the project folder
 * @param folder the folder to list, relative to the project folder
 * @returns the file paths, relative to the project folder
 */
async function listFiles(root: string, folder: string) {
  const entries = await Array.fromAsync(glob('**/*', { cwd: path.join(root, folder), exclude: entry => ignoredFolders.has(entry.name), withFileTypes: true }))
  return entries.filter(entry => entry.isFile()).map(entry => path.relative(root, path.join(entry.parentPath, entry.name)))
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
  return { readText, search: io.search, sizeKo: io.sizeKo, writeText }
}

/**
 * Write a file inside a project folder, creating the folders it needs. A path that leaves the project folder is refused: a fix only ever changes the project it is fixing
 * @param folder the absolute path of the project folder
 * @param file the path, relative to the project folder
 * @param text the new content
 * @throws {Error} when the path is outside the project folder
 */
async function writeInside(folder: string, file: string, text: string) {
  const full = path.join(folder, file)
  const relative = path.relative(folder, full)
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`${file} is outside the project folder, it is not written`)
  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, text)
}

/**
 * The files of a project folder on disk, reads are cached
 * @param folder the absolute path of the project folder
 * @returns the io
 * @example const io = diskIo('/home/me/projects/my-app')
 */
export function diskIo(folder: string) {
  const fullPath = (file: string) => path.join(folder, file)
  const readText = (file: string) => readFile(fullPath(file), 'utf8').catch(() => undefined)
  return withCache({
    readText,
    search: async (pattern, subFolder = '') => searchIn(await listFiles(folder, subFolder), readText, pattern),
    sizeKo: file => sizeOnDisk(fullPath(file)),
    writeText: (file, text) => writeInside(folder, file, text),
  })
}

/**
 * List the files of a fake project under a folder
 * @param files the file contents by path
 * @param folder the folder, relative to the project folder, empty for the whole project
 * @returns the file paths
 */
function filesUnder(files: Readonly<Record<string, string>>, folder: string) {
  return Object.keys(files).filter(file => file.startsWith(folder))
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
  const readText = (file: string) => Promise.resolve(files[file])
  return {
    readText,
    search: (pattern, folder = '') => searchIn(filesUnder(files, folder), readText, pattern),
    sizeKo: file => Promise.resolve(files[file] === undefined ? undefined : toKo(Buffer.byteLength(files[file]))),
    writeText(file, text) {
      files[file] = text
      return Promise.resolve()
    },
  }
}
