import { addToHead, readAttribute, setAttribute } from './html.utils.ts'

describe(addToHead, () => {
  it.each([
    { expected: '<head>\n  <a />\n</head>', name: 'a closing tag at the start of a line', text: '<head>\n</head>' },
    { expected: '<html>\n  <head>\n    <b />\n    <a />\n  </head>\n</html>', name: 'the indent of the closing tag is kept', text: '<html>\n  <head>\n    <b />\n  </head>\n</html>' },
    { expected: '<head>  <a />\n</head>', name: 'a closing tag in the middle of a line', text: '<head></head>' },
    { expected: '<html></html>', name: 'no head', text: '<html></html>' },
  ])('$name', ({ expected, text }) => {
    expect.hasAssertions()
    expect(addToHead(text, '<a />')).toBe(expected)
  })
})

describe(readAttribute, () => {
  it('reads an attribute, or nothing', () => {
    expect.hasAssertions()
    expect(readAttribute('<meta name="a" content="b" />', 'content')).toBe('b')
    expect(readAttribute('<meta name="a" />', 'content')).toBeUndefined()
  })
})

describe(setAttribute, () => {
  it('replaces an attribute or adds it at the end of the tag', () => {
    expect.hasAssertions()
    expect(setAttribute('<link a="1" color="x">', 'color', 'y')).toBe('<link a="1" color="y">')
    expect(setAttribute('<link a="1" />', 'color', 'y')).toBe('<link a="1" color="y" />')
    expect(setAttribute('<link a="1">', 'color', 'y')).toBe('<link a="1" color="y">')
  })
})
