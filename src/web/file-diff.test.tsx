import { render, screen } from '@testing-library/react'
import { FileDiff } from './layout/file-diff.tsx'

describe(FileDiff, () => {
  it('shows only the change with its context, and says how many lines are left out', () => {
    expect.hasAssertions()
    const lines = Array.from({ length: 100 }, (_item, index) => `line ${index + 1}`)
    render(<FileDiff after={lines.with(49, 'edited').join('\n')} before={lines.join('\n')} file="big.txt" />)
    const diff = screen.getByTestId('diff-big.txt')
    expect(diff.textContent).toContain('… 34 unchanged lines …')
    expect(diff.textContent).toContain('+ edited')
    expect(diff.textContent).toContain('… 35 unchanged lines …')
    expect(diff.textContent).not.toContain('line 1 ')
    expect(diff.textContent).not.toContain('line 100')
  })
})
