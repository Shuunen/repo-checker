/**
 * Edit the steps of a GitHub workflow as text, so the comments and the layout of the file stay as they are.
 * @module
 */

/** The spaces a yaml level adds */
const yamlIndent = 2

/** A workflow cut around its steps, only the steps of the first `steps:` list are read */
interface Workflow {
  /** The lines after the steps */
  after: string[]
  /** The lines before the steps */
  before: string[]
  /** True when the steps are separated by a blank line */
  isSpaced: boolean
  /** The steps, each one with its lines and without the blank lines around */
  steps: string[][]
}

/**
 * Count the spaces and tabs a line starts with
 * @param line the line
 * @returns the length of its indentation
 */
function indentOf(line: string) {
  return line.length - line.trimStart().length
}

/**
 * Tell if a line is empty
 * @param line the line
 * @returns true when it has nothing but spaces
 */
function isBlank(line: string) {
  return line.trim() === ''
}

/**
 * Find the end of the steps: the first filled line that is less indented than the steps, the end of the file otherwise, without the blank lines before it
 * @param lines the lines of the workflow
 * @param first the index of the first step
 * @returns the index after the last line of the last step
 */
function endOfSteps(lines: readonly string[], first: number) {
  const indent = indentOf(String(lines[first]))
  const next = lines.findIndex((line, index) => index > first && !isBlank(line) && indentOf(line) < indent)
  let end = next === -1 ? lines.length : next
  while (isBlank(String(lines[end - 1]))) end -= 1
  return end
}

/**
 * Cut the lines of the steps in one group per step
 * @param region the lines from the first step to the last
 * @returns the steps, without the blank lines at their ends
 */
function groupSteps(region: readonly string[]) {
  const indent = indentOf(String(region[0]))
  const steps: string[][] = []
  for (const line of region)
    if (indentOf(line) === indent && line.trimStart().startsWith('- ')) steps.push([line])
    else steps.at(-1)?.push(line)
  return steps.map(step => {
    const end = step.findLastIndex(line => !isBlank(line)) + 1
    return step.slice(0, end)
  })
}

/**
 * Read the steps of a workflow
 * @param text the workflow text
 * @returns the workflow cut around its steps, undefined when it has no `steps:` list
 */
function readWorkflow(text: string): Workflow | undefined {
  const lines = text.split('\n')
  const header = lines.findIndex(line => /^\s*steps:\s*$/u.test(line))
  const first = header === -1 ? -1 : lines.findIndex((line, index) => index > header && line.trimStart().startsWith('- '))
  if (first === -1) return undefined
  const end = endOfSteps(lines, first)
  const region = lines.slice(first, end)
  return { after: lines.slice(end), before: lines.slice(0, first), isSpaced: region.some(line => isBlank(line)), steps: groupSteps(region) }
}

/**
 * Write a workflow back, from its parts
 * @param workflow the workflow
 * @returns the text
 */
function writeWorkflow(workflow: Readonly<Workflow>) {
  const { after, before, isSpaced, steps } = workflow
  const body = steps.map(step => step.join('\n')).join(isSpaced ? '\n\n' : '\n')
  return [...before, body, ...after].join('\n')
}

/**
 * Tell if a step uses an action
 * @param step the lines of the step
 * @param action the action name, like `actions/setup-node`
 * @returns true when one of its lines is `uses: <action>@...`
 */
function usesAction(step: readonly string[], action: string) {
  return step.some(line => new RegExp(`\\buses:\\s*${action}(?:@|\\s|$)`, 'u').test(line))
}

/**
 * Set an option of a step, in its `with:` block: its value is replaced when it is there, else the option is added at the end of the block, which is created when the step has none
 * @param step the lines of the step
 * @param key the option name, like `cache`
 * @param value the value
 * @returns the lines of the step with the option
 * @example setOption(['- uses: actions/setup-node@v7'], 'cache', 'pnpm') // ['- uses: actions/setup-node@v7', '  with:', '    cache: pnpm']
 */
