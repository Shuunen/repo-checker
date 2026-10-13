import { Chip } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import { githubUrl, identityBadges } from '../projects/detail.ts'

/**
 * Who a project is: its name, badges, owner, GitHub link and last push
 * @param props the props
 * @param props.project the project
 * @returns the header
 */
export function ProjectIdentity({ project }: Readonly<{ project: Project }>) {
  const url = githubUrl(project)
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">{project.name}</h1>
      <span className="flex gap-1" data-testid="badges">
        {identityBadges(project).map(badge => (
          <Chip color={badge.color} key={badge.label} size="sm">
            {badge.label}
          </Chip>
        ))}
      </span>
      <p className="flex gap-3 text-sm text-muted" data-testid="identity-line">
        {project.github && <span>{project.github.owner}</span>}
        {url && (
          <a className="text-accent" href={url} rel="noreferrer" target="_blank">
            GitHub
          </a>
        )}
        {project.github && <span>{`last push ${project.github.pushedAt.slice(0, 'yyyy-mm-dd'.length)}`}</span>}
      </p>
    </header>
  )
}
