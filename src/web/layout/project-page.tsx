import type { ScanState } from '../scan/scan-state.ts'
import { BackLink } from './back-link.tsx'
import { ProjectBody } from './project-body.tsx'

/**
 * The page of one project, with a link back to the list
 * @param props the props
 * @param props.error the request error, when the scan could not start
 * @param props.isScanning true while the scan streams
 * @param props.name the project name from the address
 * @param props.state the scan state
 * @returns the main element
 */
export function ProjectPage({ error, isScanning, name, state }: Readonly<{ error: Error | null; isScanning: boolean; name: string; state: ScanState }>) {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 p-8">
      <BackLink />
      <ProjectBody error={error} isScanning={isScanning} name={name} state={state} />
    </main>
  )
}
