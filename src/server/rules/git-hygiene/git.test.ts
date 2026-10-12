import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { avoidMainBranch, gitignoreRules } from './git.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = gitignoreRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

testRule(avoidMainBranch, {
  invalid: [{ errors: ['found'], files: { '.git/config': '[branch "main"]\n\tremote = origin\n' }, name: 'a main branch' }],
  valid: [{ files: { '.git/config': '[branch "master"]\n\tremote = origin\n' }, name: 'a master branch' }],
})

testRule(byId('gitignore-exists'), { invalid: [{ errors: ['missing'], name: 'no .gitignore' }], valid: [{ files: { '.gitignore': 'node_modules' }, name: 'a .gitignore' }] })
testRule(byId('gitignore-node-modules'), { invalid: [{ errors: ['missing'], files: { '.gitignore': 'dist' }, name: 'no node_modules' }], valid: [{ files: { '.gitignore': 'node_modules\ndist' }, name: 'node_modules' }] })
testRule(byId('gitignore-keeps-pnpm-lock'), { invalid: [{ errors: ['found'], files: { '.gitignore': 'pnpm-lock.yaml' }, name: 'the lock excluded' }], valid: [{ files: { '.gitignore': 'node_modules' }, name: 'the lock kept' }] })
