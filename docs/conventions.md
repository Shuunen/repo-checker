# Conventions

The rewrite follows the same tooling and rules as the `snippets` repo, so the repos stay consistent.

## Tooling

- pnpm for development: it is the package manager, and Node 26 runs the TypeScript sources directly (`pnpm start`, `pnpm start:ui`, `pnpm check`).
- Node 26 (`.nvmrc`) for users: the published package is plain JavaScript built by `tsdown`, so `npx repo-check` only needs Node, not pnpm.
- oxlint to lint, oxfmt to format (`.oxfmtrc.json`, migrated from the old biome config: 300 columns, single quotes, no semicolons). Biome is gone. Long tables stay one item per line without any ignore comment.
- vitest for tests, Testing Library for the web.
- Vite builds `src/web`, `pnpm dev` serves it with `/api` proxied to `pnpm start:ui`. Its packages are devDependencies, since Vite bundles them.
- The `react` lint plugin is on for the page. Decided rule by rule: `react/jsx-max-depth` is 5 (a HeroUI table is 5 deep), `react/jsx-no-literals` and `react/forbid-component-props` are off (plain text in the markup, `className` on HeroUI components). `react/react-in-jsx-scope` is off and `.tsx` is the JSX extension, as the new JSX transform needs. The `vitest` plugin only runs on test files, and the test helpers (`rule-tester.ts`, `fixtures.ts`, `render-app.tsx`) only get the vitest globals. `react/jsx-props-no-spreading` stays on, so components take explicit props.
- oxlint runs type aware (`options.typeAware` and `typeCheck`, with `oxlint-tsgolint`). Turned off after a first run because they are noise here or wrong: `prefer-readonly-parameter-types`, `promise-function-async`, `no-confusing-void-expression`, `no-unsafe-type-assertion`, `strict-boolean-expressions`, `strict-void-return`, `non-nullable-type-assertion-style` (it asks for `x!`), `prefer-nullish-coalescing` (the `||` on GitHub fields is on purpose, empty strings count as absent), and `no-unnecessary-type-assertion`, `no-unnecessary-type-parameters`, `no-unnecessary-condition` (their `--fix-dangerously` removed casts that `tsc` needs). The `no-unsafe-*` and `prefer-promise-reject-errors` rules are off in tests and `sw.js`, `no-base-to-string` in tests.
- Never disable a lint rule without asking. Try to fix the code first.

## Code

- Constants are camelCase, never UPPER_SNAKE_CASE.
- Absent values are `undefined`, never `null`. Check with `isNil` from es-toolkit.
- Zod nullish values: `.nullish().transform(x => x ?? undefined)`.
- Narrow with `invariant(x, "msg")` from es-toolkit, never `x!` and never a silent `if (!x) return`.
- No `try`/`catch`, avoid it unless nothing else can replace it. Use the Result pattern with the `Result` util from `shuutils`: `Result.trySafe(() => JSON.parse(text))` or `await Result.trySafe(promise)` gives `{ ok, value }` or `{ ok: false, error }`, `Result.ok(value)` and `Result.error('message')` build one, `Result.unwrap(result)` gives `{ value, error }`. Functions that can fail return a `Result` instead of throwing, and the caller checks `result.ok`.
- No class unless there is no other way (an open item from the old README).
- Web components take a named `<Component>Props` interface, never an inline props type, and each prop is documented once, on that interface. `jsdoc/require-param` has `checkDestructured: false` in `src/web`, so the component JSDoc only has `@param props the props`.
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
