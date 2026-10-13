import { Alert } from '@heroui/react'

/**
 * Say why the scan stopped, for example when gh is not logged in
 * @param props the props
 * @param props.message the error message
 * @returns the alert
 */
export function ScanFailure({ message }: Readonly<{ message: string }>) {
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
