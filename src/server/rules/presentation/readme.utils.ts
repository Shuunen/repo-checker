import { escapeRegExp, invariant } from 'es-toolkit'
import type { Context } from '../../engine/context.ts'
import type { Severity } from '../../../shared/scan-event.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { hasDependency } from '../../engine/package-json.ts'

interface ReadmePatternOptions {
  /** Turn the README text into a fixed one, makes the rule fixable */
  fix?: (text: string) => string
  id: string
  message: string
  pattern: RegExp
  /** Skip the rule when the GitHub repo is private */
  publicOnly?: boolean
  severity: Severity
}

/**
 * Tell if the project has a README, the README rules apply then
 * @param context the project context
 * @param context.readme the README
 * @returns true when there is one
 */
export function hasReadme({ readme }: Readonly<Context>) {
  return readme !== undefined
}

/**
 * A rule that requires the README to match a pattern
 * @param options the options
 * @param options.fix turn the README text into a fixed one
 * @param options.id the check id
 * @param options.message the message when it does not match
 * @param options.pattern the pattern, without the `g` flag
 * @param options.publicOnly skip the rule when the GitHub repo is private
 * @param options.severity the severity
 * @returns the rule
 */
export function requireInReadme({ fix, id, message, pattern, publicOnly, severity }: Readonly<ReadmePatternOptions>) {
  return defineRule({
    appliesTo: context => hasReadme(context) && !(publicOnly === true && context.flags.isPrivate === true),
    check({ readme, report }) {
      invariant(readme !== undefined, 'appliesTo guarantees a README')
      if (pattern.test(readme.text)) return
      report(fix === undefined ? { messageId: 'missing' } : { fix: fixer => fixer.text(readme.file, fix), messageId: 'missing' })
    },
    meta: { fixable: fix !== undefined, id, messages: { missing: message }, severity },
  })
}

/**
 * A rule that forbids a pattern in the README, fixable when a transform is given
 * @param options the options
 * @param options.fix turn the README text into a fixed one
 * @param options.id the check id
 * @param options.message the message when it matches
 * @param options.pattern the pattern, without the `g` flag
 * @param options.severity the severity
 * @returns the rule
 */
export function forbidInReadme({ fix, id, message, pattern, severity }: Readonly<ReadmePatternOptions & { fix?: (text: string) => string }>) {
  return defineRule({
    appliesTo: hasReadme,
    check({ readme, report }) {
      if (readme === undefined || !pattern.test(readme.text)) return
      report(fix === undefined ? { messageId: 'found' } : { fix: fixer => fixer.text(readme.file, fix), messageId: 'found' })
    },
    meta: { fixable: fix !== undefined, id, messages: { found: message }, severity },
  })
}

/** A badge shown under the README title */
export interface Badge {
  /** The badge image url */
  image: string
  /** False when the badge cannot be added automatically, for example a website badge without a declared url */
  isFixable: boolean
  /** The badge label, its alt text */
  label: string
  /** Where the badge links to */
  link: string
}

/**
 * Build the markdown of a badge
 * @param badge the badge
 * @param badge.image the image url
 * @param badge.label the alt text
 * @param badge.link where it links to
 * @returns like `[![Npm version](image)](link)`
 */
export function badgeMarkdown({ image, label, link }: Readonly<Badge>) {
  return `[![${label}](${image})](${link})`
}

/**
 * Insert a badge line after the README title and the badge lines that follow it, so badges keep their order,
 * and keep a blank line between the badges and the text that follows, else markdown renders them inline
 * @param text the README text
 * @param line the badge line to insert
 * @returns the new text, unchanged when there is no title
 */
