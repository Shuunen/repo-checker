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

  it('shows only 15 unchanged lines around a change, and counts what is left out', () => {
    expect.hasAssertions()
    const lines = Array.from({ length: 100 }, (_item, index) => `line ${index + 1}`)
    const changed = lines.with(49, 'edited')
    const shown = kinds(`${lines.join('\n')}\n`, `${changed.join('\n')}\n`)
    expect(shown).toHaveLength(1 + 15 + 1 + 1 + 15 + 1)
    expect(shown[0]).toStrictEqual(['skipped', '34 unchanged lines'])
    expect(shown[1]).toStrictEqual(['kept', 'line 35'])
    expect(shown[16]).toStrictEqual(['removed', 'line 50'])
    expect(shown.at(-1)).toStrictEqual(['skipped', '35 unchanged lines'])
  })

  it('counts the lines between two distant changes', () => {
    expect.hasAssertions()
    const lines = Array.from({ length: 80 }, (_item, index) => `line ${index + 1}`)
    const changed = lines.with(0, 'edited').with(79, 'edited')
    expect(kinds(lines.join('\n'), changed.join('\n')).filter(([kind]) => kind === 'skipped')).toStrictEqual([['skipped', '48 unchanged lines']])
  })

  it('leaves out everything when nothing changed', () => {
    expect.hasAssertions()
    expect(kinds('a\nb\n', 'a\nb\n')).toStrictEqual([['skipped', '2 unchanged lines']])
  })
})
