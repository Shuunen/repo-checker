import { expect, it } from 'vitest'
import { check } from '../src/check'
import { ProjectData, repoCheckerPath } from '../src/constants'
import { tsProjectFolder } from './utils'

it('check A folder fails with low max size', async () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const message = await check(repoCheckerPath, new ProjectData({ maxSizeKo: 2, isPublishedPackage: true, isQuiet: true })).catch((error: unknown) => (error as Error).message)
  expect(message).toMatchSnapshot()
})

it('check B folder succeed', async () => {
  const { passed, failed, warnings } = await check(repoCheckerPath, new ProjectData({ maxSizeKo: 120, isPublishedPackage: true, isQuiet: true }))
  expect(passed, 'passed').toMatchSnapshot()
  expect(failed, 'failed').toMatchSnapshot()
  expect(warnings, 'warnings').toMatchSnapshot()
})

it('check C data/tsProject', async () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const message = await check(tsProjectFolder, new ProjectData({ isQuiet: true })).catch((error: unknown) => (error as Error).message)
  expect(message).toMatchSnapshot()
})
