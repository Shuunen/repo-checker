import { defineRule } from '../../engine/define-rule.ts'

export const themeColorMissing = defineRule({
  appliesTo: ({ flags, pkg }) => pkg !== undefined && flags.themeColor === undefined,
  check({ report }) {
    report({ messageId: 'missing' })
  },
  meta: {
    id: 'theme-color-missing',
    messages: {
      missing:
        'no themeColor found, define one in "themeColor" of .repo-checker.json, in "theme_color" of the web manifest, in a <meta name="theme-color"> of index.html or in "titleBar.activeBackground" of .vscode/settings.json, repo-check never picks a color for you and ignores a white #ffffff found in a file, the old default, only .repo-checker.json can declare it',
    },
    severity: 'info',
  },
})
