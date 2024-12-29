
# Benchmarks

- [Benchmarks](#benchmarks)
  - [Execution](#execution)
  - [Build](#build)
  - [Eslint](#eslint)
  - [Tsc](#tsc)
  - [Vitest](#vitest)
  - [Old method](#old-method)

## Execution

Using Tsup to build the checker, then using node to run the common-js build.

`pnpm build` then `hyperfine --runs 20 --warmup 3 'node dist/repo-check.cjs' 'bun src/repo-check.cjs' 'deno --allow-env --allow-read dist/repo-check.cjs'`

|    date    | version |   runner   | delay  | node  | machine          | comment                                                       |
| :--------: | :-----: | :--------: | :----: | ----- | ---------------- | ------------------------------------------------------------- |
| 2023-06-19 |  1.31   |    node    | 60 ms  | 18.16 | romain linux     |                                                               |
| 2023-07-17 |  1.33   |    node    | 55 ms  | 18.16 | romain linux     |                                                               |
| 2024-06-19 |  1.35   |    node    | 72 ms  | 20.14 | romain duc win11 |                                                               |
| 2024-12-29 |  1.40   |    node    | 179 ms | 22.11 | romain duc win11 | 2x slow but 6 months have passed, not sure what happened here |
| 2024-12-29 |  1.40   | bun 1.1.42 | 78 ms  | 22.11 | romain duc win11 | what the ?!? bun is 2x faster than node                       |
| 2024-12-29 |  1.40   | deno 2.1.4 | 68 ms  | 22.11 | romain duc win11 | deno is also 2x faster than node                              |

Running the typescript file directly.

`hyperfine --runs 20 --warmup 3 'node --experimental-strip-types src/repo-check.ts' 'bun src/repo-check.ts' 'deno --allow-env --allow-read src/repo-check.ts'`

|    date    | version | runner       | delay  | node  | machine          | comment                                                |
| :--------: | :-----: | ------------ | :----: | ----- | ---------------- | ------------------------------------------------------ |
| 2024-12-29 |  1.40   | node --strip | 235 ms | 22.11 | romain duc win11 | wow not far from the cjs build !                       |
| 2024-12-29 |  1.40   | bun 1.1.42   | 84 ms  | 22.11 | romain duc win11 | what the ?!? 2x faster than node running the cjs build |
| 2024-12-29 |  1.40   | deno 2.1.4   | 68 ms  | 22.11 | romain duc win11 | why even build things at this point xD                 |

Notes :

1. `ts-node src/repo-check.ts` is simply not working, and give this error : `TypeError: Unknown file extension ".ts" for C:\Users\Huei\Projects\github\repo-checker\src\repo-check.ts`, for sure `.ts` is not that common in the typescript world.
2. `tsx src/repo-check.ts` is working and giving a 554 ms delay, but it's not a runner, it's compiling via esbuild and then running the build.

## Build

`hyperfine --runs 6 --warmup 2 'node ./node_modules/tsup/dist/cli-node.js'`

|    date    | version | delay  | node  | machine          | comment                                                |
| :--------: | :-----: | :----: | ----- | ---------------- | ------------------------------------------------------ |
| 2024-12-29 |   n/a   | 177 ms | 22.11 | romain duc win11 | using esbuild 0.24 and producing a single cjs output   |
| 2024-12-29 |   8.3   | 1.2 s  | 22.11 | romain duc win11 | using tsup, producing 4 outputs : cjs, js, d.cts, d.ts |

## Eslint

`hyperfine --runs 4 --warmup 1 'node node_modules/eslint/bin/eslint src'`

|    date    | version | eslint-plugin-shuunen | delay | node  | machine           | comment                           |
| :--------: | :-----: | :-------------------: | :---: | ----- | ----------------- | --------------------------------- |
| 2023-06-19 |  8.43   |                       | 7,4 s | 18.16 | romain linux      |                                   |
| 2024-06-19 |  8.57   |                       | 6,0 s | 20.14 | romain duc win11  |                                   |
| 2024-07-08 |  9.60   |          0.1          | 3,9 s | 20.15 | romain gram zorin | introducing eslint plugin shuunen |
| 2024-12-29 |  9.17   |          0.4          | 3,6 s | 22.11 | romain duc win11  |                                   |

## Tsc

`hyperfine --runs 10 --warmup 2 'node node_modules/typescript/bin/tsc --noEmit'`

|    date    | version | delay  | node  | machine          | comment |
| :--------: | :-----: | :----: | ----- | ---------------- | ------- |
| 2023-06-19 |   5.1   | 760 ms | 18.16 | romain linux     |         |
| 2024-06-19 |   5.4   | 750 ms | 20.14 | romain duc win11 |         |
| 2024-12-29 |   5.7   | 818 ms | 22.11 | romain duc win11 |         |

For fun, proving `npx` is damn slow : `hyperfine --runs 10 --warmup 2 'npx tsc --noEmit'`

|    date    | version | delay  | node  | machine          | comment                        |
| :--------: | :-----: | :----: | ----- | ---------------- | ------------------------------ |
| 2024-12-29 |   5.7   | 1.78 s | 22.11 | romain duc win11 | same objective, 2 times slower |

## Vitest

`hyperfine --runs 5 --warmup 1 'node node_modules/vitest/dist/cli.js --run'`.

|    date    | version | delay | node  | machine          | comment       |
| :--------: | :-----: | :---: | ----- | ---------------- | ------------- |
| 2023-06-19 |  0.32   | 1,8 s | 18.16 | romain linux     |               |
| 2023-07-17 |  0.33   | 2,0 s | 18.16 | romain linux     |               |
| 2024-06-19 |   1.6   | 1,8 s | 20.14 | romain duc win11 |               |
| 2024-12-29 |   1.7   | 4,5 s | 22.11 | romain duc win11 | damn slow :'/ |

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
