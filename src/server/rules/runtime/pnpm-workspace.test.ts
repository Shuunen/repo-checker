import { testRule } from '../../test/rule-tester.ts'
import { pnpmWorkspaceNoLegacyOnlyBuilt } from './pnpm-workspace.rule.ts'

testRule(pnpmWorkspaceNoLegacyOnlyBuilt, {
  invalid: [
    { errors: ['legacy'], files: { 'pnpm-workspace.yaml': 'onlyBuiltDependencies:\n  - esbuild\n  - bun\n' }, name: 'only the legacy list', output: 'allowBuilds:\n  esbuild: true\n  bun: true\n' },
    { errors: ['legacy'], files: { 'pnpm-workspace.yaml': 'allowBuilds:\n  bun: true\nonlyBuiltDependencies:\n  - bun\n  - esbuild\n' }, name: 'next to allowBuilds, duplicates dropped', output: 'allowBuilds:\n  esbuild: true\n  bun: true\n' },
    { errors: ['legacy'], files: { 'pnpm-workspace.yaml': 'onlyBuiltDependencies:\n  - "@swc/core"\noverrides:\n  a: 1\n' }, name: 'a quoted scoped package and other keys', output: 'overrides:\n  a: 1\nallowBuilds:\n  @swc/core: true\n' },
    { errors: ['legacy'], files: { 'pnpm-workspace.yaml': 'allowBuilds:\n  bun: true\nonlyBuiltDependencies:\n  - bun\n' }, name: 'nothing new to move', output: 'allowBuilds:\n  bun: true\n' },
  ],
  valid: [{ files: { 'pnpm-workspace.yaml': 'allowBuilds:\n  bun: true\n' }, name: 'allowBuilds' }, { name: 'no workspace file' }],
})
