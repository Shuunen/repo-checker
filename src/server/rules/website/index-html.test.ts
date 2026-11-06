import { testRule } from '../../engine/rule-tester.ts'
import { indexHtmlUniqueMark } from './index-html.rule.ts'

const mark = '<meta name="unique-mark" content="" />'
const swapped = '<meta content="" name="unique-mark" />'

testRule(indexHtmlUniqueMark, {
  invalid: [
    { errors: ['missing'], files: { 'index.html': '<html><head>\n</head></html>' }, name: 'root index.html without the mark', output: `<html><head>\n  ${mark}\n</head></html>` },
    { errors: ['missing'], files: { 'src/index.html': '<html><head>\n</head></html>' }, name: 'src/index.html without the mark', output: `<html><head>\n  ${mark}\n</head></html>` },
    { errors: ['missing'], files: { 'index.html': '<html></html>' }, name: 'no head, no fix' },
  ],
  valid: [
    { files: { 'index.html': `<head>${mark}</head>` }, name: 'root index.html with the mark' },
    { files: { 'src/index.html': `<head>${mark}</head>` }, name: 'src/index.html with the mark' },
    { files: { 'index.html': `<head>${swapped}</head>` }, name: 'attributes in the other order' },
    { files: { 'index.html': '<head><meta name="unique-mark" content="abc"></head>' }, name: 'a filled content' },
    { name: 'no index.html' },
  ],
})
