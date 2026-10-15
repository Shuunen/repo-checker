import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'
import { hasReadme, hasThanks, requireInReadme, thanksLine, thanksList } from './readme.utils.ts'

export const readmeThanksSection = requireInReadme({ fix: text => `${text.trimEnd()}\n\n## Thanks\n`, id: 'readme-thanks-section', message: 'the README has no "## Thanks" section', pattern: /## Thanks/u, severity: 'warning' })

export const readmeThanksEntries = defineRule({
  appliesTo: context => hasReadme(context) && context.readme?.text.includes('## Thanks') === true,
  check(context) {
    const { readme, report } = context
    invariant(readme !== undefined, 'appliesTo guarantees a README')
    const { text } = readme
    for (const thanks of thanksList) {
      const isUsed = thanks.isUsed(context)
      if (isUsed && !hasThanks(text, thanks)) report({ data: { label: thanks.label }, fix: fixer => fixer.text(readme.file, current => current.replace(/(?<section>## Thank.*\n+)/u, `$<section>${thanksLine(thanks)}\n`)), messageId: 'missing' })
      if (!isUsed && hasThanks(text, thanks)) report({ data: { label: thanks.label }, messageId: 'unused' })
    }
  },
  meta: { fixable: true, id: 'readme-thanks-entries', messages: { missing: 'the README does not thank {{label}}, which the project uses', unused: 'the README thanks {{label}}, which the project no longer uses' }, severity: 'warning' },
})
