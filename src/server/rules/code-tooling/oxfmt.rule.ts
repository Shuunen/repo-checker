import type { Context } from '../../engine/context.ts'
import { requireFile, requireJsonSchema, requireJsonValues } from '../../engine/file-rules.ts'
import { hasDependency } from '../../engine/package-json.ts'
import { usesTailwind } from './code-tooling.utils.ts'

const files = ['.oxfmtrc.json', '.oxfmtrc.jsonc']
const minPrintWidth = 80
const schema = './node_modules/oxfmt/configuration_schema.json'

const oxfmtConfigContent = `{
  "$schema": "${schema}",
  "arrowParens": "avoid",
  "bracketSpacing": true,
  "endOfLine": "lf",
  "semi": false,
  "singleQuote": true,
  "sortPackageJson": false,
  "tabWidth": 2,
  "useTabs": false
}
`

/**
 * Tell if the project uses oxfmt
 * @param context the project context
 * @param context.pkg the package.json
 * @returns true when it depends on oxfmt
 */
function usesOxfmt({ pkg }: Readonly<Context>) {
  return hasDependency(pkg, 'oxfmt')
}

export const oxfmtConfigExists = requireFile({ content: oxfmtConfigContent, files, id: 'oxfmt-config-exists', message: 'no oxfmt config, like {{file}}', severity: 'error', when: usesOxfmt })

export const oxfmtSchema = requireJsonSchema({ files, id: 'oxfmt-schema', schema, severity: 'warning', when: usesOxfmt })

export const oxfmtStyle = requireJsonValues({
  files,
  id: 'oxfmt-style',
  isSorted: true,
  severity: 'warning',
  values: [
    { expected: 'all', path: ['trailingComma'] },
    { expected: 'as-needed', path: ['quoteProps'] },
    { expected: false, path: ['bracketSameLine'] },
    { expected: 'preserve', path: ['objectWrap'] },
    { expected: false, path: ['singleAttributePerLine'] },
    { expected: 240, isValid: current => typeof current === 'number' && current > minPrintWidth, path: ['printWidth'] },
    { expected: { ignoreCase: true, newlinesBetween: false }, path: ['sortImports'] },
  ],
  when: usesOxfmt,
})

export const oxfmtTailwind = requireJsonValues({
  files,
  id: 'oxfmt-tailwind',
  severity: 'warning',
  values: [{ expected: { functions: ['clsx', 'cn', 'cva', 'tw'] }, isValid: current => current !== undefined, path: ['sortTailwindcss'] }],
  when: context => usesOxfmt(context) && usesTailwind(context),
})

export const oxfmtFormatter = requireJsonValues({
  files,
  id: 'oxfmt-formatter',
  isSorted: true,
  severity: 'warning',
  values: [
    { expected: false, path: ['useTabs'] },
    { expected: 2, path: ['tabWidth'] },
    { expected: 'lf', path: ['endOfLine'] },
    { expected: true, path: ['singleQuote'] },
    { expected: false, path: ['semi'] },
    { expected: 'avoid', path: ['arrowParens'] },
    { expected: true, path: ['bracketSpacing'] },
    { expected: false, path: ['sortPackageJson'] },
  ],
  when: usesOxfmt,
})
