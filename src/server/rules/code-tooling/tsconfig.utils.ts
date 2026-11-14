import { invariant } from 'es-toolkit'
import { parse } from 'jsonc-parser'
import type { Context } from '../../engine/context.ts'

/** The tsconfig.json fields the rules read */
interface TsConfig {
  compilerOptions?: Record<string, unknown>
  extends?: string | string[]
  files?: string[]
  include?: string[]
  references?: unknown[]
}

/** The compiler options every project should set, with their value */
export const recommendedCompilerOptions: Readonly<Record<string, boolean>> = {
  allowUnreachableCode: false,
  allowUnusedLabels: false,
  checkJs: true,
  esModuleInterop: true,
  exactOptionalPropertyTypes: true,
  forceConsistentCasingInFileNames: true,
  noFallthroughCasesInSwitch: true,
  noImplicitAny: true,
  noImplicitOverride: true,
  noImplicitReturns: true,
  noPropertyAccessFromIndexSignature: false,
  noUncheckedIndexedAccess: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  skipLibCheck: true,
  strict: true,
  verbatimModuleSyntax: true,
}

/** What a config extending @tsconfig/strictest still has to set */
export const strictestCompilerOptions: Readonly<Record<string, boolean>> = { verbatimModuleSyntax: true }

/**
 * Read and parse tsconfig.json
 * @param context the project context
 * @returns the parsed config, undefined when there is no tsconfig.json
 */
async function readTsconfig(context: Readonly<Context>) {
  const text = await context.files.readText('tsconfig.json')
  return text === undefined ? undefined : ((parse(text) as TsConfig | undefined) ?? {})
}

/**
 * Tell if the tsconfig rules apply: a TypeScript project with a tsconfig.json
 * @param context the project context
 * @returns true when they apply
 */
export async function hasTsconfig(context: Readonly<Context>) {
  return context.flags.isUsingTypescript === true && (await readTsconfig(context)) !== undefined
}

/**
 * Tell if the compiler option rules apply: a tsconfig.json that is not a solution-style config with references
 * @param context the project context
 * @returns true when they apply
 */
export async function hasOwnCompilerOptions(context: Readonly<Context>) {
  const config = await readTsconfig(context)
  return context.flags.isUsingTypescript === true && config !== undefined && config.references === undefined
}

/**
 * Read tsconfig.json in a rule whose appliesTo guarantees it exists
 * @param context the project context
 * @returns the parsed config
 */
export async function readCheckedTsconfig(context: Readonly<Context>) {
  const config = await readTsconfig(context)
  invariant(config !== undefined, 'appliesTo guarantees a tsconfig.json')
  return config
}
