import { fireEvent, render, screen } from '@testing-library/react'
import { aProject } from '../test/fixtures.ts'
import { OpenVscodeButton } from './open-vscode-button.tsx'

describe('the open in VS Code button', () => {
  it('opens the clone in VS Code', () => {
    expect.hasAssertions()
    const location = { href: '' }
    vi.stubGlobal('location', location)
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    render(<OpenVscodeButton project={aProject('finga').project} />)
    fireEvent.click(screen.getByTestId('action-open-vscode'))
    expect(location.href).toBe('vscode://file/projects/finga?windowId=_blank')
  })

  it('is not there without a clone', () => {
    expect.hasAssertions()
    render(<OpenVscodeButton project={aProject('finga', [], { local: undefined }).project} />)
    expect(screen.queryByTestId('action-open-vscode')).toBeNull()
  })
})
