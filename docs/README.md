# Docs

Version 2 rewrote repo-checker from scratch. The docs were written and approved first, the code follows them, and they are kept in sync with it: `src/server/engine/rules.test.ts` checks `checks.md` against the rules.

- [designs/projects-dashboard.md](designs/projects-dashboard.md) : the decision record of version 2. What we are building, why, what was ruled out, open questions, next steps.
- [designs/theme-color.md](designs/theme-color.md) : the decision record of `themeColor`, one color for the web app and the editor.
- [checks.md](checks.md) : every check, built or wanted, with the ids used in the code.
- [features.md](features.md) : the Sync checks and their actions, their exact behavior, the safety rules.
- [architecture.md](architecture.md) : folders, scan flow, API, actions, web app, tests.
- [ui.md](ui.md) : look, screens, states, mockups.
- [conventions.md](conventions.md) : tooling and code rules.
- [scripts-turbo.md](scripts-turbo.md) : the agreed shape of the `package.json` scripts and of turbo, that the `scripts-*` and `turbo-*` checks enforce.
- [../TODOS.md](../TODOS.md) : future work that is not a check (actions, output, ideas).

[../demo/README.md](../demo/README.md) : the demo account, a fake `gh` and real local projects, to try the dashboard and take screenshots. `banner.svg` is the project logo. `demo-cli.svg` and `demo-ui.svg` are the animated demos of the README, `demo-list.jpg` and `demo-dialog.jpg` are captures of the dashboard on that demo account, nothing real in them.
