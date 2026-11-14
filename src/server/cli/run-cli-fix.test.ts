import { cli, makeEmptyFolder } from '../test/cli-fixtures.ts'
import { fixProjects } from './fix-projects.ts'

vi.mock(import('./fix-projects.ts'), () => ({ fixProjects: vi.fn<typeof fixProjects>(() => Promise.resolve(['app: fixed 1 file (a.txt), no fix left, check git diff'])) }))

describe('cli --fix', () => {
  it('fixes, scans again and reports what was fixed above the findings', async () => {
    expect.hasAssertions()
    const folder = await makeEmptyFolder()
    const { code, output, progress } = await cli(['--fix'], { cwd: folder })
    expect(code).toBe(0)
    expect(output).toContain('🔧 fixed (1)\n  app: fixed 1 file (a.txt), no fix left, check git diff')
    expect(vi.mocked(fixProjects)).toHaveBeenCalledOnce()
    expect(progress.filter(line => line.startsWith('reading the local clones'))).toHaveLength(2)
  })
})
