import type { ReactNode } from 'react'
import type { ActionDialog, AnyPreview } from './use-action-dialog.ts'

/**
 * What the body of a previewed action shows
 * @template Preview the shape of the preview
 */
interface PreviewBodyProps<Preview extends AnyPreview> {
  /** What the body says while the server proves again that the action is right */
  checking: string
  /** What the action would do, from the preview that offers it */
  children: (preview: Extract<Preview, { ok: true }>) => ReactNode
  /** The class of the block that holds what the action would do */
  className?: string
  /** What the server said */
  dialog: Pick<ActionDialog<Preview>, 'error' | 'isLoading' | 'preview' | 'previewError'>
  /** The test ids start with it: `delete` gives `delete-checking`, `delete-refused`, `delete-preview` and `delete-error` */
  prefix: string
}

/**
 * The body of a confirmation that shows what the action would do first: the proof is being redone, the action is refused with its reason, or what it would do, with why it failed once confirmed
 * @template Preview the shape of the preview
 * @param props the props
 * @param props.checking what the body says while the proof is redone
 * @param props.children what the action would do, from the preview that offers it
 * @param props.className the class of the block that holds what the action would do
 * @param props.dialog what the server said
 * @param props.prefix the start of the test ids
 * @returns the body
 */
export function PreviewBody<Preview extends AnyPreview>({ checking, children, className, dialog, prefix }: Readonly<PreviewBodyProps<Preview>>) {
  const { error, isLoading, preview, previewError } = dialog
  if (isLoading) return <p data-testid={`${prefix}-checking`}>{checking}</p>
  if (previewError !== undefined) return <p data-testid={`${prefix}-refused`}>{previewError}</p>
  if (preview === undefined || !preview.ok) return <p data-testid={`${prefix}-refused`}>{preview?.reason}</p>
  return (
    <div className={className} data-testid={`${prefix}-preview`}>
      {children(preview as Extract<Preview, { ok: true }>)}
      {error !== undefined && <p data-testid={`${prefix}-error`}>{error}</p>}
    </div>
  )
}
