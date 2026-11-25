# WonderBites Portals — Builder Conventions (v1.1, LEAD)

> v1.1 (contract alignment): list responses carry both shapes, there are new helpers (`UI.kpiData`, `UI.select`, `UI.banner`,
> `UI.status.ensure`, `App.loc`, `fmt.kpi`, `fmt.delta`, `fmt.money(Money)`, `Charts` accepts contract `Series`), `context|Text` i18n keys,
> and core-protected shell keys. The changes are marked **(v1.1)** below.

Read this, then `SPEC.md`. Everything here is implemented in the LEAD core files; if something you
need is missing, add it **inside your own files** if you can, otherwise append to `CORE_REQUESTS.md`.

---------------------------------------------------------------------------------------------------
## 0. TL;DR for a new screen

1. Create `assets/js/screens/<admin|merchant>/<screen>.js` (you own it).
2. Add the file (plus your mock + i18n files) to **your** manifest `assets/js/modules/<you>.js`.
3. Register the route with `App.route('admin-drops', { … render(el, ctx) { … } })`.
4. Fetch data only through `api('GET', '/admin/drops', query)` and render with `UI.*` helpers.
5. Every user-visible English string goes through `t('English text')`, and its Arabic goes into your
   `assets/js/i18n/<module>.js` via `App.i18n.add({...})`.
6. Open `index.html#admin-drops` (EN) or `index.html#admin-drops-ar` (AR) to check.

---------------------------------------------------------------------------------------------------
## 1. Files, loading & ownership

```
index.html                        LEAD   entry; loads core + every manifest
assets/css/tokens.css|base.css|components.css   LEAD
assets/js/core/{app,i18n,ui,charts,overlays}.js LEAD
assets/js/api/client.js           LEAD   api(), api.mock(), api.db
assets/js/modules/lead.js         LEAD   manifest
assets/js/modules/d1.js           D1     manifest (Admin operations)
assets/js/modules/d2.js           D2     manifest (Admin business & analytics)
assets/js/modules/d3.js           D3     manifest (Admin platform + merchant account)
assets/js/modules/d4.js           D4     manifest (Merchant operations)
assets/js/modules/api.js          API    manifest (only if the API engineer ships shared mocks)
assets/js/api/mock/<module>.js    owner of the module
assets/js/i18n/<module>.js        owner of the module
assets/js/screens/admin/*.js, screens/merchant/*.js   owner of the screen
```

A manifest is a single call; paths are relative to `assets/js/`:

```js
// assets/js/modules/d1.js  (owned by D1)
App.load([
  'i18n/admin-ops.js',
  'api/mock/admin-ops.js',
  'screens/admin/drops.js',
  'screens/admin/pickups.js',
]);
```

The core loads files **in the listed order** after all core files and before the router starts.
A missing file is reported as a console *warning* (not an error), so it never breaks the app. Don't add
`<script>` tags to `index.html`.

CSS for a screen: prefer the shared classes. If you really need screen CSS, inject it once from your
screen file with `UI.css('drops', `.drops-map{…}`)`. Scope it under a screen class, use logical
properties only, and **no transitions/animations**.

---------------------------------------------------------------------------------------------------
## 2. Routes (plain hash names — no `#/path`, no query strings)

* URL = `index.html#<route-name>`; an optional `-ar` / `-en` suffix switches the language
  (`#admin-drops-ar`). The router strips it and stores the language.
* Parameters (ids, tabs, prefill …) are passed **in memory**: `App.go(name, params)`. They are also
  kept in `sessionStorage`, so a reload of a detail page still works. The hash stays `#name`.
* Portal guard: names starting `admin-` need an admin session; `m-` needs a merchant session.
  Without a session the user is sent to that portal's login and returned afterwards.
  (QA/devs: `App.devLogin('admin'|'merchant')` in the console, or simply click "Sign In" — the mock
  accepts any non-empty credentials.)
* A sidebar item whose route isn't registered yet shows a branded placeholder ("Screen in
  progress") instead of breaking. Register your route and the placeholder disappears.

### Canonical route names (use exactly these — the sidebar, widgets and other screens link to them)

Admin sidebar (nav key = English label):

| Nav item | Route | Owner |
|---|---|---|
| Command Center | `admin-command-center` | LEAD |
| Drops | `admin-drops` | D1 |
| Pickups | `admin-pickups` | D1 |
| Orders & Reservations | `admin-orders` | D1 |
| Merchants | `admin-merchants` (+ `admin-merchant-new`, `admin-merchant-detail` {id}) | D1 |
| Consumers | `admin-consumers` (+ `admin-consumer-detail` {id}) | D1 |
| Financials | `admin-financials` (+ `admin-payout-detail` {id}) | D2 |
| Operations Analytics | `admin-operations` | D2 |
| Wallet & Vouchers | `admin-wallet` {tab:'credit'\|'vouchers'} (+ `admin-voucher-new`, `admin-wallet-detail` {id}, `admin-voucher-detail` {id}) | D2 |
| Quality & Safety | `admin-quality` (+ `admin-compliance-detail` {id}) | D2 |
| Issues & Alerts | `admin-issues` {tab} | D1 |
| Support | `admin-support` (+ `admin-ticket-detail` {id}) | D1 |
| Performance | `admin-performance` (+ `admin-performance-report`) | D2 |
| Sustainability & Impact | `admin-sustainability` (+ `admin-sustainability-report`) | D2 |
| Listings & Templates | `admin-listings` (+ `admin-template-new`, `admin-template-edit` {id}) | D3 |
| CMS | `admin-cms` {tab} (+ `admin-cms-page` {id}, `admin-cms-banner` {id}, `admin-cms-faq` {id}) | D3 |
| Users & Access | `admin-users` | D3 |
| Settings | `admin-settings` = General; `admin-settings-profile`, `admin-settings-notifications`, `admin-settings-security`, `admin-settings-policies`, `admin-policy-refund`, `admin-policy-about`, `admin-policy-privacy`, `admin-policy-terms` | D3 |

