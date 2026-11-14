import { memoryIo } from './io.ts'
import { detectThemeColor } from './theme-color.ts'

const manifest = '{ "theme_color": "#AABBCC" }'
const page = '<head><meta name="theme-color" content="#112233" /></head>'
const vscode = '{ "workbench.colorCustomizations": { "titleBar.activeBackground": "#445566" } }'

describe(detectThemeColor, () => {
  it('prefers the manifest', async () => {
    expect.hasAssertions()
    await expect(detectThemeColor(memoryIo({ '.vscode/settings.json': vscode, 'index.html': page, 'public/manifest.json': manifest }))).resolves.toBe('#aabbcc')
  })

  it('finds a manifest wherever it is, the first with a color wins', async () => {
    expect.hasAssertions()
    await expect(detectThemeColor(memoryIo({ 'a/manifest.json': '{}', 'src/web/public/site.webmanifest': manifest, 'z/manifest.json': '{ "theme_color": "#000" }' }))).resolves.toBe('#aabbcc')
  })

  it('then the meta tag of a page', async () => {
    expect.hasAssertions()
    await expect(detectThemeColor(memoryIo({ '.vscode/settings.json': vscode, 'index.html': page, 'public/manifest.json': '{ "theme_color": "red" }' }))).resolves.toBe('#112233')
  })

  it('then the title bar of VS Code', async () => {
    expect.hasAssertions()
    await expect(detectThemeColor(memoryIo({ '.vscode/settings.json': vscode, 'index.html': '<head></head>' }))).resolves.toBe('#445566')
  })

  it('ignores the white placeholder and goes on to the next source', async () => {
    expect.hasAssertions()
    const white = '{ "theme_color": "#FFFFFF" }'
    await expect(detectThemeColor(memoryIo({ 'index.html': page, 'public/manifest.json': white }))).resolves.toBe('#112233')
    await expect(detectThemeColor(memoryIo({ '.vscode/settings.json': '{ "workbench.colorCustomizations": { "titleBar.activeBackground": "#fff" } }', 'public/manifest.json': white }))).resolves.toBeUndefined()
  })

  it('finds nothing and guesses nothing', async () => {
    expect.hasAssertions()
    await expect(detectThemeColor(memoryIo())).resolves.toBeUndefined()
    await expect(detectThemeColor(memoryIo({ '.vscode/settings.json': '{ "workbench.colorCustomizations": "no" }' }))).resolves.toBeUndefined()
  })
})
