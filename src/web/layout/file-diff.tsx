import { diffLinesOf, type LineKind } from '../projects/diff-lines.ts'

/** The look and the sign of a line of a diff, by what happened to it */
const looks: Readonly<Record<LineKind, { classes: string; sign: string }>> = {
  added: { classes: 'bg-success/15 text-success', sign: '+' },
  kept: { classes: 'text-muted', sign: ' ' },
  removed: { classes: 'bg-danger/15 text-danger', sign: '-' },
  skipped: { classes: 'py-1 text-center italic text-muted', sign: '…' },
}

/** What `FileDiff` shows and does */
interface FileDiffProps {
  /** The text once fixed */
  after: string
  /** The text now, empty when the file does not exist yet */
  before: string
  /** The file path */
  file: string
}

/**
 * The change of one file as a diff: the lines that go are red with a minus, the lines that come are green with a plus, the others are dimmed. Only the changes are shown with 15 lines around them, the rest is one line that counts what was left out. A file that does not exist yet is all green
 * @param props the props
 * @returns the diff
 */
export function FileDiff({ after, before, file }: Readonly<FileDiffProps>) {
  return (
    <section data-testid={`diff-${file}`}>
      <h3 className="font-medium">{before === '' ? `${file} (new file)` : file}</h3>
      <pre className="overflow-x-auto rounded-md bg-default/30 p-2 text-xs">
        {diffLinesOf(before, after).map(line => (
          <div className={looks[line.kind].classes} key={line.id}>
            {line.kind === 'skipped' ? `${looks.skipped.sign} ${line.text} ${looks.skipped.sign}` : `${looks[line.kind].sign} ${line.text}`}
          </div>
        ))}
      </pre>
    </section>
  )
}
