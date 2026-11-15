import { testRule } from '../../test/rule-tester.ts'
import { addTodoLines, extractTodoSection, removeTodoSection } from './readme-todo.utils.ts'
import { readmeNoTodoSection } from './readme.rule.ts'

testRule(readmeNoTodoSection, {
  invalid: [
    {
      errors: ['found'],
      files: { 'README.md': '# App\n\n## Todo\n\n- [ ] first\n- [ ] second\n\n## Thanks\n\n- a\n' },
      name: 'a todo section in the middle, no TODOS.md yet',
      output: ['# App\n\n## Thanks\n\n- a\n', '# TODOS\n\n- [ ] first\n- [ ] second\n'],
    },
    {
      errors: ['found'],
      files: { 'README.md': '# App\n\n## Thanks\n\n- a\n\n## Todos\n\n- [ ] last\n', 'TODOS.md': '# TODOS\n\n- [ ] known\n' },
      name: 'a todo section at the end, a TODOS.md already',
      output: ['# App\n\n## Thanks\n\n- a\n', '# TODOS\n\n- [ ] known\n- [ ] last\n'],
    },
    { errors: ['found'], files: { 'README.md': '# App\n\n## Todo\n\n## Thanks\n' }, name: 'an empty todo section, only removed', output: '# App\n\n## Thanks\n' },
  ],
  valid: [{ files: { 'README.md': '# App\n\n## Thanks\n' }, name: 'no todo section' }, { files: { 'README.md': '# App\n\n## Todo\n\nSee [TODOS.md](TODOS.md).\n' }, name: 'a todo section that only points to TODOS.md, already moved' }, { name: 'no README' }],
})

describe(extractTodoSection, () => {
  it('finds a "To do" heading in a lowercase readme', () => {
    expect.hasAssertions()
    expect(extractTodoSection('# App\n\n## to do\n\n- [ ] a\n')).toStrictEqual({ body: '- [ ] a', rest: '# App\n' })
  })

  it('ignores a todo heading of another level', () => {
    expect.hasAssertions()
    expect(extractTodoSection('# App\n\n### Todo\n\n- [ ] a\n')).toBeUndefined()
  })
})

describe(removeTodoSection, () => {
  it('removes the section', () => {
    expect.hasAssertions()
    expect(removeTodoSection('# App\n\n## Todo\n\n- [ ] a\n')).toBe('# App\n')
  })

  it('leaves a README without the section as it is', () => {
    expect.hasAssertions()
    expect(removeTodoSection('# App\n')).toBe('# App\n')
  })
})

describe(addTodoLines, () => {
  it('adds nothing when TODOS.md has every line already', () => {
    expect.hasAssertions()
    expect(addTodoLines('# TODOS\n\n- [ ] a\n', '- [ ] a')).toBe('# TODOS\n\n- [ ] a\n')
  })
})
