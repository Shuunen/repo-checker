import { Route, Switch } from 'wouter'
import type { FilterId } from '../projects/filters.ts'
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
  /** Starts a new scan */
  onRescan: () => void
  /** The scan state */
  state: ScanState
}

/**
 * The two pages: the project of `/project/:name`, and the list everywhere else
 * @param props the props
 * @param props.error the request error
 * @param props.filterId the selected filter of the list
 * @param props.isScanning true while the scan streams
 * @param props.onRescan starts a new scan
 * @param props.state the scan state
 * @returns the page of the current address
 */
export function Routes({ error, filterId, isScanning, onRescan, state }: Readonly<RoutesProps>) {
  return (
    <Switch>
      <Route path="/project/:name">{params => <ProjectPage error={error} isScanning={isScanning} name={params.name} state={state} />}</Route>
      <Route>
        <Page error={error} filterId={filterId} isScanning={isScanning} onRescan={onRescan} state={state} />
      </Route>
    </Switch>
  )
}
