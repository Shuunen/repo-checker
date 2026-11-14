import { testRule } from '../../test/rule-tester.ts'
import { knipSchema } from './knip.rule.ts'

const pkg = { devDependencies: { knip: '~6.44.1' } }
const schema = 'https://unpkg.com/knip@6/schema.json'
const json = (value: unknown) => ({ 'knip.json': `${JSON.stringify(value, undefined, 2)}\n` })

testRule(knipSchema, {
  invalid: [
    { errors: ['wrong'], files: json({ entry: ['src/index.ts'] }), name: 'no schema', output: `${JSON.stringify({ $schema: schema, entry: ['src/index.ts'] }, undefined, 2)}\n`, pkg },
    { errors: ['wrong'], files: json({ $schema: 'https://unpkg.com/knip@5/schema.json' }), name: 'an older major', output: `${JSON.stringify({ $schema: schema }, undefined, 2)}\n`, pkg },
  ],
  valid: [
    { files: json({ $schema: schema }), name: 'the schema of the major', pkg },
    { name: 'zero config', pkg },
    { files: json({}), name: 'knip not used' },
    { files: json({ $schema: schema }), name: 'a .jsonc config', pkg },
    { files: json({}), name: 'a version range that is not plain', pkg: { devDependencies: { knip: 'latest' } } },
  ],
})
