import { testRule } from '../../test/rule-tester.ts'
import { indexHtmlDescription, indexHtmlHeadSorted, indexHtmlIcon, indexHtmlLang, indexHtmlMaskIconColor, indexHtmlThemeColor, indexHtmlTileColor, indexHtmlUniqueMark, indexHtmlViewport } from './index-html.rule.ts'

const mark = '<meta name="unique-mark" content="" />'
const swapped = '<meta content="" name="unique-mark" />'

testRule(indexHtmlUniqueMark, {
  invalid: [
    { errors: ['missing'], files: { 'index.html': '<html><head>\n</head></html>' }, name: 'root index.html without the mark', output: `<html><head>\n  ${mark}\n</head></html>` },
    { errors: ['missing'], files: { 'src/index.html': '<html><head>\n</head></html>' }, name: 'src/index.html without the mark', output: `<html><head>\n  ${mark}\n</head></html>` },
    { errors: ['missing'], files: { 'src/web/index.html': '<html><head>\n</head></html>' }, name: 'a nested src/web/index.html without the mark', output: `<html><head>\n  ${mark}\n</head></html>` },
    { errors: ['missing', 'missing'], files: { 'index.html': '<html><head></head></html>', 'src/web/index.html': '<!doctype html><head></head>' }, name: 'two pages without the mark', output: [`<html><head>  ${mark}\n</head></html>`, `<!doctype html><head>  ${mark}\n</head>`] },
    { errors: ['missing'], files: { 'index.html': '<html></html>' }, name: 'no head, no fix' },
  ],
  valid: [
    { files: { 'index.html': `<head>${mark}</head>` }, name: 'root index.html with the mark' },
    { files: { 'src/index.html': `<head>${mark}</head>` }, name: 'src/index.html with the mark' },
    { files: { 'index.html': `<head>${swapped}</head>` }, name: 'attributes in the other order' },
    { files: { 'index.html': '<head><meta name="unique-mark" content="abc"></head>' }, name: 'a filled content' },
    { files: { 'src/web/index.html': `<head>${mark}</head>` }, name: 'a nested index.html with the mark' },
    { files: { 'src/web/index.html': '<div>a partial</div>' }, name: 'a nested index.html that is not a page' },
    { name: 'no index.html' },
  ],
})

testRule(indexHtmlLang, {
  invalid: [
    { errors: ['missing'], files: { 'index.html': '<!doctype html><html><head></head></html>' }, name: 'no lang', output: '<!doctype html><html lang="en"><head></head></html>' },
    { errors: ['missing'], files: { 'index.html': '<html class="a"><head></head></html>' }, name: 'other attributes kept', output: '<html lang="en" class="a"><head></head></html>' },
  ],
  valid: [{ files: { 'index.html': '<html lang="fr"><head></head></html>' }, name: 'a lang' }, { files: { 'index.html': '<head></head>' }, name: 'no html tag' }, { name: 'no index.html' }],
})

testRule(indexHtmlViewport, {
  invalid: [
    { errors: ['missing'], files: { 'index.html': '<html><head>\n</head></html>' }, name: 'no viewport', output: '<html><head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n</head></html>' },
    { errors: ['missing'], files: { 'index.html': '<html></html>' }, name: 'no head, no fix' },
  ],
  valid: [{ files: { 'index.html': '<head><meta name="viewport" content="width=device-width" /></head>' }, name: 'a viewport' }, { files: { 'index.html': '<head><meta content="width=device-width" name="viewport"></head>' }, name: 'attributes in the other order' }, { name: 'no index.html' }],
})

testRule(indexHtmlIcon, {
  invalid: [
    { errors: ['missing'], files: { 'index.html': '<html><head>\n</head></html>', 'public/favicon.svg': '<svg />' }, name: 'an svg favicon to link', output: '<html><head>\n  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />\n</head></html>' },
    { errors: ['missing'], files: { 'index.html': '<html><head>\n</head></html>', 'public/favicon.ico': 'ico' }, name: 'an ico favicon to link', output: '<html><head>\n  <link rel="icon" type="image/x-icon" href="/favicon.ico" />\n</head></html>' },
    { errors: ['missing'], files: { 'index.html': '<html><head></head></html>' }, name: 'no favicon file, no fix' },
  ],
  valid: [{ files: { 'index.html': '<head><link rel="icon" href="/logo.svg" /></head>' }, name: 'an icon link' }, { files: { 'index.html': '<head><link href="/favicon.ico" rel="shortcut icon"></head>' }, name: 'a shortcut icon link, attributes swapped' }, { name: 'no index.html' }],
})

testRule(indexHtmlDescription, {
  invalid: [
    { errors: ['missing'], files: { 'index.html': '<html><head>\n</head></html>' }, name: 'no description', output: '<html><head>\n  <meta name="description" content="A &quot;tool&quot;" />\n</head></html>', pkg: { description: 'A "tool"' } },
    { errors: ['missing'], files: { 'index.html': '<html><head></head></html>' }, name: 'no package description, no fix' },
    { errors: ['missing'], files: { 'index.html': '<html><head></head></html>' }, name: 'an empty package description, no fix', pkg: { description: '' } },
  ],
  valid: [{ files: { 'index.html': '<head><meta content="a" name="description"></head>' }, name: 'a description' }, { name: 'no index.html' }],
})

