import Markdown from 'react-markdown'
import { baseComponents, listFor } from './markdown-components.tsx'

/** What `ClaudeText` shows and does */
interface ClaudeTextProps {
  /** Called with the number of the clicked item of a numbered list, undefined when the message cannot be answered by a click */
  onChoose: ((choice: string) => void) | undefined
  text: string
}

/**
 * What Claude says, rendered from markdown
 * @param props the props
 * @returns the message
 */
export function ClaudeText({ onChoose, text }: Readonly<ClaudeTextProps>) {
  return (
    <div className="max-w-[95%] text-sm leading-relaxed">
      <Markdown components={{ ...baseComponents, ol: listFor(onChoose) }}>{text}</Markdown>
    </div>
  )
}
