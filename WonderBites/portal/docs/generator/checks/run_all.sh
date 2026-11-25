#!/usr/bin/env bash
# Re-run the contract-vs-code checks. Run from anywhere; exits non-zero if a blocking check fails.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
rc=0
echo "== 1/5 regenerate docs";            python3 "$HERE/../render.py" || rc=1
echo "== 2/5 OpenAPI validation";         python3 -c "import yaml,sys; from openapi_spec_validator import validate; validate(yaml.safe_load(open('$HERE/../../openapi.yaml'))); print('openapi.yaml VALID')" || rc=1
echo "== 3/5 examples vs schemas";        python3 "$HERE/check_examples.py" || rc=1
echo "== 4/5 code paths vs spec";         python3 "$HERE/check_paths.py" || rc=1
echo "== 5/5 mock responses vs schemas";  python3 "$HERE/probe_mocks.py" && python3 "$HERE/check_shapes.py" || rc=1
echo "== (info) request bodies";          python3 "$HERE/check_bodies.py"
exit $rc
