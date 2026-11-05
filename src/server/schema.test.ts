import { readFileSync } from 'node:fs'
import { parse } from 'jsonc-parser'

/**
 * Read a json file of the repo root
 * @param name the file name
 * @returns the parsed content
 */
function readRoot(name: string) {
  return parse(readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8')) as Record<string, unknown>
}

describe('the .repo-checker.json schema', () => {
  it('describes every option and is published with the package', () => {
    expect.hasAssertions()
    const { properties } = readRoot('schema.json') as { properties: Record<string, { description?: string }> }
    expect(Object.keys(properties)).toContain('$schema')
    expect(Object.values(properties).filter(property => property.description === undefined)).toStrictEqual([])
    expect(readRoot('package.json').files).toContain('schema.json')
  })

  it('is the file the created .repo-checker.json points to', () => {
    expect.hasAssertions()
    expect(readRoot('package.json').name).toBe('repo-check')
  })
})
