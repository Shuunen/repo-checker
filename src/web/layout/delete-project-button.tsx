import { Trash2 } from 'lucide-react'
import { Button } from '@heroui/react'
import { useLocation } from 'wouter'
import type { ProjectDeletePreview } from '../../shared/action.ts'
import type { Project } from '../../shared/project.ts'
import { slugOf } from '../projects/detail.ts'
import { ConfirmDialog } from './confirm-dialog.tsx'
import { IgnoredFiles } from './ignored-files.tsx'
import { PreviewBody } from './preview-body.tsx'
import { useActionDialog, useOpensAtOnce } from './use-action-dialog.ts'

/** What `DeleteProjectButton` shows and does */
interface DeleteProjectButtonProps {
  /** The project to delete */
  project: Project
}

/**
 * The Delete project action: the button opens a confirmation that says what is deleted for good, the repo on GitHub and the local clone, and the delete only runs when it is confirmed. Once it worked the page goes back to the list. The scan runs again after it worked
 * @param props the props
 * @returns the button and its dialog
 */
export function DeleteProjectButton({ project }: Readonly<DeleteProjectButtonProps>) {
  const [, navigate] = useLocation()
  const dialog = useActionDialog<ProjectDeletePreview>(project.name, 'delete-project', { onDone: () => navigate('/') })
  const isAtOnce = useOpensAtOnce(dialog.handleOpen)
  return (
    <>
      {!isAtOnce && (
        <Button aria-label={`Delete ${project.name}`} data-testid="action-delete-project" onPress={dialog.handleOpen} size="sm" variant="danger-soft">
          <Trash2 aria-hidden="true" size={16} />
          Delete project
        </Button>
      )}
      <ConfirmDialog confirmLabel="Delete the project" dialog={dialog} heading={`Delete ${slugOf(project)} for good?`} isDanger prefix="project">
        <PreviewBody checking="Reading what the repo and the clone hold…" dialog={dialog} prefix="project">
          {({ clone, repo }) => (
            <>
              {repo !== undefined && <p data-testid="project-repo">{`The repo ${repo} is deleted on GitHub for good, with its issues and pull requests. It cannot be undone.`}</p>}
              {clone !== undefined && <p data-testid="project-clone">{`The folder ${clone.path} is deleted for good.`}</p>}
              {clone !== undefined && clone.unsaved.length > 0 && <p data-testid="project-unsaved">{`It holds work that exists nowhere else: ${clone.unsaved.join(', ')}.`}</p>}
              {clone !== undefined && <IgnoredFiles files={clone.ignoredFiles} />}
            </>
          )}
        </PreviewBody>
      </ConfirmDialog>
    </>
  )
}
