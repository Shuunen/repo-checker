import type { ScanProject } from '../../shared/scan-event.ts'
import { factGroups } from '../projects/detail.ts'
import { ActionsCard } from './actions-card.tsx'
import { FactsCard } from './facts-card.tsx'
import { FindingsCard } from './findings-card.tsx'
import { FixFilesCard } from './fix-files-card.tsx'
import { ProjectIdentity } from './project-identity.tsx'

/** What `ProjectDetail` shows and does */
interface ProjectDetailProps {
  /** The project result */
  result: ScanProject
  /** The folder of projects */
  target: string
}

/**
 * Everything the scan knows about one project: who it is, then its findings next to a rail that holds the fixes, the local and fork state and the actions
 * @param props the props
 * @returns the detail
 */
export function ProjectDetail({ result: { findings, project }, target }: Readonly<ProjectDetailProps>) {
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
