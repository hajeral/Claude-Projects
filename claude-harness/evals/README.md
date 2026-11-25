# evals/regressions

One script per mistake that must never happen twice. Each script exits 0 when the
mistake is absent and non-zero when it reappears. `bin/harness evals` runs them all,
and the default contract's acceptance criteria include it, so every task is checked.

Add one with: `bin/harness lesson "<one-line rule>" --eval path/to/check.sh`
