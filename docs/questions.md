# Questions and decisions to review

Status: written during an autonomous session (2026-10-13). Each item is a decision taken without asking, or a question that blocked a task. Nothing here is urgent: the code works as described, and each item says what to change if you disagree.

## Blocked tasks

None so far.

## Decisions taken without asking

1. **Delete clone removes the folder for good** (`fs.rm`), not to a trash. The dialog lists the ignored files that would be lost, and everything else is proved to be on GitHub. A trash would need a dependency or a per-OS command. *Change it if you want a safety net.*
2. **Clone uses `gh repo clone`**, so the protocol is the one in your gh config (SSH here). *Change it if you want a fixed HTTPS or SSH URL.*
3. **Unarchive, push, re-archive leaves the repo writable for a few seconds.** If archiving again fails, the error gives the hand command. The action never creates a commit and never forces a push. *Nothing was run against a real archived repo, only against a real bare git repo in tests: please try it on a throwaway archived repo before trusting it on `jozzo`.*
4. **Discard keeps the ignored files** (`.env`, local databases) and only removes what git knows or sees as untracked. They are listed by the Delete clone dialog later. *Change it if you want Discard to remove them too.*
5. **Discard lands on `origin/HEAD`** when the checked out branch only exists locally, or else on the first branch that has an upstream, and refuses when none does.
6. **Discard asks for a fingerprint of the list the user saw** and refuses when the clone changed. This costs a fresh fetch when the dialog opens (a few seconds), and is what makes "after listing every item" true.
7. **After an action the whole list is scanned again** (up to about 12 s) instead of only the project that changed. It is in `TODOS.md`.
8. **The row action in the list links to the project view**, where the confirmation lives, instead of opening the dialog from the row. It is in `TODOS.md`.
9. **`plural` now adds `es` after `ch`, `sh`, `s`, `x` and `z`** (it said "branchs" and "stashs").
10. **`max-lines-per-function` is 30** (your change), and I regrouped the web components to fit it.
