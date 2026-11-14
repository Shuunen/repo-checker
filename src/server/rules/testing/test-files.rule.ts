import { defineRule } from '../../engine/define-rule.ts'
import type { FileReader } from '../../engine/io.ts'

/** A test file, `.test` or `.spec` */
const testFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/u

/** The folders where the tests live */
const folders = ['src', 'e2e', 'tests', 'test']

/** The vitest configs, or the vite config that holds a `test` section */
const configFiles = ['vitest.config.mts', 'vitest.config.ts', 'vitest.config.mjs', 'vitest.config.js', 'vite.config.mts', 'vite.config.ts', 'vite.config.mjs', 'vite.config.js']

/** A value import from vitest, `import { describe, it } from 'vitest'`, a type import is not matched */
const vitestImport = /^import\s*\{(?<names>[^}]*)\}\s*from\s*['"]vitest['"][^\S\n]*;?[^\S\n]*\n?/mu

/** A `toBeInTheDocument()` assertion, at the start of a line so a mention in a string is not one */
const toBeInTheDocument = /^\s*(?:(?:await\s+)?expect\(.*|\))(?:\.not)?\.toBeInTheDocument\(/mu

/** What the tests get as globals and must not import */
const globalNames = new Set(['describe', 'expect', 'it'])

/**
 * Find the test files of a project that contain a pattern, sorted
 * @param files the reader of the project files
 * @param pattern the pattern to look for
 * @returns the test files
 */
export async function findTestFiles(files: Readonly<FileReader>, pattern: RegExp) {
  const results = await Promise.all(folders.map(folder => files.search(pattern, folder)))
  return [...new Set(results.flat().filter(file => testFile.test(file)))].toSorted()
}

/**
 * Tell if the vitest config makes `describe`, `it` and `expect` globals
 * @param files the reader of the project files
 * @returns true when `globals: true` is set
 */
async function hasGlobals(files: Readonly<FileReader>) {
  const texts = await Promise.all(configFiles.map(file => files.readText(file)))
  return texts.some(text => /\bglobals:\s*true\b/u.test(text ?? ''))
}

/**
 * Remove `describe`, `it` and `expect` from the vitest imports of a test file, an import that ends up empty is dropped
 * @param text the test file
 * @returns the new text
 * @example dropGlobalImports("import { describe, vi } from 'vitest'\n") // "import { vi } from 'vitest'\n"
 */
function dropGlobalImports(text: string) {
  return text.replaceAll(new RegExp(vitestImport.source, 'gmu'), (_statement, names: string) => {
    const kept = names
      .split(',')
      .map(name => name.trim())
      .filter(name => name !== '' && !globalNames.has(name))
    return kept.length === 0 ? '' : `import { ${kept.join(', ')} } from 'vitest'\n`
  })
}

export const testNoSpecFiles = defineRule({
  async check({ files, report }) {
    const found = await findTestFiles(files, /^/u)
    for (const file of found.filter(name => /\.spec\./u.test(name))) report({ data: { file }, messageId: 'found' })
  },
  meta: { id: 'test-no-spec-files', messages: { found: '{{file}} is a .spec file, the tests of the project are .test files' }, severity: 'warning' },
})

export const testNoVitestGlobalsImport = defineRule({
  appliesTo: ({ files }) => hasGlobals(files),
  async check({ files, report }) {
    const candidates = await findTestFiles(files, new RegExp(vitestImport.source, 'mu'))
    const texts = await Promise.all(candidates.map(file => files.readText(file)))
    for (const [index, file] of candidates.entries()) if (dropGlobalImports(String(texts[index])) !== texts[index]) report({ data: { file }, fix: fixer => fixer.text(file, dropGlobalImports), messageId: 'found' })
  },
  meta: { fixable: true, id: 'test-no-vitest-globals-import', messages: { found: '{{file}} imports describe, it or expect from vitest, they are globals' }, severity: 'info' },
})

export const testNoToBeInTheDocument = defineRule({
  async check({ files, report }) {
    for (const file of await findTestFiles(files, toBeInTheDocument)) report({ data: { file }, messageId: 'found' })
  },
  meta: { id: 'test-no-to-be-in-the-document', messages: { found: '{{file}} uses toBeInTheDocument(), query the element with getByTestId instead, it throws when missing' }, nitpick: true, severity: 'info' },
})

/** A file that is not a source: a test, a spec or a type declaration */
const notSource = /\.(?:test|spec|d)\.[^/]+$/u

/** A test that is not about one source file: integration, end to end or the app as a whole, or a test helper */
const looseTest = /(?:^|\/)(?:app|[^/]*(?:e2e|integration)[^/]*)\.test\.[^/]+$|\/test-utils\//u

/**
 * Tell if a source file sits next to a test: same folder, same name, optionally followed by a kind like `.rule` or `.utils`
 * @param test the path of the test, like `src/rules/stale.test.ts`
 * @param candidates the paths of every file under `src`
 * @returns true when `src/rules/stale.ts` or `src/rules/stale.rule.ts` exists
 */
function hasSource(test: string, candidates: readonly string[]) {
  const base = test.replace(/\.test\.[^/]+$/u, '')
  return candidates.some(file => file.startsWith(`${base}.`) && !notSource.test(file) && !file.slice(base.length + 1).includes('/'))
}

export const testFileColocated = defineRule({
  async check({ files, report }) {
    const [found, candidates] = await Promise.all([findTestFiles(files, /^/u), files.search(/^/u, 'src')])
    const tests = found.filter(file => file.startsWith('src/') && /\.test\.[^/]+$/u.test(file) && !looseTest.test(file))
    for (const test of tests.filter(file => !hasSource(file, candidates))) report({ data: { file: test }, messageId: 'orphan' })
  },
  meta: { id: 'test-file-colocated', messages: { orphan: '{{file}} has no source file next to it, a test sits beside the file it tests' }, nitpick: true, severity: 'info' },
})
