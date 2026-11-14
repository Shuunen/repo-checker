import { darken, normalizeColor, readableText, workbenchColors } from './color.ts'

describe(normalizeColor, () => {
  it.each([
    ['#FA0', '#ffaa00'],
    ['#024EB8', '#024eb8'],
    ['red', undefined],
    ['#12345', undefined],
    [3, undefined],
    [undefined, undefined],
  ])('normalizes %s to %s', (color, expected) => {
    expect.hasAssertions()
    expect(normalizeColor(color)).toBe(expected)
  })
})

describe(darken, () => {
  it.each([
    ['#024eb8', '#012c67'],
    ['#ff0000', '#ad0000'],
    ['#00ff00', '#00ad00'],
    ['#0000ff', '#0000ad'],
    ['#ffffff', '#d6d6d6'],
    ['#000000', '#000000'],
    ['#ff00aa', '#ad0074'],
  ])('darkens %s to %s', (color, expected) => {
    expect.hasAssertions()
    expect(darken(color)).toBe(expected)
  })
})

describe(readableText, () => {
  it.each([
    ['#024eb8', '#f9fafb'],
    ['#000000', '#f9fafb'],
    ['#ffcc00', '#111827'],
    ['#ffffff', '#111827'],
  ])('reads on %s with %s', (color, expected) => {
    expect.hasAssertions()
    expect(readableText(color)).toBe(expected)
  })
})

describe(workbenchColors, () => {
  it('gives the title bar the theme color, the activity and status bars a darker shade, a dimmer status bar without focus and readable texts', () => {
    expect.hasAssertions()
    expect(workbenchColors('#024eb8')).toStrictEqual({
      'activityBar.background': '#012c67',
      'activityBar.foreground': '#f9fafb',
      'activityBarBadge.background': '#024eb8',
      'activityBarBadge.foreground': '#f9fafb',
      'statusBar.background': '#012c67',
      'statusBar.foreground': '#f9fafbcc',
      'statusBar.inactiveBackground': '#011d43',
      'tab.activeBorderTop': '#024eb8',
      'titleBar.activeBackground': '#024eb8',
      'titleBar.activeForeground': '#f9fafb',
      'titleBar.inactiveBackground': '#012c67',
      'titleBar.inactiveForeground': '#f9fafbaa',
    })
  })

  it('writes dark texts on a light theme color', () => {
    expect.hasAssertions()
    expect(workbenchColors('#ffd27a')).toMatchObject({ 'statusBar.foreground': '#111827cc', 'statusBar.inactiveBackground': '#a6771a', 'titleBar.activeForeground': '#111827' })
  })
})
