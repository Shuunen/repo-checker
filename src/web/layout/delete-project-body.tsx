import type { ProjectDeletePreview } from '../../shared/action.ts'
import { IgnoredFiles } from './ignored-files.tsx'

/** What the body of the project delete confirmation shows */
export interface DeleteProjectBodyProps {
  /** Why the delete failed after it was confirmed, undefined before */
  error: string | undefined
  /** True while the server reads what the project holds */
  isLoading: boolean
  /** What the server found, undefined before the answer */
  preview: ProjectDeletePreview | undefined
  /** Why the server could not be asked, undefined when it answered */
  previewError: string | undefined
}

/**
 * What the delete would do: the server is reading, the delete is refused with its reason, or the repo on GitHub and the clone that are deleted for good, with the unsaved work and the ignored files that exist nowhere else
 * @param props the props
 * @param props.error why the delete failed after it was confirmed
 * @param props.isLoading true while the server reads
 * @param props.preview what the server found
 * @param props.previewError why the server could not be asked
 * @returns the body
 */
export function DeleteProjectBody({ error, isLoading, preview, previewError }: Readonly<DeleteProjectBodyProps>) {
  if (isLoading) return <p data-testid="project-checking">Reading what the repo and the clone hold…</p>
  if (previewError !== undefined) return <p data-testid="project-refused">{previewError}</p>
  if (preview?.ok !== true) return <p data-testid="project-refused">{preview?.reason}</p>
  const { clone, repo } = preview
  return (
    <div data-testid="project-preview">
      {repo !== undefined && <p data-testid="project-repo">{`The repo ${repo} is deleted on GitHub for good, with its issues and pull requests. It cannot be undone.`}</p>}
      {clone !== undefined && <p data-testid="project-clone">{`The folder ${clone.path} is deleted for good.`}</p>}
      {clone !== undefined && clone.unsaved.length > 0 && <p data-testid="project-unsaved">{`It holds work that exists nowhere else: ${clone.unsaved.join(', ')}.`}</p>}
      {clone !== undefined && <IgnoredFiles files={clone.ignoredFiles} />}
      {error !== undefined && <p data-testid="project-error">{error}</p>}
    </div>
  )
}
