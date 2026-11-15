import { readFileSync } from 'node:fs'
import { testRule } from '../../test/rule-tester.ts'
import { knownKeys, repoCheckerConfigKnownKeys, repoCheckerConfigSchema } from './repo-checker-config.rule.ts'

const file = '.repo-checker.json'
const schema = './node_modules/repo-check/schema.json'

describe('known keys', () => {
  it('match the properties of schema.json', () => {
    expect.hasAssertions()
    const { properties } = JSON.parse(readFileSync(new URL('../../../../schema.json', import.meta.url), 'utf8')) as { properties: Record<string, unknown> }
    expect(knownKeys).toStrictEqual(Object.keys(properties))
  })
})

testRule(repoCheckerConfigSchema, {
  invalid: [{ errors: ['missing'], files: { [file]: '{\n  "webUrl": "https://a.b"\n}\n' }, name: 'no schema', output: `{\n  "$schema": "${schema}",\n  "webUrl": "https://a.b"\n}\n` }],
  valid: [{ files: { [file]: `{ "$schema": "${schema}" }` }, name: 'the schema' }, { files: { [file]: '{}' }, name: 'repo-checker itself', pkg: { name: 'repo-check' } }, { name: 'no config, repo-checker-config reports it' }],
})

testRule(repoCheckerConfigKnownKeys, {
  invalid: [
    { errors: ['renamed'], files: { [file]: '{\n  "web_url": "https://a.b"\n}\n' }, name: 'web_url renamed', output: '{\n  "webUrl": "https://a.b"\n}\n' },
    { errors: ['renamed'], files: { [file]: '{\n  "web_url": "https://old",\n  "webUrl": "https://new"\n}\n' }, name: 'webUrl already there', output: '{\n  "webUrl": "https://new"\n}\n' },
    { errors: ['legacy', 'legacy'], files: { [file]: '{\n  "user_mail": "a@b.c",\n  "user_name": "A"\n}\n' }, name: 'user keys removed', output: '{\n}\n' },
    { errors: ['legacy', 'legacy'], files: { [file]: '{\n  "userMail": "a@b.c",\n  "userName": "A",\n  "webUrl": "https://a.b"\n}\n' }, name: 'camelCase user keys removed', output: '{\n  "webUrl": "https://a.b"\n}\n' },
    { errors: ['unknown'], files: { [file]: '{\n  "colour": "red"\n}\n' }, name: 'an unknown key, no fix' },
  ],
  valid: [{ files: { [file]: '' }, name: 'an empty file' }, { files: { [file]: '{ "webUrl": "https://a.b", "license": "MIT" }' }, name: 'known keys' }, { name: 'no config' }],
})
