import { Route, Switch } from 'wouter'
import type { FilterId } from '../projects/filters.ts'
import type { ListView } from '../projects/list-view.ts'
import type { ScanState } from '../scan/scan-state.ts'
import { Page } from './page.tsx'
import { ProjectPage } from './project-page.tsx'

/** What the routes show */
interface RoutesProps {
  /** The request error, when the scan could not start */
  error: Error | null
  /** The selected filter of the list */
  filterId: FilterId
  /** True while the scan streams */
  isScanning: boolean
  /** Changes the view of the list */
  onView: (view: ListView) => void
  /** The scan state */
  state: ScanState
  /** The view of the list */
  view: ListView
}

/**
 * The two pages: the project of `/project/:name`, and the list everywhere else
 * @param props the props
 * @returns the page of the current address
 */
export function Routes({ error, filterId, isScanning, onView, state, view }: Readonly<RoutesProps>) {
  return (
    <Switch>
      <Route path="/project/:name">{params => <ProjectPage error={error} isScanning={isScanning} name={params.name} state={state} />}</Route>
      <Route>
        <Page error={error} filterId={filterId} isScanning={isScanning} onView={onView} state={state} view={view} />
      </Route>
    </Switch>
  )
}
