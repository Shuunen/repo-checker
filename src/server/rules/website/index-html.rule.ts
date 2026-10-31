import { requireInFile } from '../../engine/file-rules.ts'

/** The unique-mark meta tag, whatever the order of its attributes */
const uniqueMarkMeta = /<meta\b(?=[^>]*\bname=["']unique-mark["'])[^>]*>/iu

export const indexHtmlUniqueMark = requireInFile({
  files: ['index.html', 'src/index.html'],
  fix: text => (text.includes('</head>') ? text.replace('</head>', '  <meta name="unique-mark" content="" />\n</head>') : text),
  id: 'index-html-unique-mark',
  message: '{{file}} has no <meta name="unique-mark" content="" /> tag',
  pattern: uniqueMarkMeta,
  severity: 'warning',
})
