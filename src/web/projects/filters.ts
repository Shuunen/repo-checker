import type { ScanFinding, ScanProject } from '../../shared/scan-event.ts'

/** One filter tab */
interface ProjectFilter {
  /** The key */
  id: string
  /** The label, also the page title */
  label: string
  /** Tell if a project belongs to it */
  matches: (result: Readonly<ScanProject>) => boolean
}

/** The filter tabs, in order */
export const filters = [
  { id: 'overview', label: 'Overview', matches: () => true },
  { id: 'attention', label: 'Needs attention', matches: ({ findings }) => findings.some(finding => finding.severity !== 'info') },
  { id: 'not-cloned', label: 'Not cloned', matches: ({ findings }) => findings.some(finding => finding.ruleId === 'not-cloned') },
  { id: 'forks', label: 'Forks', matches: ({ project }) => project.github?.isFork === true },
  { id: 'archived', label: 'Archived', matches: ({ project }) => project.github?.isArchived === true },
] as const satisfies readonly ProjectFilter[]

/** The key of a filter tab */
export type FilterId = (typeof filters)[number]['id']

/**
 * Find a filter tab
 * @param id the key
 * @returns the entry, the overview for an unknown key
 */
export function filterById(id: FilterId) {
  return filters.find(filter => filter.id === id) ?? filters[0]
}

/** One summary tile */
interface Tile {
  /** The key, for tests */
  id: string
  /** True when a non-zero value should stand out in red */
  isAlarming: boolean
  /** The label */
  label: string
  /** How many projects */
  value: number
}

/**
 * Count the projects that have a finding matching a predicate
 * @param results the project results
 * @param predicate tells if a finding counts
 * @returns how many projects have one
 */
function countWith(results: readonly ScanProject[], predicate: (finding: Readonly<ScanFinding>) => boolean) {
  return results.filter(({ findings }) => findings.some(finding => predicate(finding))).length
}

/**
 * The summary tiles above the table: at risk is work that could be lost (a Sync error), file errors are about the project files
 * @param results the project results
 * @returns the tiles, in order
 * @example const [atRisk] = summaryTiles(state.projects)
 */
export function summaryTiles(results: readonly ScanProject[]): Tile[] {
  return [
    { id: 'at-risk', isAlarming: true, label: 'At risk', value: countWith(results, finding => finding.scope === 'project' && finding.severity === 'error') },
    { id: 'errors', isAlarming: false, label: 'With file errors', value: countWith(results, finding => finding.scope === 'file' && finding.severity === 'error') },
    { id: 'not-cloned', isAlarming: false, label: 'Not cloned', value: countWith(results, finding => finding.ruleId === 'not-cloned') },
    { id: 'pristine-forks', isAlarming: false, label: 'Pristine forks', value: countWith(results, finding => finding.actions.includes('delete-fork')) },
  ]
}
