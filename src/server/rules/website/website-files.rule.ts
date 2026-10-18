import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { requireFile } from '../../engine/file-rules.ts'
import type { FileReader } from '../../engine/io.ts'
import type { PackageJson } from '../../engine/package-json.ts'

/**
 * Tell if the project is published as a website
 * @param context the project context
 * @param context.flags the project flags
 * @returns true for a website or a web app
 */
function isWebsite({ flags }: Readonly<Context>) {
  return flags.isWebPublished === true
}

/** The json indent of the files created */
const indent = 2

/** The folders where a website keeps the files it serves as they are, the root of the project itself for a plain site */
const staticPlaces = ['', 'public/', 'static/']

/** What each static file the website needs is, its content when it can be created */
const staticFiles = [
  { content: () => '/*\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n', id: 'headers', name: '_headers' },
  { content: () => undefined, id: 'favicon', name: 'favicon.ico' },
  { content: (pkg: Readonly<PackageJson> | undefined) => `${JSON.stringify({ background_color: '#ffffff', display: 'standalone', name: pkg?.name ?? 'app', short_name: pkg?.name ?? 'app', start_url: '/', theme_color: '#ffffff' }, undefined, indent)}\n`, id: 'manifest', name: 'manifest.json' },
] as const

/**
 * Find where a new static file goes: the `public` folder when it exists, else `static`, else the root of a plain site, else a new `public` folder
 * @param files the reader of the project files
 * @returns the folder with its trailing slash, empty for the root
 */
async function staticFolder(files: Readonly<FileReader>) {
  const [inPublic, inStatic, index] = await Promise.all([files.search(/^/u, 'public'), files.search(/^/u, 'static'), files.readText('index.html')])
  if (inPublic.length > 0) return 'public/'
  if (inStatic.length > 0) return 'static/'
  return index === undefined ? 'public/' : ''
}

export const websiteStaticFiles = defineRule({
  appliesTo: isWebsite,
  async check({ files, pkg, report }) {
    const folder = await staticFolder(files)
    const texts = await Promise.all(staticFiles.map(({ name }) => Promise.all(staticPlaces.map(place => files.readText(`${place}${name}`)))))
    const present = texts.map(found => found.some(text => text !== undefined))
    for (const [index, item] of staticFiles.entries()) {
      const file = `${folder}${item.name}`
      const content = item.content(pkg)
      if (present[index] === true) continue
      report(content === undefined ? { data: { file }, messageId: item.id } : { data: { file }, fix: fixer => fixer.text(file, () => content), messageId: item.id })
    }
  },
  meta: {
    fixable: true,
    id: 'website-static-files',
    messages: { favicon: 'a website should have a {{file}}, it cannot be created for you', headers: 'a website should have a {{file}} to set its security headers', manifest: 'a website should have a {{file}}' },
    severity: 'warning',
  },
})

/** The ways to declare a Lighthouse budget, the first one is created */
const budgetFiles = ['budget.json', 'lighthouse-budget.json', 'lighthouserc.json', '.lighthouserc.json', '.lighthouserc.js', '.lighthouserc.cjs']

/** A first Lighthouse budget, sizes in Ko and timings in ms, to tune */
const budget = [
  {
    path: '/*',
    resourceSizes: [
      { budget: 300, resourceType: 'total' },
      { budget: 100, resourceType: 'script' },
    ],
    timings: [{ budget: 2000, metric: 'interactive' }],
  },
]

export const lighthouseBudget = requireFile({ content: `${JSON.stringify(budget, undefined, indent)}\n`, files: budgetFiles, id: 'lighthouse-budget', message: 'no Lighthouse budget, like a {{file}}', severity: 'info', when: isWebsite })
