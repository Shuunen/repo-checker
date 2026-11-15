import { toPnpm } from './scripts.utils.ts'

describe('npm run to pnpm', () => {
  it('drops the -- before flags', () => {
    expect.hasAssertions()
    expect(toPnpm('npm run test -- --watch')).toBe('pnpm test --watch')
  })

  it('keeps a -- that is not followed by a flag', () => {
    expect.hasAssertions()
    expect(toPnpm('npm run test -- file.ts')).toBe('pnpm test -- file.ts')
  })
})
