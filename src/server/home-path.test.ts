import { homePath } from './home-path.ts'

describe(homePath, () => {
  it.each([
    ['/home/me/Projects/github', '/home/me', '~/Projects/github'],
    ['/home/me', '/home/me', '~'],
    ['/home/me2/Projects', '/home/me', '/home/me2/Projects'],
    ['/srv/projects', '/home/me', '/srv/projects'],
  ])('shows %s as %s from the home %s', (folder, home, shown) => {
    expect.hasAssertions()
    expect(homePath(folder, home)).toBe(shown)
  })
})
