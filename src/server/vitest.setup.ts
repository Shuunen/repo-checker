import { vi } from 'vitest'

// No test reaches the internet: the facts fall back when nodejs.org cannot be read, local servers still answer
const realFetch = fetch
vi.stubGlobal('fetch', (input: Parameters<typeof fetch>[0], init?: RequestInit) => (String(input).startsWith('http://127.0.0.1') ? realFetch(input, init) : Promise.reject(new Error('no network in tests'))))
