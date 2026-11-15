import { AlertDialog, Button } from '@heroui/react'
import { AboutBody } from './about-body.tsx'

/** What the dialog shows and does */
interface AboutDialogProps {
  /** True while the dialog is open */
  isOpen: boolean
  /** Close the dialog */
  onClose: () => void
}

/**
 * The About dialog: what the app is, its home on GitHub, and the unique mark of the build (version, commit and date), that the unique-mark plugin writes in the placeholder at build time
 * @param props the props
 * @returns the dialog
 */
export function AboutDialog({ isOpen, onClose }: Readonly<AboutDialogProps>) {
  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onClose}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading>About repo-checker</AlertDialog.Heading>
            </AlertDialog.Header>
            <AboutBody />
            <AlertDialog.Footer>
              <Button data-testid="about-close" onPress={onClose} variant="primary">
                Close
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}
