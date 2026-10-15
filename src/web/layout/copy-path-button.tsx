import { Button } from '@heroui/react'
import { useState } from 'react'

/** How long the button says Copied, in milliseconds */
const copiedDuration = 2000

/**
 * Copy the scanned folder path to the clipboard, the label says Copied for a moment
 * @param props the props
 * @param props.path the path to copy
 * @returns the button
 */
export function CopyPathButton({ path }: Readonly<{ path: string }>) {
  const [isCopied, setIsCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(path)
    setIsCopied(true)
    setTimeout(() => {
      setIsCopied(false)
    }, copiedDuration)
  }
  return (
    <Button data-testid="copy-path" isDisabled={path === ''} onPress={copy} variant="outline">
      {isCopied ? 'Copied' : 'Copy path'}
    </Button>
  )
}
