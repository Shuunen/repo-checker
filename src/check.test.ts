import { expect, it } from 'vitest'
import { check } from './check'
import { ProjectData, repoCheckerPath } from './constants'
import { mocksProjectsFolder, tsProjectFolder } from './mock'

it('check A folder fails with low max size', async () => {
  const data = new ProjectData({ isPublishedPackage: true, isQuiet: true, maxSizeKo: 2 })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const message = await check({ data, folderPath: repoCheckerPath }).catch((error: unknown) => (error as Error).message)
  expect(message).toMatchSnapshot()
})

it('check B folder succeed', async () => {
  const data = new ProjectData({ isPublishedPackage: true, isQuiet: true, maxSizeKo: 120 })
  const indicators = await check({ data, folderPath: repoCheckerPath })
  expect(indicators).toMatchSnapshot()
})

it('check C data/tsProject', async () => {
  const data = new ProjectData({ isQuiet: true })
  const indicators = await check({ canThrow: false, data, folderPath: tsProjectFolder })
  expect(indicators).toMatchSnapshot()
})

it('check D data folders and throw', async () => {
  const data = new ProjectData({ isQuiet: true })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const message = await check({ canFailStop: true, data, folderPath: mocksProjectsFolder }).catch((error: unknown) => (error as Error).message)
  expect(message).toMatchSnapshot()
})

it('check E data folders and not throw', async () => {
  const data = new ProjectData({ isQuiet: true })
  const indicators = await check({ canFailStop: true, canThrow: false, data, folderPath: mocksProjectsFolder })
  expect(indicators).toMatchSnapshot()
})
