import { followSystemTheme } from './theme.ts'

/**
 * A fake media query whose match can be changed
 * @param matches the first value
 * @returns the query and a function to change it
 */
function fakeMedia(matches: boolean) {
  const target = new EventTarget()
  const media = Object.assign(target, { matches }) as unknown as MediaQueryList
  const change = (value: boolean) => {
    Object.assign(media, { matches: value })
    target.dispatchEvent(new Event('change'))
  }
  return { change, media }
}

describe(followSystemTheme, () => {
  it('follows the system theme until stopped', () => {
    expect.hasAssertions()
    const root = document.createElement('html')
    const { change, media } = fakeMedia(true)
    const stop = followSystemTheme(root, media)
    expect(root.classList.contains('dark')).toBe(true)
    change(false)
    expect(root.classList.contains('dark')).toBe(false)
    stop()
    change(true)
    expect(root.classList.contains('dark')).toBe(false)
  })
})
