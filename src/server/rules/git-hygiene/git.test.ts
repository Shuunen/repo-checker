import { invariant } from 'es-toolkit'
import { testRule } from '../../test/rule-tester.ts'
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

testRule(byId('gitignore-exists'), { invalid: [{ errors: ['missing'], name: 'no .gitignore', output: 'node_modules\n' }], valid: [{ files: { '.gitignore': 'node_modules' }, name: 'a .gitignore' }] })
testRule(byId('gitignore-node-modules'), {
  invalid: [{ errors: ['missing'], files: { '.gitignore': 'dist' }, name: 'no node_modules', output: 'dist\nnode_modules\n', pkg: {} }],
  valid: [
    { files: { '.gitignore': 'node_modules\ndist' }, name: 'node_modules' },
    { files: { '.gitignore': 'dist' }, name: 'no package.json, nothing to ignore' },
  ],
})
testRule(byId('gitignore-keeps-pnpm-lock'), {
  invalid: [
    { errors: ['found'], files: { '.gitignore': 'pnpm-lock.yaml' }, name: 'the lock excluded', output: '\n' },
    { errors: ['found'], files: { '.gitignore': 'dist\n/pnpm-lock.yaml\nnode_modules' }, name: 'excluded from the root', output: 'dist\nnode_modules\n' },
    { errors: ['found'], files: { '.gitignore': '**/pnpm-lock.yaml\n' }, name: 'excluded everywhere', output: '\n' },
  ],
  valid: [
    { files: { '.gitignore': 'node_modules' }, name: 'the lock kept' },
    { files: { '.gitignore': '# pnpm-lock.yaml is committed\nnode_modules' }, name: 'a comment' },
    { files: { '.gitignore': '*.yaml\n!pnpm-lock.yaml' }, name: 'a negation' },
  ],
})
testRule(byId('gitignore-keeps-github'), {
  invalid: [
    { errors: ['found'], files: { '.gitignore': '.github' }, name: 'the folder excluded', output: '\n' },
    { errors: ['found'], files: { '.gitignore': 'dist\n/.github/' }, name: 'the folder excluded from the root', output: 'dist\n' },
    { errors: ['found'], files: { '.gitignore': '.github/**' }, name: 'the content excluded', output: '\n' },
  ],
  valid: [
    { files: { '.gitignore': 'node_modules' }, name: 'the folder kept' },
    { files: { '.gitignore': '.github/workflows/tmp' }, name: 'a sub path excluded' },
    { files: { '.gitignore': '.githubrc' }, name: 'another name' },
  ],
})
