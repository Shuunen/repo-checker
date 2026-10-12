import { testRule } from '../../engine/rule-tester.ts'
import { badgeMarkdown } from './readme.utils.ts'
import { readmeBadges, readmeNoDeprecatedBadges, readmeViewsCounter } from './readme-badges.rule.ts'

const repo = { owner: 'me', repoId: 'app' }
const license = badgeMarkdown({ image: 'https://img.shields.io/github/license/me/app.svg?color=informational', isFixable: true, label: 'Project license', link: 'https://github.com/me/app/blob/master/LICENSE' })
const counterUrl = 'https://views-counter.vercel.app/badge?pageId=me%2Fapp&leftColor=5c5c5c&rightColor=07a62f&type=total&label=Visitors&style=none'
const counter = `\n## Page views\n\n[![Views Counter](${counterUrl})](https://github.com/Kumara2mahe/Views-Counter)\n`
const npmBadges = [
  badgeMarkdown({ image: 'https://img.shields.io/npm/dm/app.svg?color=informational', isFixable: true, label: 'Npm monthly downloads', link: 'https://www.npmjs.com/package/app' }),
  badgeMarkdown({ image: 'https://img.shields.io/npm/v/app.svg?color=informational', isFixable: true, label: 'Npm version', link: 'https://www.npmjs.com/package/app' }),
  badgeMarkdown({ image: 'https://img.shields.io/bundlephobia/min/app?label=publish%20size', isFixable: true, label: 'Publish size', link: 'https://bundlephobia.com/package/app' }),
  badgeMarkdown({ image: 'https://badgen.net/packagephobia/install/app', isFixable: true, label: 'Install size', link: 'https://packagephobia.com/result?p=app' }),
]
const npmLinks = ['https://www.npmjs.com/package/app', 'https://bundlephobia.com/package/app', 'https://packagephobia.com/result?p=app'].map(link => `(${link})`).join(' ')

testRule(readmeBadges, {
  invalid: [
    { errors: ['missing'], files: { 'README.md': '# app\n\ntext\n' }, flags: repo, name: 'no license badge, added under the title', output: `# app\n\n${license}\ntext\n` },
    { errors: ['missingUrl'], files: { 'README.md': `# app\n${license}\n` }, flags: { ...repo, isWebPublished: true }, name: 'a website without declared url' },
    {
      errors: ['missing', 'missing', 'missing', 'missing'],
      files: { 'README.md': `# app\n${license}\ntext\n` },
      flags: { ...repo, isPublishedPackage: true },
      name: 'a published package without npm badges, added in order after the existing ones',
      output: `# app\n${license}\n${npmBadges.join('\n')}\ntext\n`,
      pkg: { name: 'app' },
    },
  ],
  valid: [
    { files: { 'README.md': `# app\n${license}\n` }, flags: repo, name: 'the license badge' },
    { files: { 'README.md': `# app\n${license}\n[![Website up](https://img.shields.io/website/https/app.dev.svg)](https://app.dev)\n` }, flags: { ...repo, isWebPublished: true, webUrl: 'https://app.dev' }, name: 'a website badge' },
    { files: { 'README.md': `# app\n${license}\n${npmLinks}\n` }, flags: { ...repo, isPublishedPackage: true }, name: 'every npm badge', pkg: { name: 'app' } },
    { files: { 'README.md': `# app\n${license}\n` }, flags: { ...repo, isPublishedPackage: true }, name: 'a published package without name' },
    { files: { 'README.md': '# app\n' }, flags: { owner: 'me' }, name: 'no known repo' },
  ],
})

testRule(readmeBadges, {
  invalid: [{ errors: ['missing'], files: { 'README.md': `# app\n${license}\n` }, flags: { ...repo, isWebPublished: true, webUrl: 'https://app.dev' }, name: 'a website badge, added', output: `# app\n${license}\n[![Website up](https://img.shields.io/website/https/app.dev.svg)](https://app.dev)\n` }],
  valid: [],
})

testRule(readmeNoDeprecatedBadges, {
  invalid: [{ errors: ['found'], files: { 'README.md': '# app\n[![deps](https://david-dm.org/me/app.svg)](https://david-dm.org/me/app)\ntext\n' }, name: 'a david-dm badge, removed', output: '# app\ntext\n' }],
  valid: [{ files: { 'README.md': '# app\n' }, name: 'no deprecated badge' }],
})

testRule(readmeViewsCounter, {
  invalid: [{ errors: ['missing'], files: { 'README.md': '# app\n' }, flags: repo, name: 'no counter, added at the end', output: `# app\n${counter}` }],
  valid: [{ files: { 'README.md': `# app\n${counter}` }, flags: repo, name: 'a counter' }],
})
