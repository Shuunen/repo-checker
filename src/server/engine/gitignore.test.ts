import { addIgnoreLine, removeIgnoreLines } from './gitignore.ts'

describe(addIgnoreLine, () => {
  it.each([
    { expected: 'a\nb\nc\n', line: 'b', name: 'inserted in order', text: 'a\nc\n' },
    { expected: '.cache\n.turbo\n*.log\ndist\n', line: '.turbo', name: 'dots before stars before letters', text: '.cache\n*.log\ndist\n' },
    { expected: 'a\nb\n', line: 'a', name: 'no duplicate', text: 'b\na' },
    { expected: 'b\nc\nd\n', line: 'd', name: 'an unsorted list is sorted', text: 'c\nb\n' },
    { expected: '.turbo\nnode_modules\n', line: '.turbo', name: 'trailing blank lines are dropped', text: 'node_modules\n\n' },
    { expected: '# deps\nnode_modules\n.turbo\n', line: '.turbo', name: 'a comment keeps the structure', text: '# deps\nnode_modules\n' },
    { expected: 'dist\n!dist/keep\n.turbo\n', line: '.turbo', name: 'a negation keeps the order', text: 'dist\n!dist/keep\n' },
    { expected: 'a\n\nb\n.turbo\n', line: '.turbo', name: 'a blank line keeps the structure', text: 'a\n\nb\n' },
    { expected: '.turbo\n', line: '.turbo', name: 'empty file', text: '' },
  ])('$name', ({ expected, line, text }) => {
    expect.hasAssertions()
    expect(addIgnoreLine(text, line)).toBe(expected)
  })
})

describe(removeIgnoreLines, () => {
  it.each([
    { expected: 'dist\nnode_modules\n', name: 'the matching line is removed', text: 'dist\n.github\nnode_modules\n' },
    { expected: '# deps\n\ndist\n', name: 'comments and blank lines stay', text: '# deps\n.github/\n\ndist\n' },
    { expected: '\n', name: 'nothing left', text: '.github\n' },
  ])('$name', ({ expected, text }) => {
    expect.hasAssertions()
    expect(removeIgnoreLines(text, /^\.github\/?$/u)).toBe(expected)
  })
})
