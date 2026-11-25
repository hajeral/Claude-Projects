# claude-harness

A drop-in harness for Claude Code that makes every code change go through
**contract → isolated worktree → build → independent review → signed receipt → commit**.

| Role | Model | Does | Can't |
|---|---|---|---|
| Architect | Opus (main session) | writes the contract, arbitrates, merges | edit app code |
| Builder | Sonnet (`.claude/agents/builder.md`) | minimal diff inside the task worktree, runs tests | edit outside `allowed_paths`, sign, merge |
| Skeptic | Fable (`.claude/agents/skeptic.md`) | clean-context review of raw diff + contract | edit files |

## Quick start

```bash
git clone <this repo> && cd claude-harness
bin/harness init          # creates signing key in ~/.config/claude-harness, enables .githooks
python3 -m pytest -q      # sample app tests + 31 harness tests
claude --model opus
> /ship T1 add a transfer(to, amount) method to Wallet
```

To use it in another project, copy `.claude/`, `.githooks/`, `bin/`, `harness/`,
`evals/` and `CLAUDE.md` into that repo, run `bin/harness init`, and edit the
contract template's `allowed_paths` and `acceptance_criteria` to match it.

## What enforces what

| Rule from the spec | Where it's enforced |
|---|---|
| Contract before code (`allowed_paths`, `forbidden`, acceptance commands, budget) | `harness new-task` / `start` validates and locks it; later edits are refused |
| Blast radius > 5 files needs your OK | `harness test` goes RED; only you can run `harness approve-blast` |
| Builder works only in `.agent_worktrees/task-ID` on `feat/task-ID` | `pre-tool.sh` checks path + `agent_type` on every Edit/Write |
| Block `rm -rf`, force push, unapproved deps, `--no-verify`, secrets | `pre-tool.sh` (median ~45 ms incl. Python start) + settings `deny` list |
| Lint/typecheck after every edit | `post-edit.sh` runs the contract's `lint_commands` |
| Raw test stdout, exit codes, no chat flooding | `harness test` saves the full log, prints the last 40 lines + `[exit N]` |
| Self-approval forbidden | only `agent_type == skeptic` may run `harness verdict`; verdict is bound to the diff hash |
| No receipt, no commit | `harness sign` (HMAC-SHA256 over diff, test log, verdict, contract) + `.githooks/pre-commit` |
| Same error 3× or turn budget spent → rollback + freeze | `harness test` rolls back to the last green checkpoint and writes `FROZEN`; only you can `harness unfreeze` |
| Never break main | `harness merge` squash-merges, re-runs acceptance on main, aborts if red |
| Decision ledger | `.claude/state/decision_ledger.jsonl` (every command and every block) |
| Flywheel | `harness lesson "<rule>" --eval check.sh` → appends to CLAUDE.md (150-line cap) + `evals/regressions/` |

## Honest limits

- **Dollars aren't metered.** Claude Code doesn't expose spend to hooks. Turns are enforced;
  `max_usd` is a reminder — check `/cost`.
- **"Signed" means HMAC with a local key**, not a public-key signature. It stops the agent (which
  is blocked from reading the key) and accidental edits from faking a receipt; it does not prove
  identity to third parties.
- **Shell-based writes** (`sed -i`, scripts) by the builder aren't blocked up front; they're
  caught by `harness test`, which rejects any changed file outside `allowed_paths`.
- **Alerts** are printed in the session; there's no phone push.
- **No "24/7" by itself** — runs while a Claude Code session runs, or via a scheduled task.

## Commands

`bin/harness init | new-task | start | test | review-pack | verdict | sign | finish | merge | abort | status | evals | lesson`
Human-only (blocked for Claude): `unfreeze`, `approve-blast`, `init`.
