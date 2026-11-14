import { testRule } from '../../test/rule-tester.ts'
import { themeColorMissing } from './theme-color.rule.ts'

testRule(themeColorMissing, {
  invalid: [{ errors: ['missing'], name: 'no color anywhere', pkg: {} }],
  valid: [{ flags: { themeColor: '#024eb8' }, name: 'a theme color', pkg: {} }, { name: 'no package.json' }],
})
