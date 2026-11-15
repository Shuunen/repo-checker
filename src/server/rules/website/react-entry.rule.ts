import { defineRule } from '../../engine/define-rule.ts'
import { hasDependency } from '../../engine/package-json.ts'

export const reactStrictMode = defineRule({
  appliesTo: ({ pkg }) => hasDependency(pkg, 'react'),
  async check({ files, report }) {
    const entries = await files.search(/\bcreateRoot\(/u, 'src')
    const texts = await Promise.all(entries.map(file => files.readText(file)))
    for (const [index, file] of entries.entries()) if (!/\bStrictMode\b/u.test(String(texts[index]))) report({ data: { file }, messageId: 'missing' })
  },
  meta: { id: 'react-strict-mode', messages: { missing: '{{file}} renders the app without <StrictMode>, which finds unsafe effects while developing. No fix, the wrapping is for you to do' }, severity: 'info' },
})
