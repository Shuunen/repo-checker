/**
 * The context of one project: what every rule can read, built once per scan so files are read and parsed once.
 * @module
 */
import { isNil } from 'es-toolkit'
import { parse } from 'jsonc-parser'
import type { FileReader } from './io.ts'

/** The parts of a package.json the rules read, every field may be missing */
export interface PackageJson {
  /** The json schema url, usually `https://json.schemastore.org/package` */
  $schema?: string
  /** Runtime dependencies, by name, with their version range */
  dependencies?: Record<string, string>
  /** Development dependencies, by name, with their version range */
  devDependencies?: Record<string, string>
  /** The entry file of the package, relative to the project folder */
  main?: string
  /** The package name */
  name?: string
  /** The npm scripts, by name, with their command */
  scripts?: Record<string, string>
  /** The package version */
  version?: string
}

/** What the project declares in its config or what was detected about it, the successor of the old ProjectData */
export interface ProjectFlags {
  /** The maximum size of the main file in Ko, the size rule is skipped when it is not set */
  maxSizeKo?: number
}

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
 * Build the context of one project
 * @param files the reader of the project files
 * @param flags the project flags
 * @returns the context
 * @example const context = await buildContext(diskIo(folder), { maxSizeKo: 100 })
 */
export async function buildContext(files: FileReader, flags: ProjectFlags = {}): Promise<Context> {
  const text = await files.readText('package.json')
  const pkg = isNil(text) ? undefined : (parse(text) as PackageJson)
  return { files, flags, pkg }
}
