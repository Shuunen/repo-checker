import { Link } from 'wouter'

/**
 * The link back to the project list
 * @returns the link
 */
export function BackLink() {
  return (
    <Link className="text-sm text-accent" data-testid="back" href="/">
      ← Projects
    </Link>
  )
}
