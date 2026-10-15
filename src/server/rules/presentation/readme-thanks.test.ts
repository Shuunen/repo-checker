import { testRule } from '../../engine/rule-tester.ts'
import { thanksLine, thanksList } from './readme.utils.ts'
import { readmeThanksEntries, readmeThanksSection } from './readme-thanks.rule.ts'

const vitest = thanksList.find(thanks => thanks.label === 'Vitest')
const github = '- [Github](https://github.com) : for all their great work'

testRule(readmeThanksSection, {
  invalid: [{ errors: ['missing'], files: { 'README.md': '# app\n' }, name: 'no thanks section, added', output: '# app\n\n## Thanks\n' }],
  valid: [{ files: { 'README.md': '# app\n\n## Thanks\n' }, name: 'a thanks section' }],
})

testRule(readmeThanksEntries, {
  invalid: [
    { errors: ['missing'], files: { 'README.md': `# app\n\n## Thanks\n\n${github}\n` }, name: 'a used tool not thanked, added first', output: `# app\n\n## Thanks\n\n${vitest === undefined ? '' : thanksLine(vitest)}\n${github}\n`, pkg: { devDependencies: { vitest: '^4.0.0' } } },
    { errors: ['missing'], files: { 'README.md': `# app\n\n## Thanks\n${github}\n` }, name: 'no blank line after the title, one is added', output: `# app\n\n## Thanks\n\n${vitest === undefined ? '' : thanksLine(vitest)}\n${github}\n`, pkg: { devDependencies: { vitest: '^4.0.0' } } },
    { errors: ['unused'], files: { 'README.md': '# app\n\n## Thanks\n\n- [Zod](https://zod.dev) : validation\n' }, name: 'a thanked tool no longer used', pkg: { name: 'app' } },
  ],
  valid: [
    { files: { 'README.md': '# app\n\n## Thanks\n\n- [vitest](https://vitest.dev) : tests\n' }, name: 'a used tool thanked, any case', pkg: { devDependencies: { vitest: '^4.0.0' } } },
    { files: { 'README.md': `# app\n\n## Thanks\n\n${github}\n- [Repo-checker](https://github.com/Shuunen/repo-checker) : itself\n` }, name: 'repo-checker thanking itself', pkg: { name: 'repo-check' } },
    { files: { 'README.md': '# app\n\n## Thanks\n\n- [Bun](https://bun.sh) : runtime\n' }, flags: { isUsingBun: true }, name: 'a tool detected by flag' },
    { files: { 'README.md': '# app\n' }, name: 'no thanks section, readme-thanks-section reports it' },
  ],
})
