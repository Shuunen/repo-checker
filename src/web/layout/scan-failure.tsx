import { Alert } from '@heroui/react'

/** What `ScanFailure` shows and does */
interface ScanFailureProps {
  /** The error message */
  message: string
}

/**
 * Say why the scan stopped, for example when gh is not logged in
 * @param props the props
 * @returns the alert
 */
export function ScanFailure({ message }: Readonly<ScanFailureProps>) {
  return (
    <Alert data-testid="scan-failure" status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>The scan failed</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  )
}
