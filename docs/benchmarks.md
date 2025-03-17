
# Benchmarks

- [Benchmarks](#benchmarks)
  - [Execution](#execution)
  - [Build](#build)
  - [Lint](#lint)
  - [Tsc](#tsc)
  - [Unit tests](#unit-tests)
  - [Old method](#old-method)

## Execution

Using Tsup to build the checker, then using node to run the common-js build.

`pnpm build` then `hyperfine --runs 20 --warmup 3 'node dist/repo-check.cjs' 'bun dist/repo-check.cjs'`

|    date    | repo-checker |   runner   | delay  | machine          | comment                                                       |
| :--------: | :----------: | :--------: | :----: | ---------------- | ------------------------------------------------------------- |
| 2023-06-19 |     1.31     | node 18.16 | 60 ms  | romain linux     |                                                               |
| 2023-07-17 |     1.33     | node 18.16 | 55 ms  | romain linux     |                                                               |
| 2024-06-19 |     1.35     | node 20.14 | 72 ms  | romain duc win11 |                                                               |
| 2024-12-29 |     1.40     | node 22.11 | 179 ms | romain duc win11 | 2x slow but 6 months have passed, not sure what happened here |
| 2024-12-29 |     1.40     | bun 1.1.42 | 78 ms  | romain duc win11 | what the ?!? bun is 2x faster than node                       |
| 2024-12-29 |     1.40     | deno 2.1.4 | 68 ms  | romain duc win11 | deno is also 2x faster than node                              |
| 2025-03-17 |     1.42     | node 22.14 | 241 ms | romain duc win11 | node even slower now...                                       |
| 2025-03-17 |     1.42     | bun 1.2.4  | 87 ms  | romain duc win11 | nice ^^                                                       |

Running the typescript file directly.

`hyperfine --runs 20 --warmup 3 'node --experimental-strip-types src/repo-check.ts' 'bun src/repo-check.ts'`

|    date    | repo-checker | runner     | delay  | machine          | comment                                                |
| :--------: | :----------: | ---------- | :----: | ---------------- | ------------------------------------------------------ |
| 2024-12-29 |     1.40     | node 22.11 | 235 ms | romain duc win11 | wow not far from the cjs build !                       |
| 2024-12-29 |     1.40     | bun 1.1.42 | 84 ms  | romain duc win11 | what the ?!? 2x faster than node running the cjs build |
| 2024-12-29 |     1.40     | deno 2.1.4 | 68 ms  | romain duc win11 | why even build things at this point xD                 |
| 2025-03-17 |     1.42     | node 22.14 | 300 ms | romain duc win11 |                                                        |
| 2025-03-17 |     1.42     | bun 1.2.4  | 92 ms  | romain duc win11 | very nice ^^                                           |

Notes :

1. `ts-node src/repo-check.ts` is simply not working, and give this error : `TypeError: Unknown file extension ".ts" for C:\Users\Huei\Projects\github\repo-checker\src\repo-check.ts`, for sure `.ts` is not that common in the typescript world.
2. `tsx src/repo-check.ts` is working and giving a 554 ms delay, but it's not a runner, it's compiling via esbuild and then running the build.

## Build

`hyperfine --runs 6 --warmup 2 'node ./node_modules/tsup/dist/cli-node.js'`

|    date    |    runner    | delay  | node  | machine          | comment                                    |
| :--------: | :----------: | :----: | ----- | ---------------- | ------------------------------------------ |
| 2024-12-29 | esbuild 0.24 | 177 ms | 22.11 | romain duc win11 | producing a single cjs output              |
| 2024-12-29 |   tsup 8.3   | 1.2 s  | 22.11 | romain duc win11 | producing 4 outputs : cjs, js, d.cts, d.ts |
| 2025-03-17 |   tsup 8.4   | 1.3 s  | 22.14 | romain duc win11 | same as before                             |

## Lint

`hyperfine --runs 4 --warmup 1 'bun node_modules/eslint/bin/eslint src'`

`hyperfine --runs 40 --warmup 3 'bun ./node_modules/oxlint/bin/oxlint src'`

|    date    |   runner    | eslint-plugin-shuunen | delay | node  | bun   | machine           | comment                           |
| :--------: | :---------: | :-------------------: | :---: | ----- | ----- | ----------------- | --------------------------------- |
| 2023-06-19 | eslint 8.43 |                       | 7,4 s | 18.16 |       | romain linux      |                                   |
| 2024-06-19 | eslint 8.57 |                       | 6,0 s | 20.14 |       | romain duc win11  |                                   |
| 2024-07-08 | eslint 9.60 |          0.1          | 3,9 s | 20.15 |       | romain gram zorin | introducing eslint plugin shuunen |
| 2024-12-29 | eslint 9.17 |          0.4          | 3,6 s | 22.11 |       | romain duc win11  |                                   |
| 2025-03-17 | eslint 9.22 |          1.1          | 4,2 s | 22.14 | 1.2.4 | romain duc win11  |                                   |
| 2025-03-17 | oxlint 0.16 |       adios :'/       | 97 ms | 22.14 | 1.2.4 | romain duc win11  | omg ^^''                          |

## Tsc

`hyperfine --runs 10 --warmup 2 'node node_modules/typescript/bin/tsc --noEmit'`

|    date    | runner  | delay  | node  | machine          | comment |
| :--------: | :-----: | :----: | ----- | ---------------- | ------- |
| 2023-06-19 | tsc 5.1 | 760 ms | 18.16 | romain linux     |         |
| 2024-06-19 | tsc 5.4 | 750 ms | 20.14 | romain duc win11 |         |
| 2024-12-29 | tsc 5.7 | 818 ms | 22.11 | romain duc win11 |         |
| 2025-03-17 | tsc 5.8 | 938 ms | 22.14 | romain duc win11 |         |

For fun, proving `npx` is damn slow : `hyperfine --runs 10 --warmup 2 'npx tsc --noEmit'`

|    date    | runner  | delay  | node  | machine          | comment                        |
| :--------: | :-----: | :----: | ----- | ---------------- | ------------------------------ |
| 2024-12-29 | tsc 5.7 | 1.78 s | 22.11 | romain duc win11 | same objective, 2 times slower |
| 2025-03-17 | tsc 5.8 | 1.99 s | 22.14 | romain duc win11 | same objective, 2 times slower |

## Unit tests

`hyperfine --runs 5 --warmup 1 'node node_modules/vitest/dist/cli.js --run'`.

|    date    |   runner    | delay | node  | machine          | comment             |
| :--------: | :---------: | :---: | ----- | ---------------- | ------------------- |
| 2023-06-19 | vitest 0.32 | 1,8 s | 18.16 | romain linux     |                     |
| 2023-07-17 | vitest 0.33 | 2,0 s | 18.16 | romain linux     |                     |
| 2024-06-19 | vitest 1.6  | 1,8 s | 20.14 | romain duc win11 |                     |
| 2024-12-29 | vitest 1.7  | 4,5 s | 22.11 | romain duc win11 | damn slow :'/       |
| 2025-03-17 | vitest 3.0  | 6,6 s | 22.14 | romain duc win11 | slower & slower :'/ |

## Old method

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
