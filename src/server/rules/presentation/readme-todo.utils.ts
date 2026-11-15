/**
 * Cut the Todo section (`## Todo`, `## Todos`, `## To do`) out of a README
 * @param text the README text
 * @returns what the section held and the README without it, undefined when there is no such section
 * @example extractTodoSection('# App\n\n## Todo\n\n- [ ] a\n\n## Thanks\n') // { body: '- [ ] a', rest: '# App\n\n## Thanks\n' }
 */
export function extractTodoSection(text: string) {
  const lines = text.split('\n')
  const start = lines.findIndex(line => /^##\s+to\s?dos?\s*$/iu.test(line))
  if (start === -1) return undefined
  const next = lines.findIndex((line, index) => index > start && /^#{1,2}\s/u.test(line))
  const end = next === -1 ? lines.length : next
  const body = lines
    .slice(start + 1, end)
    .join('\n')
    .trim()
  const rest = `${[...lines.slice(0, start), ...lines.slice(end)]
    .join('\n')
    .replaceAll(/\n{3,}/gu, '\n\n')
    .trimEnd()}\n`
  return { body, rest }
}

/**
 * Remove the Todo section from a README, the text is left as it is when it has none, like when another fix removed it already
 * @param text the README text
 * @returns the README without the section
 * @example removeTodoSection('# App\n\n## Todo\n\n- [ ] a\n') // '# App\n'
 */
export function removeTodoSection(text: string) {
  return extractTodoSection(text)?.rest ?? text
}

/**
 * Add the lines of a moved Todo section to the text of TODOS.md, skipping the lines it already has
 * @param current the current TODOS.md text, empty when the file does not exist
 * @param body the lines of the Todo section
 * @returns the new text
 * @example addTodoLines('', '- [ ] a') // '# TODOS\n\n- [ ] a\n'
 */
export function addTodoLines(current: string, body: string) {
  const known = new Set(current.split('\n').map(line => line.trim()))
  const lines = body.split('\n').filter(line => line.trim() !== '' && !known.has(line.trim()))
  if (lines.length === 0) return current
  return current.trim() === '' ? `# TODOS\n\n${lines.join('\n')}\n` : `${current.trimEnd()}\n${lines.join('\n')}\n`
}
