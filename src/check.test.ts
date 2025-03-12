import { Result } from 'shuutils'
import { expect, it } from 'vitest'
import { check } from './check'
import { ProjectData, repoCheckerPath } from './constants'
import { cleanIndicatorsForSnap, cleanUnknownValueForSnap, mocksProjectsFolder, tsProjectFolder } from './mock'

it('check A repo-checker folder fails with low max size', async () => {
  const data = new ProjectData({ isPublishedPackage: true, isQuiet: true, maxSizeKo: 2 })
  const result = Result.unwrap(await check({ data, folderPath: repoCheckerPath }))
  expect(result.value).toBeUndefined()
  expect(cleanUnknownValueForSnap(result.error)).toMatchInlineSnapshot(`"failed at validating at least one rule in one folder : package-json-main-file-size-XYZko-should-be-less-or-equal-to-max-size-allowed-2ko"`)
})

it('check B repo-checker folder succeed', async () => {
  const data = new ProjectData({ isModule: true, isPublishedPackage: true, isQuiet: true, maxSizeKo: 120 })
  const result = Result.unwrap(await check({ data, folderPath: repoCheckerPath }))
  expect(cleanIndicatorsForSnap(result.value)).toMatchSnapshot()
  expect(result.error).toBeUndefined()
})

it('check C ts-project folder', async () => {
  const data = new ProjectData({ isQuiet: true })
  const result = Result.unwrap(await check({ canThrow: false, data, folderPath: tsProjectFolder }))
  expect(cleanIndicatorsForSnap(result.value)).toMatchSnapshot()
  expect(cleanIndicatorsForSnap()).toBeUndefined()
  expect(result.error).toBeUndefined()
})

it('check D mocks-projects folders and throw', async () => {
  const data = new ProjectData({ isQuiet: true })
  const result = Result.unwrap(await check({ canFailStop: true, data, folderPath: mocksProjectsFolder }))
  expect(result.value).toBeUndefined()
  expect(result.error).toMatchInlineSnapshot(`"failed at validating at least one rule in one folder : has-a-editorconfig-file, has-a-gitignore-file, has-a-license-file, has-a-nvmrc-file, package-json-do..."`)
})

it('check E mocks-projects folders and not throw', async () => {
  const data = new ProjectData({ isQuiet: true })
  const result = Result.unwrap(await check({ canFailStop: true, canThrow: false, data, folderPath: mocksProjectsFolder }))
  expect(cleanIndicatorsForSnap(result.value)).toMatchSnapshot()
  expect(result.error).toBeUndefined()
})
