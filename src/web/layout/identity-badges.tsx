import { Chip } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import { identityBadges } from '../projects/detail.ts'

/**
 * The badges of a project: archived, fork, private, other owner
 * @param props the props
 * @param props.project the project
 * @returns the badges
 */
export function IdentityBadges({ project }: Readonly<{ project: Project }>) {
  return (
    <span className="flex gap-1" data-testid="badges">
      {identityBadges(project).map(badge => (
        <Chip color={badge.color} key={badge.label} size="sm">
          {badge.label}
        </Chip>
      ))}
    </span>
  )
}
