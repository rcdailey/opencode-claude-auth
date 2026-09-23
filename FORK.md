# Fork state (rcdailey)

This branch (`integration`) is consumed directly by the chezmoi dotfiles repo in
`home/dot_config/opencode/opencode.jsonc.tmpl` as `github:rcdailey/opencode-claude-auth#integration`
until upstream merges the PRs below. The reference floats: OpenCode follows the branch head, so
updates land here only, not in the config. This file is the source of truth for what the branch
carries; nothing else needs to be re-derived.

## Contents

Base: `upstream/main` (`griffinmartin/opencode-claude-auth`).

| Source | Merged as | Why |
| --- | --- | --- |
| [PR #274](https://github.com/griffinmartin/opencode-claude-auth/pull/274) | merge of `refs/pull/274/head` | OpenCode 2 plugin API support |

Fork-local commits (not upstream candidates):

- `chore: commit dist for git-ref consumption` - un-ignores `dist/` and commits the build output.
  OpenCode installs this package from a Git ref and does not build it, so `dist/` must be rebuilt
  and committed on every update to this branch.
- `chore: rename the build script to compile` - npm's Git fetcher (pacote) prepares any Git
  dependency whose manifest declares `preinstall`, `install`, `postinstall`, `build`, `prepack`, or
  `prepare`, by running a nested `npm install` in its checkout. That step fails inside OpenCode's
  plugin installer ("git dep preparation failed"), so the manifest must declare none of those
  names. Upstream merges that touch `package.json` scripts can reintroduce `build`; rename it
  again.

## Update procedure

Run after any listed PR gains commits, a PR is added or dropped, or upstream `main` moves.

```sh
git fetch upstream
git fetch upstream 'refs/pull/<N>/head:pr-<N>'   # for each PR in the table
git checkout -B integration upstream/main
git merge --no-edit pr-<N>                       # each PR, in table order
git checkout <previous-integration> -- .gitignore FORK.md   # keep fork-local files
pnpm install --frozen-lockfile && pnpm run compile && pnpm test && pnpm run lint
git add -A dist .gitignore FORK.md && git commit -m "chore: commit dist for git-ref consumption"
git push --force-with-lease
```

The chezmoi config needs no change; restart the OpenCode service so it re-resolves the branch head.

## Retirement

Drop a row when upstream merges that PR and the change reaches a release the chezmoi config can
pin. When the table is empty, delete the branch and point the chezmoi `plugins` entry back at the
published package.
