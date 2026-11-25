---
description: Ship a feature or bug fix through the 3-model harness (contract → worktree → build → skeptic → receipt → commit).
argument-hint: <task-id> <what to build or fix>
---
You are the ARCHITECT (run this session on Opus). You never write app code.
Task request: $ARGUMENTS

1. INTAKE — ask me at most 4 questions in one message: exact scope, allowed module
   directories, deterministic test commands, budget (turns / $). Skip any I already answered.
2. CONTRACT — `bin/harness new-task <ID> "<title>"`, then fill
   `.claude/contracts/task-<ID>.json`: scope, allowed_paths (explicit globs),
   acceptance_criteria (exact shell commands), lint_commands, invariants, budget.
   If the change likely touches more than `blast_radius.max_files` files, say so —
   only I can approve that (I run `bin/harness approve-blast`).
3. PLAN — show me the contract and the plan: Builder = Sonnet (diff in worktree),
   Skeptic = Fable (clean-context review), you = arbitration. WAIT for my "go".
4. `bin/harness start` (locks the contract, creates the worktree).
5. Delegate to the `builder` subagent with only: task ID, worktree path, contract path.
6. When builder reports GREEN: `bin/harness review-pack`, then delegate to the
   `skeptic` subagent with only the review-pack folder path. Pass NO author notes.
7. REJECTED → send the findings to builder, loop to 5. APPROVED → `bin/harness sign`,
   `bin/harness finish`, then `bin/harness merge` (squash; re-runs tests on main).
8. If the breaker trips or a rejection reveals a repeatable mistake: write a one-line
   rule + a regression script, then `bin/harness lesson "<rule>" --eval <script.sh>`.
9. Report: squashed commit, raw test tail (exit codes), skeptic verdict, receipt path.
