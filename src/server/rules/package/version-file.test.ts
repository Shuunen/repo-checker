import { testRule } from '../../test/rule-tester.ts'
import { versionFileExists, versionFileInSync } from './version-file.rule.ts'

testRule(versionFileExists, {
  invalid: [{ errors: ['missing'], name: 'no VERSION file', output: '1.2.0\n', pkg: { version: '1.2.0' } }],
  valid: [{ files: { VERSION: '1.2.0\n' }, name: 'a VERSION file', pkg: { version: '1.2.0' } }, { name: 'no version in package.json', pkg: {} }, { name: 'no package.json' }],
})

testRule(versionFileInSync, {
  invalid: [
    { errors: ['wrong'], files: { VERSION: '1.1.0\n' }, name: 'VERSION is behind', output: '1.2.0\n', pkg: { version: '1.2.0' } },
    { errors: ['wrong'], files: { VERSION: 'v1.2.0' }, name: 'a v prefix, no new line', output: '1.2.0\n', pkg: { version: '1.2.0' } },
  ],
  valid: [
    { files: { VERSION: '1.2.0\n' }, name: 'same version', pkg: { version: '1.2.0' } },
    { files: { VERSION: '1.2.0' }, name: 'same version without final new line', pkg: { version: '1.2.0' } },
    { name: 'no VERSION file, version-file-exists reports it', pkg: { version: '1.2.0' } },
    { files: { VERSION: '1.2.0\n' }, name: 'no version in package.json', pkg: {} },
  ],
})
