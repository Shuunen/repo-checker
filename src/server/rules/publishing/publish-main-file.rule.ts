import { invariant, isNil } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'

export const publishMaxSizeDeclared = defineRule({
  appliesTo: ({ pkg }) => !isNil(pkg?.main),
  check({ flags, report }) {
    if (isNil(flags.maxSizeKo)) report({ messageId: 'missing' })
  },
  meta: { id: 'publish-max-size-declared', messages: { missing: 'the main file maximum size is not declared, add it to .repo-checker.json, like "maxSizeKo": 100' }, severity: 'warning' },
})

export const publishMainFileExists = defineRule({
  appliesTo: ({ flags, pkg }) => !isNil(flags.maxSizeKo) && !isNil(pkg?.main),
  async check({ files, pkg, report }) {
    const main = pkg?.main
    invariant(!isNil(main), 'appliesTo guarantees a main field')
    if (isNil(await files.sizeKo(main))) report({ data: { file: main }, messageId: 'missing' })
  },
  meta: { id: 'publish-main-file-exists', messages: { missing: 'main file {{file}} does not exist, build before running repo-check' }, severity: 'error' },
})
