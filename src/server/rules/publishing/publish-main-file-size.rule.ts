import { invariant, isNil } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'

export const publishMainFileSize = defineRule({
  appliesTo: ({ flags, pkg }) => !isNil(flags.maxSizeKo) && !isNil(pkg?.main),
  async check({ files, flags, pkg, report }) {
    const { maxSizeKo } = flags
    const main = pkg?.main
    invariant(!isNil(maxSizeKo) && !isNil(main), 'appliesTo guarantees maxSizeKo and main')
    const sizeKo = await files.sizeKo(main)
    // a missing file is the job of publish-main-file-exists
    if (!isNil(sizeKo) && sizeKo > maxSizeKo) report({ data: { file: main, maxSizeKo, sizeKo }, messageId: 'tooBig' })
  },
  meta: { id: 'publish-main-file-size', messages: { tooBig: 'main file {{file}} is {{sizeKo}}Ko, the maximum is {{maxSizeKo}}Ko' }, severity: 'error' },
})
