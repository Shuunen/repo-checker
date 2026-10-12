/**
 * The package.json shape the rules read, and helpers to look into it.
 * @module
 */
/** A `repository` field: a shorthand string like `github:user/repo`, or an object with a url */
type Repository = string | { type?: string; url?: string }

/** One entry of the `exports` field, the paths of each condition */
interface ExportEntry {
  /** The path for `import`, the ESM build */
  import?: string
  /** The path for `require`, the CommonJS build */
  require?: string
  /** The path of the type declarations */
  types?: string
}

/** The parts of a package.json the rules read, every field may be missing */
export interface PackageJson {
  /** The json schema url, usually `https://json.schemastore.org/package` */
  $schema?: string
  /** The author, like `Name <mail>` */
  author?: string
  /** The url where to report bugs */
  bugs?: string
  /** Runtime dependencies, by name, with their version range */
  dependencies?: Record<string, string>
  /** The command line entry points, by command name, or a single path */
  bin?: Record<string, string> | string
  /** A one line description of the package */
  description?: string
  /** Development dependencies, by name, with their version range */
  devDependencies?: Record<string, string>
  /** The entry points by subpath, `.` being the main one */
  exports?: Record<string, ExportEntry>
  /** The files to publish */
  files?: string[]
  /** The url of the project home page */
  homepage?: string
  /** The npm keywords */
  keywords?: string[]
  /** The license identifier, like `MIT` or `GPL-3.0` */
  license?: string
  /** The entry file of the package, relative to the project folder */
  main?: string
  /** The legacy ESM entry file, used by bundlers */
  module?: string
  /** The package name */
  name?: string
  /** The package manager and its version, like `pnpm@12.8.1` or `bun@1.4.2` */
  packageManager?: string
  /** True when the package must never be published */
  private?: boolean
  /** Where the source code lives */
  repository?: Repository
  /** The npm scripts, by name, with their command */
  scripts?: Record<string, string>
  /** `module` for an ESM package, `commonjs` or absent for CommonJS */
  type?: string
  /** The type declarations entry file */
  types?: string
  /** The package version */
  version?: string
}

/**
 * Get the version range of a dependency, from dependencies or devDependencies
 * @param pkg the package.json, undefined when the project has none
 * @param name the dependency name
 * @returns the version range, undefined when the project does not depend on it
 * @example dependencyVersion({ devDependencies: { vitest: '^4.0.0' } }, 'vitest') // '^4.0.0'
 */
export function dependencyVersion(pkg: Readonly<PackageJson> | undefined, name: string) {
  return pkg?.dependencies?.[name] ?? pkg?.devDependencies?.[name]
}

/**
 * Tell if the project depends on a package, in dependencies or devDependencies
 * @param pkg the package.json, undefined when the project has none
 * @param name the dependency name
 * @returns true when it is a dependency
 * @example hasDependency({ dependencies: { zod: '^4.0.0' } }, 'zod') // true
 */
export function hasDependency(pkg: Readonly<PackageJson> | undefined, name: string) {
  return dependencyVersion(pkg, name) !== undefined
}

/**
 * Get the scripts whose command matches a pattern
 * @param pkg the package.json, undefined when the project has none
 * @param pattern the pattern to look for in each command, without the `g` flag
 * @returns the matching scripts, as `[name, command]` pairs
 * @example scriptsMatching({ scripts: { test: 'npm test' } }, /\bnpm test\b/u) // [['test', 'npm test']]
 */
export function scriptsMatching(pkg: Readonly<PackageJson> | undefined, pattern: Readonly<RegExp>) {
  return Object.entries(pkg?.scripts ?? {}).filter(([, command]) => pattern.test(command))
}
