import { invariant } from 'es-toolkit'
import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { requireFile } from '../../engine/file-rules.ts'

/** What the LICENSE file must contain, per license */
const expectedTexts: Readonly<Record<string, readonly string[]>> = {
  'GPL-3.0': ['GNU GENERAL PUBLIC LICENSE', 'Version 3, 29 June 2007'],
  MIT: ['MIT License'],
}

export const licenseFileExists = requireFile({ files: ['LICENSE'], id: 'license-file-exists', message: 'no {{file}} file', severity: 'error' })

/**
 * Get the declared license: `.repo-checker.json` first, then package.json
 * @param context the project context
 * @param context.flags the project flags
 * @param context.pkg the package.json
 * @returns the license, undefined when none is declared
 */
function declaredLicense({ flags, pkg }: Readonly<Context>) {
  return flags.license ?? pkg?.license
}

export const licenseFileContent = defineRule({
  async appliesTo(context) {
    return expectedTexts[declaredLicense(context) ?? ''] !== undefined && (await context.files.readText('LICENSE')) !== undefined
  },
  async check(context) {
    const license = String(declaredLicense(context))
    const text = await context.files.readText('LICENSE')
    invariant(text !== undefined, 'appliesTo guarantees the file exists')
    const expected = expectedTexts[license]
    invariant(expected !== undefined, 'appliesTo guarantees a known license')
    const missing = expected.filter(line => !text.includes(line))
    for (const line of missing) context.report({ data: { expected: line, license }, messageId: 'missing' })
  },
  meta: { id: 'license-file-content', messages: { missing: 'the LICENSE file does not match the {{license}} license, it lacks "{{expected}}"' }, severity: 'error' },
})
