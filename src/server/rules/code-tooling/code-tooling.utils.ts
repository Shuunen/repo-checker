import type { Context } from '../../engine/context.ts'
import { hasDependency } from '../../engine/package-json.ts'

/** The ESLint flat config files, any of them is fine */
export const eslintConfigFiles = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts', 'eslint.config.mts']

/**
 * Tell if the project uses ESLint
 * @param context the project context
 * @param context.flags the project flags
 * @returns true when it does
 */
export function usesEslint({ flags }: Readonly<Context>) {
  return flags.isUsingEslint === true
}

/**
 * Tell if the project uses Tailwind
 * @param context the project context
 * @param context.pkg the package.json
 * @returns true when it depends on tailwindcss
 */
export function usesTailwind({ pkg }: Readonly<Context>) {
  return hasDependency(pkg, 'tailwindcss')
}

/**
 * Tell if the project uses knip, the dependency-cruiser checks are skipped then
 * @param context the project context
 * @param context.pkg the package.json
 * @returns true when it depends on knip
 */
export function usesKnip({ pkg }: Readonly<Context>) {
  return hasDependency(pkg, 'knip')
}
