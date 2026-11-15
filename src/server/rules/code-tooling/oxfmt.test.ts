import { testRule } from '../../test/rule-tester.ts'
import { oxfmtConfigExists, oxfmtFormatter, oxfmtSchema, oxfmtStyle, oxfmtTailwind } from './oxfmt.rule.ts'

const pkg = { devDependencies: { oxfmt: '1.0.0' } }
const schema = './node_modules/oxfmt/configuration_schema.json'
const json = (value: unknown) => ({ '.oxfmtrc.json': `${JSON.stringify(value, undefined, 2)}\n` })
const style = { arrowParens: 'avoid', bracketSpacing: true, endOfLine: 'lf', semi: false, singleQuote: true, sortPackageJson: false, tabWidth: 2, useTabs: false }

testRule(oxfmtConfigExists, {
  invalid: [
    {
      errors: ['missing'],
      name: 'oxfmt without config',
      output: `{\n  "$schema": "${schema}",\n  "arrowParens": "avoid",\n  "bracketSpacing": true,\n  "endOfLine": "lf",\n  "semi": false,\n  "singleQuote": true,\n  "sortPackageJson": false,\n  "tabWidth": 2,\n  "useTabs": false\n}\n`,
      pkg,
    },
  ],
  valid: [{ files: { '.oxfmtrc.jsonc': '{}' }, name: 'an .oxfmtrc.jsonc', pkg }, { name: 'oxfmt not used' }],
})

testRule(oxfmtSchema, {
  invalid: [{ errors: ['missing'], files: json({ semi: false }), name: 'no schema', output: `${JSON.stringify({ $schema: schema, semi: false }, undefined, 2)}\n`, pkg }],
  valid: [{ files: json({ $schema: schema }), name: 'the schema', pkg }],
})

testRule(oxfmtFormatter, {
  invalid: [
    { errors: ['wrong'], files: json({ ...style, useTabs: true }), name: 'tabs', output: `${JSON.stringify(style, undefined, 2)}\n`, pkg },
    { errors: Array.from({ length: 8 }, () => 'wrong'), files: json({}), name: 'nothing set', output: `${JSON.stringify(style, undefined, 2)}\n`, pkg },
  ],
  valid: [
    { files: json(style), name: 'the style', pkg },
    { files: json({}), name: 'oxfmt not used' },
  ],
})

const extra = { bracketSameLine: false, objectWrap: 'preserve', printWidth: 240, quoteProps: 'as-needed', singleAttributePerLine: false, sortImports: { ignoreCase: true, newlinesBetween: false }, trailingComma: 'all' }

testRule(oxfmtStyle, {
  invalid: [
    { errors: Array.from({ length: 7 }, () => 'wrong'), files: json({}), name: 'nothing set', output: `${JSON.stringify(extra, undefined, 2)}\n`, pkg },
    { errors: ['wrong'], files: json({ ...extra, trailingComma: 'none' }), name: 'no trailing comma', output: `${JSON.stringify(extra, undefined, 2)}\n`, pkg },
  ],
  valid: [
    { files: json(extra), name: 'the extra style', pkg },
    { files: json({ ...extra, printWidth: 300 }), name: 'another print width', pkg },
    { files: json({}), name: 'oxfmt not used' },
  ],
})

testRule(oxfmtTailwind, {
  invalid: [
    {
      errors: ['wrong'],
      files: json({}),
      name: 'tailwind without class sorting',
      output: `${JSON.stringify({ sortTailwindcss: { functions: ['clsx', 'cn', 'cva', 'tw'] } }, undefined, 2)}
`,
      pkg: { devDependencies: { oxfmt: '1.0.0', tailwindcss: '4.0.0' } },
    },
  ],
  valid: [
    { files: json({ sortTailwindcss: { stylesheet: './src/index.css' } }), name: 'class sorting set', pkg: { devDependencies: { oxfmt: '1.0.0', tailwindcss: '4.0.0' } } },
    { files: json({}), name: 'no tailwind', pkg },
  ],
})