Not in the admin nav: `admin-moderation` (D1, from Issues & Alerts → Moderation tab and from alerts),
`admin-templates` (D3, templates gallery, target of the "Create from Template" banner on admin).

Merchant sidebar:

| Nav item | Route | Owner |
|---|---|---|
| Overview | `m-overview` | LEAD |
| Orders & Pickups | `m-orders` (order detail = modal inside) | D4 |
| Listings (Bags) | `m-listings` | D4 |
| Inventory | `m-inventory` (+ `m-inventory-new`, `m-inventory-detail` {id}, `m-create-product` {templateId?}) | D4 |
| Driver | `m-drivers` (+ `m-driver-detail` {id}) | D4 |
| Analytics | `m-analytics` (+ `m-analytics-days`) | D4 |
| Customers | `m-customers` (+ `m-customer-new`, `m-customer-detail` {id}) | D4 |
| Branches | `m-branches` (+ `m-branch-edit` {id?}) | D4 |
| Reviews | `m-reviews` | D3 |
| Reports / Dispute | `m-reports` (+ `m-report-detail` {id}) | D3 |
| Templates | `m-templates` | D4 |
| Settings | `m-settings` {tab:'profile'\|'store'\|'security'\|'hours'\|'language'} | D3 |

Not in the merchant nav: `m-help` (D3, from "Need Help?"), `m-vendors` (+ `m-vendor-new`, `m-vendor-detail`) (D4, linked from Branches page header),
`m-sustainability` (LEAD, target of the merchant "This month's impact" card), `admin-notifications` / `m-notifications` (LEAD, "View all" in the notifications panel).

Public/shell (LEAD): `launcher`, `admin-login`, `m-login`, `m-signup`, `forgot-password` {portal},
`reset-password` {portal}, `otp` {portal}, `not-found`.

---------------------------------------------------------------------------------------------------
## 3. Registering a route

```js
App.route(name, {
  portal:  'admin' | 'merchant' | 'public',   // default from the name prefix
  nav:     'Drops',            // English label of the sidebar item to highlight
  title:   'Drops',            // English; shown in the glass top bar (t() is applied by the shell)
  subtitle:'Manage scheduled and active food drops across all locations.',
  chrome:  true,               // false = full-bleed (auth pages)
  render(el, ctx) { … },       // el = <div class="page"> inside the shell; may return a Promise
  exportResource: 'admin.drops',            // (v1.1) used by the top-bar Export dialog
  exportColumns: ['Drop','Restaurant','Status'],
});
// title / subtitle may also be functions (ctx) => html (e.g. the merchant greeting).
```

`ctx` = `{ name, params, state, go: App.go, refresh(), onCleanup(fn), setTitle(en, subtitleEn) }`.

* `ctx.refresh()` re-runs `render` (e.g. after a save).
* `ctx.onCleanup(fn)` runs when the user leaves the route (remove timers/listeners on `document`).
  Listeners attached to `el` don't need cleanup, because `el` is thrown away.
* When the language or theme changes, the router re-renders the current route, so build all text with `t()` at
  render time (never cache translated strings).
* Charts animate once per render automatically (the router puts `.anim` on the page).

Navigation: `App.go('admin-merchant-detail', { id: 'MER-094' })`, or in markup
`<a href="#admin-drops" data-go="admin-drops">` or `UI.link('View All', 'admin-issues', {tab:'alerts'})`.
Any element with `data-go="route"` and optional `data-params='{"id":"x"}'` navigates on click.

---------------------------------------------------------------------------------------------------
## 4. State

`App.state` (read freely, write through the setters):

| key | values | setter |
|---|---|---|
| `lang` | `'en'` (default) \| `'ar'` | `App.setLang('ar')` |
| `theme` | `'dark'` (default) \| `'light'` | `App.setTheme('light')` |
| `portal` | `'admin'` \| `'merchant'` \| null | set by router |
| `user` | `{ id, name, role, email, portal, merchant? }` \| null | `App.login(portal, user)` / `App.logout()` |
| `dateRange` | `{ from:'2025-06-20', to:'2025-07-20', preset:'30d' }` | `App.setDateRange(r)` |
| `branch` | `{ id:'all'\|'BR-01'…, name }` (merchant) | `App.setBranch(b)` |

