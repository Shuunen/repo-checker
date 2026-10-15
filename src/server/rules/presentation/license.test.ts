import { testRule } from '../../engine/rule-tester.ts'
import { licenseFileContent, licenseFileExists } from './license.rule.ts'

const gpl = 'GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n'

const mit = (author: string) =>
  `MIT License\n\nCopyright (c) ${new Date().getFullYear()} ${author}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`

testRule(licenseFileExists, {
  invalid: [
    { errors: ['missing'], flags: { gitAuthor: { name: 'Me' } }, name: 'no LICENSE, MIT by default', output: mit('Me') },
    { errors: ['missing'], flags: { gitAuthor: { name: 'Me' } }, name: 'no LICENSE, MIT declared', output: mit('Me'), pkg: { license: 'MIT' } },
    { errors: ['missing'], flags: { gitAuthor: { name: 'Me' } }, name: 'no LICENSE, another license, no fix', pkg: { license: 'GPL-3.0' } },
    { errors: ['missing'], name: 'no LICENSE, no author, no fix' },
  ],
  valid: [{ files: { LICENSE: gpl }, name: 'a LICENSE' }],
})

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
