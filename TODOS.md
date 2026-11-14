# TODOS

- [ ] check `PATTERNS.md` for potential new checks
- [ ] `stale-remote-branch` fix: `git push origin --delete`
- [ ] `multiple-lockfiles` fix: delete the extra lockfile
- [ ] `old-lockfile-format` fix: delete or migrate the obsolete lockfile
- [ ] `media-dimensions` fix: for a local image, add `width` and `height` read from the file itself (remote images and videos stay manual)
- [ ] `security-advisory` reads the lowest version of a range, not the lockfile: a `^` range can resolve to a newer, fixed version
- [ ] Clone all missing repos in one action
- [ ] CLI `--fix` applies the file fixes, then asks `y/N` for each fix that needs a manual acceptance
- [ ] Offer "git init and create GitHub repo" for local folders that have no git
- [ ] `--json` output for scripts and for Claude
- [ ] Offline mode that skips GitHub and the npm registry
- [ ] Archive ceremony: push leftovers, add an "archived" note to the README, archive on GitHub, delete the local clone
- [ ] enhance readme headers via snippets/banner or [socialify.git.ci](https://socialify.git.ci/Shuunen/repo-checker?font=Inter&language=1&owner=1&pattern=Circuit%20Board&stargazers=1&theme=Light) or [satori](https://github.com/vercel/satori)
- [ ] suggest lighthouse budget like [3f052df](https://github.com/Shuunen/stuff-finder/commit/3f052df076b23503d3692883319c618c2d045a99) & [1c4c2f3](https://github.com/Shuunen/stuff-finder/commit/1c4c2f365bc53ba158d7e4eeda596094cad8accb) add appropriate thanks to [lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action) & lighthouse
