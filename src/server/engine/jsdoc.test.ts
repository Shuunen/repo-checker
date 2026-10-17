import { readFileSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

const folder = import.meta.dirname
const allFiles = await Array.fromAsync(glob('*.ts', { cwd: folder }))
const files = allFiles.filter(file => !file.endsWith('.test.ts')).toSorted()

/**
 * Parse an engine file
 * @param file the file name
 * @returns the typescript source file
 */
function parse(file: string) {
  return ts.createSourceFile(file, readFileSync(path.join(folder, file), 'utf8'), ts.ScriptTarget.Latest, true)
}

/**
 * Get the first comment of a file
 * @param file the file name
 * @returns the text up to the end of the first comment
 */
function firstComment(file: string) {
  const { text } = parse(file)
  return text.slice(0, text.indexOf('*/') + '*/'.length)
}

/**
 * List the top level declarations and interface properties that have no JSDoc
 * @param file the file name
 * @returns the first line of each undocumented node
 */
function undocumented(file: string) {
  const source = parse(file)
  const declarations = source.statements.filter(statement => !ts.isImportDeclaration(statement))
  const properties = declarations.filter(statement => ts.isInterfaceDeclaration(statement)).flatMap(statement => statement.members)
  const nodes = [...declarations, ...properties].filter(node => ts.getJSDocCommentsAndTags(node).length === 0)
  return nodes.map(node => node.getText(source).split('\n')[0])
}

describe('engine jsdoc', () => {
  it('finds the engine files', () => {
    expect.hasAssertions()
    expect(files).toContain('runner.ts')
  })

  it.each(files)('%s starts with a @module comment', file => {
    expect.hasAssertions()
    expect(firstComment(file)).toMatch(/^\/\*\*/u)
    expect(firstComment(file)).toContain('@module')
  })

  it.each(files)('%s documents every declaration and interface property', file => {
    expect.hasAssertions()
    expect(undocumented(file)).toStrictEqual([])
  })
})