Language and theme persist in `localStorage` (`wb.lang`, `wb.theme`) and sessions in `wb.session.*`,
all wrapped in try/catch. Listen for changes with `App.on('lang'|'theme'|'dateRange'|'branch'|'route', fn)`.
When `dateRange` or `branch` changes, the current route is re-rendered. **Always pass
`App.state.dateRange` / `App.state.branch.id` to your API calls** (`api.ctx()` does it for you, see §6).

---------------------------------------------------------------------------------------------------
## 5. i18n

* EN keys = the exact English UI text. `t('Total Drops')` → `'إجمالي العروض'` in Arabic.
* Placeholders: `t('{n} orders awaiting collection by {time}', { n: 4, time: '20:00' })`.
* **(v1.1) Ambiguous words:** prefix a context, `t('theme|Day')`. EN shows "Day"; AR looks up the full key `'theme|Day'`
  (falling back to `'Day'`). Use this when the same English word needs different Arabic (e.g. `'weekday|Day'`, `'verb|Report'`).
* **(v1.1) Core-protected keys:** the shell/nav/status vocabulary in `i18n/core.js` is added with `{core:true}`, so later
  module dictionaries can't override it (e.g. nav "Driver" stays `السائقون` per the RTL brief). Conflicts are listed by
  `App.i18n.conflicts()`; generic content words are released so you can translate them for your own screens.
  If you need a different Arabic for a protected word, use a context key.
* **(v1.1) LocalizedText:** contract content fields are `{ en, ar }`. Render them with `App.loc(x)` (also `t.loc(x)`), which
  returns the current-language string; plain strings pass through `t()`.
  Values aren't escaped, so pass `fmt.*` output (which already carries LTR isolation).
* Add Arabic in your module file: `App.i18n.add({ 'Total Drops': 'إجمالي العروض', … })`.
  Missing keys fall back to English and are listed by `App.i18n.missing()`. QA runs it, so keep it empty.
* Copy style: concise Modern Standard Arabic; no uppercase or letter-spacing on Arabic.

Formatting (all return **HTML** with numbers wrapped in `<span class="num">` = LTR isolate; use
`fmt.text.*` for plain text, e.g. in `title=""` or inside SVG):

```js
fmt.money(24560)            // EN "AED 24,560"        AR "24,560 د.إ"
fmt.money(211540, 'QAR')    // EN "QAR 211,540"       AR "211,540 ر.ق"
fmt.money(4.99, 'AED', 2)   // 2 decimals
fmt.money({ amount: 2580, currency: 'AED' })   // (v1.1) contract Money object
fmt.kpi(kpi)                // (v1.1) contract Kpi value by kpi.format (number|money|percent|tonnes|litres|gallons|…)
fmt.delta(kpi)              // (v1.1) '+16.4%' | '+3' | '+4.1pp' | '−0.6 days' from kpi.delta + kpi.deltaUnit
fmt.number(1842)            // "1,842"
fmt.compact(52400)          // "52.4k"
fmt.pct(18.6, {sign:true})  // "+18.6%"
fmt.date('2025-07-19')      // EN "Jul 19, 2025"   AR "19 يوليو 2025"
fmt.date(d, 'short')        // EN "Jul 19"         AR "19 يوليو"
fmt.time('18:00')           // EN "6:00 PM"        AR "6:00 م"
fmt.timeRange('17:30','18:00') // EN "5:30–6:00 PM" AR "5:30–6:00 م"
fmt.ago(12)                 // minutes → EN "12m" / "2h" / "3d"; AR "12 د" / "2 س" / "3 ي"
fmt.id('#3021')             // isolates IDs like MO-5210, DR-3391
fmt.month('Feb')            // AR "فبراير"
```

---------------------------------------------------------------------------------------------------
## 6. API (`assets/js/api/client.js`)

```js
const res = await api(method, path, payload?, opts?)
// GET/DELETE: payload = query object → serialized into the path (?status=live&page=2)
// POST/PUT/PATCH: payload = JSON body
// resolves  { data, page, pageSize, total, summary, meta }   (v1.1) lists expose the contract's top-level
//           page/pageSize/total/summary AND the same values in `meta` (either style works; dataTable reads meta)
// rejects   ApiError { status, code, message, details }
```

* Paths **and response shapes** must match `docs/API_CONTRACT.md` / `docs/openapi.yaml` (API engineer). Families:
  `/auth/*`, `/me`, `/shared/*` (notifications, search, exports, uploads, imports, impact, meta, help, support tickets),
  `/admin/*`, `/merchant/*`. Error codes are the contract's lowercase ones (`validation_error`, `unauthorized`,
  `forbidden`, `not_found`, `conflict`, `policy_violation`, `rate_limited`, `internal`). The real-backend error body
  `{ error:{code,message,details} }` is mapped to `ApiError` automatically.
