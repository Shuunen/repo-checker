/**
 * The context of one project: what every rule can read, built once per scan so files are read and parsed once.
 * @module
 */
import { isNil } from 'es-toolkit'
import { parse } from 'jsonc-parser'
import { detectFlags, type ProjectFlags } from './flags.ts'
import type { FileReader } from './io.ts'
import type { PackageJson } from './package-json.ts'

/** Everything a rule can know about one project */
export interface Context {
  /** Read-only access to the project files, cached */
  files: FileReader
  /** What the project declares or what was detected */
  flags: ProjectFlags
  /** The parsed package.json, undefined when the project has none. Comments and trailing commas are tolerated */
  pkg: PackageJson | undefined
  /** The README, `README.md` first then `readme.md`, undefined when the project has none */
  readme: Readme | undefined
}

/** The README of a project */
interface Readme {
  /** The file name, `README.md` or `readme.md`, the one to edit when fixing */
  file: string
  /** The markdown text */
  text: string
}

/**
 * Read the README of a project
 * @param files the reader of the project files
 * @returns the README, undefined when the project has none
 */
async function readReadme(files: FileReader): Promise<Readme | undefined> {
  const [upper, lower] = await Promise.all([files.readText('README.md'), files.readText('readme.md')])
  if (upper !== undefined) return { file: 'README.md', text: upper }
  return lower === undefined ? undefined : { file: 'readme.md', text: lower }
}

/**
 * Build the context of one project, flags are detected then overridden by the given ones
 * @param files the reader of the project files
 * @param flags flags that win over the detected ones, mostly for tests
 * @returns the context
 * @example const context = await buildContext(diskIo(folder))
 */
export async function buildContext(files: FileReader, flags: ProjectFlags = {}): Promise<Context> {
  const text = await files.readText('package.json')
  const pkg = isNil(text) ? undefined : (parse(text) as PackageJson)
  return { files, flags: { ...(await detectFlags(files)), ...flags }, pkg, readme: await readReadme(files) }
}
