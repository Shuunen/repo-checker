import { projectNumber, readVitePorts } from './vite-ports.ts'

describe(readVitePorts, () => {
  it('reads both ports', () => {
    expect.hasAssertions()
    expect(readVitePorts('server: { port: 5105, strictPort: true },\npreview: {\n  port: 4105,\n}')).toStrictEqual({ preview: 4105, server: 5105 })
  })

  it('leaves out a section without port', () => {
    expect.hasAssertions()
    expect(readVitePorts('server: { open: true }')).toStrictEqual({ preview: undefined, server: undefined })
  })
})

describe(projectNumber, () => {
  it('keeps the project number', () => {
    expect.hasAssertions()
    expect(projectNumber(5105)).toBe(5)
  })
})
