import type { GithubRepo } from '../../../shared/project.ts'
import { testProjectRule } from '../../engine/rule-tester.ts'
import { missingDescription, missingHomepage, missingLicense, missingTopics } from './github-metadata.rule.ts'

/**
 * The cases where a repo lacks a field but the check does not apply: not an own repo that is alive
 * @param missing the repo fields that make the field missing
 * @returns the valid cases
 */
function notChecked(missing: Readonly<Partial<GithubRepo>>) {
  return [{ github: { ...missing, isArchived: true }, name: 'an archived repo' }, { github: { ...missing, isFork: true }, name: 'a fork' }, { github: missing, isOtherOwner: true, name: 'a clone of another owner' }, { name: 'a folder without GitHub repo' }]
}

/**
 * The case where a public-only check skips a private repo
 * @param missing the repo fields that make the field missing
 * @returns the valid case
 */
function notCheckedPrivate(missing: Readonly<Partial<GithubRepo>>) {
  return { github: { ...missing, isPrivate: true }, name: 'a private repo' }
}

testProjectRule(missingLicense, {
  invalid: [{ errors: ['missing'], github: { hasLicense: false }, name: 'no license detected' }],
  valid: [{ github: {}, name: 'a license' }, ...notChecked({ hasLicense: false }), notCheckedPrivate({ hasLicense: false })],
})

testProjectRule(missingDescription, {
  invalid: [{ actions: [['sync-github-metadata']], errors: ['missing'], github: { description: undefined }, name: 'no description' }],
  valid: [{ github: {}, name: 'a description' }, ...notChecked({ description: undefined })],
})

testProjectRule(missingTopics, {
  invalid: [{ errors: ['missing'], github: { topics: [] }, name: 'no topics' }],
  valid: [{ github: {}, name: 'a topic' }, ...notChecked({ topics: [] }), notCheckedPrivate({ topics: [] })],
})

testProjectRule(missingHomepage, {
  invalid: [{ actions: [['sync-github-metadata']], errors: ['missing'], github: { homepage: undefined }, name: 'no homepage' }],
  valid: [{ github: {}, name: 'a homepage' }, ...notChecked({ homepage: undefined }), notCheckedPrivate({ homepage: undefined })],
})
