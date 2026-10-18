import { Button, toast } from '@heroui/react'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

/** How long the icon shows the check, in milliseconds */
const copiedDuration = 2000

/**
 * A small icon button that copies a path to the clipboard, the icon turns into a check for a moment and a toast says it was copied
 * @param props the props
 * @param props.path the path to copy, the icon is disabled when it is empty
 * @param props.testId the test id of the button
 * @returns the button
 */
export function CopyPathIcon({ path, testId = 'copy-path-icon' }: Readonly<{ path: string; testId?: string }>) {
  const [isCopied, setIsCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(path)
    setIsCopied(true)
    toast.success('Path copied')
    setTimeout(() => {
      setIsCopied(false)
    }, copiedDuration)
  }
  return (
    <Button aria-label={isCopied ? 'Copied' : 'Copy path'} data-testid={testId} isDisabled={path === ''} isIconOnly className="text-muted" onPress={copy} size="sm" variant="ghost">
      {isCopied ? <Check size={14} /> : <Copy size={14} />}
    </Button>
  )
}
