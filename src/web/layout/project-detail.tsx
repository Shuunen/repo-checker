import type { ScanProject } from '../../shared/scan-event.ts'
import { factGroups } from '../projects/detail.ts'
import { ActionsCard } from './actions-card.tsx'
import { FactsCard } from './facts-card.tsx'
import { FindingsCard } from './findings-card.tsx'
import { FixFilesCard } from './fix-files-card.tsx'
import { ProjectIdentity } from './project-identity.tsx'

/**
 * Everything the scan knows about one project: who it is, then its findings next to a rail that holds the fixes, the local and fork state and the actions
 * @param props the props
 * @param props.result the project result
 * @param props.result.findings its findings
 * @param props.result.project the project
 * @param props.target the folder of projects
 * @returns the detail
 */
export function ProjectDetail({ result: { findings, project }, target }: Readonly<{ result: ScanProject; target: string }>) {
  return (
    <>
      <ProjectIdentity findings={findings} project={project} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <FindingsCard findings={findings} />
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:w-96 lg:shrink-0">
          <FixFilesCard findings={findings} project={project} />
          {factGroups(project).map(group => (
            <FactsCard facts={group.facts} key={group.title} title={group.title} />
          ))}
          <ActionsCard findings={findings} project={project} target={target} />
        </aside>
      </div>
    </>
  )
}
