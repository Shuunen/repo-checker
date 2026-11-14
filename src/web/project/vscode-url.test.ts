import { vscodeUrl } from './vscode-url.ts'

describe('the VS Code link', () => {
  it('turns a Windows path into a file link that opens a new window', () => {
    expect.hasAssertions()
    expect(vscodeUrl(String.raw`C:\Users\me\app`)).toBe('vscode://file/C:/Users/me/app?windowId=_blank')
  })

  it('drops the leading slash of a POSIX path, the link already has one', () => {
    expect.hasAssertions()
    expect(vscodeUrl('/home/me/app')).toBe('vscode://file/home/me/app?windowId=_blank')
  })
})
