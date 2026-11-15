import { testRule } from '../../test/rule-tester.ts'
import { changelogExists, changelogLatestVersion } from './changelog.rule.ts'

testRule(changelogExists, {
  invalid: [{ errors: ['missing'], name: 'no changelog', pkg: {} }],
  valid: [{ files: { 'CHANGELOG.md': '# Changelog' }, name: 'a CHANGELOG.md', pkg: {} }, { files: { 'changelog.md': '# Changelog' }, name: 'a changelog.md', pkg: {} }, { name: 'no package.json' }],
})

const changelog = '# Changelog\n\n## [Unreleased]\n\n## [1.2.0] - 2026-01-01\n\n### Added in 1.2.0\n\n## [1.1.0] - 2025-12-01\n'

testRule(changelogLatestVersion, {
  invalid: [
    { errors: ['wrong'], files: { 'CHANGELOG.md': changelog }, name: 'the version is ahead of the changelog', pkg: { version: '1.3.0' } },
    { errors: ['wrong'], files: { 'changelog.md': changelog }, name: 'the changelog is ahead of the version', pkg: { version: '1.1.0' } },
  ],
  valid: [
    { files: { 'CHANGELOG.md': changelog }, name: 'same version', pkg: { version: '1.2.0' } },
    { files: { 'CHANGELOG.md': '## v2.0.0-beta.1\n' }, name: 'a prerelease heading with a v', pkg: { version: '2.0.0-beta.1' } },
    { files: { 'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n' }, name: 'no entry yet', pkg: { version: '1.0.0' } },
    { files: { 'CHANGELOG.md': changelog }, name: 'no version in package.json', pkg: {} },
    { name: 'no changelog, changelog-exists reports it', pkg: { version: '1.0.0' } },
  ],
})
