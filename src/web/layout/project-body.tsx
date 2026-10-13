import type { ScanState } from '../scan/scan-state.ts'
import { ProjectDetail } from './project-detail.tsx'
import { ProjectMissing } from './project-missing.tsx'
import { ScanFailure } from './scan-failure.tsx'

/** What the project page needs */
interface ProjectBodyProps {
  /** The request error, when the scan could not start */
  error: Error | null
  /** True while the scan streams */
  isScanning: boolean
  /** The project name asked for */
  name: string
  /** The scan state */
  state: ScanState
}

/**
 * The project, or why it is not there: the scan failed, it is still looking, or the scan has no such project
 * @param props the props
 * @param props.error the request error
 * @param props.isScanning true while the scan streams
 * @param props.name the project name asked for
 * @param props.state the scan state
 * @returns the detail or the reason
 */
export function ProjectBody({ error, isScanning, name, state }: Readonly<ProjectBodyProps>) {
  const failure = state.failure ?? error?.message
  const result = state.projects.find(item => item.project.name === name)
  if (failure !== undefined) return <ScanFailure message={failure} />
  if (result === undefined) return <ProjectMissing isScanning={isScanning} name={name} />
  return <ProjectDetail result={result} />
}