* LEAD mocks (in `api/mock/core.js`), already matching the contract: `POST /auth/login|otp/verify|otp/resend|merchant/signup|password/forgot|password/reset|logout|refresh`,
  `GET /me`, `GET /shared/notifications` (+ `PATCH /shared/notifications/{id}`, `POST /shared/notifications/read-all`), `GET /shared/search`,
  `POST /shared/exports` (+ mock-only `/complete`, `GET /shared/exports`, `GET /shared/exports/{id}`), `GET /shared/impact`, `GET /shared/help/faqs`,
  `POST /shared/support/tickets`, `GET /merchant/me/branches`, `GET /merchant/context`, `GET /admin/dashboard`, `GET /admin/dashboard/drop-accuracy`,
  `GET /admin/alerts`, `POST /admin/alerts/{id}/dismiss`, `GET /merchant/overview`, `GET /merchant/overview/sales`, and a fallback
  `PATCH /merchant/branches/{id}/state` (D4's Branches mock registers the same route later and wins, which is intended).
* Mock handlers may call `api()` themselves (async), e.g. to read another module's source of truth (Overview reads
  `GET /merchant/branches/{id}` for the open/closed state).
* List query conventions: `q`, `page` (1-based), `pageSize` (default 10), `sort` (`field` or
  `-field`), filters by name (`status`, `category`, `city`, `dietary` …), plus the context params
  `from`, `to` (dateRange) and `branchId` (merchant). Spread `api.ctx()` to add them:
  `api('GET','/merchant/orders',{ ...api.ctx(), status, page })`.
* Real backend switch: `api.config({ mock:false, BASE_URL:'https://api.wonderbites.ae/v1' })`.
  The client sends `Authorization: Bearer <token>`, `Accept-Language: en|ar` and JSON, and maps
  non-2xx responses to `ApiError`.
* Mock adapter (on by default): latency 180–450 ms. Simulate failures with
  `api.simulate('GET /admin/drops', 'error'|'empty'|'slow')` or add `__sim=error` to the query.

### Writing mock handlers (your `api/mock/<module>.js`)

```js
const drops = api.db.table('drops', SEED_ROWS, { searchable:['name','id','restaurant'] });

api.mock('GET',    '/admin/drops',      req => drops.list(req.query));            // filters+sort+page
api.mock('GET',    '/admin/drops/:id',  req => drops.get(req.params.id) || api.notFound());
api.mock('PUT',    '/admin/drops/:id',  req => drops.update(req.params.id, req.body));
api.mock('DELETE', '/admin/drops/:id',  req => (drops.remove(req.params.id), { ok:true }));
api.mock('POST',   '/admin/drops/bulk', req => ({ updated: req.body.ids.length }));
```

* A handler gets `req = { method, path, params, query, body, headers }` and returns either the
  `data` (wrapped as `{data}`) or a full `{ data, meta }`. Throw `api.error(422,'VALIDATION','msg',details)`
  for errors.
* `table.list(query, { summary(allRows, filteredRows, query) })` supports `q`, `sort`, `page`, `pageSize`, and exact-match filters for every
  other query key whose value isn't `''`/`'all'`. It returns `{ data, page, pageSize, total, summary, meta }`.
* Table API: `all()`, `get(id)`, `insert(row)`, `update(id, patch)`, `remove(id)`, `list(query, {filter(row,query)})`.
* Statuses in data are **English enum strings** (`'live'`, `'sold_out'` …). Map them to labels with
  `UI.status` (§7).

---------------------------------------------------------------------------------------------------
## 7. UI helpers (`assets/js/core/ui.js`) — all return HTML strings unless noted

