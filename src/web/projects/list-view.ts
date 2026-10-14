import type { ScanProject } from '../../shared/scan-event.ts'
import type { FilterId } from './filters.ts'
import { type Bucket, worstBucket } from './health.ts'

/** What the user picked to look at the list, on top of the sidebar filter */
export interface ListView {
  /** Only the projects of this health bucket, every project when undefined */
  bucket: Bucket | undefined
  /** True when the archived projects with nothing to report are listed, they are folded in one row otherwise */
  isArchivedShown: boolean
}

/** The view when the page opens: every project, the quiet archived ones folded */
export const initialListView: ListView = { bucket: undefined, isArchivedShown: false }

/**
 * Tell if an archived project has nothing to report, the kind of row that is folded
 * @param result the project result
 * @returns true when archived and without finding
 */
function isQuietArchived(result: Readonly<ScanProject>) {
  return result.project.github?.isArchived === true && result.findings.length === 0
}

/**
 * Tell if the quiet archived projects can be folded: not in the Archived filter nor in the "all good" bucket, where the user asks for them
 * @param filterId the selected sidebar filter
 * @param view the view
 * @returns true when they can be folded
 */
function isFoldable(filterId: FilterId, view: Readonly<ListView>) {
  return filterId !== 'archived' && view.bucket !== 'quiet'
}

/**
 * How many archived projects with nothing to report are folded or could be folded, zero when the filter asks for them
 * @param results the project results of the sidebar filter
 * @param filterId the selected sidebar filter
 * @param view the view
 * @returns the count
 * @example foldableCount(inFilter, 'overview', view) // 32
 */
export function foldableCount(results: readonly ScanProject[], filterId: FilterId, view: Readonly<ListView>) {
  return isFoldable(filterId, view) ? results.filter(result => isQuietArchived(result)).length : 0
}

/**
 * Keep the projects of a view: the ones of its bucket, without the folded archived ones
 * @param results the project results, already filtered by the sidebar
 * @param filterId the selected sidebar filter
 * @param view the view
 * @returns the projects to list
 * @example applyView(state.projects, 'overview', initialListView)
 */
export function applyView(results: readonly ScanProject[], filterId: FilterId, view: Readonly<ListView>) {
  const isFolding = isFoldable(filterId, view) && !view.isArchivedShown
  return results.filter(result => (view.bucket === undefined || worstBucket(result.findings) === view.bucket) && !(isFolding && isQuietArchived(result)))
}
