import type { Project } from '../../../shared/project.ts'
import { settingFixes } from '../../../shared/repo-settings.ts'
import { slugOf } from '../../project/detail.ts'
import { ActionTrigger } from '../action-trigger.tsx'
import { ConfirmDialog } from '../confirm-dialog.tsx'
import { useActionDialog } from '../use-action-dialog.ts'

/** What `FixGithubSettingsButton` shows and does */
interface FixGithubSettingsButtonProps {
  /** The project whose repo settings are set */
  project: Project
}

/** The settings of a repo that is not known, nothing is listed for it */
const noRepo = { isPrivate: false, settings: undefined } as const

/**
 * The Fix the GitHub settings action: the button opens a confirmation that lists the settings that will be set, the action only runs when it is confirmed. The scan runs again after it worked
 * @param props the props
 * @returns the button and its dialog
 */
export function FixGithubSettingsButton({ project }: Readonly<FixGithubSettingsButtonProps>) {
  const dialog = useActionDialog(project.name, 'fix-github-settings')
  const slug = slugOf(project)
  const fixes = settingFixes(project.github ?? noRepo)
  return (
    <>
      <ActionTrigger onPress={dialog.handleOpen} testId="action-fix-github-settings">
        Fix the GitHub settings
      </ActionTrigger>
      <ConfirmDialog confirmLabel="Set them" dialog={dialog} heading={`Fix the GitHub settings of ${slug}?`} prefix="fix-github-settings">
        <p>These settings will be changed on GitHub, they can be changed back in the settings of the repo:</p>
        <ul className="list-disc pl-5" data-testid="fix-github-settings-list">
          {fixes.map(fix => (
            <li key={fix.id}>{fix.label}</li>
          ))}
        </ul>
        {dialog.error !== undefined && <p data-testid="fix-github-settings-error">{dialog.error}</p>}
      </ConfirmDialog>
    </>
  )
}
