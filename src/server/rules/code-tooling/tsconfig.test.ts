import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { recommendedCompilerOptions } from './tsconfig.utils.ts'
import { compilerOptionRules, tsconfigCompilerOptions, tsconfigInclude, tsconfigNoUselessGlob, tsconfigNoWildcardFiles, tsconfigSchema } from './tsconfig.rule.ts'

const ts = { isUsingTypescript: true }
const json = (value: unknown) => ({ 'tsconfig.json': `${JSON.stringify(value, undefined, 2)}\n` })
const complete = { compilerOptions: { ...recommendedCompilerOptions, lib: ['ESNext'], moduleResolution: 'bundler', outDir: './dist' }, include: ['src'] }

/**
 * Get a rule of the compiler option table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = compilerOptionRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

testRule(tsconfigSchema, {
  invalid: [{ errors: ['missing'], files: json({ include: ['src'] }), flags: ts, name: 'no schema, added first', output: `${JSON.stringify({ $schema: 'https://json.schemastore.org/tsconfig', include: ['src'] }, undefined, 2)}\n` }],
  valid: [{ files: json({}), name: 'not a TypeScript project' }],
})

testRule(tsconfigInclude, {
  invalid: [{ errors: ['missing'], files: json({ compilerOptions: {} }), flags: ts, name: 'no include, added', output: `${JSON.stringify({ compilerOptions: {}, include: ['src'] }, undefined, 2)}\n` }],
  valid: [
    { files: json(complete), flags: ts, name: 'an include' },
    { files: json({ references: [{ path: './tsconfig.app.json' }] }), flags: ts, name: 'a solution-style config, skipped' },
    { flags: ts, name: 'no tsconfig.json, skipped' },
    { files: { 'tsconfig.json': '{ "include": ["src"] }' }, flags: ts, name: 'an include, on one line' },
  ],
})

testRule(tsconfigCompilerOptions, {
  invalid: [{ errors: ['wrong'], files: json({ ...complete, compilerOptions: { ...complete.compilerOptions, strict: false } }), flags: ts, name: 'strict false, set to true', output: `${JSON.stringify(complete, undefined, 2)}\n` }],
  valid: [
    { files: json(complete), flags: ts, name: 'every recommended option' },
    { files: json({ compilerOptions: { verbatimModuleSyntax: true }, extends: '@tsconfig/strictest/tsconfig.json' }), flags: ts, name: 'strictest only needs verbatimModuleSyntax' },
  ],
})

testRule(tsconfigCompilerOptions, {
  invalid: [{ errors: Object.keys(recommendedCompilerOptions).map(() => 'wrong'), files: json({}), flags: ts, name: 'no compiler options at all, all added', output: `${JSON.stringify({ compilerOptions: recommendedCompilerOptions }, undefined, 2)}\n` }],
  valid: [],
})

testRule(byId('tsconfig-out-dir'), {
  invalid: [{ errors: ['missing'], files: json({ compilerOptions: {} }), flags: ts, name: 'no outDir, added', output: `${JSON.stringify({ compilerOptions: { outDir: './dist' } }, undefined, 2)}\n` }],
  valid: [{ files: json(complete), flags: ts, name: 'an outDir' }],
})
testRule(byId('tsconfig-module-resolution'), {
  invalid: [{ errors: ['missing'], files: json({}), flags: ts, name: 'no moduleResolution, added', output: `${JSON.stringify({ compilerOptions: { moduleResolution: 'bundler' } }, undefined, 2)}\n` }],
  valid: [{ files: json(complete), flags: ts, name: 'a moduleResolution' }],
})
testRule(byId('tsconfig-lib'), {
  invalid: [{ errors: ['missing'], files: json({ compilerOptions: { lib: [] } }), flags: ts, name: 'an empty lib, filled', output: `${JSON.stringify({ compilerOptions: { lib: ['ESNext'] } }, undefined, 2)}\n` }],
  valid: [{ files: json(complete), flags: ts, name: 'a lib' }],
})

testRule(tsconfigNoWildcardFiles, {
  invalid: [{ errors: ['found'], files: json({ files: ['src/index.ts', 'src/*.ts'] }), flags: ts, name: 'a wildcard in files' }],
  valid: [
    { files: json({ files: ['src/index.ts'] }), flags: ts, name: 'plain files' },
    { files: json({}), flags: ts, name: 'no files section' },
  ],
})

testRule(tsconfigNoUselessGlob, {
  invalid: [{ errors: ['found'], files: json({ include: ['src/**/*', 'tests'] }), flags: ts, name: 'a useless glob, removed', output: `${JSON.stringify({ include: ['src', 'tests'] }, undefined, 2)}\n` }],
  valid: [
    { files: json({ include: ['src', 'tests/**/*.ts'] }), flags: ts, name: 'folders and real patterns' },
    { files: json({}), flags: ts, name: 'no include section' },
  ],
})

testRule(tsconfigInclude, {
  invalid: [{ errors: ['missing'], files: { 'tsconfig.json': '' }, flags: ts, name: 'an empty tsconfig.json, include added', output: '{\n  "include": [\n    "src"\n  ]\n}' }],
  valid: [],
})
