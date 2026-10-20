import Markdown from 'react-markdown'
import { baseComponents, listFor } from './markdown-components.tsx'

/**
 * What Claude says, rendered from markdown
 * @param props the props
 * @param props.onChoose called with the number of the clicked item of a numbered list, undefined when the message cannot be answered by a click
 * @param props.text what Claude says
 * @returns the message
 */
export function ClaudeText({ onChoose, text }: Readonly<{ onChoose: ((choice: string) => void) | undefined; text: string }>) {
  return (
    <div className="max-w-[95%] text-sm leading-relaxed">
      <Markdown components={{ ...baseComponents, ol: listFor(onChoose) }}>{text}</Markdown>
    </div>
  )
}
