# Demo

A fake account to look at the dashboard without touching your own repos, and to take the screenshots of the README.

```bash
bun run build   # the page is served from dist/web
bun demo        # builds the demo projects in a temporary folder, starts the dashboard on http://127.0.0.1:4760
```

Anything after `bun demo` goes to `repo-check ui`, for example `bun demo --no-open`.

## What it is

- `build-world.mjs` builds 11 projects in a temporary folder: real git clones with bare origins, so their git state is real (a clone that is behind, one with a stash, uncommitted files, an unpushed commit, a feature branch), plus a plain folder that is not a git repo. Their origin is set to a fake GitHub address, so the scan runs with `--no-fetch`.
- `gh` is a fake GitHub CLI that answers the calls of the scan with 10 repos of an account called `demo` (two archived, two forks, two not cloned). It comes first in the `PATH` of the demo server only, and `HOME` is the demo folder so the page shows `~/projects`.
- `start.mjs` ties them together. `demo.test.mjs` is a smoke test: if the scan starts asking GitHub for something the fake `gh` does not know, or a kind of finding disappears, `bun check` fails.

The actions work on this world too, they only touch the demo folder: a fix rewrites a demo file, a clone or a push would try the fake GitHub address and fail.
