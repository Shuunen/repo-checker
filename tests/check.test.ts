import { expect, it } from 'vitest'
import { check } from '../src/check'
import { ProjectData, repoCheckerPath } from '../src/constants'
import { dataProjectsFolder, tsProjectFolder } from './utils'

it('check A folder fails with low max size', async () => {
  const data = new ProjectData({ maxSizeKo: 2, isPublishedPackage: true, isQuiet: true })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const message = await check({ folderPath: repoCheckerPath, data }).catch((error: unknown) => (error as Error).message)
  expect(message).toMatchSnapshot()
})

it('check B folder succeed', async () => {
  const data = new ProjectData({ maxSizeKo: 120, isPublishedPackage: true, isQuiet: true })
  const indicators = await check({ folderPath: repoCheckerPath, data })
  expect(indicators).toMatchSnapshot()
})

it('check C data/tsProject', async () => {
  const data = new ProjectData({ isQuiet: true })
  const indicators = await check({ folderPath: tsProjectFolder, data, canThrow: false })
  expect(indicators).toMatchSnapshot()
})

it('check D data folders and throw', async () => {
  const data = new ProjectData({ isQuiet: true })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const message = await check({ folderPath: dataProjectsFolder, data, canFailStop: true }).catch((error: unknown) => (error as Error).message)
  expect(message).toMatchSnapshot()
})

it('check E data folders and not throw', async () => {
  const data = new ProjectData({ isQuiet: true })
  const indicators = await check({ folderPath: dataProjectsFolder, data, canFailStop: true, canThrow: false })
  expect(indicators).toMatchSnapshot()
})
