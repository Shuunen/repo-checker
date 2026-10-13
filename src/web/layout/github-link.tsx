/**
 * A link to the repo on GitHub, opened in a new tab
 * @param props the props
 * @param props.url the address of the repo
 * @returns the link
 */
export function GithubLink({ url }: Readonly<{ url: string }>) {
  return (
    <a className="text-accent" href={url} rel="noreferrer" target="_blank">
      GitHub
    </a>
  )
}