function setOption(step: readonly string[], key: string, value: string) {
  const existing = step.findIndex(line => new RegExp(`^\\s+${key}:`, 'u').test(line))
  const padding = ' '.repeat(indentOf(String(step[existing])))
  if (existing !== -1) return step.with(existing, `${padding}${key}: ${value}`)
  const keysIndent = indentOf(String(step[0])) + yamlIndent
  const header = step.findIndex(line => /^\s+with:\s*$/u.test(line))
  if (header === -1) return [...step, `${' '.repeat(keysIndent)}with:`, `${' '.repeat(keysIndent + yamlIndent)}${key}: ${value}`]
  const lastOption = step.findLastIndex((line, index) => index > header && indentOf(line) > indentOf(String(step[header])))
  const optionIndent = indentOf(step[header + 1] ?? '') || keysIndent + yamlIndent
  return step.toSpliced(Math.max(lastOption, header) + 1, 0, `${' '.repeat(optionIndent)}${key}: ${value}`)
}

/**
 * Change the step that uses an action, the text is left as it is when no step does
 * @param text the workflow text
 * @param action the action name, like `pnpm/action-setup`
 * @param change turn the lines of the step into its new lines
 * @returns the new text
 * @example editStep(text, 'pnpm/action-setup', step => setOption(step, 'run_install', 'false'))
 */
export function editStep(text: string, action: string, change: (step: readonly string[]) => readonly string[]) {
  const workflow = readWorkflow(text)
  const index = workflow?.steps.findIndex(step => usesAction(step, action)) ?? -1
  if (workflow === undefined || index === -1) return text
  return writeWorkflow({ ...workflow, steps: workflow.steps.with(index, [...change(workflow.steps[index] as string[])]) })
}

/**
 * Set an option of the step that uses an action, see `setOption`
 * @param text the workflow text
 * @param action the action name
 * @param option the option
 * @param option.key the option name
 * @param option.value the value
 * @returns the new text
 * @example setStepOption(text, 'actions/setup-node', { key: 'cache', value: 'pnpm' })
 */
export function setStepOption(text: string, action: string, { key, value }: Readonly<{ key: string; value: string }>) {
  return editStep(text, action, step => setOption(step, key, value))
}

/**
 * Move the step that uses an action just before the step that uses another one, nothing changes when it is there already
 * @param text the workflow text
 * @param action the action of the step to move, like `pnpm/action-setup`
 * @param target the action of the step it must come before, like `actions/setup-node`
 * @returns the new text
 * @example moveStepBefore(text, 'pnpm/action-setup', 'actions/setup-node')
 */
export function moveStepBefore(text: string, action: string, target: string) {
  const workflow = readWorkflow(text)
  const from = workflow?.steps.findIndex(step => usesAction(step, action)) ?? -1
  const to = workflow?.steps.findIndex(step => usesAction(step, target)) ?? -1
  if (workflow === undefined || from === -1 || to === -1 || from < to) return text
  const moved = workflow.steps[from] as string[]
  return writeWorkflow({ ...workflow, steps: workflow.steps.toSpliced(from, 1).toSpliced(to, 0, moved) })
}

/**
 * Add a step at the end of the steps, with the indentation of the others
 * @param text the workflow text
 * @param name the name of the step
 * @param command the command it runs
 * @returns the new text, as it was when the workflow has no steps
 * @example appendRunStep(text, 'Run check 👀', 'pnpm run check')
 */
export function appendRunStep(text: string, name: string, command: string) {
  const workflow = readWorkflow(text)
  if (workflow === undefined) return text
  const dash = ' '.repeat(indentOf(String((workflow.steps[0] as string[])[0])))
  return writeWorkflow({ ...workflow, steps: [...workflow.steps, [`${dash}- name: ${name}`, `${dash}${' '.repeat(yamlIndent)}run: ${command}`]] })
}
