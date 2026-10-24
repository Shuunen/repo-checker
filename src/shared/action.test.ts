import { attempt, refused } from './action.ts'

describe(attempt, () => {
  it('gives the answer when it works, and a refusal with the message when it throws', async () => {
    expect.hasAssertions()
    await expect(attempt(() => Promise.resolve({ ok: true }))).resolves.toStrictEqual({ ok: true })
    await expect(attempt(() => Promise.reject(new Error('gh exploded')))).resolves.toStrictEqual(refused('gh exploded'))
  })
})
