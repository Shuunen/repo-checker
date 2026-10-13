import { diffLinesOf } from './diff-lines.ts'

/**
 * Drop the ids, they only exist to be keys
 * @param before the text now
 * @param after the text once fixed
 * @returns the kind and the text of each line
 */
function kinds(before: string, after: string) {
  return diffLinesOf(before, after).map(({ kind, text }) => [kind, text])
}

describe(diffLinesOf, () => {
  it('tells the lines that go, the lines that come and the lines that stay', () => {
    expect.hasAssertions()
    expect(kinds('a\nb\nc\n', 'a\nx\nc\n')).toStrictEqual([
      ['kept', 'a'],
      ['removed', 'b'],
      ['added', 'x'],
      ['kept', 'c'],
    ])
  })

  it('shows a file that does not exist yet as all added', () => {
    expect.hasAssertions()
    expect(kinds('', '# new\ntext\n')).toStrictEqual([
      ['added', '# new'],
      ['added', 'text'],
    ])
  })

  it('handles a text without a final line break', () => {
    expect.hasAssertions()
    expect(kinds('old a', 'new a')).toStrictEqual([
      ['removed', 'old a'],
      ['added', 'new a'],
    ])
  })

  it('gives every line its own id', () => {
    expect.hasAssertions()
    const ids = diffLinesOf('a\na\n', 'a\na\nb\nb\n').map(line => line.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
