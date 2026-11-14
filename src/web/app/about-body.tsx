import { AlertDialog } from '@heroui/react'

/**
 * What the About dialog says: the app, its home on GitHub, and the placeholder the unique-mark plugin fills with the build mark (version, commit and date)
 * @returns the body
 */
export function AboutBody() {
  return (
    <AlertDialog.Body className="flex flex-col gap-3" data-testid="about-body">
      <p>Checks the projects of a folder against GitHub and the good practices, and fixes what it can.</p>
      <a className="underline" href="https://github.com/Shuunen/repo-checker" rel="noreferrer" target="_blank">
        github.com/Shuunen/repo-checker
      </a>
      <p className="text-muted text-sm">
        <span data-testid="about-mark" id="unique-mark" />
      </p>
    </AlertDialog.Body>
  )
}
