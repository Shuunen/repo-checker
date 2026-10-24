import { sortJson } from './sort-json.ts'

describe(sortJson, () => {
  it('sorts package.json alphabetically but keeps the order of the exports', () => {
    expect.hasAssertions()
    expect(sortJson('package.json', '{\n  "name": "foo"\n}\n', '{\n  "version": "1.0.0",\n  "name": "foo",\n  "exports": { ".": { "types": "a", "default": "b" }, "./a": "c" }\n}\n')).toBe(
      '{\n  "exports": {\n    ".": {\n      "types": "a",\n      "default": "b"\n    },\n    "./a": "c"\n  },\n  "name": "foo",\n  "version": "1.0.0"\n}\n',
    )
    expect(sortJson('packages/a/package.json', '', '{"version":"1","name":"a"}')).toBe('{\n  "name": "a",\n  "version": "1"\n}')
  })

  it('sorts the other json files alphabetically with $schema first and keeps the arrays', () => {
    expect.hasAssertions()
    expect(sortJson('tsconfig.json', '{\n\t"a": 1\n}', '{\n\t"b": [2, 1],\n\t"a": { "z": 1, "y": null },\n\t"$schema": "x"\n}')).toBe('{\n\t"$schema": "x",\n\t"a": {\n\t\t"y": null,\n\t\t"z": 1\n\t},\n\t"b": [\n\t\t2,\n\t\t1\n\t]\n}')
  })

  it('keeps crlf line endings', () => {
    expect.hasAssertions()
    expect(sortJson('a.json', '{\r\n  "a": 2\r\n}\r\n', '{\r\n  "b": 1,\r\n  "a": 2\r\n}\r\n')).toBe('{\r\n  "a": 2,\r\n  "b": 1\r\n}\r\n')
  })

  it('sorts a package.json that was not exactly in order', () => {
    expect.hasAssertions()
    expect(sortJson('package.json', '{\n  "version": "1",\n  "name": "a"\n}', '{\n  "version": "2",\n  "name": "a"\n}')).toBe('{\n  "name": "a",\n  "version": "2"\n}')
  })

  it('leaves a file that was not sorted, one already in order, comments, and other files', () => {
    expect.hasAssertions()
    expect(sortJson('a.json', '{"b":1,"a":2}', '{"b":1,"a":2,"c":3}')).toBe('{"b":1,"a":2,"c":3}')
    expect(sortJson('a.json', '{"a":1}', '{ "a": 1, "b": 2 }')).toBe('{ "a": 1, "b": 2 }')
    expect(sortJson('a.json', '{ // c\n "a": 1 }', '{ // c\n "b": 1, "a": 2 }')).toBe('{ // c\n "b": 1, "a": 2 }')
    expect(sortJson('a.json', '', '')).toBe('')
    expect(sortJson('a.txt', '', '{"b":1,"a":2}')).toBe('{"b":1,"a":2}')
  })
})
