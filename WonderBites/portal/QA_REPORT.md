# WonderBites Portals — QA report (v1.2)

QA lead, and core owner since the core lead left. Run date: 2026-11-19. All numbers come from the final run of `qa/run_all.sh`, done after every fix below.

## Totals

| Suite | Scope | Result |
|---|---|---|
| Route registry | 82 registered routes (47 admin, 27 merchant, 8 public/shell). 0 placeholder or unregistered routes. | ✅ |
| Render crawl (`qa/render_crawl.py`) | 112 route/param jobs (sampled ids from the mocks + tab/portal variants) × **8 combos** (EN/AR × Night/Day × 1440/1280) = **896 renders** | **0 findings** |
| Render checks | console + page errors (fonts.googleapis/gstatic ignored), document horizontal overflow, card overflow and children sticking out, clipped text, KPI value/label/footer overflow, tables that scroll horizontally (row actions out of view), placeholder/404/error state, `App.i18n.missing()` empty (AR), every `[data-go]` / `#hash` link target registered (67 distinct targets) | all pass |
| Click-through (`qa/click_crawl.py`) | 81 routes + global chrome (sidebar + top bar) for each portal, EN and AR, 1440. **3,094 isolated interactions** (EN 1,544 · AR 1,550). The route is re-rendered and overlays closed before each click. Overlays get a second level of clicks. Filter `<select>`s are exercised too. | **0 dead, 0 errors, 0 bad routes, 0 missing AR strings** (117 "already active", e.g. the selected tab) |
| End-to-end flows (`qa/flows.py`) | 20 journeys (list below) | **20 / 20 pass** |
| Inventory | `docs/screens.html`: 82 routes, 561 endpoint references (linked to `docs/api.html` operations) | generated |

**What counts as "something happened" after a click:** a route or params change, an overlay opening, closing or changing, a toast, an API call, a DOM change, an input/aria state change, an app-state change (lang/theme/date range/branch/unread), a download, a file chooser or an external `tel:`/`mailto:` link. Doc links (`docs/*.html`) are checked to exist.

### End-to-end flows (all pass)
1. Admin login → OTP → Command Center (guard redirect, session, KPIs). 2. A wrong OTP (000000) shows an error. 3. Merchant sign-up: empty form shows validation errors → filled form → OTP → Overview. 4. Forgot password → "check your email" → reset (rejects mismatched passwords) → sign in with a toast. 5. Logout: profile menu → confirm → login, and the guard blocks access afterwards. 6. Global search: `/` → results → navigates. 7. Date range: the 7-day preset, then a custom 2-click range, then Apply → `state.dateRange`, the top-bar label and an `/admin/dashboard` refetch with `from`/`to`. The merchant orders list refetches with `from`. 8. Notifications panel → deep link → mark all read (badge 0) → View all. 9. Profile menu → Profile settings (admin + merchant, `tab:'profile'`), theme switch. 10. Export dialog (PDF) → toast → unread +1 → Downloads tab → file download. 11. Branch switcher → refetch with `branchId=BR-02` → top-bar label → Manage branches. 12. Need Help drawer: FAQ, ticket validation, submit → toast → "View my tickets" → Help screen. 13. Template banner → Templates → Create from Template → create product prefilled from the template → save → listing detail. The picker modal also works. 14. Add listing (validation, live preview) → detail → edit (prefilled) → save → more menu → Delete → confirm → back on Inventory, and the record returns 404. 15. Order modal → assign driver (the API record gets the driver). 16. Refund: drawer → Refund → a missing reason is blocked → policy reason → Issue refund → order refunded. 17. Invite user (validation → user appears in the list). 18. Create voucher (validation → voucher detail). 19. CMS banner → Publish now → status `published`. 20. Merchant Settings → Language → Arabic: the app switches to AR/RTL, stays on the tab, and `missing()` is empty.

## Defects found and fixed