```js
UI.esc(s)                                   // escape user/mock text
UI.icon(name, cls?)                         // see UI.icons for names; add 'flip' to mirror in RTL
UI.btn(label, { variant:'primary'|'secondary'|'ghost'|'danger'|'green'|'icon', icon, size:'sm'|'md',
                 attrs:'data-act="save"', go:'route', params, type:'button'|'submit', disabled })
UI.link(label='View All', route, params)    // accent link with direction-aware chevron
UI.card({ title, icon, tone:'rose'|'lime'|'orange'|'mauve', count, sub, actions, body,
          hero:'rose'|'lime', flush:true, cls, id })          // hero glow ONLY for Priority Alerts & Sustainability Impact
UI.kpi({ label, icon, tone, value, delta:{ value:'+16.4%', dir:'up'|'down', good:true }, foot,
         spark:[…], badge, go, params })
UI.kpis(items, cols?)                        // KPI grid row (items = UI.kpi option objects or ready HTML strings)
UI.kpiData(kpi, { icon, tone, go, params, goodWhen:'down', captionTone:'neg' })   // (v1.1) contract Kpi → KPI card
UI.select({ name, label, value, options:[{value,label}] })   // (v1.1) compact "This Week ▾" menu → emits 'ui:select' {name,value}
UI.banner(route, { title, text, cta })       // (v1.1) "Create more. Rescue more. Impact more." banner → route
UI.status.ensure({...})                      // (v1.1) like register() but never overrides an existing enum
UI.pill(status, { label?, tone? })           // status pill w/ icon; status = enum or English label
UI.status.register({ in_review:{ label:'In Review', tone:'o', icon:'clock' } })  // add your enums
   tones: g (green) o (orange) r (rose) n (grey) m (mauve/info)
UI.chip(label, { tone, icon })               // small tag (category, severity, type)
UI.avatar(name, { size, img:'ph1' })         // initials or food placeholder (ph1..ph6)
UI.thumb(variant='ph1', size)                // CSS food placeholder
UI.empty({ icon, title, text, action })      // empty state
UI.skeleton('table'|'cards'|'kpis'|'list'|'form', n)
UI.errorState({ text, retry:true })          // retry button emits 'ui:retry'
UI.pagination({ page, pageSize, total })
UI.tabs({ name, tabs:[{ id, label, count }], active })          → emits 'ui:tab'  {name, value}
UI.segmented({ name, options:[{ value, label }], value })        → emits 'ui:seg'  {name, value}
UI.toggle({ name, checked, label?, disabled? })                   → emits 'ui:toggle' {name, value}
UI.field({ type:'text'|'email'|'password'|'number'|'tel'|'url'|'date'|'time'|'money'|'textarea'|
                 'select'|'multiselect'|'checkbox'|'radio'|'search'|'color',
           name, label, value, placeholder, required, options:[{value,label}], hint, prefix, suffix,
           min, max, minlength, maxlength, pattern, rows, cols:1|2 , icon, disabled })
UI.dropzone({ name, accept:'image/*', multiple:true, hint, files:[] })   // instant previews
UI.richText({ name, value, placeholder })    // toolbar: B I U H2 • 1. link quote undo
UI.stepper({ steps:['Basics','Branches','Compliance','Review'], current:1 })
UI.filters({ search:{ placeholder:'Search by box ID', name:'q' },
             selects:[{ name:'status', label:'All Status', options:[…] }],
             sort:{ name:'sort', options:[…], value }, actions:UI.btn(…) , clear:true })
```

Stateful helpers (mount into an element, return a controller):

```js
// Data table: loading → rows | empty | error, with sorting, bulk select, row actions and pagination
const tbl = UI.dataTable(el, {
  columns: [
    { key:'name', label:'Drops', sortable:true, render:r => `…` },
    { key:'price', label:'Price', align:'end', sortable:true, render:r => fmt.money(r.price) },
    { key:'status', label:'Status', render:r => UI.pill(r.status) },
  ],
  fetch: q => api('GET', '/admin/drops', { ...q, ...filters.values() }),  // q = {page,pageSize,sort}
  select: true,                               // checkbox column (start side)
  bulkActions: [{ label:'Delete', icon:'trash', danger:true, run: ids => … }],
  rowActions: r => [ { icon:'eye', label:'View', run:() => … }, { icon:'trash', label:'Delete', danger:true, run:() => … } ],
  rowClick: r => App.go('admin-merchant-detail', { id:r.id }),
  pageSize: 10, sort:'-createdAt',
  empty: { icon:'bag', title:'No drops found', text:'Try changing the filters.' },
});
tbl.reload(); tbl.selected(); tbl.setQuery({ page:1 });

// Filters bar wiring (search debounced 250 ms, selects, chips with ×, Clear Filters)
const f = UI.mountFilters(el, filtersConfig, values => tbl.setQuery({ page:1 }));
f.values()  // {q, status, …}  ('' = all)

// Generic async block for non-table content
UI.async(el, () => api('GET','/admin/command-center'), res => `…html…`, { skeleton:'cards' });

// Forms: native validation + bilingual messages; returns {ok, values, errors}
const r = UI.validate(formEl); if (!r.ok) return;
UI.formValues(formEl)   // {name: value} (checkbox → boolean, multiselect → [] , dropzone → files)
```

Overlays (appear instantly, Esc closes, focus is trapped and returned to the trigger):

```js
const m = UI.modal({ title, body, size:'sm'|'md'|'lg', actions:[
          { label:'Cancel', variant:'secondary', close:true },
          { label:'Save', variant:'primary', run: async (m) => { …; m.close(); } } ],
        onOpen: m => {/* m.el = dialog element */} });
const d = UI.drawer({ title, body, width:480, actions, onOpen });
const ok = await UI.confirm({ title:'Delete drop?', text:'This cannot be undone.', confirm:'Delete', danger:true });
UI.toast('Export started', { tone:'success'|'error'|'info' });
UI.menu(anchorEl, [{ label:'Duplicate', icon:'copy', run }, { label:'Delete', icon:'trash', danger:true, run }]);
```

Events: `UI.on(root, 'click', '[data-act="save"]', (e, el) => …)` (delegated). Component events
(`ui:tab`, `ui:seg`, `ui:toggle`, `ui:retry`, `ui:change`) bubble from the component root.

---------------------------------------------------------------------------------------------------
## 8. Charts (`assets/js/core/charts.js`) — HTML strings, animate once per render

