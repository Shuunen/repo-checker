import { plural } from '../../shared/text.ts'

/** How many ignored files are listed before the rest is counted */
const maxListed = 20

/**
 * Say how many ignored files would be lost
 * @param count how many ignored files the clone holds
 * @returns the sentence
 */
function lostText(count: number) {
  if (count === 0) return 'No ignored file would be lost.'
  return `${plural(count, 'ignored file')} would be lost${count > maxListed ? `, the first ${maxListed} are listed` : ''}.`
}

/** What `IgnoredFiles` shows and does */
interface IgnoredFilesProps {
  /** The ignored files */
  files: readonly string[]
}

/**
 * The files git ignores that a delete of a clone would lose (a `.env`, a local database), the first ones listed and all of them counted
 * @param props the props
 * @returns the list and the sentence
 */
export function IgnoredFiles({ files }: Readonly<IgnoredFilesProps>) {
  return (
    <>
      <ul>
        {files.slice(0, maxListed).map(file => (
          <li key={file}>{file}</li>
        ))}
      </ul>
      <p>{lostText(files.length)}</p>
    </>
  )
}
