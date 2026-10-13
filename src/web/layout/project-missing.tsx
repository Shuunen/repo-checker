/**
 * Say the project is not in the scan, or not yet while the scan runs
 * @param props the props
 * @param props.isScanning true while the scan streams
 * @param props.name the project name asked for
 * @returns the message
 */
export function ProjectMissing({ isScanning, name }: Readonly<{ isScanning: boolean; name: string }>) {
  return <p data-testid="project-missing">{isScanning ? `Looking for ${name}…` : `No project named ${name} in this scan`}</p>
}
