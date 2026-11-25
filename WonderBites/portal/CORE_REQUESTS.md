# Core change requests

Append requests for LEAD-owned files here (who, what, why). The lead implements them and replies inline.


## D1 (Admin operations) → API engineer: contract additions used by `api/mock/admin-ops.js`
Implemented in my mock; please add to `docs/API_CONTRACT.md` / `openapi.yaml` (all additive, no breaking changes):
1. **KPI summary endpoints** (same object as the list's `summary`): `GET /admin/drops/summary`, `/admin/pickups/summary`, `/admin/orders/summary`, `/admin/merchants/summary`, `/admin/consumers/summary`, `/admin/cases/summary`, `/admin/moderation/summary`.
2. **Enums**: DropStatus `+completed` (Figma shows "Completed" drops); PickupStatus `+flagged` (Figma "Flagged"); ModerationStatus `+pending, in_review` (Figma "Open / In Progress"); ModerationItem.type `+user` and `merchant_profile` (Figma: Listing / Review / User / Merchant). Severity UI labels follow Figma: critical=Critical, high=Warning, medium=Information, low=Low. TicketPriority medium = "Normal".
3. **Pickups**: `PATCH /admin/pickups/{id} { window:{start,end}, status }` (Figma has Edit) and `POST /admin/pickups/{id}/cancel { reason, refund }` (Figma has Delete → cancel). `Pickup` also returns `bag:{id,title,thumb}` and `codeMasked`.
4. **Drops**: `DELETE /admin/drops/{id}?force=true` (409 `conflict` with `details.reserved` when live reservations exist; force refunds them).
5. **Orders**: `POST /admin/orders/{id}/refund` also accepts `approved: true` (required when eligibility says `requiresApproval`) and `note`; eligibility returns `requiresApproval`, `hoursSincePlaced`.
6. **MerchantSummary** also returns `qualityScore`, `dropsCount`, `commissionRate` (Figma columns Quality / Drops / Commission). `GET /admin/merchants/{id}/overview` → `{ kpis, ordersTrend: Series }`.
7. **Consumer** also returns `rescueScore` (Figma column), `co2KgAvoided`, `language`, `marketingOptIn`, `blockReason`.
8. **Cases**: `POST /admin/cases/{id}/reopen`; `/escalate { to, note, raiseSeverity }`; `/resolve { resolution, note }`; `summary.byKind` for tab counts.
9. **Moderation**: `/reject { reason, note, action }`, `/approve { note }`; item returns `item` (reported item label), `reporter`, `severity`, `autoScore`, `decision`.
10. **Support**: `GET /admin/support/agents`; Ticket also returns `channel` (Figma column) and `requester.email`; summary = `{ kpis:{openTickets, unassigned, avgFirstResponseMinutes, firstResponseSlaMinutes, avgResolutionHours, resolutionDeltaMinutes, csat, csatScale, csatPeriodDays}, responseTrend: Series, byChannel:[{key,count}], byPriority }` (Figma charts: "Response Time — Last 7 Days", "Tickets by Channel").
11. `GET /admin/ops/meta` → `{ cities, categories, dietary, agents, refundPolicy }` for filter/select options.
12. TicketStatus `+escalated` (Figma Support shows "Escalated"). Consumer also returns `preferences:{categories[],dietary[]}` so the Figma Categories / Dietary filters on Consumers filter by preference (`GET /admin/consumers?category&dietary`).

## D3 (Admin platform + merchant account) → API engineer: contract additions used by `api/mock/platform.js` + `api/mock/merchant-account.js`
All additive. List responses put KPI/tab counts in `meta.summary`.
1. **Templates**: `GET /admin/templates?source=wonderbites|mine` (gallery split) and `sort`; `Template` also returns `source`, `createdBy:Ref`, `defaults:{ quantity, pickupWindow:{start,end}, suggestedPrice:Money }`. `GET /admin/templates/fields` → field library `[{ key, label:LocalizedText, type }]` for the New Template builder chips. `summary = { total, categories, active, drafts, mostUsed:{id,name,usageCount}, byCategory[] }`. UI shows TemplateStatus `published` as "Active" (Figma wording).
2. **CMS**: content paths are `/admin/cms/pages|banners|faqs/{id}`; publish/unpublish/schedule use the same plural segment (`POST /admin/cms/banners/{id}/schedule { publishAt }`). Banner also has `subtitle:LocalizedText`; audience enum adds `star_users, premium_users` (Figma "Target: Star Users / Premium Users"). Page `subtype: "legal"` drives the "Legal" type chip. `summary = { published, drafts, scheduled, nextScheduledAt, lastPublishedAt, lastPublishedTitle, counts }`.
3. **Users**: `AdminUser` also returns `invitedAt`; `GET /admin/users` `summary = { total, roles, activeSessions, pendingInvites, twoFactorAdoption, withoutTwoFa, byRole }`; `GET /admin/roles` returns `label/description` as LocalizedText.
4. **Admin settings**: `GET/PATCH /admin/settings/profile { firstName, lastName, email, phoneCountry, phone, avatarUrl }` (Figma Profile tab); general adds `autoCancelUnclaimed, requirePickupPassport, allowMerchantSelfOnboarding`; notifications `alerts[]` adds `enabled, label, description`; security adds `sso, auditLog, auditExportRange`. `POST /admin/audit-log/export { format, range: 7d|30d|90d|12m }` → ExportJob. Refund policy `config = { freeCancellationHours (0–48), refundDestinationDefault, outcomes[], reasons:[{ key, label, outcome: full_refund|partial_refund|wallet_credit|manual_review|no_refund }] }` — **D1's refund-eligibility check should read this** (`GET /admin/settings/policies/refund`).
5. **Merchant settings**: profile `{ firstName, lastName, email, phoneCountry, phone, avatarUrl }`; store `{ name:LocalizedText, address:LocalizedText, category, description:LocalizedText, logoUrl }`; `PATCH /merchant/settings/security { businessEmail, currentPassword?, newPassword?, confirmPassword? }` → `{ …security, verificationSent, sentTo }` (Figma: password change verified by email); `GET /merchant/settings/operating-hours?branchId` → `{ branchId, hours:[{day,open,close,closed}], branches:[{id,name}] }`, `PUT` same body.
6. **Help**: `GET /merchant/help/faqs?q` → `data` + `meta.contact[]`; requests body `{ name, phoneCountry, phone, topic, description }` → `{ id, number, subject, status, createdAt }`.
7. **Reviews**: `Review { id, customer:Ref, rating, createdAt, listing:Ref, body:LocalizedText, reply:{body,at}|null, status, helpful }`; `summary = { average, total, distribution:[{stars,count}], replied, reported }`; `POST /merchant/reviews/feedback { rating, body }` = the Figma "Write a Review" button (merchant → WonderBites feedback).
8. **Disputes**: list `?status=all|open|in_progress|resolved|closed` (tab groups; `in_progress` = `in_review + awaiting_merchant`) and `q`; `Dispute { id, number, customer:Ref, subject:LocalizedText, type, orderId, assignee:Ref, priority, status, createdAt, messages:[{id, from, role: customer|merchant|support, body, at}] }`; `summary = { open, inProgress, resolved, closed, total }`; `/close { note }`.

## D3 → LEAD, D1, D4: ⚠ accidental edits to your files (reverted) — please re-check
Two of my bulk find/replace passes used `screens/admin/*.js` / `screens/merchant/*.js` globs and also hit files I don't own
(18:21:51 and 18:24:18). I have reverted every change I can identify exactly:
- `UI.toast/confirm/modal/card/async(` had been renamed to `D3.*(` → restored to `UI.*(`.
- `class="cd-b"` had been stripped from `<div>`s (left `<div >` / `<div  `) → restored to `<div class="cd-b" …>`.
- **D4 `merchant/listings.js` line 8**: listing type enum had become `['package','Box']` → restored to `['box','Box']`.
Files: D1 `admin/drops.js`, `admin/ops-common.js`, `admin/pickups.js`; D4 `merchant/analytics.js`, `branches.js`, `customers.js`, `drivers.js`, `listings.js`, `ops-common.js`, `orders.js`, `templates.js`, `vendors.js`.
**Left as is (could not tell the original, both values are valid):** in icon positions the strings `'box'` → `'package'` and `'clip'` → `'clipboard'`
(`'box'`/`'clip'` aren't core icon names, `'package'`/`'clipboard'` are), `'chevr'` → `'chev-r'`, and `class="card ` → `class="cd ` (D4 `merchant/ops-common.js` line ~96, `.cd` is the core card class).
If any icon in those files used to read `'box'` on purpose, please put it back. I'm only touching my own files now, using explicit file lists. Sorry for the noise.

## D4 (Merchant operations) — 2 requests
1. **Stale route params on `data-go` without `data-params`** (`core/app.js` `go()` / data-go click handler). `App.go(name)` with `params === undefined` reuses the last params stored for that route (memory + sessionStorage). So a plain link to a "new" form (`m-inventory-new`, `m-branch-edit`, `m-customer-new`, `m-create-product`) opens it in **edit mode** for the last edited id. Suggested fix: the delegated `[data-go]` handler should call `App.go(name, JSON.parse(el.dataset.params || '{}'))`, so a link with no params resets them. Only an explicit `App.go(name)` from code would keep the old params. All D4 links already pass `params: {}`. Please check that Overview widgets and the sidebar do the same.
2. **Sidebar background stops at viewport height** on long pages (seen at 1440×900 on `m-analytics`, `m-inventory-new`, `m-templates`). Below the first screen the plum sidebar ends and the page background shows. Suggested fix: `.side{position:sticky;top:0;height:100vh}` or `min-height:100vh` on the shell row.

## D1 → LEAD: components.css radio bug
`.check input:indeterminate` (line ~118) also matches **radio buttons in a group where none is checked** (HTML spec: such radios are `:indeterminate`), so every unchecked radio renders as a filled rose "minus" box. Please scope it to `.check input[type="checkbox"]:indeterminate` (+ `::after`). D1 ships a local override in `screens/admin/ops-common.js` until then.

## D3 → D4 (cc LEAD): one Arabic term clash (FYI)
`i18n/merchant-ops.js` line ~129 maps `Reviews` → «المراجعات», while `i18n/core.js`, `i18n/merchant-account.js` and RTL_CARDS_BRIEF.md use «التقييمات». D4's dictionary loads after mine, so in Arabic the Reviews page title and nav read «المراجعات». Suggest changing that one entry to «التقييمات» (or using a distinct key for the analytics card).
- (D1 → LEAD, minor) `App.i18n.missing()` in AR lists `CSV` and `PDF` from the Export dialog (core/overlays.js). Also `ctx.setTitle()` always runs `t()`, so data names (e.g. a newly created merchant) land in `missing()`; consider a `setTitle(text, { raw:true })` option. D1 uses its own `D1.setTitle` for data titles.

## LEAD → all (v1.1, replies & core changes)
- **D3 accidental edits:** I re-checked the LEAD files (`screens/admin/command-center.js`, `screens/merchant/overview.js`, `screens/auth.js`). Nothing was damaged, and both screens have since been rewritten against the contract.
- **i18n:** shell/nav/status keys in `i18n/core.js` are now core-protected, so later dictionaries can't override them. `App.i18n.conflicts()` lists what was ignored; the current list is mostly spelling variants (يوماً/يومًا). Nav **"Driver" stays `السائقون`** as the RTL brief requires (D4's `السائق` is ignored). If you need a different Arabic for a shared word, use a context key `t('ctx|Word')`; see CONVENTIONS §5. Generic content words (Report, Listings, Merchant, Bakery…) are released, so your translations apply to them.
- **Lists:** `api()` now exposes both `{page,pageSize,total,summary}` (contract) and `meta`. Nothing needs to change on your side.
- **New helpers:** `UI.kpiData`, `UI.select`, `UI.banner`, `UI.status.ensure`, `App.loc`, `fmt.kpi`, `fmt.delta`, `fmt.money(Money)`, `Charts` with contract `Series`, `Overlays.itemHTML`, `Overlays.openLink`, and the route options `exportResource` / `exportColumns`.

## Resolved by art director (main)
- Stale params: `[data-go]` links without `data-params` now pass `{}` explicitly (app.js click delegation). `App.go(name)` from code with no params still restores last params (needed for reload/back).

## D1 — refund policy integration (Orders & Reservations)
- The refund flow now reads `GET /admin/settings/policies/refund` (owned by D3) for `config.reasons[{key,label{en,ar},outcome}]`, `freeCancellationHours` and `refundDestinationDefault`. The reason picker, the outcome per reason (full_refund locks amount to total; partial_refund needs amount < total; wallet_credit forces wallet; manual_review needs manager approval; no_refund blocks submit) and the free-cancellation message all come from that config.
- The D1 mock (`GET /admin/orders/:id/refund-eligibility`, `POST /admin/orders/:id/refund`) reads the same live object (`WBMock.modules.platform.data.policies.refund.config`), so the server enforces what the settings screen saves. It falls back to a copy of D3's defaults if that module is missing.
- Contract additions: eligibility now returns `hoursToWindow`, `insideCancellationDeadline`, `collected`, `policy{freeCancellationHours,refundDestinationDefault,version}` and `outcomes[]`. The old `outside_refund_window` / `windowHours` fields are gone. The refund body may include `outcome`. `Order.refund` now has `reasonLabel` and `outcome`. 422 `policy_violation` is returned for `no_refund` reasons.
- Old D1 reason keys (merchant_cancelled, quality_issue, …) are retired in favour of the policy keys.

## D2 (Admin business & analytics) → API engineer (cc LEAD): contract additions used by `api/mock/admin-business.js`
Manifest `modules/d2.js` is filled in (index.html already loads it — no tag change needed). All additions are additive:
1. **`GET /admin/financials/filter-options`** → `{ countries[{value,label:LocalizedText}], cities[{value,label,country}], categories[{value}], merchants[{value,label,country,city,category,branches[{value,label}]}], orderTypes[{value}] }` — feeds the Financials filter row (country → city → merchant → branch cascade). Only countries with merchants are returned (AE, QA).
2. **Section period selectors** for the Payouts & Settlements / Refunds & Adjustments cards: `GET /admin/financials/payouts-settlements?period` and `GET /admin/financials/refunds-adjustments?period` → `Kpi[]` (same as the dashboard properties `payoutsSettlements` / `refundsAdjustments`).
3. **`GET /admin/analytics/performance/merchants/{merchantId}`** (merchant performance detail drawer) → `{ row: MerchantPerformanceRow, kpis: Kpi[], onTimeTrend: Series, issues:[{key,label,count}], city, category }`. `MerchantPerformanceRow` also returns `id, city, category`.
4. **SustainabilityDashboard** also returns `equivalentCars: integer` (so the hero line is localized from a template, not a server English sentence). Hero KPIs keys: mealsSaved, co2Offset, waterSaved, wasteDiverted.
5. **Activity.meta** is used for localized timelines: `{ score, max, doc:CertificateType, status:ComplianceStatus, dueAt, note }`; Activity.action values used: payouts `created|paid|failed|hold|process|retry`, compliance `onboarded|inspection|status_override|certificate_uploaded|certificate_updated|certificate_deleted|certificate_approved|certificate_rejected|warn|request_documents|schedule_inspection|suspend|clear`.
6. **ComplianceSummary** also returns `hygieneMax`; ComplianceRow also returns `createdAt` (sort "Newest First") and `suspended`. CertificateInput also accepts `fileName, size` (shown in the file preview). Compliance list sort accepts `name|-name|hygieneScore|-hygieneScore|createdAt|-createdAt`.
7. **IssueCredit** response also returns `skipped` (frozen/blocked wallets are skipped). Wallet list also returns `consumerId`. VoucherStatus `exhausted` is shown as "Exhausted".
8. `POST /shared/uploads/presign` has no shared mock yet — D2 registers a **fallback** only if no other module has registered it (`api.routes()` check). LEAD/API: please own it in `mock/core.js`; yours will win.
9. LEAD (minor): `fmt` CUR map has no `SAR` (Arabic would show "SAR"); suggest `SAR: { en:'SAR', ar:'ر.س' }`. `fmt.delta` with `deltaUnit:'abs'` rounds to 0 dp (a rating delta of +0.2 shows "+0") — D2 uses its own `D2.deltaText`.
Figma fixes applied: Quality & Safety KPIs replaced with compliance KPIs (Merchants Monitored, Compliant, Non-Compliant, Expiring Certificates, Avg Hygiene Score); "Search by box ID" → screen-specific search placeholders; "Last Transition" → "Last Transaction"; wallet rows show consumers (Figma listed merchant names) with balances that add up to the KPI; BACKTOSCHOOL value fixed (Fixed · AED 5); US regions (Northeast/Midwest…) → UAE/Qatar cities.

## QA lead (now core owner) → all — status of every LEAD item (v1.2)
- **D1 radio `:indeterminate` bug** — fixed in `components.css` (`.check input[type="checkbox"]:indeterminate`). D1's local override in `ops-common.js` is now redundant but harmless.
- **D1 CSV/PDF in `missing()`** — registered in `i18n/core.js` (`CSV`, `PDF`, `XLSX` stay Latin in Arabic, which is the standard usage). **`ctx.setTitle(text, { raw:true })`** (or `setTitle(text, sub, { raw:true })`) shows data text without `t()`.
- **D2 #8 presign** — `POST /shared/uploads/presign` (+ deprecated alias `/uploads/presign`) is now owned by `api/mock/core.js`; D2's fallback steps aside automatically.
- **D2 #9** — `fmt.money(…, 'SAR')` → EN `SAR 120`, AR `120 ر.س`; `fmt.delta` with `deltaUnit:'abs'` keeps one decimal for fractional deltas (+0.2).
- **D4 #1 stale params** — already resolved (art director). **D4 #2 sidebar** — `.side` is `position:sticky; height:100vh`; it follows the scroll in a real browser. The cut-off only shows in Playwright full-page screenshots (viewport-height artefact).
- **D3 Reviews term clash** — `i18n/merchant-ops.js` already says «التقييمات». Resolved.
- **KPI layout (5-across at 1280)** — `.kpi` is now a size container: the label wraps to 2 lines instead of being cut off, the footer wraps, and the value scales `clamp(19px, 13.5cqi, 26px)`. Below 200px card width the padding and icon get tighter. Nothing overflows at 1280 or 1440 (QA render crawl: 0 findings).
- **New (QA):** card footers wrap, `.cd-sub` truncates with an ellipsis instead of pushing the header out, and tables at ≤1365px get tighter cells plus a `td.wrap` column class (`{ key, cls:'wrap' }`), so row actions never scroll out of view. The rich-text toolbar shows B/I/U state (`aria-pressed`) and Undo starts disabled. Forms in modals and drawers must use `novalidate` (UI.validate then shows bilingual errors; native bubbles aren't translated).
