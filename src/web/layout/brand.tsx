/**
 * The app name with its logo square, at the top of the sidebar
 * @returns the brand
 */
export function Brand() {
  return (
    <p className="mb-4 flex items-center gap-2 px-2 font-semibold">
      <span className="size-4 rounded bg-accent" />
      repo-checker
    </p>
  )
}
