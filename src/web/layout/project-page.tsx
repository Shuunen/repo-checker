import { Link } from 'wouter'
import type { ScanState } from '../scan/scan-state.ts'
import { ProjectDetail } from './project-detail.tsx'
import { ScanFailure } from './scan-failure.tsx'

/** What the project page needs */
interface ProjectPageProps {
  /** The request error, when the scan could not start */
  error: Error | null
  /** True while the scan streams */
  isScanning: boolean
  /** The project name from the address */
  name: string
  /** The scan state */
  state: ScanState
}

/**
 * The page of one project, with a link back to the list. Under it the project, or why it is not there: the scan failed, it is still looking, or the scan has no such project
 * @param props the props
 * @param props.error the request error, when the scan could not start
 * @param props.isScanning true while the scan streams
 * @param props.name the project name from the address
 * @param props.state the scan state
 * @returns the main element
 */
export function ProjectPage({ error, isScanning, name, state }: Readonly<ProjectPageProps>) {
  const failure = state.failure ?? error?.message
  const result = state.projects.find(item => item.project.name === name)
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-8">
      <Link className="text-sm text-accent" data-testid="back" href="/">
        ← Projects
      </Link>
      {failure !== undefined && <ScanFailure message={failure} />}
      {failure === undefined && result === undefined && <p data-testid="project-missing">{isScanning ? `Looking for ${name}…` : `No project named ${name} in this scan`}</p>}
      {failure === undefined && result !== undefined && <ProjectDetail result={result} target={state.target} />}
    </main>
  )
}
