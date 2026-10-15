import { defineRule } from '../../engine/define-rule.ts'
import { requireFile, requireInFile } from '../../engine/file-rules.ts'
import { usesKnip, usesTailwind } from './code-tooling.utils.ts'

export const dependencyToolChoice = defineRule({
  appliesTo: context => !usesKnip(context),
  check({ flags, report }) {
    if (flags.isUsingDependencyCruiser !== true) report({ messageId: 'missing' })
  },
  meta: { id: 'dependency-tool-choice', messages: { missing: 'no tool checks the dependencies, use knip (https://knip.dev) or dependency-cruiser' }, severity: 'warning' },
})

export const toolingRules = [
  requireFile({ files: ['.dependency-cruiser.js', '.dependency-cruiser.cjs'], id: 'dependency-cruiser-config', message: 'no dependency-cruiser config, like {{file}}', severity: 'error', when: context => context.flags.isUsingDependencyCruiser === true && !usesKnip(context) }),
  requireInFile({ files: ['tailwind.config.mjs', 'tailwind.config.ts', 'tailwind.config.js', 'tailwind.config.cjs'], id: 'tailwind-content', message: "{{file}} has no content option, like content: ['./src/**/*.{vue,js,ts,jsx,tsx}']", pattern: /content/u, severity: 'error', when: usesTailwind }),
  requireFile({ content: '{\n  "$schema": "./node_modules/repo-check/schema.json"\n}\n', files: ['.repo-checker.json'], id: 'repo-checker-config', message: 'no {{file}} file to tell repo-check about the project, like { "maxSizeKo": 100 }', severity: 'warning' }),
]
