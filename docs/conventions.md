# Conventions

The rewrite follows the same tooling and rules as the `snippets` repo, so the repos stay consistent.

## Tooling

- pnpm, Node 24 (`.nvmrc`).
- oxlint and oxfmt. Biome is dropped.
- vitest for tests, Testing Library for the web.
- Vite builds `src/web`.
- Never disable a lint rule without asking. Try to fix the code first.

## Code

- Constants are camelCase, never UPPER_SNAKE_CASE.
- Absent values are `undefined`, never `null`. Check with `isNil` from es-toolkit.
- Zod nullish values: `.nullish().transform(x => x ?? undefined)`.
- Narrow with `invariant(x, "msg")` from es-toolkit, never `x!` and never a silent `if (!x) return`.
- No class unless there is no other way (an open item from the old README).
- Everything in `src/server/engine` has JSDoc: a `@module` comment at the top of each file, then every declaration and every interface property. Public functions get an `@example`. `src/server/engine/jsdoc.test.ts` enforces it, because oxlint can only check existing comments, not require them.

## Tests

- `describe`, `it` and `expect` are globals, do not import them.
- Files are named `.test.ts` or `.test.tsx`, never `.spec.ts`.
- No blank lines inside `test` and `it` blocks.
- Select with `getByTestId`, `queryByTestId`, `getAllByTestId` only. Test ids are kebab-case, built with `kebabCase` from es-toolkit when dynamic.
- Do not add `toBeInTheDocument()` after `getByTestId`. Use `toHaveTextContent`, `toHaveClass`, `toHaveAttribute`.
- Pair `expect(x).toBeDefined()` with `invariant(x, "msg")`.
- Use `toBeTypeOf("number")` instead of `expect(typeof x).toBe("number")`.

## Checks

`pnpm check` runs types, formatting, lint, build and tests. Run it after every change and fix all failures before calling work done.
