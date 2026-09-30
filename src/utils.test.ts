// eslint-disable-next-line unicorn/prevent-abbreviations
import { Result } from 'shuutils'
import { repoCheckerPath } from './constants'
import { readFileInFolder } from './utils'

describe('utils', () => {
  it('readFileInFolder A existing file', async () => {
    expect.hasAssertions()
    const result = Result.unwrap(await readFileInFolder(repoCheckerPath, '.nvmrc'))
    expect(result.value?.length).toBeGreaterThan(3)
    expect(result.error).toBeUndefined()
  })

  it('readFileInFolder B existing folder', async () => {
    expect.hasAssertions()
    const result = Result.unwrap(await readFileInFolder(repoCheckerPath, 'src'))
    expect(result.value).toBeUndefined()
    expect(result.error).toContain('is a directory')
  })

  it('readFileInFolder C missing file', async () => {
    expect.hasAssertions()
    const result = Result.unwrap(await readFileInFolder(repoCheckerPath, 'missing-file'))
    expect(result.value).toBeUndefined()
    expect(result.error).toContain('does not exists')
  })
})
