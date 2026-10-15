import { diffLines } from 'diff'

/** What happened to a line of a file between its text now and the text once fixed, `skipped` stands for a run of unchanged lines that is not shown */
export type LineKind = 'added' | 'kept' | 'removed' | 'skipped'

/** One line of a diff */
interface DiffLine {
  /** A key that is unique in the diff */
  id: string
  /** What happened to the line */
  kind: LineKind
  /** The text of the line, without its line break, or how many lines are skipped */
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

/** How many unchanged lines are shown around a change */
const contextLines = 15

/**
 * The line that says how many unchanged lines are left out, nothing when none is
 * @param count how many lines are left out
 * @param id a key that is unique in the diff
 * @returns the line in a list, empty when nothing is left out
 */
function skip(count: number, id: string): DiffLine[] {
  return count > 0 ? [{ id: `skipped:${id}`, kind: 'skipped', text: `${count} unchanged lines` }] : []
}

/**
 * Keep the changed lines and the unchanged lines around them, a run of other unchanged lines becomes one line that says how many were left out
 * @param lines every line of the diff
 * @returns the lines to show
 */
function withContext(lines: readonly DiffLine[]): DiffLine[] {
  const changed = lines.flatMap((line, index) => (line.kind === 'kept' ? [] : [index]))
  const flags = lines.map((_line, index) => changed.some(position => Math.abs(position - index) <= contextLines))
  const shown = lines.flatMap((line, index) => {
    if (!flags[index]) return []
    const before = flags.slice(0, index)
    return [...skip(before.length - (before.lastIndexOf(true) + 1), String(index)), line]
  })
  return [...shown, ...skip(lines.length - (flags.lastIndexOf(true) + 1), 'end')]
}

/**
 * Compare the text of a file now and once fixed, line by line, showing only the changes with 15 unchanged lines around them
 * @param before the text now, empty when the file does not exist yet
 * @param after the text once fixed
 * @returns the lines in order, each added, removed or kept, and a `skipped` line where unchanged lines were left out
 * @example diffLinesOf('a\nb\n', 'a\nc\n') // [{ kind: 'kept', text: 'a' }, { kind: 'removed', text: 'b' }, { kind: 'added', text: 'c' }] with ids
 */
export function diffLinesOf(before: string, after: string): DiffLine[] {
  const lines = diffLines(before, after).flatMap((part, partIndex) => {
    const kind = kindOf(part)
    return part.value
      .replace(/\n$/u, '')
      .split('\n')
      .map((text, lineIndex) => ({ id: `${partIndex}:${lineIndex}`, kind, text }))
  })
  return withContext(lines)
}
