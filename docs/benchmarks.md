
# Benchmarks

## Via `hyperfine`

Each bench result is from `hyperfine --runs 20 --warmup 3 'COMMAND_TO_BENCH'`.

| date       | command / target | delay  | node  | machine          | comment |
| ---------- | ---------------- | ------ | ----- | ---------------- | ------- |
| 2023-06-19 | esbuild 0.18     | 12 ms  | 18.16 | Linux            |         |
| 2023-06-19 | eslint 8.43      | 7,4 s  | 18.16 | Linux            |         |
| 2023-06-19 | repo-check 1.31  | 60 ms  | 18.16 | Linux            |         |
| 2023-06-19 | tsc-no-emit 5.1  | 760 ms | 18.16 | Linux            |         |
| 2023-06-19 | vitest 0.32      | 1,8 s  | 18.16 | Linux            |         |
| 2023-06-19 | vitest-v8        | 1,9 s  | 18.16 | Linux            |         |
| 2023-07-17 | esbuild 0.18     | 12 ms  | 18.16 | Linux            |         |
| 2023-07-17 | repo-check 1.33  | 55 ms  | 18.16 | Linux            |         |
| 2023-07-17 | vitest 0.33      | 1,97 s | 18.16 | Linux            |         |
| 2023-07-17 | vitest-v8        | 2,16 s | 18.16 | Linux            |         |
| 2024-06-19 | eslint 8.57      | 6,05 s | 20.14 | romain duc win11 |         |
| 2024-06-19 | repo-check 1.35  | 72 ms  | 20.14 | romain duc win11 |         |
| 2024-06-19 | tsc-no-emit 5.4  | 750 ms | 20.14 | romain duc win11 |         |
| 2024-06-19 | vitest 1.6       | 1,79 s | 20.14 | romain duc win11 |         |
| 2024-06-19 | vitest-v8 1.6    | 2,19 s | 20.14 | romain duc win11 |         |

Command aliases :

- repo-check : `node dist/repo-check.min.cjs`
- esbuild : `node_modules/.bin/esbuild src/index.ts --target=esnext --bundle --platform=node --minify --outfile=dist/repo-check.min.cjs`
- tsc-no-emit : `node node_modules/typescript/bin/tsc --noEmit`
- npx-tsc-no-emit : `npx tsc --noEmit`
- eslint : `node node_modules/eslint/bin/eslint --fix --ignore-path .gitignore --ext .js,.ts .`
- eslint-ts-src-only : `node node_modules/eslint/bin/eslint src/ --ext .ts`
- uvu : `node node_modules/uvu/bin -r tsm tests`
- c8-uvu : `node node_modules/c8/bin/c8 node_modules/uvu/bin -r tsm tests`
- vitest : `npx vitest --run`
- vitest-c8 : `npx vitest --run --coverage`
- vitest-v8 : `npx vitest --run --coverage`

## Old method via `time`

Each task is run 3 times via `time npm run <task>` to get the average execution time in seconds.

| task       | lib          | seconds    | comment                                            |
| ---------- | ------------ | ---------- | -------------------------------------------------- |
| build      | tsup         | 1          | 0 config, 1 dep only, super fast                   |
| build      | rollup       | 2,7        | lots of deps (plugins) & config to do the same job |
| build      | esbuild      | 0,2        | amazing 👍                                          |
| check      | repo-checker | 3,2 (2019) | can surely be reduced ^^                           |
| check      | repo-checker | 0,8 (2021) |                                                    |
| lint       | xo           | 2,7        |                                                    |
| lint       | eslint       | 3,5        |                                                    |
| test       | ava          | 9          |                                                    |
| test       | mocha        | 7,4        | a bit faster, same amount of setup                 |
| test       | uvu          | 1,2        | amazing 👍                                          |
| test + cov | ava + c8     | 16         | 7 seconds for c8 coverage ? wtf                    |
| test + cov | mocha + c8   | 12         | 7 seconds for c8 coverage ? wtf                    |
| test + cov | mocha + nyc  | 9,6        | 2 seconds for coverage seems more reasonable       |
| test + cov | uvu + c8     | 1,6        | amazing 👍                                          |
