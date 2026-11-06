import { Button } from '@heroui/react'
import type { Project } from '../../shared/project.ts'
import { vscodeUrl } from './vscode-url.ts'

/** What `OpenVscodeButton` shows and does */
interface OpenVscodeButtonProps {
  /** The project, it needs a local clone */
  project: Project
}

/**
 * The Open in VS Code action: it opens the clone in VS Code through the `vscode://` link, nothing to confirm since nothing changes
 * @param props the props
 * @returns the button, nothing when the project has no clone
 */
export function OpenVscodeButton({ project }: Readonly<OpenVscodeButtonProps>) {
  if (project.local === undefined) return undefined
  const { path } = project.local
  return (
    <Button
      data-testid="action-open-vscode"
      onPress={() => {
        globalThis.location.href = vscodeUrl(path)
      }}
      size="sm"
      variant="outline"
    >
      Open in VS Code
    </Button>
  )
}
