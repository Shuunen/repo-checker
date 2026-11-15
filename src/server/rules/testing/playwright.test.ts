import { testRule } from '../../test/rule-tester.ts'
import { playwrightConfigExists, playwrightE2eFolder } from './playwright.rule.ts'

const pkg = { devDependencies: { '@playwright/test': '1.0.0' } }

testRule(playwrightConfigExists, {
  invalid: [{ errors: ['missing'], name: 'no config', pkg }],
  valid: [{ files: { 'playwright.config.ts': '' }, name: 'a config', pkg }, { name: 'no playwright' }],
})

testRule(playwrightE2eFolder, {
  invalid: [{ errors: ['missing'], files: { 'playwright.config.ts': 'export default {}' }, name: 'no e2e folder', pkg }],
  valid: [{ files: { 'e2e/home.test.ts': 'test' }, name: 'tests in e2e', pkg }, { files: { 'playwright.config.ts': "export default { testDir: './tests' }" }, name: 'another test folder', pkg }, { name: 'no playwright' }],
})
