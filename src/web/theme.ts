/**
 * Follow the system theme: HeroUI switches to dark when the root element has the `dark` class
 * @param root the element that gets the class, the html element in the page
 * @param media the `(prefers-color-scheme: dark)` media query
 * @returns stops following
 * @example followSystemTheme(document.documentElement, matchMedia('(prefers-color-scheme: dark)'))
 */
export function followSystemTheme(root: Readonly<HTMLElement>, media: Readonly<MediaQueryList>) {
  const apply = () => root.classList.toggle('dark', media.matches)
  apply()
  media.addEventListener('change', apply)
  return () => media.removeEventListener('change', apply)
}