export function insertAfterBadges(text: string, line: string) {
  const inserted = text.replace(/^(?<top># .+\n+(?:\[!\[.*\n)*)/u, `$<top>${line}\n`)
  return inserted.replace(/^(?<badges># .+\n+(?:\[!\[.*\n)+)(?!\[!\[)(?=\S)/u, '$<badges>\n')
}

/**
 * The badges of a package published on npm
 * @param name the package name
 * @returns the npm downloads, npm version, publish size and install size badges
 */
function npmBadges(name: string): Badge[] {
  return [
    { image: `https://img.shields.io/npm/dm/${name}.svg?color=informational`, isFixable: true, label: 'Npm monthly downloads', link: `https://www.npmjs.com/package/${name}` },
    { image: `https://img.shields.io/npm/v/${name}.svg?color=informational`, isFixable: true, label: 'Npm version', link: `https://www.npmjs.com/package/${name}` },
    { image: `https://img.shields.io/bundlephobia/min/${name}?label=publish%20size`, isFixable: true, label: 'Publish size', link: `https://bundlephobia.com/package/${name}` },
    { image: `https://badgen.net/packagephobia/install/${name}`, isFixable: true, label: 'Install size', link: `https://packagephobia.com/result?p=${name}` },
  ]
}

/**
 * The "Website up" badge, fixable only when the website url is declared
 * @param webUrl the declared website url
 * @returns the badge
 */
function websiteBadge(webUrl: string | undefined): Badge {
  return { image: `https://img.shields.io/website/https/${(webUrl ?? '').replace('https://', '')}.svg`, isFixable: webUrl !== undefined, label: 'Website up', link: webUrl ?? '' }
}

/**
 * The page views counter badge, served by hits.sh in the shields.io style
 * @param slug the GitHub "owner/repo"
 * @returns the badge
 */
export function viewsBadge(slug: string): Badge {
  return { image: `https://hits.sh/github.com/${slug}.svg?label=visitors&color=informational`, isFixable: true, label: 'Visitors', link: `https://hits.sh/github.com/${slug}/` }
}

/**
 * List the badges the README should show, from the GitHub repo, the website and the npm package
 * @param context the project context
 * @param context.flags the project flags, with the GitHub owner and repo
 * @param context.pkg the package.json
 * @param context.readme the README
 * @returns the expected badges
 */
export function expectedBadges({ flags, pkg, readme }: Readonly<Context>): Badge[] {
  const slug = `${flags.owner}/${flags.repoId}`
  const license = { image: `https://img.shields.io/github/license/${slug}.svg?color=informational`, isFixable: true, label: 'Project license', link: `https://github.com/${slug}/blob/master/LICENSE` }
  const website = flags.isWebPublished === true && readme?.text.includes('shields.io/website/') !== true ? [websiteBadge(flags.webUrl)] : []
  const npm = flags.isPublishedPackage === true && pkg?.name !== undefined ? npmBadges(pkg.name) : []
  return [...(flags.isPrivate === true ? [] : [license]), ...website, ...npm]
}

/**
 * Tell if a badge is in the README, by its link in parentheses
 * @param text the README text
 * @param badge the badge
 * @returns true when present
 */
export function hasBadge(text: string, badge: Readonly<Badge>) {
  return new RegExp(`\\(${escapeRegExp(badge.link)}\\)`, 'u').test(text)
}

/** A tool to thank in the README */
interface Thanks {
  /** What the tool brings */
  description: string
  /** Tell if the project uses the tool, from its dependencies, flags or README */
  isUsed: (context: Readonly<Context>) => boolean
  /** The tool name, as linked */
  label: string
  /** The tool home page */
  link: string
}

/**
 * Tell if the project depends on one of the packages
 * @param names the package names
 * @returns the test
 */
const depends =
  (...names: readonly string[]) =>
  ({ pkg }: Readonly<Context>) =>
    names.some(name => hasDependency(pkg, name))

/**
 * Tell if the README mentions a word
 * @param word the word
 * @returns the test
 */
const mentions =
  (word: string) =>
  ({ readme }: Readonly<Context>) =>
    readme?.text.includes(word) === true

export const thanksList: readonly Thanks[] = [
  { description: 'for the nice badges on top of this readme', isUsed: mentions('shields'), label: 'Shields.io', link: 'https://shields.io' },
  { description: 'for providing free continuous deployments', isUsed: mentions('travis-ci'), label: 'Travis-ci.com', link: 'https://travis-ci.com' },
  { description: 'for all their great work year after year, pushing OSS forward', isUsed: mentions('github'), label: 'Github', link: 'https://github.com' },
  { description: 'awesome company that offers free CI & hosting for OSS projects', isUsed: mentions('netlify'), label: 'Netlify', link: 'https://netlify.com' },
  { description: 'great db provider with a nice free tier <3', isUsed: mentions('appwrite'), label: 'AppWrite', link: 'https://appwrite.io' },
  { description: 'un-opinionated, no-frills CLI argument parser', isUsed: depends('arg'), label: 'Arg', link: 'https://github.com/vercel/arg' },
  { description: 'great test runner easy to setup & use', isUsed: depends('ava'), label: 'Ava', link: 'https://github.com/avajs/ava' },
  { description: 'super fast linter & formatter', isUsed: depends('@biomejs/biome'), label: 'Biome', link: 'https://biomejs.dev' },
  { description: 'simple & effective svg editor', isUsed: mentions('.svg'), label: 'Boxy Svg', link: 'https://boxy-svg.com' },
  { description: 'super fast runtime for JavaScript and TypeScript', isUsed: ({ flags }) => flags.isUsingBun === true, label: 'Bun', link: 'https://bun.sh' },
  { description: 'simple & effective cli for code coverage', isUsed: depends('c8', '@vitest/coverage-c8'), label: 'C8', link: 'https://github.com/bcoe/c8' },
  { description: 'minimal and efficient cross-platform file watching library', isUsed: depends('chokidar'), label: 'Chokidar', link: 'https://github.com/paulmillr/chokidar' },
  { description: 'cool E2E testing framework', isUsed: depends('cypress'), label: 'Cypress.io', link: 'https://www.cypress.io' },
  { description: 'handy tool to validate and visualize dependencies', isUsed: depends('dependency-cruiser'), label: 'Dependency-cruiser', link: 'https://github.com/sverweij/dependency-cruiser' },
  { description: 'an extremely fast JavaScript bundler and minifier', isUsed: depends('esbuild'), label: 'Esbuild', link: 'https://github.com/evanw/esbuild' },
  { description: 'super tool to find & fix problems', isUsed: depends('eslint'), label: 'Eslint', link: 'https://eslint.org' },
  { description: 'super tool to find & fix problems', isUsed: depends('knip'), label: 'Knip', link: 'https://github.com/webpro/knip' },
  { description: 'great test runner easy to setup & use', isUsed: depends('mocha'), label: 'Mocha', link: 'https://github.com/mochajs/mocha' },
  { description: 'to keep my npm scripts clean & readable', isUsed: depends('npm-parallel'), label: 'Npm-parallel', link: 'https://github.com/spion/npm-parallel' },
  { description: 'to keep my npm scripts clean & readable', isUsed: depends('npm-run-all'), label: 'Npm-run-all', link: 'https://github.com/mysticatea/npm-run-all' },
  { description: 'minimalist framework for server-rendered Vue.js applications', isUsed: depends('nuxt'), label: 'Nuxt', link: 'https://github.com/nuxt/nuxt.js' },
  { description: 'simple & effective cli for code coverage', isUsed: depends('nyc'), label: 'Nyc', link: 'https://github.com/istanbuljs/nyc' },
  { description: 'a lovely super-fast collection of JavaScript tools written in Rust', isUsed: depends('oxlint', 'oxc'), label: 'Oxc', link: 'https://oxc.rs' },
  { description: 'fast 3kB alternative to React', isUsed: depends('preact'), label: 'Preact', link: 'https://preactjs.com' },
  { description: 'great library for web and native user interfaces', isUsed: depends('react'), label: 'React', link: 'https://react.dev' },
  { description: 'a lightweight library for creating reactive, state-based components and UI', isUsed: depends('reefjs'), label: 'Reef', link: 'https://github.com/cferdinandi/reef' },
  { description: 'eslint cover /src code and this tool the rest ^^', isUsed: context => depends('repo-check')(context) || context.pkg?.name === 'repo-check', label: 'Repo-checker', link: 'https://github.com/Shuunen/repo-checker' },
  { description: 'a fast & efficient js module bundler', isUsed: depends('rollup'), label: 'Rollup', link: 'https://rollupjs.org' },
  { description: 'dependency free dev server for single page app development', isUsed: depends('servor'), label: 'Servor', link: 'https://github.com/lukejacksonn/servor' },
  { description: 'a Markdown to HTML converter written in Javascript', isUsed: depends('showdown'), label: 'Showdown', link: 'https://github.com/showdownjs/showdown' },
  { description: 'collection of pure JS utils', isUsed: depends('shuutils'), label: 'Shuutils', link: 'https://github.com/Shuunen/shuutils' },
  { description: 'the great king of svg file size reduction', isUsed: mentions('.svg'), label: 'Svg Omg', link: 'https://jakearchibald.github.io/svgomg/' },
  { description: 'awesome lib to produce maintainable style', isUsed: depends('tailwindcss'), label: 'TailwindCss', link: 'https://tailwindcss.com' },
  { description: 'super fast js/ts bundler with no config, powered by esbuild <3', isUsed: depends('tsup'), label: 'Tsup', link: 'https://github.com/egoist/tsup' },
  { description: 'extremely fast and lightweight test runner for Node.js and the browser', isUsed: depends('uvu'), label: 'UvU', link: 'https://github.com/lukeed/uvu' },
  { description: 'simple & effective cli for code coverage', isUsed: depends('@vitest/coverage-v8'), label: 'V8', link: 'https://github.com/demurgos/v8-coverage' },
  { description: 'super fast frontend tooling', isUsed: depends('vite'), label: 'Vite', link: 'https://github.com/vitejs/vite' },
  { description: 'super fast vite-native testing framework', isUsed: depends('vitest'), label: 'Vitest', link: 'https://github.com/vitest-dev/vitest' },
  { description: 'great front-end framework', isUsed: depends('vue', 'nuxt', 'vitepress'), label: 'Vue', link: 'https://vuejs.org' },
  { description: 'recursively watch a list of directories & run a command on any file system', isUsed: depends('watchlist'), label: 'Watchlist', link: 'https://github.com/lukeed/watchlist' },
  { description: 'super tool to find & fix problems', isUsed: depends('xo'), label: 'Xo', link: 'https://github.com/xojs/xo' },
  { description: 'typeScript-first schema validation', isUsed: depends('zod'), label: 'Zod', link: 'https://github.com/colinhacks/zod' },
]

/**
 * Build the markdown line of a thanks entry
 * @param thanks the tool to thank
 * @param thanks.description what the tool brings
 * @param thanks.label the tool name
 * @param thanks.link the tool home page
 * @returns like `- [Vitest](https://...) : super fast vite-native testing framework`
 */
export function thanksLine({ description, label, link }: Readonly<Thanks>) {
  return `- [${label}](${link}) : ${description}`
}

/**
 * Tell if the README thanks a tool, by its linked label, ignoring the case
 * @param text the README text
 * @param thanks the tool
 * @returns true when thanked
 */
export function hasThanks(text: string, thanks: Readonly<Thanks>) {
  return new RegExp(`\\[${escapeRegExp(thanks.label)}\\]`, 'iu').test(text)
}
