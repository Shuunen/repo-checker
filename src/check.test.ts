import { expect, it } from 'vitest'
import { check } from './check'
import { ProjectData, repoCheckerPath } from './constants'
import { cleanIndicatorsForSnap, cleanUnknownValueForSnap, mocksProjectsFolder, tsProjectFolder } from './mock'

it('check A repo-checker folder fails with low max size', async () => {
  const data = new ProjectData({ isPublishedPackage: true, isQuiet: true, maxSizeKo: 2 })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion
  const message = await check({ data, folderPath: repoCheckerPath }).catch((error: unknown) => (error as Error).message)
  expect(cleanUnknownValueForSnap(message)).toMatchSnapshot()
})

it('check B repo-checker folder succeed', async () => {
  const data = new ProjectData({ isModule: true, isPublishedPackage: true, isQuiet: true, maxSizeKo: 120 })
  const indicators = await check({ data, folderPath: repoCheckerPath })
  expect(cleanIndicatorsForSnap(indicators)).toMatchSnapshot()
})

it('check C ts-project folder', async () => {
  const data = new ProjectData({ isQuiet: true })
  const indicators = await check({ canThrow: false, data, folderPath: tsProjectFolder })
  expect(cleanIndicatorsForSnap(indicators)).toMatchSnapshot()
})

it('check D mocks-projects folders and throw', async () => {
  const data = new ProjectData({ isQuiet: true })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion
  const message = await check({ canFailStop: true, data, folderPath: mocksProjectsFolder }).catch((error: unknown) => (error as Error).message)
  expect(message).toMatchSnapshot()
})

it('check E mocks-projects folders and not throw', async () => {
  const data = new ProjectData({ isQuiet: true })
  const indicators = await check({ canFailStop: true, canThrow: false, data, folderPath: mocksProjectsFolder })
  expect(cleanIndicatorsForSnap(indicators)).toMatchSnapshot()
})
