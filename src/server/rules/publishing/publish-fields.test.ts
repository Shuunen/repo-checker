import type { ProjectFlags } from '../../engine/flags.ts'
import { testRule } from '../../engine/rule-tester.ts'
import { publishCjsExportsField, publishCjsModuleField, publishExportsField, publishMainField, publishModuleField, publishTypeModule, publishTypesField } from './publish-fields.rule.ts'

const esm: ProjectFlags = { isModule: true, isPublishedPackage: true }
const cjs: ProjectFlags = { isModule: false, isPublishedPackage: true }

testRule(publishTypeModule, {
  invalid: [{ errors: ['missing'], flags: cjs, name: 'no type module', pkg: { name: 'foo' } }],
  valid: [
    { flags: esm, name: 'type module', pkg: { type: 'module' } },
    { flags: { isPublishedPackage: false }, name: 'not published', pkg: { name: 'foo' } },
  ],
})

testRule(publishTypesField, {
  invalid: [{ errors: ['missing'], flags: { ...esm, isUsingTypescript: true }, name: 'no types', pkg: { name: 'foo' } }],
  valid: [
    { flags: { ...esm, isUsingTypescript: true }, name: 'a types field', pkg: { types: './dist/index.d.ts' } },
    { flags: { ...esm, isUsingTypescript: true }, name: 'types in exports', pkg: { exports: { '.': { types: './dist/index.d.ts' } } } },
    { flags: { ...esm, isCli: true, isUsingTypescript: true }, name: 'a cli', pkg: { name: 'foo' } },
  ],
})

testRule(publishMainField, {
  invalid: [
    { errors: ['wrong'], flags: esm, name: 'esm with a cjs main', pkg: { main: './dist/index.cjs' } },
    { errors: ['wrong'], flags: cjs, name: 'cjs without main', pkg: { name: 'foo' } },
  ],
  valid: [
    { flags: esm, name: 'esm with a js main', pkg: { main: './dist/index.js' } },
    { flags: cjs, name: 'cjs with a cjs main', pkg: { main: './dist/index.cjs' } },
  ],
})

testRule(publishModuleField, {
  invalid: [{ errors: ['found'], flags: esm, name: 'esm with a module field', pkg: { module: './dist/index.mjs' } }],
  valid: [{ flags: esm, name: 'esm without module field', pkg: { main: './dist/index.js' } }],
})

testRule(publishCjsModuleField, {
  invalid: [{ errors: ['missing'], flags: cjs, name: 'cjs without module field', pkg: { main: './dist/index.cjs' } }],
  valid: [{ flags: cjs, name: 'cjs with an mjs module', pkg: { module: './dist/index.mjs' } }],
})

testRule(publishExportsField, {
  invalid: [{ errors: ['missing'], flags: esm, name: 'esm with mjs exports', pkg: { exports: { '.': { import: './dist/index.mjs', require: './dist/index.cjs' } } } }],
  valid: [{ flags: esm, name: 'esm exports', pkg: { exports: { '.': { import: './dist/index.js', require: './dist/index.cjs' } } } }],
})

testRule(publishCjsExportsField, {
  invalid: [{ errors: ['missing'], flags: cjs, name: 'cjs without exports', pkg: { main: './dist/index.cjs' } }],
  valid: [{ flags: cjs, name: 'cjs exports', pkg: { exports: { '.': { import: './dist/index.mjs', require: './dist/index.cjs' } } } }],
})
