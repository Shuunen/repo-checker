/**
 * Keep a .gitignore sorted when a fix adds a line to it.
 * @module
 */
/**
 * Add a line to the text of a .gitignore, keeping the list sorted alphabetically. A file with comments, blank lines or negations (`!x`) is not a plain list, sorting it could change what it ignores, so the line goes at the end
 * @param text the current .gitignore content
 * @param line the pattern to add
 * @returns the new content, ending with a newline
 * @example addIgnoreLine('dist\nnode_modules\n', 'coverage') // 'coverage\ndist\nnode_modules\n'
 */
export function addIgnoreLine(text: string, line: string): string {
  const items =
    text.trim() === ''
      ? []
      : text
          .trimEnd()
          .split('\n')
          .map(item => item.trimEnd())
  const isPlainList = items.every(item => item !== '' && !item.startsWith('#') && !item.startsWith('!'))
  if (!isPlainList) return `${text.trimEnd()}\n${line}\n`
  return `${[...new Set([...items, line])].toSorted((first, second) => first.localeCompare(second, 'en')).join('\n')}\n`
}

/**
 * Remove the lines of a .gitignore that match a pattern, the other lines stay as they are
 * @param text the current .gitignore content
 * @param pattern the pattern of the lines to remove, tested on each line
 * @returns the new content, ending with a newline
 * @example removeIgnoreLines('dist\n.github\n', /^\.github$/u) // 'dist\n'
 */
export function removeIgnoreLines(text: string, pattern: RegExp): string {
  const kept = text.split('\n').filter(line => !pattern.test(line))
  return `${kept.join('\n').trimEnd()}\n`
}
