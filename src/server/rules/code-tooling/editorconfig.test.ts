import { invariant } from 'es-toolkit'
import { testRule } from '../../engine/rule-tester.ts'
import { editorconfigRules } from './editorconfig.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = editorconfigRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

const good = { '.editorconfig': 'root = true\n\n[*]\ncharset = utf-8\nend_of_line = lf\nindent_size = 2\nindent_style = space\ninsert_final_newline = true\ntrim_trailing_whitespace = true\n' }
const bare = { '.editorconfig': 'root = true\n' }

testRule(byId('editorconfig-exists'), { invalid: [{ errors: ['missing'], name: 'no .editorconfig' }], valid: [{ files: good, name: 'an .editorconfig' }] })
testRule(byId('editorconfig-indent'), { invalid: [{ errors: ['missing'], files: { '.editorconfig': 'indent_style = space\nindent_size = 4' }, name: '4 spaces' }], valid: [{ files: good, name: '2 spaces, in any order' }] })
testRule(byId('editorconfig-line-endings'), { invalid: [{ errors: ['missing'], files: bare, name: 'no line endings' }], valid: [{ files: good, name: 'lf' }] })
testRule(byId('editorconfig-charset'), { invalid: [{ errors: ['missing'], files: bare, name: 'no charset' }], valid: [{ files: good, name: 'utf8' }] })
testRule(byId('editorconfig-trim-whitespace'), { invalid: [{ errors: ['missing'], files: bare, name: 'no trim' }], valid: [{ files: good, name: 'trim' }] })
testRule(byId('editorconfig-final-newline'), { invalid: [{ errors: ['missing'], files: bare, name: 'no final newline' }], valid: [{ files: good, name: 'final newline' }] })
testRule(byId('editorconfig-no-html-indent'), { invalid: [{ errors: ['found'], files: { '.editorconfig': '[*.html]\nindent_size = 4\n' }, name: 'an html indent' }], valid: [{ files: good, name: 'no html indent' }] })
