import { testRule } from '../../engine/rule-tester.ts'
import { externalLinkRel, mediaDimensions } from './website-html.rule.ts'

const web = { isWebPublished: true }

testRule(externalLinkRel, {
  invalid: [
    { errors: ['missing'], files: { 'index.html': '<a href="/about">i</a><a href="https://example.com">x</a>' }, flags: web, name: 'a plain external link, the internal one is left alone', output: '<a href="/about">i</a><a href="https://example.com" rel="noopener noreferrer">x</a>' },
    { errors: ['missing'], files: { 'src/App.tsx': '<a href="https://example.com" target="_blank" />' }, flags: web, name: 'a self closing link in a component', output: '<a href="https://example.com" target="_blank" rel="noopener noreferrer" />' },
    {
      errors: ['missing'],
      files: { 'index.html': "<a href='https://a.com' rel='nofollow'>x</a> <a href=\"http://b.com\">y</a>" },
      flags: web,
      name: 'a rel without protection is completed, once per file',
      output: '<a href=\'https://a.com\' rel=\'noopener noreferrer nofollow\'>x</a> <a href="http://b.com" rel="noopener noreferrer">y</a>',
    },
  ],
  valid: [
    { files: { 'index.html': '<a href="https://example.com" rel="noopener">x</a>' }, flags: web, name: 'noopener' },
    { files: { 'index.html': '<a rel="external noreferrer" href="https://example.com">x</a>' }, flags: web, name: 'noreferrer before the href' },
    { files: { 'App.tsx': '<a href="https://example.com" rel={rel}>x</a>' }, flags: web, name: 'a computed rel' },
    { files: { 'index.html': '<a href="/about">x</a> <a href="#top">y</a>' }, flags: web, name: 'internal links' },
    { files: { 'README.md': '<a href="https://example.com">x</a>' }, flags: web, name: 'not a markup file' },
    { files: { 'index.html': '<a href="https://example.com">x</a>' }, name: 'not a website' },
  ],
})

testRule(mediaDimensions, {
  invalid: [
    { errors: ['missing'], files: { 'index.html': '<img src="a.png"> <video src="a.mp4" width="1"></video> <img src="b.png" width="1" height="2">' }, flags: web, name: 'an image and a video without full size' },
    { errors: ['missing'], files: { 'App.vue': '<img :src="a" height="2" />' }, flags: web, name: 'a component image without width' },
  ],
  valid: [
    { files: { 'index.html': '<img src="a.png" width="1" height="2"> <video width="1" height="2"></video>' }, flags: web, name: 'sized media' },
    { files: { 'App.tsx': '<img {...props} />' }, flags: web, name: 'spread props' },
    { files: { 'App.vue': '<img :width="w" :height="h" />' }, flags: web, name: 'bound size' },
    { files: { 'index.html': '<img src="a.png">' }, name: 'not a website' },
  ],
})
