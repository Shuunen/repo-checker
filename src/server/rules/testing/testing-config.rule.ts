import { requireFile, requireInFile, requireJsonSchema } from '../../engine/file-rules.ts'
import { hasDependency } from '../../engine/package-json.ts'

const nycFiles = ['.nycrc', '.nycrc.json']

export const testingConfigRules = [
  requireInFile({
    files: ['vitest.config.mts', 'vitest.config.ts', 'vitest.config.mjs', 'vitest.config.js'],
    id: 'vitest-pool-threads',
    message: "{{file}} does not run the tests in threads, like pool: 'threads'",
    pattern: /pool: 'threads'/u,
    severity: 'warning',
    when: ({ pkg }) => hasDependency(pkg, 'vitest'),
  }),
  requireFile({ files: nycFiles, id: 'nycrc-exists', message: 'no nyc config, like {{file}}', severity: 'error', when: ({ pkg }) => hasDependency(pkg, 'nyc') }),
  requireJsonSchema({ files: nycFiles, id: 'nycrc-schema', schema: 'https://json.schemastore.org/nycrc', severity: 'warning', when: ({ pkg }) => hasDependency(pkg, 'nyc') }),
]
