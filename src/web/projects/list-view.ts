import type { ScanProject } from '../../shared/scan-event.ts'
import { type Bucket, worstBucket } from './health.ts'

/** What the user picked to look at the list, on top of the sidebar filter */
export interface ListView {
  /** Only the projects of this health bucket, every project when undefined */
  bucket: Bucket | undefined
}

/** The view when the page opens: every project */
export const initialListView: ListView = { bucket: undefined }

/**
 * Keep the projects of a view
 * @param results the project results, already filtered by the sidebar
 * @param view the view
 * @returns the projects to list
 * @example applyView(state.projects, { bucket: 'error' })
 */
export function applyView(results: readonly ScanProject[], view: Readonly<ListView>) {
  return results.filter(({ findings }) => view.bucket === undefined || worstBucket(findings) === view.bucket)
}
