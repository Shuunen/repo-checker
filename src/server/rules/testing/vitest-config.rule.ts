import { builders } from 'magicast'
import { requireInFile } from '../../engine/file-rules.ts'
import { editConfig, setOption } from '../../engine/fixer.ts'
import { hasDependency } from '../../engine/package-json.ts'
import { testOf } from './vitest.utils.ts'

/** Where the vitest options live: a vitest config, or the vite config that holds a `test` section */
const files = ['vitest.config.mts', 'vitest.config.ts', 'vitest.config.mjs', 'vitest.config.js', 'vite.config.mts', 'vite.config.ts', 'vite.config.mjs', 'vite.config.js']

/** The thresholds of a coverage when they are a plain object, replaced as text so the rest of the file keeps its layout */
const simpleThresholds = /thresholds:\s*\{[^{}]*\}/u

export const vitestConfigRules = [
  requireInFile({
    files,
    fix: text =>
      simpleThresholds.test(text)
        ? text.replace(simpleThresholds, 'thresholds: { 100: true }')
        : editConfig(text, options => {
            const test = testOf(options)
            if (test.coverage === undefined) setOption(test, 'coverage', builders.raw('{ thresholds: { 100: true } }'))
            else setOption(test.coverage as Record<string, unknown>, 'thresholds', builders.raw('{ 100: true }'))
          }),
    id: 'vitest-coverage-100',
    message: '{{file}} does not require a 100% coverage, like coverage: { thresholds: { 100: true } }',
    pattern: /thresholds:\s*\{\s*['"]?100['"]?:\s*true\s*,?\s*\}/u,
    severity: 'info',
    when: ({ pkg }) => hasDependency(pkg, 'vitest'),
  }),
  requireInFile({
    files,
    fix: text =>
      editConfig(text, options => {
        setOption(testOf(options), 'globals', true)
      }),
    id: 'vitest-globals',
    message: '{{file}} does not make describe, it and expect globals, like globals: true',
    pattern: /\bglobals:\s*true\b/u,
    severity: 'info',
    when: ({ pkg }) => hasDependency(pkg, 'vitest'),
  }),
  requireInFile({
    files,
    fix: text =>
      editConfig(text, options => {
        setOption(testOf(options), 'reporters', ['dot'])
      }),
    id: 'vitest-reporter-dot',
    message: "{{file}} does not use the dot reporter, like reporters: ['dot']",
    pattern: /reporters:\s*\[\s*['"]dot['"]\s*\]/u,
    severity: 'info',
    when: ({ pkg }) => hasDependency(pkg, 'vitest'),
  }),
  requireInFile({
    files,
    fix: text =>
      editConfig(text, options => {
        setOption(testOf(options), 'silent', true)
      }),
    id: 'vitest-silent',
    message: '{{file}} lets the tests print to the console, like silent: true',
    pattern: /\bsilent:\s*true\b/u,
    severity: 'info',
    when: ({ pkg }) => hasDependency(pkg, 'vitest'),
  }),
  requireInFile({
    files,
    fix: text =>
      editConfig(text, options => {
        setOption(testOf(options), 'environment', 'happy-dom')
      }),
    id: 'vitest-environment-happy-dom',
    message: "{{file}} does not set a test environment, the project depends on happy-dom, like environment: 'happy-dom'",
    pattern: /\benvironment:/u,
    severity: 'info',
    when: ({ pkg }) => hasDependency(pkg, 'vitest') && hasDependency(pkg, 'happy-dom'),
  }),
]
