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
