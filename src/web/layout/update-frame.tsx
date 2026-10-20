import { Modal } from '@heroui/react'
import type { ReactNode } from 'react'

/** What the frame of the update modal shows */
interface UpdateFrameProps {
  /** What the body shows: the conversation and the box of the message */
  body: ReactNode
  /** What the footer holds */
  footer: ReactNode
  /** The heading */
  heading: string
  /** True when the modal is shown */
  isOpen: boolean
}

/**
 * The frame of the update modal, that only its own buttons close: a click beside it or Escape never ends the session by accident
 * @param props the props
 * @returns the modal
 */
export function UpdateFrame({ body, footer, heading, isOpen }: Readonly<UpdateFrameProps>) {
  return (
    <Modal isOpen={isOpen}>
      <Modal.Backdrop isDismissable={false} isKeyboardDismissDisabled>
        <Modal.Container scroll="inside" size="lg">
          <Modal.Dialog className="max-w-3xl">
            <Modal.Header>
              <Modal.Heading>{heading}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3" data-testid="update-dialog-body">
              {body}
            </Modal.Body>
            <Modal.Footer>{footer}</Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
