import { browserCommand } from './open-browser.ts'

describe(browserCommand, () => {
  it.each([
    ['darwin', ['open', 'http://127.0.0.1:4747']],
    ['win32', ['cmd', '/c', 'start', '""', 'http://127.0.0.1:4747']],
    ['linux', ['xdg-open', 'http://127.0.0.1:4747']],
    ['freebsd', ['xdg-open', 'http://127.0.0.1:4747']],
  ])('opens the default browser on %s with %j', (platform, command) => {
    expect.hasAssertions()
    expect(browserCommand(platform, 'http://127.0.0.1:4747')).toStrictEqual(command)
  })
})
