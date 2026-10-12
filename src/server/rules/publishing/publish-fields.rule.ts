import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'

/**
 * Tell if the project is a published package with a package.json
 * @param context the project context
 * @param context.flags the project flags
 * @param context.pkg the package.json
 * @returns true when the publishing rules apply
 */
function isPublished({ flags, pkg }: Readonly<Context>) {
  return flags.isPublishedPackage === true && pkg !== undefined
}

/**
 * Tell if the project is a published library, not a CLI that only publishes a bin: the entry point rules apply then
 * @param context the project context
 * @returns true when the package exposes code to import
 */
function isPublishedLibrary(context: Readonly<Context>) {
  const { pkg } = context
  const isBinOnly = pkg?.bin !== undefined && pkg.main === undefined && pkg.exports === undefined
  return isPublished(context) && !isBinOnly
}

export const publishTypeModule = defineRule({
  appliesTo: isPublished,
  check({ pkg, report }) {
    if (pkg?.type !== 'module') report({ messageId: 'missing' })
  },
  meta: { id: 'publish-type-module', messages: { missing: 'package.json has no "type": "module" declaration, for modern practices' }, severity: 'warning' },
})

export const publishTypesField = defineRule({
  appliesTo: context => isPublishedLibrary(context) && context.flags.isCli !== true && context.flags.isUsingTypescript === true,
  check({ pkg, report }) {
    const types = pkg?.types ?? pkg?.exports?.['.']?.types
    if (!types?.endsWith('.d.ts')) report({ messageId: 'missing' })
  },
  meta: { id: 'publish-types-field', messages: { missing: 'package.json has no "types" field pointing to a .d.ts file, like "types": "./dist/index.d.ts"' }, severity: 'error' },
})

export const publishMainField = defineRule({
  appliesTo: isPublishedLibrary,
  check({ flags, pkg, report }) {
    const extension = flags.isModule === true ? '.js' : '.cjs'
    if (!pkg?.main?.endsWith(extension)) report({ data: { extension }, messageId: 'wrong' })
  },
  meta: { id: 'publish-main-field', messages: { wrong: 'package.json "main" should point to a {{extension}} file, like "main": "./dist/index{{extension}}"' }, severity: 'error' },
})

export const publishModuleField = defineRule({
  appliesTo: context => isPublishedLibrary(context) && context.flags.isModule === true,
  check({ pkg, report }) {
    if (pkg?.module !== undefined) report({ messageId: 'found' })
  },
  meta: { id: 'publish-module-field', messages: { found: 'package.json has a "module" field, an ESM package does not need it' }, severity: 'error' },
})

export const publishCjsModuleField = defineRule({
  appliesTo: context => isPublishedLibrary(context) && context.flags.isModule !== true,
  check({ pkg, report }) {
    if (!pkg?.module?.endsWith('.mjs')) report({ messageId: 'missing' })
  },
  meta: { id: 'publish-cjs-module-field', messages: { missing: 'package.json has no "module" field pointing to an .mjs file, like "module": "./dist/index.mjs"' }, severity: 'warning' },
})

export const publishExportsField = defineRule({
  appliesTo: context => isPublishedLibrary(context) && context.flags.isModule === true,
  check({ pkg, report }) {
    const entry = pkg?.exports?.['.']
    if (!(entry?.import?.endsWith('.js') && entry.require?.endsWith('.cjs'))) report({ messageId: 'missing' })
  },
  meta: { id: 'publish-exports-field', messages: { missing: 'package.json has no "exports" field like "exports": { ".": { "import": "./dist/index.js", "require": "./dist/index.cjs" } }' }, severity: 'error' },
})

export const publishCjsExportsField = defineRule({
  appliesTo: context => isPublishedLibrary(context) && context.flags.isModule !== true,
  check({ pkg, report }) {
    const entry = pkg?.exports?.['.']
    if (!(entry?.import?.endsWith('.mjs') && entry.require?.endsWith('.cjs'))) report({ messageId: 'missing' })
  },
  meta: { id: 'publish-cjs-exports-field', messages: { missing: 'package.json has no "exports" field like "exports": { ".": { "import": "./dist/index.mjs", "require": "./dist/index.cjs" } }' }, severity: 'warning' },
})
