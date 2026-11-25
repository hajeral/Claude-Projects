# WonderBites Portals — End-to-End Build Spec (v1)

Goal: a complete, clickable, integration-ready front-end prototype of BOTH portals (Admin + Merchant) in the approved **Midnight Plum + Night Glass (refined)** style, bilingual **EN (LTR, default) / العربية (RTL)**, Night (default) + Day themes. Every nav item, tab, button, row action, modal, drawer, popover and form in the Figma reference must lead somewhere real. No dead ends, no "coming soon".

References (READ/VIEW BEFORE BUILDING):
- Figma captures: `/home/claude/wb/ref-full/*.jpg` (78 images; `-a/-b` = top/bottom of a screen). `*-99-ux-audit-notes.jpg` are the client's own audit notes — apply them.
- Approved card style: `/home/claude/wb/cards/night-glass/index.html` (Style A "Night Glass" + art-director refinements: icon status badges in tables; hero glow ONLY on Priority Alerts + Sustainability Impact, all other cards' glow at ~40%).
- Approved theme/shell + bilingual engine: `/home/claude/wb/concept-4-rtl/index.html` (Midnight Plum, EN/AR dictionary, mirroring rules).
- Brand + rules: `/home/claude/wb/BRIEF.md`, `/home/claude/wb/RTL_CARDS_BRIEF.md`.

Hard rules
1. Functionality & process flow = Figma. Restyle only. Keep every section, field, column, filter, KPI and action. Fix only obvious typos/bugs (e.g. "Dietary tages", "AED 62" used as a count, duplicated KPI labels copied from another screen → use the screen's own meaning; Reviews screen sample text about "Sam.AI/Employee Reviews" → rewrite as customer reviews of bags).
2. Motion: NO animation/transition on cards or chrome. Only charts animate once on route/language change. Respect prefers-reduced-motion. Overlays (modal/drawer/popover) appear instantly (no transitions).
3. RTL via `dir` + CSS logical properties only. Numbers/IDs/amounts isolated LTR. Chart time axes stay LTR.
4. Accessibility: AA contrast both themes, focus-visible rings, real <button>/<a>/<label>, aria for dialogs/tabs/menus, Esc closes overlays, focus trap in modals.
5. Self-contained static site: no external requests except Google Fonts (Playfair Display, Inter, Noto Naskh Arabic, IBM Plex Sans Arabic). No remote images — food/branch photos as CSS/SVG placeholders.
6. Artifact routing constraint: routes use plain hash names only, e.g. `#admin-drops`, `#m-inventory-new`, plus optional `-ar`/`-en` handled in state, NOT `#/path` or query strings. Keep language/theme in localStorage (try/catch) + in-memory.

## File layout (multi-file static app) — `/home/claude/wb/app/`
```
index.html                 # single entry: loads css + js, mounts router
assets/css/tokens.css      # Night Glass tokens (dark/light), type, spacing   [LEAD]
assets/css/base.css        # reset, layout, shell, utilities                  [LEAD]
assets/css/components.css  # card, kpi, table, pill, button, input, select, tabs, segmented, toggle, modal, drawer, popover, toast, datepicker, upload, stepper, empty/skeleton/error states  [LEAD]
assets/js/core/app.js      # boot, state (lang, theme, portal, user), router, guards  [LEAD]
assets/js/core/i18n.js     # t(), dictionaries merge, number/currency/date fmt by lang  [LEAD]
assets/js/core/ui.js       # component render helpers (card(), kpi(), table(), pill(), modal(), drawer(), toast(), confirm(), form fields, filters bar, pagination) [LEAD]
assets/js/core/charts.js   # SVG charts: line/area, bar/grouped, donut, sparkline, histogram, funnel, progress (animated once) [LEAD]
assets/js/core/overlays.js # global: notifications panel, date-range calendar, profile menu, global search, export dialog, branch switcher, Need Help drawer, logout confirm [LEAD]
assets/js/api/client.js    # api(method, path, body) → mock adapter now, real fetch later (BASE_URL, auth header, error/empty handling, latency sim) [LEAD]
assets/js/api/mock/<module>.js   # mock data + handlers per module (owned by the module's builder)
assets/js/i18n/<module>.js       # AR strings for that module (EN keys = English text)
assets/js/screens/admin/<screen>.js     # registers routes via App.route(name, renderFn)
assets/js/screens/merchant/<screen>.js
assets/js/screens/auth.js        # login / sign-up / forgot / reset / 2FA for both portals [LEAD]
docs/api.html + docs/openapi.yaml # API reference                              [API ENGINEER]
docs/screens.html                 # screen & route inventory with links        [QA]
```
Ownership: only edit files you own. Need a core change? Add it in your own file if possible; otherwise write the request to `/home/claude/wb/app/CORE_REQUESTS.md` and tell the lead (main). The LEAD writes `/home/claude/wb/app/CONVENTIONS.md` documenting every helper's signature + an example screen; everyone follows it.

Every screen fetches its data ONLY through `api()` with a documented path (e.g. `GET /admin/drops?status=&category=&city=&dietary=&sort=&q=&page=`). Each mock handler mirrors the request/response shape that the API engineer documents. Loading skeleton → data; empty state; error state with retry — for every list.

## Route inventory & ownership
Global/shell (LEAD): login (admin), login + sign-up (merchant), forgot password, reset password, OTP/2FA, portal switch launcher, 404; top bar: global search (results popover → navigates), date-range calendar (presets Today/7D/30D/This month/Custom, two-month calendar, Apply/Cancel, persisted to state and passed to APIs), Export dialog (format CSV/XLSX/PDF, scope, columns → toast "export started" + downloads list in notifications), notifications panel (tabs All/Unread, mark all read, item → deep link), profile menu (Profile settings → settings-profile, Language EN/AR, Theme, Help, Logout → confirm → login); merchant branch switcher; merchant sidebar "Need Help?" → Help screen + quick help drawer (FAQ, contact, ticket); "This month's impact" card → sustainability screen; template banner "Create from Template" → templates screen; Admin Command Center + Merchant Overview (reference screens).

D1 — Admin operations: drops (list, filters, bulk select, view drawer, edit form, delete confirm, flag), pickups (list, verify code modal, detail), orders & reservations (list, detail drawer, refund flow w/ policy check, cancel), merchants (list, Add Merchant multi-step form, merchant detail page with tabs: overview/branches/listings/payouts/compliance/activity, verify/suspend/reject actions), consumers (list, detail, edit, block/unblock, delete), issues & alerts (tabs All/Issues/Alerts/Moderation, severity chips, case detail drawer, resolve/escalate/assign), moderation (queue, approve/reject, case detail), support (KPIs, charts, ticket list with priority tabs, ticket detail with conversation + reply + assign + status).

D2 — Admin business & analytics: financials (filters, KPI grid, all charts/cards, payouts & settlements, refunds, unit economics, payout detail), operations analytics, performance (+view report, view all merchants), sustainability & impact (+view report/full breakdown), wallet & vouchers (Wallet Credit tab: list, Issue Credit modal, wallet detail/adjust/freeze; Vouchers tab: list, Create Voucher form, voucher detail, freeze/delete), quality & safety (merchant compliance list, compliance detail: certificates upload/expiry, hygiene score, indicators, actions).

D3 — Admin platform + merchant account: listings & templates (list, category tabs, New Template builder with fields chips, edit, duplicate, publish/draft), templates gallery (admin), CMS (tabs All/Pages/Banners/FAQ, page editor w/ rich text, banner editor w/ image upload, target audience, schedule, FAQ editor), users & access (role cards, list, Invite User modal, edit role, suspend, resend invite), admin settings (Profile, General = Platform Basics + Operational Defaults, Notifications = Admin Alerts, Security = Authentication + Audit & Compliance, Policies list → Refund & Cancellation (content + configuration table + save), About Us, Privacy Policy, Terms & Conditions editors). Merchant: settings (Profile, Store info, Security, Operating Hours per branch, Language), help (form + FAQ + contact options + my tickets), reviews (sort, rating summary, list, reply to review, report review), reports / dispute (tabs, ticket list, View detail, Reply thread, close).

D4 — Merchant operations: overview widgets' deep links, orders & pickups (list, Import, Export, order detail modal: assign driver, mark completed, cancel order), listings (bags) (list, view, edit, disable, delete), inventory (list, Add New Listing full form w/ live preview + settings toggles + images, listing detail page w/ activity + settings, edit, more-menu: duplicate/pause/delete), create product, drivers (list, Add Driver, driver detail, assign), sales & analytics (all sections A–H, period switch, Export CSV, view all day records), customers (list, Import/Export, Add Customer form, customer detail), branches (cards, Add/Edit Branch with hours & map placeholder, open/closed state, delete), vendors (list, status tabs, Add New Sub Vendor, vendor detail), templates (WonderBites + My Templates, Create from Template → prefilled create product, edit/delete my template, save as template).

API ENGINEER: OpenAPI 3.1 for every endpoint used (auth, admin, merchant, shared: notifications, search, exports, uploads, i18n/settings), schemas, enums (statuses), pagination/filter/sort conventions, errors, auth (JWT + refresh, roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff), webhooks/realtime events (order status, alerts), plus `docs/api.html` readable reference grouped by screen, with a "Screen → endpoints" matrix.

QA: crawl every route in EN/AR × Night/Day at 1440 and 1280 widths, click every interactive element, report dead ends/overflow/console errors; produce `docs/screens.html`.
