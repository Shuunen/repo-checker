import { testRule } from '../../engine/rule-tester.ts'
import { propertyRules } from './properties.rule.ts'

const [packageName, packageSchema] = propertyRules
const schema = 'https://json.schemastore.org/package'

if (packageName === undefined || packageSchema === undefined) throw new Error('property rules are missing')

testRule(packageName, {
  invalid: [{ errors: ['missing'], name: 'no name', pkg: { version: '1.0.0' } }],
  valid: [{ name: 'a name', pkg: { name: 'foo' } }, { name: 'no package.json at all' }],
})

testRule(packageSchema, {
  invalid: [
    { errors: ['missing'], name: 'no schema, added first', output: { $schema: schema, name: 'foo' }, pkg: { name: 'foo' } },
    { errors: ['wrong'], name: 'another schema, replaced in place', output: { $schema: schema, name: 'foo' }, pkg: { $schema: 'https://example.com', name: 'foo' } },
  ],
  valid: [{ name: 'the schemastore schema', pkg: { $schema: schema, name: 'foo' } }],
})