### Core (assets/css, core/*, api, auth, index.html, i18n/core.js)
| # | Defect | Fix |
|---|---|---|
| C1 | **5-across KPI cards at 1280.** The label was cut off at a 103px box ("Pending Verification", "Refunded / Cancelled", …), the value overflowed ("AED 24,560" 149px in 143px) and the footer was truncated. Seen on 14 list pages. | `.kpi` is now a size container. The label wraps to 2 lines, the footer wraps, the value is `clamp(19px,13.5cqi,26px)`, and cards narrower than 200px get tighter padding and a smaller icon (`components.css`). |
| C2 | Arabic: `CSV`/`PDF` (and `XLSX`) showed up in `missing()` (Export dialog). There was no SAR label. | Registered as Latin acronyms, which is the right UX. `fmt.money(…,'SAR')` → `120 ر.س` (`i18n.js`). |
| C3 | `fmt.delta` with `deltaUnit:'abs'` rounded +0.2 to "+0" (D2 request). | Keeps one decimal for fractional deltas. |
| C4 | `ctx.setTitle()` always ran `t()`, so data names landed in `missing()` (D1 request). | `setTitle(text, { raw:true })`. |
| C5 | `.check input:indeterminate` painted unchecked radio groups as rose "minus" boxes (D1 request). | Scoped to checkboxes. |
| C6 | `POST /shared/uploads/presign` had no core mock (D2 request). | Owned in `api/mock/core.js` (+ the `/uploads/presign` alias). |
| C7 | **`UI.validate` never validated required radio groups** (a radio's value is never empty), and radio fields didn't render `required`. Result: "Assign to order" on Drivers posted `/merchant/orders//assign-driver` with no order. | Group-level required check ("Please choose an option." EN/AR), plus `required`/`aria-required` on the radios. |
| C8 | 6 forms lacked `novalidate`, so they showed untranslated native bubbles and no UI.validate errors: case "Add note", case assign, merchant order "Assign Driver" and "Cancel order", Drivers assign, Templates picker, and the rich-text link dialog. | `novalidate` added (2 core, 4 module forms). |
| C9 | The rich-text toolbar gave no feedback (B/I/U/Undo looked dead without a selection). | B/I/U reflect the caret state (`aria-pressed`), and Undo starts `aria-disabled` and updates on selection change. |
| C10 | Export notifications passed the file name through `t()`, so the file name landed in `missing()` in AR. | The body of export notifications is now shown raw. |
| C11 | The link dialog placeholder `https://` was in `missing()` (AR). | Registered. |
| C12 | Card body rows (Sales Overview, Drop Accuracy) and card footers pushed content out by 24–54px at 1280. | Rows and `.cd-f` wrap. `.cd-sub` truncates with an ellipsis. |
| C13 | Merchant Overview used fixed px columns. At 1280 the Alerts card was 152px wide and the Inventory legend overlapped. | Fluid `.ov-r1`. `.ov-r2` goes 2-up below 1366px (`overview.js` + `components.css`). |
| C14 | **9 tables at 1280 needed horizontal scrolling** (up to 156px), so row actions were hidden off the end side (Drops, Pickups, Orders, Consumers, Command Center recent orders, merchant Orders, Customers, driver and consumer detail). Admin Orders also overflowed at 1440. | At ≤1365px cells and headers are tighter and product names wrap. New `td.wrap` column class (`{ cls:'wrap' }`) for name columns. |
| C15 | Launcher had no way to reach the docs. | "Start here" footer: **Screen inventory** (`docs/screens.html`) · **API reference** (`docs/api.html`), EN/AR. |

### Modules (minimal changes)
| Owner / file | Defect | Fix |
|---|---|---|
| D4 `merchant/drivers.js` | The "Assigned orders" table wasn't in `.tbl-wrap` and stuck out of its card by 47px at 1280. It also had no `novalidate`. | Wrapped. `wrap` on the bag column. `novalidate`. |
| D4 `merchant/orders.js` | Assign/cancel forms had no `novalidate`. The table overflowed at 1280. | `novalidate`. `cls:'wrap'` on Customer/Bag. |
| D4 `merchant/templates.js` | Picker form had no `novalidate`. | Added. |
| D2 `admin/financials.js` | The 8-column Unit Economics grid cut off single-word labels at 1440 ("Contribution" 71px in 65px). | 4 columns (2 rows). |
| D1 `admin/orders.js` | The orders table overflowed by 12px at 1440. | `cls:'wrap'` on User/Restaurants. |
| D1 `admin/issues.js` | "Add note" and assign forms had no `novalidate`, so the button looked dead. | Added. |
| LEAD `admin/command-center.js`, `merchant/overview.js` (now QA-owned) | See C12/C13. | — |

CORE_REQUESTS.md: every item marked for LEAD is resolved (answered in the "QA lead → all (v1.2)" section). D4's "sidebar stops at viewport height" turned out to be an artefact of Playwright full-page screenshots. The sidebar is sticky and follows the scroll in a real browser (checked).

## Tooling (`qa/`)
- `run_all.sh` runs everything in about 55 minutes on 2 CPUs. `summarize.py` prints the totals. Results are in `qa/results/` (`render.json`, `clicks-{en,ar}-*of2.json`, `flows.json`, logs).
- `render_crawl.py [--quick|--w1280] [route…]`, `click_crawl.py [--lang ar] [--shard k/n] [route…|chrome]`, `flows.py [name…]`, `build_screens.py` (regenerates `docs/screens.html`).
- Dev hooks used: `App.login/DEMO`, `App.go`, `I18N.clearMissing()/missing()`, `api.config({latency})`. A wrapper around `window.api` records calls, which gives the endpoint lists and the idle detection.

## Known limitations
- **Fonts:** Google Fonts are blocked in the crawler, so all width checks ran with fallback fonts. Those are usually wider than Inter, so the checks lean safe, but metrics with the real fonts may differ slightly.
- **Click crawl coverage:** in each table only the first row is clicked, and identical controls (same action/text/target) are clicked once per route. Overlays get two levels of clicks: a confirm dialog opened from inside a modal is checked to open, but its confirm button isn't pressed. Native `<select>`s inside forms aren't changed by the crawler (the flows fill the key ones). File inputs are checked to open a chooser, but no files are uploaded. Click-through ran at 1440 Night only. 1280 and Day are covered by the render matrix.
- Mutating clicks really run against the in-memory mocks. When an earlier click used up the state (a completed order, a deleted record), the crawler reboots the app and retries, so later clicks still run on fresh data.
- Not audited automatically: AA contrast, focus order and keyboard-only operation (Esc-to-close and the focus trap are exercised by the flows), chart animation and `prefers-reduced-motion`, and real-backend behaviour (`api.config({mock:false})`).
- `docs/screens.html` links are plain hash routes. Params (`id`, `tab`) live in memory and sessionStorage, so a bare link to a detail route opens the most recently viewed record or its list. Portal routes go through demo sign-in first.
- Mock data is anchored to 2025-06-20 – 2025-07-20 (`Overlays.TODAY`).

---------------------------------------------------------------------------------------------------
# v1.3 Markets — Qatar launch market; UAE and KSA can be added at any time, in both panels, with no code changes

The client's change request (coordinator). The art director's spacing fix at the end of `base.css` is kept unchanged.

## What changed

### Market model (core)
- **Registry API (mock-persisted).** `GET /shared/markets` returns each market: `code, name{en,ar}, currency, currencyName, currencyLabel{en,ar}, phoneCode, phoneLength, phonePlaceholder, supportPhone, timeZone, utcOffset, locale, vatRate, enabled, launchedAt, cities[{id,name,enabled}]`.
  - Seed: QA is enabled (QAR, ر.ق, +974, Asia/Qatar, VAT 0, Doha · Al Rayyan · Al Wakrah · Lusail · Al Khor). AE (AED, +971, Asia/Dubai, VAT 5) and SA (SAR, ر.س, +966, Asia/Riyadh, VAT 15) start disabled.
  - FX: `GET|PUT /admin/settings/fx` with reporting currency QAR and manual rates.
  - Market and city edits: `PATCH /admin/settings/markets/{code}`, `POST|PATCH /admin/settings/markets/{code}/cities[/{id}]`.
  - State is stored in the mock store (`localStorage wb.mock.markets.v1` / `wb.mock.fx.v1`). `POST /admin/settings/markets/reset` restores the launch defaults (demo only).
- **`core/markets.js` (new).** Loaded at boot through the new `App.onBoot()` hook and reloaded after every Settings change. Helpers: `Markets.list(enabledOnly)`, `get`, `enabled`, `primary`, `options`, `cityOptions`, `cityName`, `cityProxy`, `phoneOptions`, `timeZoneOptions`, `currencyOptions`, `currencyLabel`, `reportingCurrency`, `convert`.
- **Context.**
  - `App.market()`: admin = the switcher value; merchant = the active branch's country.
  - `App.marketInfo()`, `App.currency()` (branch, then merchant, then market, then reporting currency for "All markets"), `App.timeZone()`, `App.setMarket()`.
  - The merchant context, each branch and the user now carry `country / currency / timeZone`. The branch store key is `wb.branch.v2`.
- **Formatting and inputs.**
  - `fmt.money` uses the amount's own currency, otherwise the context currency. Currency labels come from the registry.
  - `fmt.currency()`; `fmt.clock(iso)` and `fmt.date(iso)` render in the branch/market time zone.
  - Money inputs take their prefix from `currency`, otherwise the context (`UI.moneyField`, `UI.currencyPrefix`).
  - New `UI.phone()` = phone-code selector (enabled markets) + number.
- **API convention.**
  - `api()` adds `market=<switcher value | all>` to every admin read and to global search.
  - Mocks get `api.scope()`, `api.inScope()`, `api.scoped(array)` (a market-filtered live view) and `api.lens()` (post-processing of aggregates). `api.db.table` lists honour the scope.

### Admin panel
- **Market switcher in the top bar.** Lists "All markets" plus *enabled* markets only, and a "Manage markets" link.
- **Market filtering.** Every D1 list, summary and filter (drops, pickups, orders, merchants, consumers, cases, moderation, tickets) and D2 (financials, payouts, refunds, performance, wallets, compliance) only sees rows of the selected market(s).
- **"All markets" with more than one currency.**
  - KPIs and charts are converted to the reporting currency.
  - A note under the top bar says "Totals converted to QAR from multiple currencies (QAR, AED) · rates of Jul 20".
  - Tables show each row in its own currency.
- **Registry-driven inputs.** Country and city filters (Financials, Drops, Orders, …), the Add Merchant form (country, city, phone hint) and CMS banner target cities.
- **Sample data is Qatar.** Doha, Al Rayyan, Al Wakrah, Lusail; QAR; +974; QNB/QIB; Qatari IBANs. Two UAE merchants (Sugar & Sage, Copper Kettle Café) and two UAE consumers exist in AED, but only appear once UAE is enabled.
- **Settings → Markets (new tab, `admin-settings-markets`).**
  - Markets table: enable/disable toggle with a confirmation, currency, phone code, time zone, VAT, cities count, and edit (time zone / phone code / VAT).
  - Cities drawer: add, edit, hide cities.
  - Reporting currency + FX rates table, with an example conversion and last-updated info.
  - Safeguards: the last enabled market and the reporting-currency market can't be disabled (409).
- **General settings defaults** are now Asia/Qatar and QAR, with options from the registry. They had been migrated wrongly to "Asia/Doha", and the currency labels were duplicated.

### Merchant panel
- **Fig & Bloom Bakery data.** Branches West Bay, The Pearl and Al Sadd in Doha (QAR, +974, Asia/Qatar, Doha coordinates). Qatari names and addresses; drivers, customers and vendors use +974 numbers.
- **Prices and amounts follow the active branch.** The branch switcher passes `country/city/currency/timeZone`; prices, input prefixes, totals, analytics and payouts follow the branch.
  - New listings, products and template drafts are created in that branch's currency (template prices are converted).
  - Overview and analytics aggregates are converted to the branch currency.
- **Branch form.** Country (enabled markets only), cities of that market, phone-code selector, and a hint "Prices at this branch use AED · Asia/Dubai". The mock rejects disabled markets and cities from another market.
- **Sign-up.** Asks for the country (enabled markets only); the city list and phone code follow it, and the account gets that market's currency and time zone.
- **Operating hours.** Show the branch time zone. They now read the same branch store as the branch switcher; before this, D3's mock had its own `br_wasl…` ids, which didn't match `BR-01…`.
- **Phone inputs** (help form, customers, profile) use the registry codes.

### Charts (task 6)
- **x-axis ticks.** New `Charts.xTicks()` estimates label widths, always keeps the first and last label, and adds evenly spaced labels only where they don't overlap. It's used by area/line charts, bar charts and D2's combo chart. This fixes "Jun 2Jun 26" / "Jul 1Jul 20" on Financials GMV Trend and Revenue Trend.
- **Card headers.** When the title and actions don't fit side by side, the actions now drop to their own row instead of squeezing the title onto 3 lines (Financial Trends Monthly). Its legend wraps to 2 tidy lines.
- **Top bar.** Titles truncate instead of running under the controls, and the search/market controls are slimmer at ≤1365px.

### API docs (task 7)
- **Generator changes** (`docs/generator`): `Market`, `MarketCity`, `MarketUpdate`, `MarketCityInput/Update`, `FxRate`, `FxSettings`, `FxUpdate`, `MarketMeta`, `MarketList`; 9 new endpoints.
  - `market` is a common query parameter on every admin GET.
  - `market` row field on 17 schemas; `country/currency/timeZone` on Branch / BranchOption / User / MerchantContext; OperatingHours `timeZone, branches`.
  - Country enum order is QA AE SA. Conventions and changelog have a v1.3 section; examples are Qatari.
- **Regenerated** `API_CONTRACT.md`, `openapi.yaml` and `api.html` (253 paths, 325 operations, 350 schemas).
- **`checks/run_all.sh` passes:** OpenAPI valid, 433 examples with 0 problems, 0 undocumented paths, 0 mock-vs-schema shape diffs, 0 undocumented mock routes.

## QA re-run (v1.3)
| Suite | Result |
|---|---|
| Routes | 83 registered (new: `admin-settings-markets`), 0 placeholders |
| Render matrix, launch state (QA only) | 904 renders (8 combos: EN/AR × Night/Day × 1440/1280), **0 findings** |
| Render matrix, UAE + KSA enabled (`--all-markets`) | 904 renders, **0 findings** |
| Click-through | EN 1,573 + AR 1,579 + all-markets 332 = **3,484 interactions**. One AR defect found (CMS banner preview showed the raw city id `doha`); fixed, and the route re-crawled clean. 0 dead, 0 errors, 0 bad routes. |
| Flows | **23 / 23 pass**. New: (a) Qatar defaults (Asia/Qatar, QAR, sign-up only QA / +974, merchant context QAR, disabling the last market refused). (b + c) the market journey in **EN and AR**, below. |
| Docs checks | all pass |

The market journey (b + c), run in EN and AR:
1. Only Qatar is enabled at launch.
2. Settings → Markets → enable UAE (with confirmation). The change is persisted in the mock store.
3. UAE appears in the admin switcher. The UAE scope lists only UAE merchants, Financials KPIs are in AED, and the country filter offers only AE.
4. "All markets" shows the conversion note. KPIs are in QAR, and the orders table shows rows in both AED and QAR.
5. Merchant sign-up offers UAE, with Dubai cities and +971.
6. Creating a UAE branch (Dubai, +971) gives a branch with AED and Asia/Dubai.
7. Switching to that branch: the price input prefix is AED, a new listing shows AED, and Overview totals are in AED.
8. Switching back to West Bay gives QAR everywhere; the admin Qatar scope is in QAR.
9. In AR, `missing()` is empty.

## Defects found and fixed during v1.3
1. Migration ordering turned `Asia/Dubai` into `Asia/Doha` (an invalid time zone) and created duplicate city keys and duplicate currency options. All of these are now driven by the registry.
2. D3's operating-hours mock used its own branch ids, which didn't match the branch switcher (`BR-01`). It now uses the branch store, and D3's mock wrapper supports async handlers.
3. The orders summary (Revenue / Avg order value) and the wallet summary added up mixed currencies. They now convert to the market or reporting currency.
4. Screens passed data values through `t()`: the analytics range label showed `[object Object]`, customer/vendor detail and the CMS banner preview showed raw city ids. They now use `App.loc` / `Markets.cityName`.
5. Top-bar title ran under the controls at 1280 once the market switcher was added. Card titles were squeezed onto 3 lines.
6. x-axis tick collisions in core charts and in D2's combo chart.

## Known limitations (v1.3)
- **Simulated aggregates for non-Qatar markets.**
  - The Command Center scales the Qatar seed figures by fixed market weights (AE 0.46, SA 0.38).
  - D2 dashboards are computed over the in-scope merchants in base QAR, then converted.
  - On the merchant side, Money/KPI amounts are converted to the branch currency. A few plain-number totals in the overview mock only get the branch currency's label; they are not converted (QAR↔AED is about 1:1).
- **Platform-wide screens are not market-scoped:** templates, CMS, users & access, vouchers and the audit log. The `market` param is sent but ignored. Document per-market CMS/vouchers later if needed.
- **FX rates are manual, with no history.** Historical periods use today's rates.
- **Time zone for "All markets"** is the primary market's (Asia/Qatar).
- **Enabled markets persist in localStorage** for the browser (the mock store). Use `POST /admin/settings/markets/reset` (or clear storage) to return to the launch defaults. The QA crawlers start each context fresh.
- **`qa/qatarize.py` is a one-off data migration.** It skips files that already carry the `(v1.3)` marker, so it can't overwrite the UAE/KSA seeds.

## v1.4 Audit fixes
Source: the audit attachment (F-001…F-005 plus the demo-consistency extras) and the tracker addendum (F-014, the FLOW journeys and F-018). The root cause of most findings was that each module kept its own copy of the data. There is now **one shared in-browser demo store**, `assets/js/api/mock/store.js` (`window.WBStore`, LEAD). It is loaded right after `api/mock/core.js` and used by every mock of both portals. API paths are unchanged. The helpers are documented in CONVENTIONS §15.

### Fixes
| ID | Fix | Regression test (`qa/flows_v14.py`, `qa/flows.py`) |
|---|---|---|
| **F-001** | `remaining` is never touched unless `quantity` changes. A quantity change sets `remaining = quantity − (reserved + collected)` (`S.setQuantity`). A quantity below what is already committed is rejected with 422 `{quantity: below_committed, committed}`; the listing form shows it inline under Quantity and nothing is saved. Admin → Drops edits go through the same rule. The listing detail shows Reserved and Collected today. | `F-001 listing edit keeps remaining…` (UI: title-only edit keeps stock; quantity 1 → inline error; +4 → recomputed; API 0 → 422) |
| **F-002** | One order state machine (`S.FLOW`) for the merchant and admin mocks. completed, cancelled and refunded are terminal; a completed order only accepts a refund. Anything else returns **409 `invalid_transition` `{from, to, allowed}`**. Every order carries `allowedActions` + `active`. The merchant order modal and row menu and the admin order drawer render only the allowed actions; closed orders show "No further actions". | `F-002 order state machine…` (4 API rejections, refund → every action rejected, modal/drawer hide actions) |
| **F-003** | Self-pickup orders: "Mark completed" is replaced by **Verify code & complete** in the order modal. `POST /merchant/pickups/verify {code, orderId}` atomically verifies, marks the code used, completes the order and writes **one** `pickup_verified` event. Wrong code → inline field error. Codes are single-use (409 `code_used`) and expire at window end + 30 min (422 `code_expired`). Delivery orders go out_for_delivery → delivered → completed through the state machine. "Active" = paid and not yet collected, regardless of pickup date (new **Active** filter; nav badge = active count). | `F-003 / FLOW-08…` (wrong → inline, demo code → completed in both portals, one event, reuse 409, yesterday's order Active + expired, delivery path) |
| **F-004** | `GET /merchant/overview` is derived from the store: recent orders (same ids and states as Orders & Pickups), KPIs (pending pickups = active pickup orders; completed and cancelled in the selected range), top-selling bags (completed orders), inventory (listing stock), sales card (completed orders per day) and reviews (same summary as Reviews). | `F-004…` (recent ≡ orders, pending ≡ active pickups, top bags are real listings, verify/cancel move the KPIs) |
| **F-005** | Support contacts come from the markets registry: `supportEmail`, `merchantSupportEmail`, `supportPhone`, `supportWhatsApp`, `supportHours`. Qatar: **support@wonderbites.qa**, +974 5550 0800, WhatsApp +974 5550 0801, Daily 8:00–22:00. They are used by the Need Help drawer and merchant Help, and are editable in Admin → Settings → Markets → Edit (validated). | `F-005…` (drawer + Help show the QA contacts and hours, no .ae/.com; an admin edit shows up in the drawer; invalid email 422) |
| **F-014** | One demo "today", `DEMO_TODAY = '2026-11-19'` in `api/mock/core.js` (`api.demoNow/demoIso/demoDate`). All seeds are rebased (`qa/rebase_dates.py`). The default global range is the last 30 days ending on demo today (storage key `wb.dateRange.v2`). The 2025-07-20 anchor and "Jun 20 – Jul 20" ranges are gone. The dispute seed and the API doc examples are re-anchored too. | render matrix (date chip) + `date-range calendar…` flow |
| **F-018** | `docs/gallery.html` shows every route at 1440 in EN Night and AR Day: **166 JPEGs** (1200 px wide, quality 70, 11.7 MB) in `docs/gallery/`, grouped by portal, each with route, title, params, language/theme and capture time, plus "How to reproduce". The cap of 180 images is enforced. Linked from the launcher's "Start here" row next to Screen inventory / API reference. | generated by `qa/gallery.py` (last step of `qa/run_all.sh`) |

### Demo-consistency extras
- **Pickup codes:** one format, 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0 O 1 I L), unique, single-use, expiring at window end + 30 min grace (`S.pickupCode`, `S.codeExpiry`). Admin Pickups → Verify uses the same `S.verifyPickup` helper and its response now includes the completed order. Test: `pickup codes: one format…`.
- **Shared store:**
  - A merchant listing *is* the admin drop (same id; admin flag/unflag/edit/delete write through).
  - Merchant orders are a tenant-filtered projection of admin orders.
  - Disputes and help requests are Admin Support tickets with two-way replies.
  - Review reports are Admin Moderation cases.
  - Sign-ups are Admin Merchants rows.
  - 4 weeks of completed Fig & Bloom history (≈ 270 orders) feed payouts and earnings.
  - Demo-only `POST /shared/demo/reservations` stands in for the consumer checkout.
- **Commission:**
  - Platform default **19 %**, effective-dated, in Admin → Settings → General → **Commercial** (`GET|PUT /admin/settings/commercial`, history table, schedule a new rate).
  - Per-merchant contract override in Merchants → Edit commission (`PATCH /admin/merchants/{id}`, `GET|PUT /admin/merchants/{id}/contract`). The seed has one contract (MER-071 at 17 %); the list shows a "contract" tag.
  - Payouts, net earnings, D2 commission revenue / revenue per order / monthly trend, payout lines and D1 merchant payouts are all computed from the effective rate. No 15/16/18/20 % literals remain.
  - Test: `commission…`.
- **No realistic PII:**
  - Emails use `example.com` (or `<brand>.example.com`), phones the 5550 range, IBANs are masked (`QA00 •••• … (demo)`).
  - `qa/scrub_pii.py` rewrote 17 files; `--check` runs in `qa/run_all.sh` (0 left).
  - Platform addresses (support@wonderbites.qa/ae/sa) are kept.
- **Demo labels:** a "Demo data" badge in both top bars (icon-only below 1366 px, with a tooltip); the sign-in screens say "**Demo: any credentials**" (merchant: "new sign-ups need WonderBites approval first"). Test: `demo data…` (badges, sign-in note, API responses scanned for emails/phones/IBANs).

### Cross-portal journeys (one session each, `qa/flows.py` + `qa/flows_v14.py`)
- **FLOW-01:**
  1. Merchant sign-up, then OTP. This verifies the email only; there is no session.
  2. Sign-in shows "pending verification", and a sign-in attempt is refused (403 `pending_verification`).
  3. Admin → Merchants lists the merchant as Pending. The admin opens it and clicks **Verify merchant**.
  4. The merchant signs in as its own tenant.
  5. Rejected and suspended merchants get 403 `account_rejected` / `account_suspended`.
- **FLOW-02:**
  1. The merchant creates a listing; it appears in Admin → Drops with the same id, live, with the same stock.
  2. The admin flags it. The merchant sees it Disabled with a "Disabled by WonderBites for review" notice, and Resume is refused (409 `moderation_hold`).
  3. After unflag it is active again. An admin quantity edit below committed is refused (F-001).
- **FLOW-05/06:** merchant `/merchant/orders` ≡ admin `/admin/orders?merchantId=MER-066` (same ids, same states, same total). The admin can open a merchant order by its id, and the merchant never sees other merchants' orders.
- **FLOW-07:**
  1. Reserving 2 bags: remaining −2, reserved +2, and the order is visible to the admin.
  2. Cancelling restores the stock.
  3. A reservation followed by verification: remaining −1, collected +1.
  4. An admin refund of an uncollected order restores the stock.
- **FLOW-08/09:** the merchant (order modal) or the admin (Pickups → Verify code, with an inline error on a wrong code) verifies through the same helper. The result is one completed state in both portals and one `pickup_verified` event, and the code can't be reused in the other portal.
- **FLOW-10:**
  1. The admin cancels MO-5204 by policy.
  2. A "change of mind" refund is refused by the policy (422).
  3. A "store closed" refund on completed MO-5199 is accepted with manager approval.
  4. The merchant table shows Cancelled / Refunded, and merchant earnings include the refund adjustment.
- **FLOW-12:**
  - The 4 weekly statements are equal (net) in Admin → Financials → Payouts, Admin → Merchant → Payouts and the store.
  - Gross = the completed orders of the week, and commission = gross × 19 %.
  - Merchant Analytics pending payout and paid-to-date match the statements.
- **FLOW-15:**
  - Merchant disputes and help requests are listed in Admin Support.
  - A merchant reply in the dispute screen is shown in the admin ticket. An admin reply sent from the ticket screen is shown in the merchant thread.
  - A new help request, followed by an admin reply, shows the reply under Help → My requests.
- **FLOW-17:**
  1. The merchant reports a review; it shows "Sent to WonderBites moderation".
  2. The report appears as a pending case in Admin → Moderation.
  3. The admin rejects it. The merchant sees "Removed by WonderBites".
  4. A second report that is approved shows as "reviewed — kept".

### QA re-run (v1.4)
| Suite | Result |
|---|---|
| Render matrix (QA only) | 904 renders (83 routes × 8 combos), **0 findings** |
| Render matrix, UAE + KSA enabled | 904 renders, **0 findings** |
| Click-through | EN 1,583 + AR 1,589 + all-markets 185 interactions, 0 dead, 0 errors, 0 bad routes. One AR finding (the pickup-code placeholder `ABC234` went through `t()`); fixed, and the AR crawl of m-overview / m-orders was re-run clean. |
| Flows | **39 / 39 pass**. 16 new: F-001…F-005, pickup codes, commission, demo data, FLOW-02, 05/06, 07, 09, 10, 12, 15, 17. Sign-up was replaced by FLOW-01. The assign-driver and refund flows now pick their order from `allowedActions`. The market flow checks AED rows by searching a UAE merchant, because the newest orders are Fig & Bloom's. |
| PII scrub check | 0 realistic values |
| Inventory / gallery | `docs/screens.html` 83 routes / 612 endpoint refs · `docs/gallery.html` 166 images |
| Docs checks (`docs/generator/checks/run_all.sh`) | OpenAPI valid, 441 examples 0 problems, 0 undocumented paths, 0 shape diffs. New: `PickupVerifyInput/Result`, `InvalidTransition` and `PickupCode` 409 responses on order/pickup actions, `CommercialSettings`, `MerchantContract`, `DemoReservation*`, `OrderAction`, Market support fields, Listing `reserved/collected/flagged/moderation`, Order `allowedActions/active`, merchant 403 login codes, "v1.4 Audit fixes" changelog. |

### Files
- **New:** `api/mock/store.js`, `i18n/demo-v14.js`, `qa/flows_v14.py`, `qa/gallery.py`, `qa/scrub_pii.py`, `qa/rebase_dates.py`, `docs/gallery.html`, `docs/gallery/`.
- **Core:** `api/mock/core.js` (demo clock, overview, auth approval, market support fields, Need Help tickets → store), `core/app.js` (demo badge, default range, Orders nav badge), `core/ui.js` (`UI.fieldError`), `core/overlays.js` (registry contacts), `screens/auth.js` (pending messaging, demo note, gallery link), `screens/admin/markets.js` (support fields), `components.css` (badge).
- **Modules (minimal, logged here):**
  - D1: admin-ops mock (store wiring, state machine, verify helper, contracts), orders.js, pickups.js, merchants.js, ops-common.js.
  - D2: admin-business mock (commission from the rate, store-based payouts).
  - D3: merchant-account mock (tickets, contacts, review moderation), settings.js (Commercial card), reviews.js, help.js.
  - D4: merchant-ops mock (store views, F-001/F-002/F-003, analytics from earnings), orders.js, listings.js, ops-common.js.

### Known limitations (v1.4)
- **The store lives in memory** for the session. A reload restores the seed, except markets/FX, which stay in localStorage as before. This is intended for demos; there is no backend, payment or auth work.
- **Only Fig & Bloom (MER-066) has order-level data.** Other merchants keep aggregate seeds, with their commission from the effective rate. A newly approved merchant signs in to an empty order book, while settings/branches still show the demo merchant's.
- **Merchant analytics deltas** (vs previous period) are still illustrative, because there is no history before the 4-week window.
- **Demo codes are visible:** the order modal shows the customer's code under the field, labelled "Demo data", so demos can complete pickups. A real build would hide it.
