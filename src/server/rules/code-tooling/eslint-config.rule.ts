import { forbidFile, requireFile, requireInFile } from '../../engine/file-rules.ts'
import { eslintConfigFiles, usesEslint, usesTailwind } from './code-tooling.utils.ts'

export const eslintConfigRules = [
  requireFile({ files: eslintConfigFiles, id: 'eslint-config-exists', message: 'no ESLint flat config, like {{file}}', severity: 'error', when: usesEslint }),
  forbidFile({ files: ['.eslintrc.json', '.eslintrc.js'], id: 'eslint-no-deprecated-config', message: '{{file}} is a deprecated ESLint config, use the flat config eslint.config.js', severity: 'warning', when: usesEslint }),
  forbidFile({ files: ['xo.config.js'], id: 'eslint-no-xo-config', message: '{{file}} is left from xo, remove it', severity: 'error', when: usesEslint }),
  requireInFile({ files: eslintConfigFiles, id: 'eslint-browser-config', message: '{{file}} does not set a browser environment, Tailwind projects run in the browser', pattern: /browser/u, severity: 'error', when: context => usesEslint(context) && usesTailwind(context) }),
]