```js
// (v1.1) every chart also accepts contract Series: series:[{ label, points:[{x,y}], color }] (labels taken from x;
//        ISO dates 'YYYY-MM-DD' and months 'YYYY-MM' are localized automatically)
Charts.area({ series:[{ name:'This Period (QAR)', values:[…], color:'rose' },
                      { name:'Previous Period (QAR)', values:[…], color:'mauve', dashed:true }],
              labels:['Jun 14', …],   // English month labels are localized automatically
              yTicks:[0,40,80], yFormat:v=>v+'K', height:220, tooltip:{ index:5, title:'Jun 24 · 18:00', value:fmt.money(21480), delta:'+3.4%' },
              fill:true })                                        // line chart: fill:false
Charts.bars({ series:[…], labels:['Feb','Mar',…], yTicks, yFormat, height, stacked:false, horizontal:false })
Charts.donut({ segments:[{ label:'Active & Verified', value:62, color:'green' }, …], size:140, thickness:18,
               center:{ value:fmt.number(1842), label:'passports' }, legend:true, legendFormat:v=>v+'%' })
Charts.spark(values, { color:'lime'|'rose', width, height })
Charts.histogram([{ label:'5', value:440 }, …], { max, color })   // horizontal bars (ratings)
Charts.funnel([{ label:'Reserved', value:356 }, …])
Charts.progress(value, { max:100, color, label })                 // thin bar
Charts.ring(value, { size, color, label })                         // radial progress
```
Colors: `rose`, `berry`, `mauve`, `lime`, `green`, `orange`, `grey`, or any CSS color.
The time axis always runs left→right in both languages, while the legend, title and tooltip follow `dir`.

---------------------------------------------------------------------------------------------------
## 9. Global overlays (LEAD, `core/overlays.js`) — call them, don't rebuild them

