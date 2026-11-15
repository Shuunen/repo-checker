import { colorize, shortenPaths } from './watch.ts'

describe(colorize, () => {
  it('paints the files, the flags, the words, the shortcut and the watcher actions', () => {
    expect.hasAssertions()
    const line = colorize("Restarting 'src/server/bin.ts ui --no-open'")
    expect(line).toContain('\u001B[36msrc/server/bin.ts\u001B[39m')
    expect(line).toContain('\u001B[33mui\u001B[39m')
    expect(line).toContain('\u001B[35m--no-open\u001B[39m')
    expect(line).toContain('\u001B[2mRestarting\u001B[22m')
    expect(colorize('press Ctrl+C to stop')).toContain('Ctrl+C')
  })
})

describe(shortenPaths, () => {
  it('shortens the escaped paths of the node watcher', () => {
    expect.hasAssertions()
    const folder = String.raw`C:\Users\me\app`
    expect(shortenPaths(String.raw`Change detected in 'C:\\Users\\me\\app\\src\\server\\ui.ts'`, folder)).toBe("Change detected in 'src/server/ui.ts'")
    expect(shortenPaths(String.raw`Restarting 'C:\\Users\\me\\app\\src\\server\\bin.ts ui --target=.. --no-open'`, folder)).toBe("Restarting 'src/server/bin.ts ui --target=.. --no-open'")
  })

  it('shortens plain paths and leaves other paths alone', () => {
    expect.hasAssertions()
    expect(shortenPaths('see /home/me/app/src/ui.ts', '/home/me/app')).toBe('see src/ui.ts')
    expect(shortenPaths('repo-check ui · /home/me', '/home/me/app')).toBe('repo-check ui · /home/me')
  })
})
