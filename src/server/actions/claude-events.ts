import type { ChatEvent } from '../../shared/claude.ts'

/** The longest detail shown for a tool, a command can hold a whole script */
const detailLength = 120

/** One block of the content of a message of Claude */
interface Block {
  input?: Record<string, unknown>
  name?: string
  text?: string
  type: string
}

/** One line of `claude --output-format stream-json`, the fields the chat reads */
interface Line {
  is_error?: boolean
  message?: { content?: Block[] }
  type: string
}

/**
 * Say what a tool is run on: its command, its file, its pattern or its url
 * @param input the input of the tool
 * @returns a short text, empty when the input says nothing readable
 */
function detailOf(input: Readonly<Record<string, unknown>> = {}) {
  const value = input.command ?? input.file_path ?? input.path ?? input.pattern ?? input.url ?? input.description
  return typeof value === 'string' ? value.slice(0, detailLength) : ''
}

/**
 * Turn one content block of Claude into what the chat shows
 * @param block the block
 * @returns the events, none for a block the chat does not show, like the thinking
 */
function fromBlock(block: Readonly<Block>): ChatEvent[] {
  if (block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') return [{ text: block.text, type: 'text' }]
  if (block.type === 'tool_use') return [{ detail: detailOf(block.input), name: block.name ?? 'tool', type: 'tool' }]
  return []
}

/**
 * Turn one line of the output of Claude into what the chat shows: its text and its tools, and the end of its turn. Anything else, like the hooks, the status or the thinking, is left out, and so is a line that is not json
 * @param text the line
 * @returns the events, none for a line the chat does not show
 * @example parseLine('{"type":"result","is_error":false}') // [{ isError: false, type: 'done' }]
 */
export function parseLine(text: string): ChatEvent[] {
  try {
    const line = JSON.parse(text) as Line
    if (line.type === 'result') return [{ isError: line.is_error === true, type: 'done' }]
    return line.type === 'assistant' ? (line.message?.content ?? []).flatMap(block => fromBlock(block)) : []
  } catch {
    return []
  }
}
