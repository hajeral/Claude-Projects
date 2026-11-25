# Contract-vs-code checks

These scripts check that `docs/openapi.yaml` (and `API_CONTRACT.md` / `api.html`, which are generated from the same model) still matches the screens and mock adapters in `assets/js`.

## Run everything

```bash
PYTHONDONTWRITEBYTECODE=1 bash docs/generator/checks/run_all.sh
```

It exits non-zero if a blocking check fails. Steps:

| # | Script | What it checks | Blocking |
|---|---|---|---|
| 1 | `../render.py` | Regenerates `openapi.yaml`, `api.html`, `API_CONTRACT.md` from `model.py`, `endpoints.py` and `examples.py` | yes |
| 2 | (inline) | `openapi.yaml` passes `openapi-spec-validator` (OpenAPI 3.1) | yes |
| 3 | `check_examples.py` | Every request/response/event example validates against its own schema (JSON Schema 2020-12). Also flags placeholder values (`string`, `id_123`, …) and bag names outside bag fields | yes |
| 4 | `check_paths.py` | Static scan: every `api(...)` call and every mock route registration in `assets/js` resolves to a documented path. Dynamic segments are wildcards | yes |
| 5 | `probe_mocks.py` + `check_shapes.py` | Runtime: loads `index.html` in headless Chrome. It lists every route registered with `api.mock()`, calls every GET (ids come from list responses) and compares response fields with the schemas | yes |
| – | `check_bodies.py` | Heuristic: body fields that POST/PATCH/PUT mock handlers validate or read but the spec body does not declare | info only |

## Requirements

`pip install --break-system-packages pyyaml openapi-spec-validator jsonschema playwright`. You also need a Chrome or Chromium: `probe_mocks.py` uses `$CHROME`, defaulting to `/usr/bin/google-chrome`, and otherwise falls back to Playwright's bundled Chromium (`playwright install chromium`). The probe writes to `$WB_PROBE_JSON`, default `/tmp/wb_probe.json`.

## Fixing a failure

- **Undocumented path** (step 4/5): add an `E(...)` line to `../endpoints.py` under the right screen key.
- **Shape diff** (step 5): `check_shapes.py` prints, for each schema, `add {field: type}` (the mock returns it, the schema lacks it) and `missing [...]` (the schema requires it, the mock never sends it). Update the schema in `../model.py`. The usual place is the `patch(...)` calls in the "v1.1 RECONCILIATION" section; the `add` types are already written in model shorthand. If the code is wrong instead, tell the module owner.
- **Example problem** (step 3): adjust the field-aware tables in `../examples.py`. Lookups go `(schema, field)` → field name → type.
- Re-run `run_all.sh`. Never edit `openapi.yaml`, `api.html` or `API_CONTRACT.md` by hand; they are overwritten on every run.

## Known noise

- `check_paths.py` ignores two calls built by string concatenation that are documented: `POST /admin/alerts/{id}/dismiss` and `POST /shared/exports/{id}/complete`.
- The CMS mock's generic `/admin/cms/:kind/:id` routes are the documented `/admin/cms/pages|banners|faqs/{id}` endpoints.
- `check_bodies.py` splits mock files into handlers heuristically, so fields from a neighbouring handler can appear, e.g. under `.../unfreeze` or `settings/language`.
- Mock-only helper keys (`_n`, `_s`, `sortUsage`, `sortNet`, …) are deliberately left out of the contract.
