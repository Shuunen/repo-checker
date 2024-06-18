import { clone } from 'shuutils'
import { expect, it } from 'vitest'
import { defaultOptions, getData, getFlags, getOptions, initDataFile, start } from './main'

function cleanTargetForSnap(options: Readonly<ReturnType<typeof getOptions>>) {
  const clean = clone<Partial<typeof options>>(options)
  // we need to get rid of targets like c:\Users\MyUser or /home/another-variable/ because they are not the same on every machine
  // biome-ignore lint/performance/noDelete: let me clean the snapshot ^^'
  delete clean.target
  return clean
}

it('parseOptions A defaults', () => {
  expect(cleanTargetForSnap(getOptions({}))).toMatchSnapshot()
})

it('parseOptions B non existing target', () => {
  expect(cleanTargetForSnap(getOptions({ '--fix': true, '--target': 'my-folder' }))).toMatchSnapshot()
})

it('parseOptions C show help', () => {
  expect(cleanTargetForSnap(getOptions({ '--help': true }))).toMatchSnapshot()
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

it('start E verbose', () => {
  const options = { ...defaultOptions, isVerbose: true }
  expect(start(options)).toMatchInlineSnapshot('Promise {}')
})

it('start F quiet', () => {
  const options = { ...defaultOptions, isQuiet: true }
  expect(start(options)).toMatchInlineSnapshot('Promise {}')
})

it('start G fix', () => {
  const options = { ...defaultOptions, canFix: true }
  expect(start(options)).toMatchInlineSnapshot('Promise {}')
})

it('getData A empty target : current .repo-checker.json', async () => {
  expect(await getData()).toMatchInlineSnapshot(`
    {
      "maxSizeKo": 50,
    }
  `)
})

it('getData B non-existing target : default data', () => {
  // we dont await here because there no need to pollute the get the whole default data here, see utils.test.ts
  expect(getData('unknown')).toMatchInlineSnapshot('Promise {}')
})

it('getData C mal-formatted json target : default data', async () => {
  // we dont toThrowErrorMatchingSnapshot because the JSON parse error message is localized -.-''
  await expect(async () => await getData('src/mocks/tsProject/sub-folder')).rejects.toThrowError()
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
