import { invariant } from 'es-toolkit'
import type { Severity } from '../../../shared/scan-event.ts'
import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { addIgnoreLine } from '../../engine/gitignore.ts'
import { hasDependency } from '../../engine/package-json.ts'

/** The options of `requireIgnored` */
interface RequireIgnoredOptions {
  /** Tell if the project has something to ignore, like a build script, the rule is skipped otherwise */
  applies: (context: Readonly<Context>) => Promise<boolean> | boolean
  /** The check id */
  id: string
  /** The line the fix adds to the .gitignore */
  line: string
  /** A line of the .gitignore that already covers it, matched on each line */
  pattern: RegExp
  /** The severity */
  severity: Severity
}

/**
 * A rule that requires the .gitignore to list something, fixable: the line is added, keeping the list sorted. Skipped when there is no .gitignore, `gitignore-exists` reports that
 * @param options the options
 * @param options.applies tell if the project has something to ignore
 * @param options.id the check id
 * @param options.line the line the fix adds
 * @param options.pattern a line that already covers it, without the `g` flag and with the `m` flag
 * @param options.severity the severity
 * @returns the rule
 * @example requireIgnored({ applies: ({ pkg }) => pkg?.scripts?.build !== undefined, id: 'gitignore-dist', line: 'dist', pattern: /^\/?dist\/?$/mu, severity: 'warning' })
 */
function requireIgnored({ applies, id, line, pattern, severity }: Readonly<RequireIgnoredOptions>) {
  return defineRule({
    async appliesTo(context) {
      return (await context.files.readText('.gitignore')) !== undefined && (await applies(context))
    },
    async check({ files, report }) {
      const text = await files.readText('.gitignore')
      invariant(text !== undefined, 'appliesTo guarantees a .gitignore')
      if (!pattern.test(text)) report({ data: { line }, fix: fixer => fixer.text('.gitignore', current => addIgnoreLine(current, line)), messageId: 'missing' })
    },
    meta: { fixable: true, id, messages: { missing: '.gitignore does not list {{line}}' }, severity },
  })
}

/** The tsconfig files that can turn on a `.tsbuildinfo` file */
const tsconfigFiles = ['tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'tsconfig.base.json', 'tsconfig.build.json']

/**
 * Tell if the project writes a `.tsbuildinfo` file: a tsconfig sets `incremental`, `composite` or `tsBuildInfoFile`, or a script runs `tsc --build`
 * @param context the project context
 * @param context.files the reader of the project files
 * @param context.flags the project flags
 * @param context.pkg the package.json
 * @returns true when the file is written
 */
async function writesTsBuildInfo({ files, flags, pkg }: Readonly<Context>) {
  if (flags.isUsingTypescript !== true || pkg === undefined) return false
  if (Object.values(pkg.scripts ?? {}).some(script => /\btsc\s+(?:-b|--build)\b/u.test(script))) return true
  const texts = await Promise.all(tsconfigFiles.map(file => files.readText(file)))
  return texts.some(text => /"(?:incremental|composite|tsBuildInfoFile)"/u.test(text ?? ''))
}

/**
 * Tell if the project runs tests with a coverage report: a script or a dependency mentions coverage
 * @param context the project context
 * @param context.pkg the package.json
 * @returns true when a coverage folder is likely
 */
function hasCoverage({ pkg }: Readonly<Context>) {
  const dependencies = Object.keys({ ...pkg?.dependencies, ...pkg?.devDependencies })
  return Object.values(pkg?.scripts ?? {}).some(script => script.includes('coverage')) || dependencies.some(name => name.startsWith('@vitest/coverage-') || name === 'c8' || name === 'nyc')
}

export const gitignoreBaselineRules = [
  requireIgnored({ applies: ({ pkg }) => pkg?.scripts?.build !== undefined, id: 'gitignore-dist', line: 'dist', pattern: /^\/?(?:build|dist|out)\/?$/mu, severity: 'warning' }),
  requireIgnored({ applies: hasCoverage, id: 'gitignore-coverage', line: 'coverage', pattern: /^\/?coverage\/?$/mu, severity: 'warning' }),
  requireIgnored({ applies: async ({ files }) => (await files.readText('.env')) !== undefined, id: 'gitignore-env', line: '.env', pattern: /^\/?\.env(?:\.\*|\*)?$/mu, severity: 'error' }),
  requireIgnored({ applies: writesTsBuildInfo, id: 'gitignore-tsbuildinfo', line: '*.tsbuildinfo', pattern: /tsbuildinfo/u, severity: 'warning' }),
  requireIgnored({ applies: ({ pkg }) => hasDependency(pkg, '@playwright/test'), id: 'gitignore-playwright-results', line: 'test-results', pattern: /^\/?test-results\/?$/mu, severity: 'warning' }),
  requireIgnored({ applies: ({ pkg }) => hasDependency(pkg, '@playwright/test'), id: 'gitignore-playwright-report', line: 'playwright-report', pattern: /^\/?playwright-report\/?$/mu, severity: 'warning' }),
]
