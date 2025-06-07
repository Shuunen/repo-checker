import { expect, it } from 'vitest'
import { ProjectData, repoCheckerPath } from '../constants'
import { cleanInstanceForSnap, promiseFalse, promiseTrue, promiseVoid } from '../mock'
import { BiomeFile } from './biome.file'

it('biome A not using biome', async () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  instance.data.isUsingBiome = false
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('biome B missing file', async () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  instance.data.isUsingBiome = true
  instance.checkFileExists = promiseFalse
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('biome C empty file', async () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  instance.data.isUsingBiome = true
  instance.checkFileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('biome D invalid json', async () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  instance.data.isUsingBiome = true
  instance.checkFileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = '{ invalid json }'
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('biome E minimal valid biome.json', async () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  instance.data.isUsingBiome = true
  instance.checkFileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = '{"$schema":"./node_modules/@biomejs/biome/configuration_schema.json"}'
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('biome F fix missing sections', async () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }), true)
  instance.data.isUsingBiome = true
  instance.checkFileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = '{"$schema":"./node_modules/@biomejs/biome/configuration_schema.json"}'
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('biome G full valid biome.json', async () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  instance.data.isUsingBiome = true
  instance.checkFileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = JSON.stringify({
    $schema: './node_modules/@biomejs/biome/configuration_schema.json',
    formatter: { indentStyle: 'space', indentWidth: 2, lineEnding: 'lf', lineWidth: 120 },
    javascript: { formatter: { arrowParentheses: 'asNeeded', bracketSpacing: true, quoteStyle: 'single', semicolons: 'asNeeded' } },
    json: { parser: { allowComments: false, allowTrailingCommas: false } },
    linter: { enabled: true, rules: { recommended: true, style: { useBlockStatements: 'off' } } },
    organizeImports: { enabled: true },
    vcs: { clientKind: 'git', enabled: true, useIgnoreFile: true },
  })
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('biome H throws if javascript section is missing when checkJavaScriptSection is called', () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  // @ts-expect-error: direct assignment for test
  instance.fileContentObject = {}
  expect(() => instance['checkJavaScriptSection']()).toThrow('JavaScript section is undefined')
})

it('biome I throws if json section is missing when checkJsonSection is called', () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  // @ts-expect-error: direct assignment for test
  instance.fileContentObject = {}
  expect(() => instance['checkJsonSection']()).toThrow('JSON section is undefined')
})

it('biome J throws if linter section is missing when checkLinterSection is called', () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  // @ts-expect-error: direct assignment for test
  instance.fileContentObject = {}
  expect(() => instance['checkLinterSection']()).toThrow('Linter section is undefined')
})

it('biome K throws if organizeImports section is missing when checkOrganizeImportsSection is called', () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  // @ts-expect-error: direct assignment for test
  instance.fileContentObject = {}
  expect(() => instance['checkOrganizeImportsSection']()).toThrow('organizeImports section is undefined')
})

it('biome L throws if vcs section is missing when checkVcsSection is called', () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  // @ts-expect-error: direct assignment for test
  instance.fileContentObject = {}
  expect(() => instance['checkVcsSection']()).toThrow('vcs section is undefined')
})

it('biome M throws if formatter section is missing when checkFormatterSection is called', () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  // @ts-expect-error: direct assignment for test
  instance.fileContentObject = {}
  expect(() => instance['checkFormatterSection']()).toThrow('Formatter section is undefined')
})

it('biome N fixes lineWidth if missing or too small and canFix is true', () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }), true)
  // @ts-expect-error: direct assignment for test
  instance.fileContentObject = { formatter: { indentStyle: 'space', indentWidth: 2, lineEnding: 'lf', lineWidth: 10 } }
  instance['checkFormatterSection']()
  // @ts-expect-error: test access
  expect(instance.fileContentObject?.formatter?.lineWidth).toBe(80)
})

it('biome O throws if overrides section is missing when checkOverridesSection is called', () => {
  const instance = new BiomeFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  // fileContentObject is undefined by default
  expect(() => instance['checkOverridesSection']()).toThrow('overrides section is undefined')
})
