import { forbidInFile, requireFile, requireInFile } from '../../engine/file-rules.ts'

const files = ['.editorconfig']

export const editorconfigRules = [
  requireFile({ files, id: 'editorconfig-exists', message: 'no {{file}} file', severity: 'error' }),
  requireInFile({ files, id: 'editorconfig-indent', message: '{{file}} does not indent with 2 spaces, like indent_style = space and indent_size = 2', pattern: /^(?=[\s\S]*indent_style = space)(?=[\s\S]*indent_size = 2)/u, severity: 'error' }),
  requireInFile({ files, id: 'editorconfig-line-endings', message: '{{file}} does not use Unix line endings, like end_of_line = lf', pattern: /end_of_line = lf/u, severity: 'error' }),
  requireInFile({ files, id: 'editorconfig-charset', message: '{{file}} does not use utf-8, like charset = utf-8', pattern: /charset = utf-8/u, severity: 'error' }),
  requireInFile({ files, id: 'editorconfig-trim-whitespace', message: '{{file}} does not trim trailing whitespace, like trim_trailing_whitespace = true', pattern: /trim_trailing_whitespace = true/u, severity: 'warning' }),
  requireInFile({ files, id: 'editorconfig-final-newline', message: '{{file}} does not insert a final newline, like insert_final_newline = true', pattern: /insert_final_newline = true/u, severity: 'warning' }),
  forbidInFile({ files, id: 'editorconfig-no-html-indent', message: '{{file}} has a specific html indent rule, remove it to keep 2 spaces everywhere', pattern: /\[\*\.html\]\nindent_size = 4/u, severity: 'warning' }),
]
