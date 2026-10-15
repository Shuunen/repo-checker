import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { readmeContentRules, readmeExists, readmeTodos } from './readme.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = readmeContentRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

const readme = (text: string) => ({ 'README.md': text })

testRule(readmeExists, {
  invalid: [
    { errors: ['missing'], name: 'no README, the package name', output: '# app\n\n## Thanks\n', pkg: { name: 'app' } },
    { errors: ['missing'], name: 'no README, the package description', output: '# app\n\nDoes things\n\n## Thanks\n', pkg: { description: 'Does things', name: 'app' } },
    { errors: ['missing'], flags: { githubDescription: 'From GitHub', repoId: 'tool' }, name: 'no README, the repo name and the GitHub description', output: '# tool\n\nFrom GitHub\n\n## Thanks\n' },
    { errors: ['missing'], name: 'no README, nothing known to write one' },
  ],
  valid: [
    { files: readme('# app'), name: 'README.md' },
    { files: { 'readme.md': '# app' }, name: 'readme.md' },
  ],
})

testRule(byId('readme-title'), {
  invalid: [{ errors: ['missing'], files: readme('some text\n# app'), name: 'no title first' }],
  valid: [{ files: readme('# app\n'), name: 'a title' }, { name: 'no README, readme-exists reports it' }],
})

testRule(byId('readme-logo'), {
  invalid: [{ errors: ['missing'], files: readme('# app'), name: 'no logo' }],
  valid: [
    { files: readme('# app\n![logo](docs/logo.svg)'), name: 'a logo' },
    { files: readme('# app'), flags: { isPrivate: true }, name: 'private repo' },
  ],
})
testRule(byId('readme-demo'), {
  invalid: [{ errors: ['missing'], files: readme('# app'), name: 'no demo' }],
  valid: [
    { files: readme('# app\n![demo](docs/demo.gif)'), name: 'a demo' },
    { files: readme('# app'), flags: { isPrivate: true }, name: 'private repo' },
  ],
})
testRule(byId('readme-no-netlify-com'), { invalid: [{ errors: ['found'], files: readme('see app.netlify.com'), name: 'netlify.com' }], valid: [{ files: readme('see app.netlify.app'), name: 'netlify.app' }] })
testRule(byId('readme-links-https'), { invalid: [{ errors: ['found'], files: readme('see //example.com'), name: 'no scheme' }], valid: [{ files: readme('see https://example.com'), name: 'https' }] })

testRule(byId('readme-no-crlf'), {
  invalid: [{ errors: ['found'], files: readme('# app\r\n\r\ntext\r\n'), name: 'crlf, fixed', output: '# app\n\ntext\n' }],
  valid: [{ files: readme('# app\n\ntext\n'), name: 'lf' }],
})

testRule(byId('readme-dash-lists'), {
  invalid: [{ errors: ['found'], files: readme('# app\n* one\n* [two](x)\n'), name: 'star lists, fixed', output: '# app\n- one\n- [two](x)\n' }],
  valid: [{ files: readme('# app\n- one\n**bold**\n'), name: 'dash lists and bold text' }],
})

testRule(readmeTodos, {
  invalid: [{ errors: ['todo', 'todo'], files: readme('# app\n- [ ] add a logo\n- [x] done\n- [ ] add tests\n'), name: 'two unchecked items' }],
  valid: [{ files: readme('# app\n- [x] done\n'), name: 'only checked items' }, { name: 'no README' }],
})
