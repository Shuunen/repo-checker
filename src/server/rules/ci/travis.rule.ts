import { requireInFile } from '../../engine/file-rules.ts'

const files = ['.travis.yml']

export const travisRules = [
  requireInFile({ files, id: 'travis-language', message: '{{file}} does not declare language: node_js', pattern: /language: node_js/u, severity: 'error' }),
  requireInFile({ files, id: 'travis-install-task', message: '{{file}} does not install with npm ci', pattern: /npm ci/u, severity: 'error' }),
  requireInFile({ files, id: 'travis-ci-task', message: '{{file}} does not run npm run ci', pattern: /npm run ci/u, severity: 'error' }),
]
