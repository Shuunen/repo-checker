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
  return { files, flags: { ...(await detectFlags(files)), ...flags }, pkg }
}
