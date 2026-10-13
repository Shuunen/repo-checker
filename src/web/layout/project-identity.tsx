import type { Project } from '../../shared/project.ts'
import { IdentityBadges } from './identity-badges.tsx'
import { IdentityLine } from './identity-line.tsx'

/**
 * Who a project is: its name, badges, owner, GitHub link and last push
 * @param props the props
 * @param props.project the project
 * @returns the header
 */
export function ProjectIdentity({ project }: Readonly<{ project: Project }>) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">{project.name}</h1>
      <IdentityBadges project={project} />
      <IdentityLine project={project} />
    </header>
  )
}
