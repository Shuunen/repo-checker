import type { Project } from '../../shared/project.ts'
import { githubUrl } from '../projects/detail.ts'
import { GithubLink } from './github-link.tsx'

/**
 * The owner, the link to GitHub and the last push of a project
 * @param props the props
 * @param props.project the project
 * @returns the line
 */
export function IdentityLine({ project }: Readonly<{ project: Project }>) {
  const url = githubUrl(project)
  return (
    <p className="flex gap-3 text-sm text-muted" data-testid="identity-line">
      {project.github && <span>{project.github.owner}</span>}
      {url && <GithubLink url={url} />}
      {project.github && <span>{`last push ${project.github.pushedAt.slice(0, 'yyyy-mm-dd'.length)}`}</span>}
    </p>
  )
}
