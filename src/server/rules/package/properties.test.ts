import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { propertyRules } from './properties.rule.ts'

const schema = 'https://json.schemastore.org/package'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = propertyRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

// the factory is tested in the engine, these cases check the table wiring
testRule(byId('package-files'), { invalid: [{ errors: ['missing'], name: 'no files', pkg: { name: 'foo' } }], valid: [{ name: 'files', pkg: { files: ['dist'] } }] })
testRule(byId('package-name'), { invalid: [{ errors: ['missing'], name: 'no name', pkg: { version: '1.0.0' } }], valid: [{ name: 'a name', pkg: { name: 'foo' } }, { name: 'no package.json at all' }] })
testRule(byId('package-private'), { invalid: [{ errors: ['missing'], name: 'no private', pkg: { name: 'foo' } }], valid: [{ name: 'private false', pkg: { private: false } }] })
testRule(byId('package-version'), { invalid: [{ errors: ['missing'], name: 'no version', pkg: { name: 'foo' } }], valid: [{ name: 'a version', pkg: { version: '1.0.0' } }] })

testRule(byId('package-schema'), {
  invalid: [
    { errors: ['missing'], name: 'no schema, added first', output: { $schema: schema, name: 'foo' }, pkg: { name: 'foo' } },
    { errors: ['wrong'], name: 'another schema, replaced in place', output: { $schema: schema, name: 'foo' }, pkg: { $schema: 'https://example.com', name: 'foo' } },
  ],
  valid: [{ name: 'the schemastore schema', pkg: { $schema: schema, name: 'foo' } }],
})
