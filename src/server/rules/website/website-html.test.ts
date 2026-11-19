import { testRule } from '../../test/rule-tester.ts'
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

/**
 * Make the start of a png file of a given size, as text
 * @param pngWidth the width
 * @param pngHeight the height
 * @returns the bytes read as latin1 text
 */
function png(pngWidth: number, pngHeight: number) {
  const header = Buffer.alloc(24)
  Buffer.from('89504E470D0A1A0A0000000D', 'hex').copy(header)
  header.write('IHDR', 12)
  header.writeUInt32BE(pngWidth, 16)
  header.writeUInt32BE(pngHeight, 20)
  return header.toString('latin1')
}

testRule(mediaDimensions, {
  invalid: [
    { errors: ['missing'], files: { 'index.html': '<img src="a.png"> <video src="a.mp4" width="1"></video> <img src="b.png" width="1" height="2">' }, flags: web, name: 'an image and a video without full size' },
    { errors: ['missing'], files: { 'App.vue': '<img :src="a" height="2" />' }, flags: web, name: 'a component image without width' },
    { errors: ['missing'], files: { 'index.html': '<img src="logo.png">', 'logo.png': png(30, 20) }, flags: web, name: 'a local image next to the page', output: '<img src="logo.png" width="30" height="20">' },
    { errors: ['missing'], files: { 'index.html': '<img src="/logo.png?v=2" height="5" />', 'public/logo.png': png(30, 20) }, flags: web, name: 'a root image in public, only the width is missing', output: '<img src="/logo.png?v=2" height="5" width="30" />' },
    { errors: ['missing'], files: { 'index.html': '<img src="logo.png" width="9">', 'logo.png': png(30, 20) }, flags: web, name: 'only the height is missing', output: '<img src="logo.png" width="9" height="20">' },
    { errors: ['missing'], files: { 'src/App.tsx': '<img src="./a.png" /> <img src="https://x.com/a.png" />', 'src/a.png': png(1, 2) }, flags: web, name: 'a remote image stays manual', output: '<img src="./a.png" width="1" height="2" /> <img src="https://x.com/a.png" />', remaining: 1 },
    { errors: ['missing'], files: { 'index.html': '<img src="logo.png">', 'logo.png': 'not an image' }, flags: web, name: 'a file that is not an image' },
  ],
  valid: [
    { files: { 'index.html': '<img src="a.png" width="1" height="2"> <video width="1" height="2"></video>' }, flags: web, name: 'sized media' },
    { files: { 'App.tsx': '<img {...props} />' }, flags: web, name: 'spread props' },
    { files: { 'App.vue': '<img :width="w" :height="h" />' }, flags: web, name: 'bound size' },
    { files: { 'index.html': '<img src="a.png">' }, name: 'not a website' },
  ],
})
