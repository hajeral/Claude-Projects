#!/usr/bin/env bash
# Regression: a builder once "fixed" a failure by skipping the test. Never again.
if grep -RnE "pytest\.mark\.skip|@unittest\.skip|^\s*assert True\s*$|xit\(|it\.skip\(" tests/ 2>/dev/null; then
  echo "found skipped or hollow tests"; exit 1
fi
