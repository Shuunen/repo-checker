import { escapeRegExp, invariant } from 'es-toolkit'
import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { badgeMarkdown, expectedBadges, hasBadge, hasReadme, insertAfterBadges, viewsBadge } from './readme.utils.ts'

/** Badge services that are gone or show wrong data */
const deprecatedBadgeDomains = ['bettercodehub.com', 'david-dm.org', 'lgtm.com', 'scrutinizer-ci.com', 'libraries.io']

/**
 * Tell if the project has a README and a known GitHub repo, the badges need its owner and name
 * @param context the project context
 * @returns true when the badge rules apply
 */
function hasReadmeAndRepo(context: Readonly<Context>) {
  return hasReadme(context) && context.flags.owner !== undefined && context.flags.repoId !== undefined
}

export const readmeBadges = defineRule({
  appliesTo: hasReadmeAndRepo,
  check(context) {
    const { readme, report } = context
    invariant(readme !== undefined, 'appliesTo guarantees a README')
    const missing = expectedBadges(context).filter(badge => !hasBadge(readme.text, badge))
    for (const badge of missing)
      if (badge.isFixable) report({ data: { label: badge.label }, fix: fixer => fixer.text(readme.file, text => insertAfterBadges(text, badgeMarkdown(badge))), messageId: 'missing' })
      else report({ data: { label: badge.label }, messageId: 'missingUrl' })
  },
  meta: { fixable: true, id: 'readme-badges', messages: { missing: 'the README has no "{{label}}" badge', missingUrl: 'the README has no "{{label}}" badge, declare the url as "webUrl" in .repo-checker.json to add it' }, severity: 'warning' },
})

export const readmeNoDeprecatedBadges = defineRule({
  appliesTo: hasReadme,
  check({ readme, report }) {
    invariant(readme !== undefined, 'appliesTo guarantees a README')
    const found = deprecatedBadgeDomains.filter(domain => readme.text.includes(domain))
    for (const domain of found) report({ data: { domain }, fix: fixer => fixer.text(readme.file, text => text.replaceAll(new RegExp(`.*${escapeRegExp(domain)}.*\\n`, 'giu'), '')), messageId: 'found' })
  },
  meta: { fixable: true, id: 'readme-no-deprecated-badges', messages: { found: 'the README has a {{domain}} badge, this service is gone' }, severity: 'error' },
})

export const readmeViewsCounter = defineRule({
  appliesTo: hasReadmeAndRepo,
  check({ flags, readme, report }) {
    invariant(readme !== undefined, 'appliesTo guarantees a README')
    const badge = viewsBadge(`${flags.owner}/${flags.repoId}`)
    if (hasBadge(readme.text, badge)) return
    report({ fix: fixer => fixer.text(readme.file, text => insertAfterBadges(text, badgeMarkdown(badge))), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'readme-views-counter', messages: { missing: 'the README has no page views counter' }, severity: 'warning' },
})
