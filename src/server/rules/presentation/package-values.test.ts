import { invariant } from 'es-toolkit'
import { testRule } from '../../test/rule-tester.ts'
import { packageValueRules } from './package-values.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = packageValueRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

const known = { gitAuthor: { email: 'me@mail.com', name: 'Me' }, owner: 'me', repoId: 'tool' }

testRule(byId('package-author-value'), {
  invalid: [
    { errors: ['wrong'], flags: known, name: 'another author', output: { author: 'Me <me@mail.com>' }, pkg: { author: 'Someone <someone@mail.com>' } },
    { errors: ['wrong'], flags: { gitAuthor: { name: 'Me' } }, name: 'a git user without mail', output: { author: 'Me' }, pkg: { author: 'Me <me@mail.com>' } },
  ],
  valid: [
    { flags: known, name: 'the git user', pkg: { author: 'Me <me@mail.com>' } },
    { flags: known, name: 'no author, package-author reports it', pkg: {} },
    { name: 'no git user to compare with', pkg: { author: 'Someone' } },
    { flags: known, name: 'no package.json' },
  ],
})

testRule(byId('package-homepage-value'), {
  invalid: [
    { errors: ['wrong'], flags: known, name: 'a #readme suffix', output: { homepage: 'https://github.com/me/tool' }, pkg: { homepage: 'https://github.com/me/tool#readme' } },
    { errors: ['wrong'], flags: known, name: 'the deployed website', output: { homepage: 'https://github.com/me/tool' }, pkg: { homepage: 'https://tool.netlify.app' } },
  ],
  valid: [
    { flags: known, name: 'the repo url', pkg: { homepage: 'https://github.com/me/tool' } },
    { flags: known, name: 'no homepage, package-homepage reports it', pkg: {} },
    { name: 'no origin to compare with', pkg: { homepage: 'https://x.y' } },
  ],
})

testRule(byId('package-bugs-value'), {
  invalid: [{ errors: ['wrong'], flags: known, name: 'another url', output: { bugs: 'https://github.com/me/tool/issues' }, pkg: { bugs: 'https://github.com/me/old/issues' } }],
  valid: [
    { flags: known, name: 'the issues of the repo', pkg: { bugs: 'https://github.com/me/tool/issues' } },
    { flags: known, name: 'no bugs, package-bugs reports it', pkg: {} },
    { name: 'no origin to compare with', pkg: { bugs: 'https://x.y' } },
  ],
})
