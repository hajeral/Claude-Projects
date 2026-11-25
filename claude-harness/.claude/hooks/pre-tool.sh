#!/usr/bin/env bash
# Runs before every Bash/Edit/Write/Read call. Exit 2 = block, reason on stderr.
exec python3 "${CLAUDE_PROJECT_DIR:-.}/harness/harness.py" hook-pre
