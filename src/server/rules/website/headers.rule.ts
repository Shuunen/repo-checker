import { requireInFile } from '../../engine/file-rules.ts'
import { hasDependency } from '../../engine/package-json.ts'
import { isWebsite } from './website-files.rule.ts'

/** Where a website keeps its `_headers` file, the Netlify one: the `public` folder, else `static`, else the root of a plain site */
const files = ['public/_headers', 'static/_headers', '_headers']

/**
 * Add a header to the `/*` rules of a `_headers` file, at the end of that section. A file without that section gets one
 * @param text the `_headers` text
 * @param header the header line without indentation, like `X-Frame-Options: DENY`
 * @returns the new text
 * @example addHeader('/*\n  X-Frame-Options: DENY\n', 'Referrer-Policy: no-referrer') // '/*\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n'
 */
function addHeader(text: string, header: string) {
  const lines = text.split('\n')
  const start = lines.findIndex(line => line.trim() === '/*')
  if (start === -1) return `${text.trim() === '' ? '' : `${text.trimEnd()}\n`}/*\n  ${header}\n`
  let end = start + 1
  while (/^\s+\S/u.test(lines[end] ?? '')) end += 1
  const indent = /^\s+/u.exec(lines[start + 1] ?? '')?.[0] ?? '  '
  return lines.toSpliced(end, 0, `${indent}${header}`).join('\n')
}

/** What a header check needs */
interface HeaderCheck {
  /** What to tell in the message, after the file name */
  advice: string
  /** The header line to add, like `X-Frame-Options: DENY` */
  header: string
  /** The check id */
  id: string
  /** The pattern a valid header line matches */
  pattern: RegExp
}

/**
 * A check that the `_headers` file of a website sets a header, fixed by adding it
 * @param check the check
 * @param check.advice what to tell in the message, after the file name
 * @param check.header the header line to add, like `X-Frame-Options: DENY`
 * @param check.id the check id
 * @param check.pattern the pattern a valid header line matches
 * @returns the rule
 */
function requireHeader({ advice, header, id, pattern }: Readonly<HeaderCheck>) {
  return requireInFile({ files, fix: text => addHeader(text, header), id, message: `{{file}} ${advice}, like ${header}`, pattern, severity: 'warning', when: isWebsite })
}

export const headerRules = [
  requireHeader({ advice: 'does not stop browsers from guessing the type of a file', header: 'X-Content-Type-Options: nosniff', id: 'headers-nosniff', pattern: /^[ \t]+X-Content-Type-Options:[ \t]*nosniff\b/imu }),
  requireHeader({ advice: 'does not forbid showing the site in a frame of another site', header: 'X-Frame-Options: DENY', id: 'headers-frame-options', pattern: /^[ \t]+X-Frame-Options:[ \t]*(?:DENY|SAMEORIGIN)\b/imu }),
  requireHeader({ advice: 'does not set a referrer policy', header: 'Referrer-Policy: strict-origin-when-cross-origin', id: 'headers-referrer-policy', pattern: /^[ \t]+Referrer-Policy:/imu }),
  requireInFile({
    files,
    id: 'headers-csp',
    message: "{{file}} sets no Content-Security-Policy, it cannot be added for you as it goes with a nonce plugin, like script-src 'self' 'strict-dynamic' 'nonce-...'; object-src 'none'; base-uri 'self'",
    pattern: /^[ \t]+Content-Security-Policy:/imu,
    severity: 'info',
    when: isWebsite,
  }),
  requireInFile({
    files,
    fix: text => `${text.trimEnd()}\n/sw.js\n  Cache-Control: no-cache\n`,
    id: 'headers-sw-no-cache',
    message: '{{file}} lets the service worker be cached, a stale sw.js keeps old versions alive, like "/sw.js" with Cache-Control: no-cache',
    pattern: /^\/sw\.js[ \t]*\n(?:[ \t]+[^\n]*\n)*?[ \t]+Cache-Control:[^\n]*no-cache/imu,
    severity: 'warning',
    when: context => isWebsite(context) && hasDependency(context.pkg, 'vite-plugin-pwa'),
  }),
]
