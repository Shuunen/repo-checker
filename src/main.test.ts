import { clone } from 'shuutils'
import { expect, it } from 'vitest'
import { defaultOptions, getData, getFlags, getOptions, initDataFile, start } from './main'

/**
 * Clean the target from the options to make the snapshot more stable
 * @param options the options to clean
 * @returns the cleaned options
 */
function cleanTargetForSnap(options: Readonly<ReturnType<typeof getOptions>>) {
  const clean = clone<Partial<typeof options>>(options)
  // we need to get rid of targets like c:\Users\MyUser or /home/another-variable/ because they are not the same on every machine
  // biome-ignore lint/performance/noDelete: let me clean the snapshot ^^'
  delete clean.target
  return clean
}

it('getOptions A defaults', () => {
  expect(cleanTargetForSnap(getOptions({}))).toMatchSnapshot()
})

it('getOptions B non existing target', () => {
  expect(cleanTargetForSnap(getOptions({ '--fix': true, '--target': 'my-folder' }))).toMatchSnapshot()
})

it('getOptions C show help', () => {
  expect(cleanTargetForSnap(getOptions({ '--help': true }))).toMatchSnapshot()
})

const logLevels = [
  { in: { '--verbose': true }, out: '1-debug' },
  { in: { '--debug': true }, out: '1-debug' },
  { in: { '--warn': true }, out: '5-warn' },
  { in: { '--log-level': 'warn' }, out: '5-warn' },
  { in: { '--error': true }, out: '7-error' },
  { in: { '--log-level': 'error' }, out: '7-error' },
]

it('getOptions D check log levels', () => {
  for (const { in: input, out: output } of logLevels) expect(getOptions(input).logLevel).toBe(output)
})

it('getFlags A', () => {
  expect(getFlags()).toMatchInlineSnapshot(`
    {
      "_": [],
    }
  `)
})

it('start A defaults', () => {
  // we dont await here because there no need to pollute the get the whole check result here, see check.test.ts
  expect(start()).toMatchInlineSnapshot('Promise {}')
})

it('start B show help', async () => {
  const options = { ...defaultOptions, willShowHelp: true }
  expect(await start(options)).toMatchInlineSnapshot(`
    {
      "failed": [],
      "passed": [
        "show-help",
      ],
      "warnings": [],
    }
  `)
})

it('start C show version', async () => {
  const options = { ...defaultOptions, willShowVersion: true }
  expect(await start(options)).toMatchInlineSnapshot(`
    {
      "failed": [],
      "passed": [
        "show-version",
      ],
      "warnings": [],
    }
  `)
})

it('start D init', () => {
  const options = { ...defaultOptions, willInit: true }
  expect(start(options)).toMatchInlineSnapshot('Promise {}')
})

it('start G fix', () => {
  const options = { ...defaultOptions, canFix: true }
  expect(start(options)).toMatchInlineSnapshot('Promise {}')
})

it('getData A empty target : current .repo-checker.json', async () => {
  expect(await getData()).toMatchInlineSnapshot(`
    {
      "maxSizeKo": 65,
    }
  `)
})

it('getData B non-existing target : default data', () => {
  // we dont await here because there no need to pollute the get the whole default data here, see utils.test.ts
  expect(getData('unknown')).toMatchInlineSnapshot('Promise {}')
})

it('getData C mal-formatted json target : default data', async () => {
  // we dont toThrowErrorMatchingSnapshot because the JSON parse error message is localized -.-''
  await expect(async () => getData('src/mocks/tsProject/sub-folder')).rejects.toThrowError()
})

it('initDataFile A default to current folder but data file already exists', async () => {
  expect(await initDataFile()).toMatchInlineSnapshot(`
    {
      "failed": [],
      "passed": [],
      "warnings": [
        "data-file-already-exists",
      ],
    }
  `)
})

it('initDataFile B in a temp folder', async () => {
  expect(await initDataFile('node_modules', true)).toMatchInlineSnapshot(`
    {
      "failed": [],
      "passed": [
        "init-data-file",
      ],
      "warnings": [],
    }
  `)
})
