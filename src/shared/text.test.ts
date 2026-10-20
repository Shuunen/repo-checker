import { errorMessage, plural } from './text.ts'

describe(plural, () => {
  it.each([
    [1, 'fork', '1 fork'],
    [0, 'fork', '0 forks'],
    [30, 'fork', '30 forks'],
    [1, 'branch', '1 branch'],
    [2, 'branch', '2 branches'],
    [3, 'stash', '3 stashes'],
    [2, 'box', '2 boxes'],
    [2, 'class', '2 classes'],
    [2, 'check', '2 checks'],
    [2, 'uncommitted file', '2 uncommitted files'],
  ])('says %i %s as "%s"', (count, noun, text) => {
    expect.hasAssertions()
    expect(plural(count, noun)).toBe(text)
  })
})

describe(errorMessage, () => {
  it('reads the message of an Error, or turns anything else to text', () => {
    expect.hasAssertions()
    expect(errorMessage(new Error('boom'))).toBe('boom')
    expect(errorMessage('plain text')).toBe('plain text')
  })
})