`Overlays.notifications(anchor)`, `Overlays.dateRange(anchor)`, `Overlays.profile(anchor)`,
`Overlays.search(anchor)`, `Overlays.export({ scope:'Drops', columns:[…], endpoint:'/admin/drops' })`,
`Overlays.branch(anchor)`, `Overlays.help()`, `Overlays.logout()`.
Add an **Export** button to your list toolbar that calls `Overlays.export({ scope:'Drops', resource:'admin.drops', columns:[…], filters })`
(`resource` uses the contract's ExportRequest resource names). The top-bar Export button uses the current route's
`exportResource` / `exportColumns` options from `App.route()`, so set them on your list routes.
Also available (v1.1): `Overlays.itemHTML(notification, 'li'|'it')` renders a contract Notification, and
`Overlays.openLink(deepLink)` follows a contract `DeepLink { route, id, params }`.

---------------------------------------------------------------------------------------------------
## 10. Styling & layout rules

* Use the shell classes: the page is `.page` with `display:grid; gap:var(--gap)` (24px). Rows go in
  `<div class="grid g-5">` / `g-4` / `g-3` / `g-2` or `<div class="grid" style="grid-template-columns:…">`.
* Card = `UI.card()`. Inside, use `.cd-b` for the padded body and `flush:true` for edge-to-edge tables/lists.
* Tables: `.tbl` (sticky header, row hover, row height 52px). Put the checkbox column first, which lands
  at the start side, and the actions column last.
* Use only logical properties: `margin-inline-start`, `padding-inline-end`, `inset-inline-start`,
  `text-align:start|end`, `border-inline-start`. Never `left/right` in new CSS.
* Wrap numbers, IDs and amounts with `fmt.*` (or `<span class="num">`).
* No `transition`, `animation` or `@keyframes` outside `charts.js`. Hover/focus may change colour instantly.
* Type: Playfair Display (EN) / Noto Naskh Arabic (AR) via `var(--font-display)` for page titles and the
  big serif headings in cards (`.h-serif`); everything else uses `var(--font-ui)` (Inter / IBM Plex Sans Arabic).
  KPI numbers use `var(--font-num)`.
* Tokens: see `assets/css/tokens.css` (`--bg`, `--card`, `--text`, `--muted`, `--faint`, `--accent`,
  `--line`, `--pos`, `--neg`, `--warn`, tints `--tint-rose|green|orange|mauve|berry`, `--r-card:16px`,
  `--r-ctl:11px`, `--gap:24px`, `--pad:20px`).

---------------------------------------------------------------------------------------------------
## 11. Complete example screen

```js
// assets/js/screens/admin/drops.js   (owner: D1)
(function () {
  UI.status.register({
    live:{ label:'Live', tone:'g', icon:'radio' }, completed:{ label:'Completed', tone:'g', icon:'checkc' },
    active:{ label:'Active', tone:'g', icon:'checkc' }, expired:{ label:'Expired', tone:'n', icon:'clock' },
  });

  App.route('admin-drops', {
    nav: 'Drops', title: 'Drops',
    subtitle: 'Manage scheduled and active food drops across all locations.',
    render(el, ctx) {
      el.innerHTML = `
        <div data-kpis>${UI.skeleton('kpis', 5)}</div>
        <div data-filters></div>
        ${UI.card({ title: t('All Drops'), sub: t('Summary of all drops'), icon: 'bag', flush: true,
                    body: '<div data-table></div>' })}`;

      UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/drops/summary', api.ctx()), ({ data }) =>
        UI.kpis([
          { label: t('Total Drops'), icon: 'bag', tone: 'rose', value: fmt.number(data.total), foot: t('Across all restaurants') },
          // …
        ]), { skeleton: 'kpis' });

      const filters = UI.mountFilters(el.querySelector('[data-filters]'), {
        search: { name: 'q', placeholder: 'Search by box ID' },
        selects: [
          { name: 'status', label: 'All Status', options: [{ value: 'live', label: 'Live' }, { value: 'expired', label: 'Expired' }] },
          { name: 'category', label: 'All Categories', options: [{ value: 'bakery', label: 'Bakery' }] },
        ],
        sort: { name: 'sort', options: [{ value: '-createdAt', label: 'Newest First' }, { value: 'price', label: 'Price: Low to High' }] },
        actions: UI.btn('Export', { variant: 'secondary', icon: 'upload', attrs: 'data-act="export"' }),
      }, () => table.setQuery({ page: 1 }));

      const table = UI.dataTable(el.querySelector('[data-table]'), {
        select: true, pageSize: 10,
        columns: [
          { key: 'name', label: 'Drops', sortable: true, render: r => `<div class="prod">${UI.thumb(r.thumb)}<div><b>${UI.esc(t(r.name))}</b><small>${fmt.id(r.id)}</small></div></div>` },
          { key: 'price', label: 'Price', align: 'end', sortable: true, render: r => fmt.money(r.price) },
          { key: 'status', label: 'Status', render: r => UI.pill(r.status) },
        ],
        fetch: q => api('GET', '/admin/drops', { ...api.ctx(), ...filters.values(), ...q }),
        rowActions: r => [
          { icon: 'eye', label: 'View', run: () => openDrawer(r) },
          { icon: 'edit', label: 'Edit', run: () => App.go('admin-drop-edit', { id: r.id }) },
          { icon: 'trash', label: 'Delete', danger: true, run: async () => {
              if (await UI.confirm({ title: t('Delete drop?'), text: t('This cannot be undone.'), confirm: t('Delete'), danger: true })) {
                await api('DELETE', '/admin/drops/' + r.id); UI.toast(t('Drop deleted'), { tone: 'success' }); table.reload();
              } } },
        ],
        empty: { icon: 'bag', title: 'No drops found', text: 'Try changing the filters.' },
      });

      UI.on(el, 'click', '[data-act="export"]', () => Overlays.export({ scope: 'Drops', endpoint: '/admin/drops' }));

      function openDrawer(r) {
        UI.drawer({ title: t(r.name), body: `…`, actions: [{ label: 'Close', variant: 'secondary', close: true }] });
      }
    },
  });
})();
```

```js
// assets/js/i18n/admin-ops.js
App.i18n.add({ 'All Drops': 'جميع العروض', 'Summary of all drops': 'ملخص جميع العروض', 'Total Drops': 'إجمالي العروض' });
```

---------------------------------------------------------------------------------------------------
## 12. Done checklist (per screen)
- [ ] Route registered with the canonical name; sidebar highlight correct.
- [ ] All data via `api()`; mock handler path documented/matching the contract.
- [ ] Loading skeleton, empty state and error + retry for every list/async block.
- [ ] Every button, link, row action, tab and menu item does something real (route, modal, drawer, toast or confirm).
- [ ] EN + AR (no missing keys), Night + Day, 1440 & 1280 widths, no console errors.
- [ ] Keyboard: focus ring visible, Esc closes overlays, tab order sane.
- [ ] No transitions/animations except charts.

---------------------------------------------------------------------------------------------------
## 13. Notes for teams (v1.1)
* Contract route names in `API_CONTRACT.md` headings (e.g. `m-product-new`, `admin-listings-templates`) are descriptive;
  the **canonical hash routes are the ones in §2** (`m-create-product`, `admin-listings`). Don't register both.
* Reference screens to copy from: `screens/admin/command-center.js`, `screens/merchant/overview.js` (contract Kpi/Series/
  Segment/Notification handling, deep links, dropdown period selectors, confirm + PATCH + local update pattern).
* Auth/session: `App.login(portal, user, accessToken, refreshToken)`, `App.state.user` follows the contract `User`
  (`firstName`, `role`, `merchant:{merchantId,name,verified,…}`); `App.roleLabel(user)` gives the display role.
* Dev helpers: `App.devLogin('admin'|'merchant')`, `api.simulate('GET /admin/drops','error'|'empty'|'slow')`,
  `App.i18n.missing()`, `App.i18n.conflicts()`, `api.routes()`.

---------------------------------------------------------------------------------------------------
## 14. Markets (v1.3) — Qatar launch, UAE / KSA addable without code changes
* **Registry:** `core/markets.js` loads `GET /shared/markets` at boot (`App.onBoot`) and again after Admin → Settings → Markets changes.
  `Markets.list(enabledOnly)`, `Markets.get(code)`, `Markets.enabled()`, `Markets.primary()`, `Markets.options()`, `Markets.cityOptions(code)`,
  `Markets.cityName(id)`, `Markets.cityProxy()` (live `{id: name}` map for filters), `Markets.phoneOptions()`, `Markets.timeZoneOptions()`,
  `Markets.currencyOptions()`, `Markets.currencyLabel(cur)`, `Markets.reportingCurrency()`, `Markets.convert(amount, from, to)`.
* **Context:** `App.market()` (admin: switcher `'all'|code`; merchant: active branch's country), `App.marketInfo()`, `App.currency()`
  (merchant branch → merchant; admin market → reporting currency for “All markets”), `App.timeZone()`, `App.setMarket(code)`.
* **Never hard-code** a currency, phone code, time zone, country or city in a screen:
  - `fmt.money(x)` without a currency uses `App.currency()`; contract `Money` objects always use their own `currency`.
  - money inputs: `UI.field({ type:'money', currency? })` — the prefix comes from `currency` or the context (`UI.moneyField`, `UI.currencyPrefix(cur)`, `fmt.currency(cur)`).
  - phones: `UI.phone({ name, codeName, market?, code?, value })` = code selector (enabled markets) + number.
  - ISO timestamps: `fmt.date(iso)` / `fmt.clock(iso)` render in `App.timeZone()` (branch / market); `HH:mm` values are already branch-local.
* **API:** every admin read carries `market` (added by `api()` automatically). Mocks: `api.scope()` = codes in scope, `api.inScope(row)`,
  `api.scoped(array)` (filtered live view), `api.lens(re, fn)` (post-process aggregates), `api.markets.convert/convertDeep`.
  Lists keep each row in its own currency; aggregates come back in the market currency or the reporting currency (`meta.market.converted`).

## 15. Shared demo store & business rules (v1.4) — `assets/js/api/mock/store.js` (LEAD)
One in-browser store backs **both** portals, so a record has the same id and state everywhere. Mocks read and write it; screens keep calling `api()` only.
- **Demo clock:** `api.DEMO_TODAY` (`'2026-11-19'`, defined once in `api/mock/core.js`), `api.demoNow()`, `api.demoIso()`, `api.demoDate(offsetDays)`. Never use `new Date()` / literal dates for data. The default global range is the last 30 days ending on demo today.
- **Collections** on `window.WBStore` (`S`): `orders`, `listings` (a merchant listing *is* an admin drop — `S.withListings(ownDrops)` / `S.dropView(listing)`), `pickups`, `tickets` (merchant disputes `source:'dispute'`, help requests `source:'help'`, admin tickets), `moderation`, `merchants`, `accounts`.
  - Merchant handlers use `S.view(S.orders, (o) => o.merchantId === S.me())`: a live, tenant-filtered view (push/splice write to the shared array).
- **Order state machine:** `S.FLOW`, `S.canTransition(o, to)`, `S.transition(o, to, { by, note, event })`.
  - The transition throws 409 `invalid_transition` `{from, to, allowed}`.
  - It writes exactly one timeline event and applies the stock effects.
  - Return `S.allowedActions(o)` (`verify_pickup | assign_driver | mark_delivered | complete | cancel | refund`) and `S.isActive(o)` (paid, not collected) on every order. UIs show only the allowed actions.
  - Self-pickup orders complete only via pickup verification. Delivery orders go out_for_delivery → delivered → completed.
- **Pickup codes:** `S.pickupCode(seed)` (6 chars from `S.CODE_ALPHABET`, unique), `S.codeExpiry(date, end, market)` (window end in branch time + `S.GRACE_MIN` = 30).
  - `S.verifyPickup({ code, orderId | pickupId, by, merchantId })` is the **only** verification path (merchant modal, `POST /merchant/pickups/verify`, Admin Pickups). It returns `{pickup, order}`.
  - Errors: 422 `invalid_code` / `code_expired`, 409 `code_used` / `invalid_transition`.
- **Stock:** `remaining = quantity − reserved − collected`. Change quantity only through `S.setQuantity(l, qty)`, which returns 422 `{quantity: 'below_committed', committed}`. Never set `remaining` directly.
- **Commission:**
  - `S.commercial` holds the default (19 %) and an effective-dated history. `S.contracts` holds merchant overrides.
  - `S.rateFor(merchantId, date)`, `S.earnings(merchantId, from, to)` → `{gross, commission, refunds, net, rate, orders}`, `S.payouts(merchantId)` → 4 weekly statements.
  - Every financial figure must come from these. No literal commission percentages.
- **Merchant accounts:**
  - `S.adminCreateMerchant(body)` is the same path as Add Merchant; sign-up uses it with `source: 'self_signup'`, so the merchant starts as Pending verification.
  - Sign-in is refused for `pending`, `rejected` and `suspended` merchants.
- **Support contacts** come from the markets registry: `supportEmail, merchantSupportEmail, supportPhone(Label), supportWhatsApp, supportHours`. Read them via `App.marketInfo()` in the UI. Never hard-code addresses or numbers.
- **Demo data hygiene:**
  - People's emails use `example.com` (or `<brand>.example.com`).
  - Phones use the 5550 range.
  - IBANs are masked (`QA00 •••• … (demo)`).
  - `python3 qa/scrub_pii.py --check` enforces this (run by `qa/run_all.sh`).
  - Both top bars show the "Demo data" badge, and the sign-in screens say "Demo: any credentials".
