import { invariant } from 'es-toolkit'
import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { requireFile } from '../../engine/file-rules.ts'

/** What the LICENSE file must contain, per license */
const expectedTexts: Readonly<Record<string, readonly string[]>> = {
  'GPL-3.0': ['GNU GENERAL PUBLIC LICENSE', 'Version 3, 29 June 2007'],
  MIT: ['MIT License'],
}

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

/**
 * The text of a new MIT LICENSE file
 * @param author the name of the copyright holder
 * @returns the text, with the current year
 */
function mitText(author: string) {
  return `MIT License

Copyright (c) ${new Date().getFullYear()} ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`
}

/**
 * The text of the LICENSE file to create: MIT when no other license is declared, nothing when the author is unknown
 * @param context the project context
 * @returns the text, undefined when the file cannot be written
 */
function newLicenseText(context: Readonly<Context>) {
  const license = declaredLicense(context)
  const author = context.flags.gitAuthor?.name
  return (license === undefined || license === 'MIT') && author !== undefined ? mitText(author) : undefined
}

export const licenseFileExists = requireFile({
  content: newLicenseText,
  files: ['LICENSE'],
  id: 'license-file-exists',
  message: 'no {{file}} file',
  severity: 'error',
  when: ({ flags }) => flags.isPrivate !== true,
})

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