testRule(indexHtmlThemeColor, {
  invalid: [
    { errors: ['different'], files: { 'index.html': '<head><meta name="theme-color" content="#FB923C" /></head>' }, flags: { themeColor: '#fb923c' }, name: 'the theme color in capitals is lowercased', output: '<head><meta name="theme-color" content="#fb923c" /></head>' },
    { errors: ['missing'], files: { 'index.html': '<html><head>\n</head></html>' }, flags: { themeColor: '#fb923c' }, name: 'no theme color', output: '<html><head>\n  <meta name="theme-color" content="#fb923c" />\n</head></html>' },
    { errors: ['different'], files: { 'index.html': '<head><meta name="theme-color" content="#000" /></head>' }, flags: { themeColor: '#fb923c' }, name: 'another color', output: '<head><meta name="theme-color" content="#fb923c" /></head>' },
    { errors: ['different'], files: { 'index.html': '<head><meta name="theme-color" /></head>' }, flags: { themeColor: '#fb923c' }, name: 'a tag without content', output: '<head><meta name="theme-color" content="#fb923c" /></head>' },
  ],
  valid: [
    { files: { 'index.html': '<head></head>' }, name: 'no theme color to follow' },
    { flags: { themeColor: '#fb923c' }, name: 'no index.html' },
  ],
})

testRule(indexHtmlHeadSorted, {
  invalid: [
    {
      errors: ['unsorted'],
      files: {
        'index.html': [
          '<head>',
          '  <script type="module" src="/main.tsx"></script>',
          '  <style>a{}</style>',
          '  <link rel="stylesheet" href="/a.css" />',
          '  <link rel="preload" href="/a.woff2" />',
          '  <link href="/f.svg" rel="icon" />',
          '  <link rel="author" href="/me" />',
          '  <base href="/" />',
          '  <meta name="description" content="a" />',
          '  <title>A</title>',
          '  <meta name="viewport" content="width=device-width" />',
          '  <meta charset="utf-8" />',
          '</head>',
        ].join('\n'),
      },
      name: 'every group out of order',
      output: [
        '<head>',
        '  <meta charset="utf-8" />',
        '  <meta name="viewport" content="width=device-width" />',
        '  <title>A</title>',
        '  <meta name="description" content="a" />',
        '  <base href="/" />',
        '  <link href="/f.svg" rel="icon" />',
        '  <link rel="preload" href="/a.woff2" />',
        '  <link rel="stylesheet" href="/a.css" />',
        '  <style>a{}</style>',
        '  <script type="module" src="/main.tsx"></script>',
        '  <link rel="author" href="/me" />',
        '</head>',
      ].join('\n'),
    },
    { errors: ['unsorted'], files: { 'index.html': '<head>\n  <meta name="b" />\n  <meta name="a" />\n</head>' }, name: 'the same group is sorted by text', output: '<head>\n  <meta name="a" />\n  <meta name="b" />\n</head>' },
    { errors: ['unsorted'], files: { 'index.html': '<head>\n  <title>A</title>\n\n  <meta charset="utf-8" />\n</head>' }, name: 'a blank line', output: '<head>\n  <meta charset="utf-8" />\n  <title>A</title>\n</head>' },
    {
      errors: ['unsorted'],
      files: { 'index.html': '<head>\n  <title>A</title>\n  <!-- the script -->\n  <script type="module">\n    run()\n  </script>\n  <meta name="a" />\n</head>' },
      name: 'a comment and a multi-line script move together',
      output: '<head>\n  <title>A</title>\n  <meta name="a" />\n  <!-- the script -->\n  <script type="module">\n    run()\n  </script>\n</head>',
    },
    { errors: ['unsorted'], files: { 'index.html': '<head><meta name="a"><title>A</title></head>' }, name: 'a compact head', output: '<head>\n  <title>A</title>\n  <meta name="a">\n</head>' },
  ],
  valid: [
    { files: { 'index.html': '<head>\n  <meta charset="utf-8" />\n  <title>A</title>\n  <link rel="icon" />\n  <script src="a.js"></script>\n</head>' }, name: 'a sorted head' },
    { files: { 'index.html': '<head></head>' }, name: 'an empty head' },
    { files: { 'index.html': '<head>\n  <title>A</title>\n  <meta name="a" />\n  <div>odd</div>\n</head>' }, name: 'a head with something unparsable is left alone' },
    { files: { 'index.html': '<html></html>' }, name: 'no head' },
    { name: 'no index.html' },
  ],
})

testRule(indexHtmlTileColor, {
  invalid: [{ errors: ['different'], files: { 'index.html': '<head><meta name="msapplication-TileColor" content="#000" /></head>' }, flags: { themeColor: '#fb923c' }, name: 'another color', output: '<head><meta name="msapplication-TileColor" content="#fb923c" /></head>' }],
  valid: [
    { files: { 'index.html': '<head><meta name="msapplication-TileColor" content="#fb923c" /></head>' }, flags: { themeColor: '#fb923c' }, name: 'the theme color' },
    { files: { 'index.html': '<head></head>' }, flags: { themeColor: '#fb923c' }, name: 'no tag, none is added' },
    { files: { 'index.html': '<head><meta name="msapplication-TileColor" content="#000" /></head>' }, name: 'no theme color to follow' },
  ],
})

testRule(indexHtmlMaskIconColor, {
  invalid: [
    { errors: ['different'], files: { 'index.html': '<head><link rel="mask-icon" href="a.svg" color="#000" /></head>' }, flags: { themeColor: '#fb923c' }, name: 'another color', output: '<head><link rel="mask-icon" href="a.svg" color="#fb923c" /></head>' },
    { errors: ['different'], files: { 'index.html': '<head><link rel="mask-icon" href="a.svg"></head>' }, flags: { themeColor: '#fb923c' }, name: 'no color', output: '<head><link rel="mask-icon" href="a.svg" color="#fb923c"></head>' },
  ],
  valid: [{ files: { 'index.html': '<head><link rel="mask-icon" href="a.svg" color="#fb923c" /></head>' }, flags: { themeColor: '#fb923c' }, name: 'the theme color' }],
})
