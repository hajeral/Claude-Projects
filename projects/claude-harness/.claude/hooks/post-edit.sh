#!/usr/bin/env bash
# Runs the contract's lint/typecheck commands after every edit in the task worktree.
exec python3 "${CLAUDE_PROJECT_DIR:-.}/harness/harness.py" hook-post-edit
