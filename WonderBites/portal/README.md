# WonderBites — Admin & Merchant Portals (prototype v1.4)

Bilingual (English LTR / العربية RTL), Night/Day, Midnight Plum + Night Glass design. Static multi-file front-end with an in-browser mock API; **not a backend**.

- Open `index.html` (file:// or any static server). Sign in with any credentials (demo).
- Qatar launch market (QAR, +974, Asia/Qatar); UAE and KSA enabled from Admin → Settings → Markets.
- Shared demo store across both portals (orders, listings/drops, pickups, tickets) — session only.

## Contents
| Path | What |
|---|---|
| `index.html`, `assets/` | The app: core (router, i18n, UI, charts, markets), mocks, screens |
| `docs/api.html`, `docs/openapi.yaml`, `docs/API_CONTRACT.md` | OpenAPI 3.1 contract (253 paths / 325 ops) + readable reference |
| `docs/screens.html`, `docs/gallery.html` | Route inventory and screenshot gallery (EN Night / AR Day) |
| `docs/generator/` | Regenerates the API docs; `checks/run_all.sh` verifies contract vs code |
| `qa/` | Playwright crawl, click-through and flow tests (`qa/run_all.sh`) |
| `SPEC.md`, `CONVENTIONS.md`, `QA_REPORT.md`, `CORE_REQUESTS.md` | Build spec, developer conventions, QA history (v1.0–v1.4) |
| `reference/` | Design briefs, Night Glass card style, independent audit tracker with responses |

## Not included / production work
Real auth/MFA, server RBAC, persistence, payments/settlements, notifications, file storage, FX history, unified mobile+portal contract (pending mobile DTOs). See `reference/WonderBites_Audit_Tracker_with_Response.xlsx`.
