import { testRule } from '../../engine/rule-tester.ts'
import { licenseFileContent, licenseFileExists } from './license.rule.ts'

const gpl = 'GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n'

testRule(licenseFileExists, { invalid: [{ errors: ['missing'], name: 'no LICENSE' }], valid: [{ files: { LICENSE: gpl }, name: 'a LICENSE' }] })

testRule(licenseFileContent, {
  invalid: [
    { errors: ['missing'], files: { LICENSE: 'GNU GENERAL PUBLIC LICENSE\nVersion 2\n' }, name: 'a GPL-3.0 package with a GPL 2 text', pkg: { license: 'GPL-3.0' } },
    { errors: ['missing'], files: { '.repo-checker.json': '{ "license": "MIT" }', LICENSE: gpl }, name: 'MIT declared in .repo-checker.json, GPL text' },
  ],
  valid: [
    { files: { LICENSE: gpl }, name: 'GPL-3.0', pkg: { license: 'GPL-3.0' } },
    { files: { LICENSE: 'MIT License\n' }, name: 'MIT', pkg: { license: 'MIT' } },
    { files: { LICENSE: 'anything' }, name: 'another license, not checked', pkg: { license: 'ISC' } },
    { files: { LICENSE: 'anything' }, name: 'no license declared' },
    { name: 'no LICENSE file, license-file-exists reports it', pkg: { license: 'MIT' } },
  ],
})
