import { testRule } from '../../engine/rule-tester.ts'
import { packageLicense, packageRepository, presentationPropertyRules } from './package-presentation.rule.ts'

describe('presentation property table', () => {
  it('requires author, bugs, description, homepage and keywords', () => {
    expect.hasAssertions()
    expect(presentationPropertyRules.map(rule => rule.meta.id)).toStrictEqual(['package-author', 'package-bugs', 'package-description', 'package-homepage', 'package-keywords'])
  })
})

testRule(packageLicense, {
  invalid: [
    { errors: ['missing'], name: 'no license', pkg: { name: 'foo' } },
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
    { errors: ['noGitPlus'], name: 'an https url, fixed', output: { repository: { type: 'git', url: 'git+https://github.com/foo/bar.git' } }, pkg: { repository: { type: 'git', url: 'https://github.com/foo/bar.git' } } },
    { errors: ['noGitPlus'], name: 'a shorthand, not fixable', pkg: { repository: 'github:foo/bar' } },
  ],
  valid: [{ name: 'a git+https url', pkg: { repository: { type: 'git', url: 'git+https://github.com/foo/bar.git' } } }],
})
