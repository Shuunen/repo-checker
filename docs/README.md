# Docs

The `rewrite/projects-dashboard` branch rewrites repo-checker from scratch. The docs were written and approved first, the code follows them, and they are kept in sync with it: `src/server/rules.test.ts` checks `checks.md` against the rules.

- [designs/projects-dashboard.md](designs/projects-dashboard.md) : the decision record. What we are building, why, what was ruled out, open questions, next steps.
- [checks.md](checks.md) : every check, v1 and later, with the ids used in the code.
- [features.md](features.md) : v1 scope (the Sync checks), their exact behavior, the safety rules.
- [architecture.md](architecture.md) : folders, scan flow, API sketch, tests.
- [ui.md](ui.md) : look, screens, states, mockups.
- [conventions.md](conventions.md) : tooling and code rules.
- [questions.md](questions.md) : decisions taken without asking and questions that blocked a task, to review together.
- [../TODOS.md](../TODOS.md) : future work that is not a check (actions, output, ideas).

`banner.svg` is the project logo. `demo-1.42.jpg` shows the old tool's output, replace it with a capture of the new report.
