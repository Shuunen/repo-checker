import { parseLine } from './claude-events.ts'

const assistant = (...content: object[]) => JSON.stringify({ message: { content }, type: 'assistant' })

describe(parseLine, () => {
  it('shows what Claude says', () => {
    expect.hasAssertions()
    expect(parseLine(assistant({ text: 'Starting Phase 0', type: 'text' }))).toStrictEqual([{ text: 'Starting Phase 0', type: 'text' }])
  })

  it('shows the tools, with what they are run on, cut when long', () => {
    expect.hasAssertions()
    const long = 'x'.repeat(300)
    expect(
      parseLine(
        assistant(
          { input: { command: 'git status' }, name: 'Bash', type: 'tool_use' },
          { input: { file_path: 'package.json' }, name: 'Read', type: 'tool_use' },
          { input: { command: long }, name: 'Bash', type: 'tool_use' },
          { input: { timeout: 5 }, name: 'Bash', type: 'tool_use' },
          { type: 'tool_use' },
        ),
      ),
    ).toStrictEqual([
      { detail: 'git status', name: 'Bash', type: 'tool' },
      { detail: 'package.json', name: 'Read', type: 'tool' },
      { detail: 'x'.repeat(120), name: 'Bash', type: 'tool' },
      { detail: '', name: 'Bash', type: 'tool' },
      { detail: '', name: 'tool', type: 'tool' },
    ])
  })

  it('leaves out the thinking, an empty text and a message without content', () => {
    expect.hasAssertions()
    expect(parseLine(assistant({ thinking: 'hm', type: 'thinking' }, { text: '  ', type: 'text' }))).toStrictEqual([])
    expect(parseLine('{"type":"assistant"}')).toStrictEqual([])
  })

  it('tells when a turn is over, and whether it failed', () => {
    expect.hasAssertions()
    expect(parseLine('{"is_error":false,"type":"result"}')).toStrictEqual([{ isError: false, type: 'done' }])
    expect(parseLine('{"is_error":true,"type":"result"}')).toStrictEqual([{ isError: true, type: 'done' }])
    expect(parseLine('{"type":"result"}')).toStrictEqual([{ isError: false, type: 'done' }])
  })

  it('leaves out every other line, and a line that is not json', () => {
    expect.hasAssertions()
    expect(parseLine('{"subtype":"hook_started","type":"system"}')).toStrictEqual([])
    expect(parseLine('not json')).toStrictEqual([])
  })
})
