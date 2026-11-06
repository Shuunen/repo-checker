import { Chip } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { describePush, githubUrl, identityBadges } from '../projects/detail.ts'
import { FindingCounts } from './finding-counts.tsx'

/** What `ProjectIdentity` shows and does */
interface ProjectIdentityProps {
  /** The findings of the project */
  findings: readonly ScanFinding[]
  /** The project */
  project: Project
}

/**
 * Who a project is: its name and badges, the owner, the GitHub link and the last push, and how many findings of each severity it has
 * @param props the props
 * @returns the header
 */
export function ProjectIdentity({ findings, project }: Readonly<ProjectIdentityProps>) {
  const url = githubUrl(project)
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{project.name}</h1>
          <span className="flex gap-1" data-testid="badges">
            {identityBadges(project).map(badge => (
              <Chip color={badge.color} key={badge.label} size="sm">
                {badge.label}
              </Chip>
            ))}
          </span>
        </div>
        <p className="flex gap-3 text-sm text-muted" data-testid="identity-line">
          {project.github && <span>{project.github.owner}</span>}
          {url && (
            <a className="text-accent" href={url} rel="noreferrer" target="_blank">
              GitHub ↗
            </a>
          )}
          {project.github && <span>{describePush(project.github.pushedAt)}</span>}
        </p>
        <FindingCounts findings={findings} />
      </div>
    </header>
  )
}
