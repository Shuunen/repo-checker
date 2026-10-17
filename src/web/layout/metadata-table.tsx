import type { MetadataValues } from '../../shared/action.ts'
import { Comparison } from './comparison.tsx'
import { metadataFields } from './metadata-fields.ts'

/**
 * Show a value in the table
 * @param value the value
 * @returns the value, `none` for an empty one
 */
function shown(value: string) {
  return value === '' ? 'none' : value
}

/**
 * The table of what the project says locally (the description of its package.json, the `webUrl` of its `.repo-checker.json`) and what GitHub has, a row per field
 * @param props the props
 * @param props.github the values on GitHub
 * @param props.local the values in the package.json
 * @returns the table
 */
export function MetadataTable({ github, local }: Readonly<{ github: MetadataValues; local: MetadataValues }>) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-muted">
        <tr>
          <th className="py-1 pr-3" />
          <th className="py-1 pr-3 font-medium">Local</th>
          <th className="py-1 font-medium">GitHub</th>
        </tr>
      </thead>
      <tbody>
        {metadataFields.map(({ key, label }) => (
          <tr className="border-t border-border align-top" key={key}>
            <th className="flex items-center gap-2 whitespace-nowrap py-1 pr-3 font-medium">
              {label}
              <Comparison isEqual={local[key] === github[key]} testId={`sync-github-metadata-compare-${key}`} />
            </th>
            <td className="py-1 pr-3 break-all" data-testid={`sync-github-metadata-local-${key}`}>
              {shown(local[key])}
            </td>
            <td className="py-1 break-all" data-testid={`sync-github-metadata-github-${key}`}>
              {shown(github[key])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
