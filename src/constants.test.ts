import { home, ProjectData, repoCheckerPath } from './constants'

describe('constants', () => {
  it('home (process.env.HOME) is defined', () => {
    expect.hasAssertions()
    expect(home.length).toBeGreaterThan(0)
  })

  it('repoCheckerPath (process.env.pwd) is defined', () => {
    expect.hasAssertions()
    expect(repoCheckerPath.length).toBeGreaterThan(0)
  })

  it('ProjectData ban sass by default', () => {
    expect.hasAssertions()
    expect(new ProjectData().shouldAvoidSass).toBe(true)
  })

  it('ProjectData assign', () => {
    expect.hasAssertions()
    expect(new ProjectData({ shouldAvoidSass: false }).shouldAvoidSass).toBe(false)
  })
})
