import { invariant, omit } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { biomeConfigExists, biomeSchema, biomeSections, biomeTestOverride, biomeValueRules } from './biome.rule.ts'

const biome = { devDependencies: { '@biomejs/biome': '^2.0.0' } }
const json = (value: unknown) => ({ 'biome.json': `${JSON.stringify(value, undefined, 2)}\n` })
const complete = {
  $schema: './node_modules/@biomejs/biome/configuration_schema.json',
  assist: { actions: { source: { organizeImports: 'on' } } },
  formatter: { indentStyle: 'space', indentWidth: 2, lineEnding: 'lf', lineWidth: 300 },
  javascript: { formatter: { arrowParentheses: 'asNeeded', bracketSpacing: true, quoteStyle: 'single', semicolons: 'asNeeded' } },
  json: { parser: { allowComments: false, allowTrailingCommas: false } },
  linter: { domains: { project: 'all', react: 'all', test: 'all' }, enabled: true, rules: { recommended: true, style: { useBlockStatements: 'off' } } },
  overrides: [{ includes: ['**/*.test.ts'] }],
  vcs: { clientKind: 'git', enabled: true, useIgnoreFile: true },
}

const withoutVcsNorOverrides = omit(complete, ['overrides', 'vcs'])
const sectionsAdded = Object.fromEntries([...Object.entries(withoutVcsNorOverrides), ['vcs', {}], ['overrides', []]])

/**
 * Get a rule of the value table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = biomeValueRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

testRule(biomeConfigExists, {
  invalid: [{ errors: ['missing'], name: 'biome without config', pkg: biome }],
  valid: [
    { files: { 'biome.jsonc': '{}' }, name: 'a biome.jsonc', pkg: biome },
    { name: 'biome not used', pkg: { name: 'app' } },
  ],
})
testRule(biomeSchema, { invalid: [{ errors: ['missing'], files: json({ formatter: {} }), name: 'no schema', output: `${JSON.stringify({ $schema: complete.$schema, formatter: {} }, undefined, 2)}\n`, pkg: biome }], valid: [{ files: json(complete), name: 'the schema', pkg: biome }] })

testRule(biomeSections, {
  invalid: [
    {
      errors: ['missing', 'missing'],
      files: json(withoutVcsNorOverrides),
      name: 'no vcs nor overrides, added at the end',
      output: `${JSON.stringify(sectionsAdded, undefined, 2)}\n`,
      pkg: biome,
    },
  ],
  valid: [
    { files: json(complete), name: 'every section', pkg: biome },
    { files: { 'biome.json': '{}' }, name: 'biome not used, empty config', pkg: { name: 'app' } },
    { files: { 'biome.jsonc': JSON.stringify(complete) }, name: 'every section in biome.jsonc', pkg: biome },
    { files: json({}), name: 'biome not used', pkg: { name: 'app' } },
  ],
})

testRule(byId('biome-formatter'), {
  invalid: [{ errors: ['wrong'], files: json({ formatter: { ...complete.formatter, lineWidth: 80 } }), name: 'line width 80, set to 120', output: `${JSON.stringify({ formatter: { ...complete.formatter, lineWidth: 120 } }, undefined, 2)}\n`, pkg: biome }],
  valid: [{ files: json(complete), name: 'the expected formatter', pkg: biome }],
})
testRule(byId('biome-javascript-formatter'), {
  invalid: [{ errors: ['wrong'], files: json({ javascript: { formatter: { ...complete.javascript.formatter, quoteStyle: 'double' } } }), name: 'double quotes', output: `${JSON.stringify({ javascript: complete.javascript }, undefined, 2)}\n`, pkg: biome }],
  valid: [{ files: json(complete), name: 'single quotes', pkg: biome }],
})
testRule(byId('biome-json-parser'), {
  invalid: [{ errors: ['wrong'], files: json({ json: { parser: { allowComments: true, allowTrailingCommas: false } } }), name: 'comments allowed', output: `${JSON.stringify({ json: complete.json }, undefined, 2)}\n`, pkg: biome }],
  valid: [{ files: json(complete), name: 'strict json', pkg: biome }],
})
testRule(byId('biome-linter'), {
  invalid: [
    {
      errors: ['wrong'],
      files: json({ linter: { ...complete.linter, domains: { project: 'all', test: 'all' } } }),
      name: 'a react project without the react domain',
      output: `${JSON.stringify(
        {
          linter: {
            ...complete.linter,
            domains: Object.fromEntries([
              ['project', 'all'],
              ['test', 'all'],
              ['react', 'all'],
            ]),
          },
        },
        undefined,
        2,
      )}\n`,
      pkg: { devDependencies: { ...biome.devDependencies, react: '^19.0.0' } },
    },
  ],
  valid: [{ files: json({ linter: { ...complete.linter, domains: { project: 'all', test: 'all' } } }), name: 'no react, no react domain needed', pkg: biome }],
})
testRule(byId('biome-assist'), { invalid: [{ errors: ['wrong'], files: json({ assist: {} }), name: 'no organize imports', output: `${JSON.stringify({ assist: complete.assist }, undefined, 2)}\n`, pkg: biome }], valid: [{ files: json(complete), name: 'organize imports', pkg: biome }] })
testRule(byId('biome-vcs'), {
  invalid: [{ errors: ['wrong'], files: json({ vcs: { clientKind: 'git', enabled: true } }), name: 'no ignore file', output: `${JSON.stringify({ vcs: { clientKind: 'git', enabled: true, useIgnoreFile: true } }, undefined, 2)}\n`, pkg: biome }],
  valid: [{ files: json(complete), name: 'git with ignore file', pkg: biome }],
})

testRule(biomeTestOverride, {
  invalid: [
    {
      errors: ['missing'],
      files: json({ overrides: [{ includes: ['*.config.*'] }] }),
      name: 'no test override, added',
      output: `${JSON.stringify({ overrides: [{ includes: ['*.config.*'] }, { includes: ['**/*.test.ts'], linter: { rules: { style: { noUnusedTemplateLiteral: 'off' } } } }] }, undefined, 2)}\n`,
      pkg: biome,
    },
  ],
  valid: [
    { files: json(complete), name: 'a test override', pkg: biome },
    { files: json({}), name: 'no overrides section, biome-sections reports it', pkg: biome },
  ],
})

testRule(biomeSections, {
  invalid: [
    {
      errors: ['missing', 'missing', 'missing', 'missing', 'missing', 'missing', 'missing'],
      files: { 'biome.json': '' },
      name: 'an empty config, every section added',
      output: `${JSON.stringify(
        Object.fromEntries([
          ['assist', {}],
          ['formatter', {}],
          ['javascript', {}],
          ['json', {}],
          ['linter', {}],
          ['vcs', {}],
          ['overrides', []],
        ]),
        undefined,
        2,
      )}`,
      pkg: biome,
    },
  ],
  valid: [],
})
