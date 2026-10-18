import { invariant } from 'es-toolkit'
import type { Rule } from '../../engine/define-rule.ts'
import { testRule } from '../../engine/rule-tester.ts'
import { packageLicense, packageRepository, presentationPropertyRules } from './package-presentation.rule.ts'

describe('presentation property table', () => {
  it('requires author, bugs, description, homepage and keywords', () => {
    expect.hasAssertions()
    expect(presentationPropertyRules.map(rule => rule.meta.id)).toStrictEqual(['package-author', 'package-bugs', 'package-description', 'package-homepage', 'package-keywords'])
  })
})

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = presentationPropertyRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id}`)
  return rule as Rule
}

const known = { gitAuthor: { email: 'me@mail.com', name: 'Me' }, githubDescription: 'A tool', githubTopics: ['cli', 'tool'], owner: 'me', repoId: 'tool' }

testRule(byId('package-author'), {
  invalid: [
    { errors: ['missing'], flags: known, name: 'no author, the git user', output: { author: 'Me <me@mail.com>' }, pkg: {} },
    { errors: ['missing'], flags: { gitAuthor: { name: 'Me' } }, name: 'no author, a git user without mail', output: { author: 'Me' }, pkg: {} },
    { errors: ['missing'], name: 'no author, no git user to fill it', pkg: {} },
  ],
  valid: [{ name: 'an author', pkg: { author: 'Someone' } }],
})
testRule(byId('package-bugs'), {
  invalid: [
    { errors: ['missing'], flags: known, name: 'no bugs, the issues of the repo', output: { bugs: 'https://github.com/me/tool/issues' }, pkg: {} },
    { errors: ['missing'], name: 'no bugs, no origin', pkg: {} },
  ],
  valid: [{ name: 'bugs', pkg: { bugs: 'https://x.y' } }],
})
testRule(byId('package-description'), {
  invalid: [
    { errors: ['missing'], flags: known, name: 'no description, the GitHub one', output: { description: 'A tool' }, pkg: {} },
    { errors: ['missing'], name: 'no description anywhere', pkg: {} },
  ],
  valid: [{ name: 'a description', pkg: { description: 'x' } }],
})
testRule(byId('package-homepage'), {
  invalid: [
    { errors: ['missing'], flags: known, name: 'no homepage, the repo url, never the deployed website', output: { homepage: 'https://github.com/me/tool' }, pkg: {} },
    { errors: ['missing'], name: 'no homepage, nothing known', pkg: {} },
  ],
  valid: [{ name: 'a homepage', pkg: { homepage: 'https://x.y' } }],
})

testRule(packageLicense, {
  invalid: [
    { errors: ['missing'], name: 'no license, MIT', output: { license: 'MIT' }, pkg: {} },
    { errors: ['missing'], files: { '.repo-checker.json': '{ "license": "GPL-3.0" }' }, name: 'no license, the declared one', output: { license: 'GPL-3.0' }, pkg: {} },
    { errors: ['wrong'], files: { '.repo-checker.json': '{ "license": "MIT" }' }, name: 'another license than declared', pkg: { license: 'GPL-3.0' } },
  ],
  valid: [
    { name: 'a license, nothing declared', pkg: { license: 'GPL-3.0' } },
    { files: { '.repo-checker.json': '{ "license": "MIT" }' }, name: 'the declared license', pkg: { license: 'MIT' } },
  ],
})

testRule(packageRepository, {
  invalid: [
    { errors: ['missing'], name: 'no repository', pkg: { name: 'foo' } },
    { errors: ['missing'], flags: known, name: 'no repository, the origin', output: { repository: { type: 'git', url: 'git+https://github.com/me/tool.git' } }, pkg: {} },
    { errors: ['noGitPlus'], name: 'an https url, fixed', output: { repository: { type: 'git', url: 'git+https://github.com/foo/bar.git' } }, pkg: { repository: { type: 'git', url: 'https://github.com/foo/bar.git' } } },
    { errors: ['noGitPlus'], name: 'a shorthand, not fixable', pkg: { repository: 'github:foo/bar' } },
  ],
  valid: [{ name: 'a git+https url', pkg: { repository: { type: 'git', url: 'git+https://github.com/foo/bar.git' } } }],
})

testRule(byId('package-keywords'), {
  invalid: [
    { errors: ['missing'], flags: known, name: 'no keywords, the topics of the GitHub repo', output: { keywords: ['cli', 'tool'] }, pkg: {} },
    { errors: ['missing'], flags: { githubTopics: [] }, name: 'no keywords, the repo has no topics', pkg: {} },
    { errors: ['missing'], name: 'no keywords, nothing known', pkg: {} },
  ],
  valid: [{ name: 'keywords', pkg: { keywords: ['a'] } }],
})
