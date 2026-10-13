import { diffLines } from 'diff'

/** What happened to a line of a file between its text now and the text once fixed */
export type LineKind = 'added' | 'kept' | 'removed'

/** One line of a diff */
interface DiffLine {
  /** A key that is unique in the diff */
  id: string
  /** What happened to the line */
  kind: LineKind
  /** The text of the line, without its line break */
  text: string
}

/**
 * Tell what happened to the lines of a part of a diff
 * @param part the part
 * @param part.added true when the lines are new
 * @param part.removed true when the lines go
 * @returns the kind
 */
function kindOf({ added, removed }: Readonly<{ added?: boolean; removed?: boolean }>): LineKind {
  if (added === true) return 'added'
  return removed === true ? 'removed' : 'kept'
}

/**
 * Compare the text of a file now and once fixed, line by line
 * @param before the text now, empty when the file does not exist yet
 * @param after the text once fixed
 * @returns the lines in order, each added, removed or kept
 * @example diffLinesOf('a\nb\n', 'a\nc\n') // [{ kind: 'kept', text: 'a' }, { kind: 'removed', text: 'b' }, { kind: 'added', text: 'c' }] with ids
 */
export function diffLinesOf(before: string, after: string): DiffLine[] {
  return diffLines(before, after).flatMap((part, partIndex) => {
    const kind = kindOf(part)
    return part.value
      .replace(/\n$/u, '')
      .split('\n')
      .map((text, lineIndex) => ({ id: `${partIndex}:${lineIndex}`, kind, text }))
  })
}
