import { defineRule } from '../../engine/define-rule.ts'
import { requireFile } from '../../engine/file-rules.ts'
import { hasDependency } from '../../engine/package-json.ts'

/** The Playwright configs */
const configFiles = ['playwright.config.ts', 'playwright.config.mts', 'playwright.config.js', 'playwright.config.mjs']

/**
 * Tell if the project runs Playwright tests
 * @param context the project context
 * @param context.pkg the package.json
 * @returns true when it depends on `@playwright/test`
 */
function usesPlaywright({ pkg }: Readonly<{ pkg: Parameters<typeof hasDependency>[0] }>) {
  return hasDependency(pkg, '@playwright/test')
}

export const playwrightConfigExists = requireFile({ files: configFiles, id: 'playwright-config-exists', message: 'the project depends on @playwright/test but has no {{file}}', severity: 'warning', when: usesPlaywright })

export const playwrightE2eFolder = defineRule({
  appliesTo: usesPlaywright,
  async check({ files, report }) {
    const texts = await Promise.all(configFiles.map(file => files.readText(file)))
    if (texts.some(text => /\btestDir:/u.test(text ?? ''))) return
    const found = await files.search(/\S/u, 'e2e')
    if (found.length === 0) report({ messageId: 'missing' })
  },
  meta: { id: 'playwright-e2e-folder', messages: { missing: 'the project depends on @playwright/test but has no test in e2e/, put the end to end tests there or set testDir in the Playwright config' }, severity: 'info' },
})
