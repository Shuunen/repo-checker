/**
 * Whether the deployed website of a project answers. A machine that is offline would see every site down, so a site is only probed when GitHub itself answers.
 * @module
 */
import type { WebStatus } from './engine/flags.ts'

/** How long to wait for a site, in ms */
const fetchTimeout = 5000

/** How long an answer is kept, in ms */
const keepMs = 300_000

/** The site asked to tell the machine is online */
const onlineProbe = 'https://github.com'

/** What the probe needs from the outside, replaced by fakes in tests */
export interface SiteDeps {
  /** Get the HTTP status of a url, undefined when the request failed */
  fetchStatus: (url: string) => Promise<number | undefined>
  /** The current time in milliseconds */
  now: () => number
}

/** The real dependencies */
export const realSiteDeps: SiteDeps = {
  async fetchStatus(url) {
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(fetchTimeout) })
      await response.body?.cancel()
      return response.status
    } catch {
      return undefined
    }
  },
  now: () => Date.now(),
}

/**
 * Build the probe of the sites, with its cache
 * @param deps how to reach the outside
 * @returns the probe
 * @example const { statusOf } = createSiteStatus(realSiteDeps)
 */
export function createSiteStatus(deps: Readonly<SiteDeps>) {
  const cache = new Map<string, { at: number; status: Promise<number | undefined> }>()

  /**
   * Ask a url for its status, once per five minutes
   * @param url the url
   * @returns the HTTP status, undefined when the request failed
   */
  function ask(url: string) {
    const kept = cache.get(url)
    if (kept !== undefined && deps.now() - kept.at < keepMs) return kept.status
    const status = deps.fetchStatus(url)
    cache.set(url, { at: deps.now(), status })
    return status
  }

  /**
   * Tell whether a site answers
   * @param url the url of the site
   * @returns its status, undefined when the machine is offline, since nothing can be said then
   */
  async function statusOf(url: string): Promise<WebStatus | undefined> {
    if ((await ask(onlineProbe)) === undefined) return undefined
    return { status: (await ask(url)) ?? 'unreachable', url }
  }

  return { statusOf }
}
