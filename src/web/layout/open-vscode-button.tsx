import { Button } from '@heroui/react'
import type { Project } from '../../shared/project.ts'

/** What `OpenVscodeButton` shows and does */
interface OpenVscodeButtonProps {
  /** The project, it needs a local clone */
  project: Project
}

/**
 * The `vscode://` link that opens a folder in a new VS Code window (`windowId=_blank`), instead of reusing the last active one
 * @param path the absolute path of the folder
 * @returns the link
 * @example vscodeUrl('C:\\code\\app') // 'vscode://file/C:/code/app?windowId=_blank'
 */
export function vscodeUrl(path: string) {
  const slashed = path.replaceAll('\\', '/')
  return `vscode://file/${slashed.startsWith('/') ? slashed.slice(1) : slashed}?windowId=_blank`
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
        window.location.href = vscodeUrl(path)
      }}
      size="sm"
      variant="outline"
    >
      Open in VS Code
    </Button>
  )
}
