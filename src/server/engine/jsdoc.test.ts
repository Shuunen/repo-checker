import { readFileSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import path from 'node:path'

const folder = import.meta.dirname
const allFiles = await Array.fromAsync(glob('*.ts', { cwd: folder }))
const files = allFiles.filter(file => !file.endsWith('.test.ts')).toSorted()

/**
 * Read an engine file
 * @param file the file name
 * @returns the text of the file
 */
function read(file: string) {
  return readFileSync(path.join(folder, file), 'utf8')
}

/**
 * Get the first comment of a file
 * @param file the file name
 * @returns the text up to the end of the first comment
 */
function firstComment(file: string) {
  const text = read(file)
  return text.slice(0, text.indexOf('*/') + '*/'.length)
}

/**
 * List the top level declarations and interface properties that have no JSDoc, read line by line: a declaration starts a line, a property is indented by two spaces inside an interface, and a documented one follows the line that ends a comment
 * @param file the file name
 * @returns the first line of each undocumented node
 */
function undocumented(file: string) {
  const lines = read(file).split('\n')
  let inInterface = false
  return lines.filter((line, index) => {
    const isDeclaration = /^(?:export|function|const|let|class|interface|type|enum|async function)\b/u.test(line)
    const isProperty = inInterface && /^ {2}\S/u.test(line) && !line.startsWith('  *') && !line.startsWith('  /*')
    if (isDeclaration) inInterface = /^(?:export )?interface\b/u.test(line)
    else if (line.startsWith('}')) inInterface = false
    return (isDeclaration || isProperty) && lines[index - 1]?.trimEnd().endsWith('*/') !== true
  })
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
