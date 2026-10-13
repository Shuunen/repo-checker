# Conventions

The rewrite follows the same tooling and rules as the `snippets` repo, so the repos stay consistent.

## Tooling

- bun for development: it is the package manager and runs the TypeScript sources directly (`bun scan`, `bun ui`, `bun check`).
- Node 24 (`.nvmrc`) for users: the published package is plain JavaScript built by `tsdown`, so `npx repo-check` only needs Node, not bun.
- oxlint to lint, oxfmt to format (`.oxfmtrc.json`, migrated from the old biome config: 300 columns, single quotes, no semicolons). Biome is gone. Long tables stay one item per line without any ignore comment.
- vitest for tests, Testing Library for the web.
- Vite builds `src/web`, `bun dev` serves it with `/api` proxied to `bun ui`. Its packages are devDependencies, since Vite bundles them.
- The `react` lint plugin is on for the page. Decided rule by rule: `react/jsx-max-depth` is 5 (a HeroUI table is 5 deep), `react/jsx-no-literals` and `react/forbid-component-props` are off (plain text in the markup, `className` on HeroUI components). `react/react-in-jsx-scope` is off and `.tsx` is the JSX extension, as the new JSX transform needs. The `vitest` plugin only runs on test files, and `rule-tester.ts` only gets the vitest globals.
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

`bun check` runs types, formatting, lint, build and tests. Run it after every change and fix all failures before calling work done.
