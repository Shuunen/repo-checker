import { defineRule } from '../../engine/define-rule.ts'
import { hasDependency } from '../../engine/package-json.ts'

/** The places of the Netlify redirects file */
const places = ['public/_redirects', 'static/_redirects', '_redirects']

/** The routers that need the server to answer every path with the app */
const routers = ['react-router', 'react-router-dom', '@tanstack/react-router', 'wouter', 'vue-router']

/** The single page app fallback line */
const fallbackLine = '/* /index.html 200'

/** What a redirects file holds when the fallback is there */
const fallback = /^\/\*[ \t]+\/index\.html[ \t]+200\b/mu

export const redirectsSpaFallback = defineRule({
  appliesTo: ({ flags, pkg }) => routers.some(router => hasDependency(pkg, router)) && flags.webUrl?.includes('netlify.app') === true,
  async check({ files, report }) {
    const texts = await Promise.all(places.map(place => files.readText(place)))
    if (texts.some(text => fallback.test(text ?? ''))) return
    const file = String(
      places[
        Math.max(
          texts.findIndex(text => text !== undefined),
          0,
        )
      ],
    )
    report({ data: { file }, fix: fixer => fixer.text(file, current => (current === '' ? `${fallbackLine}\n` : `${current.trimEnd()}\n${fallbackLine}\n`)), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'redirects-spa-fallback', messages: { missing: '{{file}} has no "/* /index.html 200" line, a route opened or reloaded on Netlify would answer 404' }, severity: 'warning' },
})
