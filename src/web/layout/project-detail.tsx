import type { ScanProject } from '../../shared/scan-event.ts'
import { factGroups } from '../projects/detail.ts'
import { ActionsCard } from './actions-card.tsx'
import { FactsCard } from './facts-card.tsx'
import { FindingsCard } from './findings-card.tsx'
import { ProjectIdentity } from './project-identity.tsx'

/**
 * Everything the scan knows about one project: who it is, what it found, its local and fork state, the actions it offers
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
      <ProjectIdentity project={project} />
      <FindingsCard findings={findings} />
      {factGroups(project).map(group => (
        <FactsCard facts={group.facts} key={group.title} title={group.title} />
      ))}
      <ActionsCard findings={findings} project={project} target={target} />
    </>
  )
}
