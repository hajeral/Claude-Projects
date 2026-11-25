# WonderBites Portals — API Contract (v1)

Concise builder contract, grouped by screen. **Generated from the same model as `docs/openapi.yaml`** (OpenAPI 3.1, validated) and `docs/api.html` (readable reference with examples + Screen → endpoints matrix). If anything here disagrees with openapi.yaml, the YAML wins.

Notation: `field*` = required · `Type[]` = array · `Type?` = nullable · `Paged<X>` = `{ data: X[], page, pageSize, total, summary? }` · query `name:Type` = screen-specific filter, `name*` = required. Every endpoint also accepts `Accept-Language: en|ar`. Mock handlers in `assets/js/api/mock/*.js` must mirror these paths and shapes.

## v1.1 — reconciled with the final screen code and mocks (2026-11-19)
Every `api()` call and every mock route in `assets/js` (lead, D1–D4, admin-business) resolves to a documented path. All 118 mock GET responses that could be called were compared field by field against the schemas, and no differences remain. POST/PATCH bodies were checked against the mocks' `need()` validations. Mock-internal helper keys (`_n`, `_s`, `sortUsage`, `sortNet`…) are deliberately not part of the contract.
- **New endpoints (D2):** `GET /admin/financials/filter-options`, `GET /admin/financials/payouts-settlements?period`, `GET /admin/financials/refunds-adjustments?period`, `GET /admin/analytics/performance/merchants/{merchantId}`.
- **Refund policy (D1 + D3):** `RefundPolicyConfig = { key, version, freeCancellationHours, refundDestinationDefault, outcomes[], reasons:[PolicyReason {key,label,outcome}] }` (replaces `rules`). `RefundEligibility` adds `hoursSincePlaced, hoursToWindow, insideCancellationDeadline, collected, policy{…}, outcomes[]`. The refund body may carry `outcome`, `approved`, `note`. `Order.refund` = `OrderRefund {amount, reason, reasonLabel, outcome, …}`.
- **Detail endpoints return the entity flat** (not wrapped): cases, moderation, consumers, pickups (+`order`), drops, tickets, disputes (+`messages`), drivers (+`branch`,`orders`), customers (+`orders`), vendors, merchant orders, listings (`GET /merchant/listings/{id}` → `Listing` with `activity`).
- **Renamed to match the code:** Case/Moderation/Ticket `createdAt` + `ageMinutes` (were reportedAt/ageHours); ModerationItem `item`; AdminUser `twoFactor`, `lastActiveAt`; UsersSummary `total, withoutTwoFa, byRole`; MerchantListSummary `totalMerchants`; PickupSummary `onTimeRatePct`; Driver `onTime`, DriverSummary `avgOnTime`; DayRecord `co2T`; TopOffer `{id,title,sellThrough}`; EarningsSummary `split`; SalesAnalytics `days`, `daysTotal` with object-shaped `ordersPickups`, `customerInsights`, `impact`; MerchantOrder `total`, `createdAt`, `bag: LocalizedText`, `deliveryAddress`; MerchantOrderSummary `{total, readyForPickup, outForDelivery, awaitingDriver, activeDrivers}`; Review `customer`, `listing`; RatingSummary `total` (overview card: `count`); Dispute `number`, `customer`, `tab`; DayHours `closed` (was enabled); Template `source` (was owner); TemplateUsage `{id,name,usageCount}`; StoreInfo `category`, `description`, `address: LocalizedText`.
- **Settings rewritten to match the code:** GeneralSettings (`timezone, autoCancelUnclaimed, requirePickupPassport, supportEmail, countries, commissionRate, pickupWindowMinutes, reservationHoldMinutes`), NotificationSettings `alerts[]`, SecuritySettings (`sso, auditLog, auditRetentionDays, auditExportRange, passwordPolicy, ipAllowlist`), `MerchantProfile` / `AdminProfile` (`phoneCountry, phone`), `MerchantSecurityResult` (`verificationSent, sentTo`), `SupportDashboard { kpis{…minutes/hours…}, responseTrend, byChannel[{key,count}], byPriority }`.
- **Added fields:** SustainabilityDashboard `equivalentCars`, plus documented `Activity.type/by/note/detail/meta{score,max,doc,status,dueAt,note}` and the action list. ComplianceSummary `hygieneMax`, ComplianceRow `id, createdAt, suspended`, CertificateInput `fileName, size`, Wallet `consumerId`, IssueCredit `skipped`, MerchantPerformanceRow `id, city, category`. Consumer `rescueScore, co2KgAvoided, preferences, language, marketingOptIn, blockReason`. Pickup `bag{id,title,thumb}, codeMasked`; Drop `titleI18n`, `thumb`; Ticket `channel, category, messageCount`, requester `email`. CaseSummary `byKind`, ModerationSummary `byType`, TemplateSummary `byCategory`, CmsSummary `counts`, Banner `subtitle`, CMS `subtype: legal`.
- **Enums:** CaseStatus + `pending, in_review`; ModerationType + `merchant_profile`; new `TemplateSource`, `DisputeTab`, `AuditExportRange`. `Ref.name` (and Driver/Customer/Vendor/Merchant `name`) may be a plain localized string or a `LocalizedText`.
- **Query/other:** `GET /admin/templates?source=wonderbites|mine`; `GET /merchant/disputes?status=all|open|in_progress|resolved|closed`; `DELETE /admin/drops/{id}?force=true` (409 with `details.reserved`); `GET /admin/merchants/{id}/listings` → Drop list; `/admin/merchants/{id}/compliance` → `MerchantComplianceTab`; `GET /merchant/help/faqs` is a list with `summary.contact`; `GET /merchant/branches` has `summary {total, open}`. The CMS mock's generic `/admin/cms/{kind}/{id}` routes are exactly the documented pages/banners/faqs endpoints. `POST /shared/uploads/presign` is documented under Global shell; the mock is D2's fallback until core owns it.
- The generator lives in `docs/generator/` (run `python3 docs/generator/render.py`; it writes all three docs). Contract-vs-code checks: `bash docs/generator/checks/run_all.sh` (see checks/README.md).

## v1.4 Audit fixes (shared demo store, order state machine, pickup codes, commission)
- **One store for both portals:** orders, listings (= admin drops, same ids), pickups, support tickets (merchant disputes + help requests), moderation and merchant accounts are shared. Merchant lists are a tenant-filtered projection of the admin data. Demo clock: every date is relative to `DEMO_TODAY` 2026-11-19.
- **Order state machine:** `allowedActions: OrderAction[]` and `active` on every order; disallowed actions → 409 `invalid_transition` `{from, to, allowed}`. Self-pickup completes only via `POST /merchant/pickups/verify` (→ `PickupVerifyResult` with the completed order); delivery completes out_for_delivery → delivered → completed.
- **Pickup codes:** 6 characters A–Z/2–9 (no 0 O 1 I L), single-use (`usedAt`), expire at window end + 30 min (`expiresAt`). Admin Pickups verify uses the same helper (response adds `order`). Errors: 422 `invalid_code` / `code_expired`, 409 `code_used`.
- **Stock:** Listing `reserved`, `collected`; `remaining = quantity − reserved − collected` changes only with quantity / reservations / collections. 422 `{quantity: below_committed}`.
- **Commission:** `GET|PUT /admin/settings/commercial` (19 % default, effective-dated history), `GET|PUT /admin/merchants/{id}/contract` (override). Merchant / Payout / DayRecord / EarningsSummary carry `commissionRate`; Merchant `commissionSource`.
- **Merchant approval:** sign-up creates a Pending verification merchant; OTP verify returns `status: pending_verification` (no tokens); login 403 `pending_verification` / `account_rejected` / `account_suspended`.
- **Support contacts:** Market `supportEmail, merchantSupportEmail, supportPhone, supportWhatsApp, supportHours` (Qatar: support@wonderbites.qa, +974); `PATCH /admin/settings/markets/{code}` edits them; merchant Help `contact[]` comes from them.
- **Demo only:** `POST /shared/demo/reservations` (consumer checkout stand-in). All people, emails (example.com), phones (5550 range) and IBANs (masked) are demo data.

## v1.3 Markets (Qatar launch; UAE/KSA addable)
- **New:** `GET /shared/markets`, `GET /shared/markets/{code}`, `GET /admin/settings/markets`, `PATCH /admin/settings/markets/{code}`, `POST|PATCH /admin/settings/markets/{code}/cities[/{cityId}]`, `GET|PUT /admin/settings/fx` (+ demo-only `POST /admin/settings/markets/reset`). Schemas `Market`, `MarketCity`, `MarketUpdate`, `FxSettings`, `FxRate`, `MarketMeta`.
- **Convention:** `market` query param on every admin read (`all` default). Rows carry `market`; aggregates are in the market currency or converted to the reporting currency (`meta.market`).
- **Fields:** Branch / BranchOption `country, currency, timeZone`; BranchInput `country`; User `country, timeZone`; MerchantContext `country, timeZone, branches[BranchOption]`; OperatingHours `timeZone, branches`; merchant sign-up `country` must be an enabled market. Country enum order `QA AE SA`. Sample data is Qatari (Doha, Al Rayyan, Al Wakrah, Lusail; QAR; +974; Asia/Qatar).

## Changes since the first draft (v1-draft → v1)
- Shared endpoints live under **`/shared/*`** (lead convention): `/shared/notifications` (+ `PATCH /shared/notifications/{id} {read}`), `/shared/search`, `/shared/exports`, `/shared/uploads/presign`, `/shared/imports`, `/shared/settings/language`, `/shared/impact`, `/shared/meta/*`, `/shared/help/faqs`, `/shared/support/tickets`. Root `/uploads/presign` and `/imports` remain as **deprecated aliases** (screens already call them).
- Enum values from the draft are kept (mocks use them); screen-only states were added as extra values. Display labels that differ from values: DropStatus `live`='Active'; OrderStatus `reserved`='Placed', `ready_for_pickup`='Ready'; PickupStatus `ready`='Ready for Pickup'; Severity `high`='Warning', `medium`='Information'; TicketPriority `medium`='Normal'; TemplateStatus `published`='Active'; DisputeStatus `in_review`='In progress'.
- Field names kept from the draft: `pickupWindow` (drops, orders, listings, templates — pickups use `window`), `remaining`, `fulfillment: pickup|delivery`, `commissionRate`, listing `settings { publish, featured, allowNegotiation, expiresOn }`, listing `stats { sold, revenue, views }`; listing/branch address is flat (`address, city, state, zip`).
- Added: `GET /admin/{drops|pickups|orders|merchants|consumers|cases|moderation}/summary`, `GET /admin/ops/meta`, `POST /admin/pickups/{id}/cancel`, `GET|PATCH /admin/settings/profile`, `GET /merchant/me/branches`, `POST /merchant/imports/preview`, `POST /merchant/reviews/feedback` ('Write a Review' = partner feedback to WonderBites), `GET /merchant/help/faqs`, `POST /merchant/templates/{id}/create-product`.
- `pageSize` default is 10 (max 100).

## Conventions
- **Base URL** `/api/v1`. Path families: `/auth/*`, `/shared/*` (notifications, search, exports, uploads, imports, language, impact, meta, help), `/admin/*`, `/merchant/*`, `/stream`. JSON bodies, **camelCase** keys. `Accept-Language: en|ar` localizes labels/messages; editable content fields are `LocalizedText = { en, ar }`.
- **Auth**: `Authorization: Bearer <access JWT>` (15 min) + rotating refresh token (30 days) via `POST /auth/refresh`. 2FA via `POST /auth/otp/verify`.
- **Roles**: `super_admin`, `operations_admin`, `support_agent`, `read_only` (admin portal); `merchant_owner`, `merchant_staff` (merchant portal). Each operation lists allowed roles in `x-roles`. Merchant tokens are scoped to their `merchantId`; staff may be limited to `branchIds`.
- **Lists**: `{ data: [...], page, pageSize, total, summary? }`. `summary` carries the KPI tiles / tab counts of the same screen for the same filters.
- **Query**: `q, status, category, city, dietary, sort, page, pageSize, from, to` (+ screen-specific filters). `from`/`to` = global date-range picker (ISO-8601 UTC). `branchId` scopes merchant endpoints (omit / `all` = every branch). `pageSize` default 10 (max 100). `sort=field` asc, `sort=-field` desc. `dietary` is comma-separated.
- **Money**: `{ amount: number, currency: "QAR" | "AED" | "SAR" }` (major units, 2 dp). Every amount carries its own currency — never assume one.
- **Markets (v1.3)**: the platform runs in **markets** (`GET /shared/markets`: currency, currency label, phone code, time zone, cities, VAT, `enabled`). Qatar (`QA`, QAR, +974, Asia/Qatar) is the launch market; UAE (`AE`) and KSA (`SA`) ship disabled and are enabled from Admin → Settings → Markets (`PATCH /admin/settings/markets/{code}`) — no code changes. Merchants, branches and users carry `country`; branches also `currency` + `timeZone`.
- **`market` query param**: every admin read accepts `market=all|QA|AE|SA` (default `all` = every enabled market). Lists return rows of those markets only, each row in its own currency. KPI/chart aggregates are returned in the market's currency, or — when `all` spans several currencies — converted to the reporting currency (`GET/PUT /admin/settings/fx`, default QAR) with `meta.market.converted = true`. Merchant reads are scoped by `branchId`; aggregates come back in that branch's currency.
- **Time**: timestamps ISO-8601 UTC (`2026-11-19T16:30:00Z`; the demo data is anchored on 2026-11-19); dates `YYYY-MM-DD`; pickup windows `{ start: "HH:mm", end: "HH:mm" }` and operating hours in the branch's local time zone (`branch.timeZone`); clients render UTC timestamps in the branch / market time zone.
- **KPIs / charts**: `Kpi { key, label, value, format, currency?, delta?, deltaUnit, trend, comparison?, caption?, sparkline? }`; `Series { key, label, kind, points: [{ x, y }] }`; `Segment { key, label, value, share }`.
- **Errors**: `{ error: { code, message, details } }` — `validation_error` 400/422, `unauthorized` 401, `forbidden` 403, `not_found` 404, `conflict` 409, `policy_violation` 422, `rate_limited` 429, `internal` 500.
- **Orders (v1.4)**: one state machine for both portals — each order carries `allowedActions` and `active` (paid, not yet collected); any other action returns 409 `invalid_transition`. Self-pickup orders complete only by verifying the 6-character pickup code (`POST /merchant/pickups/verify` or Admin → Pickups), which is single-use and expires at the window end + 30 min. Commission comes from `GET /admin/settings/commercial` (19 % default) or a merchant contract.
- **Exports** are async jobs (`POST /shared/exports` → poll or wait for `export.ready`). **Uploads** use presigned URLs (`POST /shared/uploads/presign` → PUT bytes → pass `fileId`).
- **Realtime**: WebSocket `wss://…/api/v1/stream` (or SSE) delivering `{ id, type, occurredAt, data }`; event payloads are documented under `webhooks`.
- **Idempotency**: send `Idempotency-Key` on money-moving POSTs (refunds, credits, payouts).

### Common shapes
- `Money { amount: number, currency: AED|QAR|SAR }` · `LocalizedText { en, ar }` · `Ref { id, name }` · `UserRef { id, name, avatarUrl? }` · `TimeWindow { start: HH:mm, end: HH:mm }` · `Phone { countryCode, number }`
- `Kpi { key, label, value, format: KpiFormat, currency?, delta?, deltaUnit?, trend?, comparison?, caption?, sparkline?: number[], badge? }`
- `Series { key, label, kind?: line|bar|area, unit?, points: [{ x, y }] }` · `Segment { key, label, value, share? }` · `FunnelStep { key, label, value, rate? }` · `Activity { id, action, label, actor?, at, meta? }`
- `Error { error: { code, message, details } }` · `BulkResult { updated, failed: [{ id, error }] }` · `ReasonBody { reason?, notify? }`

## Enums (status pills, filters)
| Enum | Values | Used for |
|---|---|---|
| Currency | `QAR QAR SAR` | Money currency |
| Language | `en ar` | UI / content language |
| Role | `super_admin operations_admin support_agent read_only merchant_owner merchant_staff` | Access role |
| Portal | `admin merchant` | Portal |
| Country | `QA AE SA` | Market country (ISO 3166-1 alpha-2). QA is the launch market; enabled markets come from GET /shared/markets |
| Category | `bakery restaurant grocery cafe desserts meals produce prepared_foods deli meat_poultry beverages other` | Food / business category |
| Dietary | `vegetarian vegan halal gluten_free dairy_free nut_free` | Dietary tag (fixes 'Dietary tages') |
| DropStatus | `live scheduled sold_out completed expired draft flagged paused removed` | Admin Drops pill (live = 'Active') |
| PickupStatus | `upcoming ready verified picked_up missed flagged cancelled` | Admin Pickups pill (ready = 'Ready for Pickup') |
| OrderStatus | `reserved confirmed ready_for_pickup driver_assigned out_for_delivery picked_up delivered completed failed cancelled no_show refunded partially_refunded` | Order pill (admin + merchant). Labels: reserved='Placed' (KPI 'Pending Confirmation'), confirmed='Confirmed'/'Processing', ready_for_pickup='Ready'. Merchant table shows 'Unassigned' when fulfillment=delivery and delivery.assignment=unassigned |
| PaymentStatus | `paid pending authorized failed refunded partially_refunded` | Payment state |
| PaymentMethodType | `card apple_pay google_pay wallet` | Payment method |
| CardBrand | `visa mastercard amex mada` | Card brand |
| FulfillmentType | `pickup delivery` | Fulfillment chip (pickup = 'Self-Pickup', delivery = 'Driver Delivery') |
| DriverAssignment | `unassigned assigned` | Delivery driver assignment |
| MerchantStatus | `pending verified active suspended rejected inactive` | Merchant pill |
| QualityBadge | `excellent good watch needs_review` | Merchant quality / performance pill |
| ConsumerStatus | `active inactive blocked deleted` | Consumer / customer pill |
| WalletStatus | `active frozen blocked` | Wallet pill |
| WalletSource | `promotional refund compensation referral adjustment` | Wallet credit source |
| WalletTxnType | `credit debit adjustment refund expiry voucher` | Wallet transaction type |
| VoucherType | `percentage fixed free_bag` | Voucher type |
| VoucherStatus | `draft scheduled active frozen expired exhausted` | Voucher pill |
| CertificateStatus | `valid expiring_soon expired missing pending_review rejected` | Food-safety / certificate pill |
| CertificateType | `food_safety trade_license health_permit halal hygiene_training other` | Certificate type |
| ComplianceStatus | `compliant expiring_soon expired non_compliant under_review` | Compliance pill |
| ComplianceAction | `warn request_documents schedule_inspection suspend clear` | Compliance action |
| Severity | `critical high medium low` | Severity chip. Labels: critical='Critical', high='Warning', medium='Information', low='Low' |
| CaseKind | `issue alert moderation` | Issues & Alerts tab |
| CaseStatus | `open pending in_review in_progress escalated resolved closed` | Case / moderation pill (pending & open = 'Open', in_review & in_progress = 'In Progress') |
| ModerationType | `listing review user merchant merchant_profile` | Moderation tab (Listings / Reviews / User Behaviour / Merchant Profile) |
| ReporterSource | `automated_filter consumer_report merchant_report system_pattern onboarding_team compliance_check admin` | Who reported |
| AlertType | `merchant warning information monitor` | Priority alert category |
| TicketChannel | `in_app email chat phone social` | Support channel |
| TicketPriority | `urgent high medium low` | Ticket priority tab/pill (medium = 'Normal') |
| TicketStatus | `open pending in_progress escalated resolved closed` | Ticket pill |
| PayoutStatus | `scheduled pending processing paid failed on_hold` | Payout pill |
| RefundStatus | `requested approved rejected processed failed` | Refund pill |
| RefundOutcome | `full_refund partial_refund wallet_credit manual_review no_refund` | Refund policy outcome |
| RefundReason | `store_closed box_unavailable serious_food_concern app_payment_issue missed_collection late_cancellation change_of_mind personal_preference wrong_location` | Refund reason (policy configuration rows) |
| RefundDestination | `original_payment wallet_credit` | Where refund goes |
| TemplateStatus | `published draft archived` | Template pill (published = 'Active') |
| TemplateFieldType | `text number select multiselect photo date time_range boolean` | Template field input type |
| CmsType | `page banner faq legal` | CMS type chip |
| CmsStatus | `draft scheduled published archived` | CMS pill |
| Audience | `all_users star_users premium_users new_users merchants` | Banner / voucher target audience |
| UserStatus | `active invited suspended` | Admin user pill |
| ListingStatus | `draft active paused sold_out disabled expired` | Listing (bag) pill |
| StockStatus | `in_stock low_stock sold_out paused expired` | Inventory status donut segment |
| ListingType | `surprise_bag fixed_item bundle` | Listing type |
| Availability | `available_now daily scheduled recurring` | Listing availability |
| DriverStatus | `available on_delivery offline inactive` | Driver pill |
| VehicleType | `bicycle motorbike car van` | Driver vehicle |
| BranchState | `open closed temporarily_closed` | Branch open/closed state |
| VendorStatus | `active pending suspended inactive` | Vendor pill |
| ReviewStatus | `published replied reported hidden` | Review state |
| ReviewSort | `newest oldest highest lowest` | Review sort |
| DisputeStatus | `open in_review awaiting_merchant resolved closed` | Reports/Dispute pill (in_review = 'In progress') |
| DisputeType | `refund_request order_issue payment app_issue account other` | Dispute type |
| DayPayoutStatus | `pending paid` | Payout pill in day breakdown |
| ExportFormat | `csv xlsx pdf` | Export format |
| ExportStatus | `queued processing ready failed expired` | Export job state |
| ExportScope | `current_page filtered all` | Export scope |
| ImportStatus | `queued validating processing completed completed_with_errors failed` | Import job state |
| UploadPurpose | `listing_image product_image banner certificate avatar branch_photo merchant_logo import attachment` | Upload purpose |
| NotificationType | `order pickup alert issue ticket payout export review inventory system` | Notification type |
| Granularity | `hourly daily weekly monthly` | Chart bucket |
| PeriodPreset | `today 7d 30d this_week this_month 3m 6m custom` | Period selector |
| KpiFormat | `number money percent duration_minutes duration_hours days rating weight_kg tonnes litres gallons` | How to format Kpi.value |
| DeltaUnit | `pct pp abs minutes hours days` | Unit of Kpi.delta |
| Trend | `up down flat` | Delta direction |
| PassportSegment | `active_verified expiring_soon needs_attention inactive` | Pickup passport donut segment |
| Weekday | `mon tue wed thu fri sat sun` | Day of week |
| SearchScope | `all drops merchants orders pickups consumers tickets cases listings customers` | Global search scope |
| PolicyKey | `refund about privacy terms` | Policy page |
| StreamEvent | `order.status_changed pickup.verified alert.created ticket.updated payout.processed notification.created export.ready` | Realtime event type |
| TemplateSource | `wonderbites mine` | Template gallery section (WonderBites Templates / My Templates) |
| DisputeTab | `open in_progress resolved closed` | Reports/Dispute tab group (in_progress = in_review + awaiting_merchant) |
| AuditExportRange | `7d 30d 90d 12m` | Audit log export range |
| OrderAction | `verify_pickup assign_driver mark_delivered complete cancel refund` | Actions the order state machine allows right now (UI shows only these). verify_pickup = self-pickup completion via code; complete = delivered → completed |
| CommissionSource | `platform_default contract` | Where a merchant's commission rate comes from |
| PickupCodeError | `invalid_code code_used code_expired invalid_transition` | Pickup verification failure codes (422 invalid_code / code_expired, 409 code_used / invalid_transition) |
| AccountStatusError | `pending_verification account_rejected account_suspended` | 403 codes of POST /auth/login for merchant accounts that may not sign in |

## SHARED & AUTH
### Auth (login · sign-up · forgot/reset · OTP)  — route `admin-login / m-login / m-signup / forgot / reset / otp`
- **POST /auth/login** — Sign in (admin or merchant portal)  
  body: `LoginRequest`  
  → `LoginResponse` · roles: public  
  _If the account has 2FA, returns `requires2fa: true` + `challengeId` and no tokens; continue with /auth/otp/verify. 401 `unauthorized` on bad credentials; 403 `forbidden` if the role does not belong to the requested portal; 423-like lock is returned as 429 `rate_limited` after 5 attempts. Merchant accounts: 403 `pending_verification` (sign-up awaiting admin approval), `account_rejected`, `account_suspended`._
- **POST /auth/otp/verify** — Verify OTP / 2FA code  
  body: `OtpVerify`  
  → `AuthTokens` · roles: public  
  _For a merchant sign-up challenge the code only verifies the email: returns `{ verified: true, status: pending_verification, merchantId }` and no tokens — the merchant signs in after Admin → Merchants approves it._
- **POST /auth/otp/resend** — Resend OTP  
  body: `{ challengeId*: string }`  
  → `{ sentTo*: string, retryAfter*: integer }` · roles: public
- **POST /auth/merchant/signup** — Sign up a merchant (self-onboarding)  
  body: `SignupRequest`  
  → `SignupResponse` · roles: public  
  _Creates merchant in `pending` (or `verified` if General setting allowMerchantSelfOnboarding = true) and sends an OTP to verify email/phone. Creates a Pending verification merchant in Admin → Merchants (`source: self_signup`)._
- **POST /auth/password/forgot** — Request password reset link  
  body: `{ email*: email, portal*: Portal }`  
  → `204 No Content` · roles: public  
  _Always 204 (no account enumeration)._
- **POST /auth/password/reset** — Reset password with emailed token  
  body: `{ token*: string, password*: string, confirmPassword*: string }`  
  → `204 No Content` · roles: public
- **POST /auth/refresh** — Rotate tokens  
  body: `{ refreshToken*: string }`  
  → `AuthTokens` · roles: public  
  _Refresh tokens are single-use (rotation). Reuse revokes the family → 401._
- **POST /auth/logout** — Sign out (revoke refresh token)  
  body: `{ refreshToken*: string, allDevices: boolean }`  
  → `204 No Content` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **GET /me** — Current user + merchant context + permissions  
  → `User` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **PATCH /me** — Update own profile (Admin Settings → Profile; Merchant Settings → Profile)  
  body: `ProfileUpdate`  
  → `User` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **POST /me/password** — Change own password (verified via emailed link)  
  body: `PasswordChange`  
  → `PasswordChangeResult` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **POST /me/2fa/setup** — Start 2FA enrolment  
  → `{ otpauthUrl*: url, secret*: string, recoveryCodes*: string[] }` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **POST /me/2fa/enable** — Confirm 2FA enrolment  
  body: `{ code*: string }`  
  → `{ enabled*: boolean }` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **POST /me/2fa/disable** — Disable 2FA  
  body: `{ code*: string, password*: string }`  
  → `{ enabled*: boolean }` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff

### Global shell (search · notifications · export · uploads · language · impact card)  — route `top bar + sidebar`
- **GET /shared/notifications** — Notifications panel (tabs All / Unread / Downloads)  
  query: `tab:enum(all,unread,downloads) portal:Portal type:NotificationType page pageSize branchId`  
  → `Paged<Notification> + summary: { unreadCount: integer }` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **PATCH /shared/notifications/{notificationId}** — Mark one notification read / unread  
  body: `{ read*: boolean }`  
  → `Notification` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **POST /shared/notifications/read-all** — Mark all read  
  body: `{ portal: Portal }`  
  → `{ updated*: integer }` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **GET /shared/search** — Global search (results popover)  
  query: `q* portal:Portal scope:SearchScope limit:int branchId market`  
  → `SearchResult` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff  
  _Admin searches drops, merchants, orders, pickups, consumers, tickets, cases. Merchant search is scoped to own listings, orders, customers._
- **POST /shared/exports** — Start export (Export dialog: format, scope, columns)  
  body: `ExportRequest`  
  → `ExportJob` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff  
  _Async. When ready: `export.ready` stream event + notification of type `export`. Resources: admin.drops, admin.pickups, admin.orders, admin.merchants, admin.consumers, admin.payouts, admin.refunds, admin.wallets, admin.vouchers, admin.compliance, admin.cases, admin.moderation, admin.tickets, admin.templates, admin.users, admin.audit_log, admin.financials, admin.operations, admin.performance, admin.sustainability, merchant.orders, merchant.listings, merchant.customers, merchant.drivers, merchant.sales_days, merchant.reviews, merchant.disputes._
- **GET /shared/exports** — My exports (downloads list)  
  query: `status:ExportStatus page pageSize`  
  → `Paged<ExportJob>` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **GET /shared/exports/{exportId}** — Export status  
  → `ExportJob` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **GET /shared/exports/{exportId}/download** — Download export file  
  → `302 → signed URL` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff  
  _302 redirect to a signed URL (valid 15 min). 409 `conflict` if not ready._
- **POST /shared/uploads/presign** — Presign a direct upload (images, certificates, import files)  
  body: `PresignRequest`  
  → `PresignResponse` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff  
  _Client PUTs the bytes to `uploadUrl`, then references `fileId` in create/update bodies. Images: JPG/PNG/WEBP ≤ 5 MB; documents: PDF/JPG/PNG ≤ 20 MB; imports: CSV/XLSX ≤ 10 MB._
- **POST /shared/imports** — Start import (merchant orders / customers / listings)  
  body: `ImportRequest`  
  → `ImportJob`
- **GET /shared/imports/{importId}** — Import status + row errors  
  → `ImportJob`
- **GET /shared/imports/templates/{resource}** — Download CSV import template  
  → `302 → signed URL`  
  _resource: merchant.orders | merchant.customers | merchant.listings_
- **GET /shared/settings/language** — Get my language  
  → `LanguageSetting` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **PATCH /shared/settings/language** — Set my language (EN/AR)  
  body: `LanguageSetting`  
  → `LanguageSetting` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **GET /shared/impact** — Sidebar 'This month's impact' card  
  query: `period:str branchId`  
  → `ImpactSummary` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff  
  _Admin: platform-wide; merchant: own merchant (optionally one branch). `period` = YYYY-MM (default current month)._
- **GET /shared/meta/enums** — All enums with localized labels (for pills, filters)  
  → `EnumCatalog` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **GET /shared/meta/cities** — Cities for filters  
  query: `country:Country`  
  → `[City]` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **GET /stream** — Realtime stream (WebSocket upgrade or SSE)  
  query: `token:str events:str branchId`  
  → `101 WebSocket / SSE` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff  
  _WebSocket: `wss://…/api/v1/stream?token=<access>`; SSE: `Accept: text/event-stream` + Authorization header. Messages are StreamEnvelope; see Realtime section / `webhooks`._
- **POST /shared/exports/{exportId}/complete** — MOCK ONLY — simulate export completion  
  → `ExportJob` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff  
  _Exists only in the mock adapter to flip a job to `ready`; the real backend completes jobs itself and emits `export.ready`._
- **GET /shared/help/faqs** — Need Help drawer FAQ (per portal)  
  query: `portal:Portal q`  
  → `[Faq]` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **POST /shared/support/tickets** — Need Help drawer → open support ticket  
  body: `{ subject*: string, message*: string, category: string, portal*: Portal, orderId: string, attachmentFileIds: string[] }`  
  → `Ticket` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **GET /shared/markets** — Markets registry (currency, phone code, time zone, cities, VAT, enabled). Loaded at app boot  
  query: `enabled:bool`  
  → `MarketList` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff  
  _Public: the sign-up screen needs it. `enabled=true` returns only enabled markets. meta.reportingCurrency + meta.fx give the conversion settings for 'All markets' totals._
- **GET /shared/markets/{code}** — One market  
  → `Market` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **GET /merchant/me/branches** — Branch switcher options (header)  
  → `[BranchOption]`
- **POST /uploads/presign** — Alias of POST /shared/uploads/presign  
  body: `PresignRequest`  
  → `PresignResponse` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **POST /imports** — Alias of POST /shared/imports  
  body: `ImportRequest`  
  → `ImportJob`
- **POST /shared/demo/reservations** — Demo only: reserve a bag as a customer (stand-in for the consumer app checkout)  
  body: `DemoReservationInput`  
  → `DemoReservationResult` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff  
  _Mock/demo helper; not part of the production API. Holds stock (reserved +qty, remaining −qty). 409 `sold_out` / `invalid_transition` when the listing is not active._

## ADMIN PORTAL (`/admin/*`)
### Command Center  — route `admin-command-center`
- **GET /admin/dashboard** — Command Center aggregates  
  query: `from to city market`  
  → `CommandCenter`  
  _KPIs (Live Drops, Reserved Today, Pickups Completed + fulfilment %, Open Issues + critical badge, Drop Accuracy), Priority Alerts, Recent Orders (live drops), Pickup Passport Monitoring donut, Issue Alerts table, Drop Accuracy chart, Merchant Quality Watch, Sustainability Impact._
- **GET /admin/dashboard/drop-accuracy** — Drop Accuracy card (period selector)  
  query: `period:PeriodPreset from to city market`  
  → `DropAccuracyCard`
- **GET /admin/alerts** — Priority alerts (View All)  
  query: `severity:Severity type:AlertType status:enum(active,dismissed) page pageSize market`  
  → `Paged<PriorityAlert>`
- **POST /admin/alerts/{alertId}/dismiss** — Dismiss a priority alert (×)  
  → `204 No Content` · roles: super_admin, operations_admin, support_agent
- **GET /admin/passports** — Pickup Passport Monitoring → Review Now  
  query: `segment:PassportSegment q city page pageSize market`  
  → `Paged<{ consumer*: Ref, segment*: PassportSegment, expiresAt: datetime?, issue: string? }>`

### Drops  — route `admin-drops`
- **GET /admin/drops** — List drops  
  query: `q status:DropStatus category city dietary merchantId:id flagged:bool sort page pageSize from to market`  
  → `Paged<Drop> + summary: DropSummary`  
  _sort: `-createdAt` (Newest First, default) | `createdAt` | `price` | `-price` | `-reserved` | `pickupWindow`. `q` matches title or code (DR-xxxx)._
- **GET /admin/drops/{dropId}** — Drop detail (view drawer)  
  query: `market`  
  → `DropDetail`
- **PATCH /admin/drops/{dropId}** — Edit drop  
  body: `DropUpdate`  
  → `Drop` · roles: super_admin, operations_admin  
  _`remaining` changes only when `quantity` changes (remaining = quantity − reserved − collected); 422 `validation_error` `{quantity: below_committed, committed}` below what is already reserved/collected._
- **DELETE /admin/drops/{dropId}** — Delete drop (confirm)  
  query: `force:bool`  
  → `204 No Content` · roles: super_admin, operations_admin  
  _409 `conflict` (with `details.reserved`) if live reservations exist unless `?force=true` (cancels + refunds them per policy)._
- **POST /admin/drops/{dropId}/flag** — Flag drop for review  
  body: `FlagBody`  
  → `Drop` · roles: super_admin, operations_admin, support_agent
- **POST /admin/drops/{dropId}/unflag** — Clear flag  
  → `Drop` · roles: super_admin, operations_admin
- **POST /admin/drops/bulk** — Bulk action on selected drops  
  body: `BulkDropAction`  
  → `BulkResult` · roles: super_admin, operations_admin
- **GET /admin/drops/summary** — KPI tiles only (drops)  
  query: `q status:DropStatus category city dietary merchantId:id from to market`  
  → `DropSummary`  
  _Same object as the list response `summary`; lets KPI tiles load independently of the table._
- **GET /admin/ops/meta** — Filter options for operations screens (cities, categories, dietary, agents, refund policy)  
  query: `market`  
  → `{ cities*: City[], markets: Country[], categories*: Category[], dietary*: Dietary[], agents*: UserRef[], refundPolicy: RefundPolicyConfig }`

### Pickups  — route `admin-pickups`
- **GET /admin/pickups** — List pickups  
  query: `q status:PickupStatus category city dietary merchantId:id branchId sort page pageSize from to market`  
  → `Paged<Pickup> + summary: PickupSummary`
- **GET /admin/pickups/{pickupId}** — Pickup detail  
  query: `market`  
  → `PickupDetail`
- **PATCH /admin/pickups/{pickupId}** — Edit pickup (window / status)  
  body: `{ window: TimeWindow, status: PickupStatus, note: string }`  
  → `Pickup` · roles: super_admin, operations_admin
- **DELETE /admin/pickups/{pickupId}** — Cancel/delete pickup  
  → `204 No Content` · roles: super_admin, operations_admin
- **POST /admin/pickups/{pickupId}/verify** — Verify pickup passport code (modal)  
  body: `VerifyCode`  
  → `VerifyResult` · roles: super_admin, operations_admin, support_agent  
  _Same helper as the merchant portal: verifies the code, marks it used and completes the order (one `pickup_verified` timeline event); response includes `order`. Wrong code → 200 `valid:false, reason: invalid_code`; 409 `code_used` / `invalid_transition`; 422 `code_expired`. Emits `pickup.verified`._
- **GET /admin/pickups/summary** — KPI tiles only (pickups)  
  query: `q status:PickupStatus category city dietary from to market`  
  → `PickupSummary`  
  _Same object as the list response `summary`; lets KPI tiles load independently of the table._
- **POST /admin/pickups/{pickupId}/cancel** — Cancel pickup  
  body: `ReasonBody`  
  → `Pickup` · roles: super_admin, operations_admin

### Orders & Reservations  — route `admin-orders`
- **GET /admin/orders** — List orders & reservations  
  query: `q status:OrderStatus paymentStatus:PaymentStatus fulfillment:FulfillmentType category city dietary merchantId:id consumerId:id sort page pageSize from to market`  
  → `Paged<OrderSummary> + summary: OrderListSummary`
- **GET /admin/orders/{orderId}** — Order detail drawer  
  query: `market`  
  → `Order`
- **GET /admin/orders/{orderId}/refund-eligibility** — Refund policy check (refund flow step 1)  
  query: `reason:RefundReason market`  
  → `RefundEligibility`
- **POST /admin/orders/{orderId}/refund** — Issue refund  
  body: `RefundRequest`  
  → `Refund` · roles: super_admin, operations_admin, support_agent  
  _422 `policy_violation` when outside policy and `overridePolicy` not set (only super_admin may override). 409 `invalid_transition` `{from, to, allowed}` when the order state machine does not allow the move (terminal: completed, cancelled, refunded)._
- **POST /admin/orders/{orderId}/cancel** — Cancel order  
  body: `CancelRequest`  
  → `Order` · roles: super_admin, operations_admin, support_agent  
  _409 `invalid_transition` `{from, to, allowed}` when the order state machine does not allow the move (terminal: completed, cancelled, refunded)._
- **POST /admin/orders/{orderId}/confirm** — Confirm pending reservation  
  → `Order` · roles: super_admin, operations_admin  
  _409 `invalid_transition` `{from, to, allowed}` when the order state machine does not allow the move (terminal: completed, cancelled, refunded)._
- **GET /admin/orders/summary** — KPI tiles only (orders)  
  query: `q status:OrderStatus category city dietary from to market`  
  → `OrderListSummary`  
  _Same object as the list response `summary`; lets KPI tiles load independently of the table._

### Merchants (+ Add Merchant, detail tabs)  — route `admin-merchants / admin-merchant-new / admin-merchant`
- **GET /admin/merchants** — List merchants  
  query: `q status:MerchantStatus category city dietary country:Country sort page pageSize from to market`  
  → `Paged<MerchantSummary> + summary: MerchantListSummary`  
  _sort: -joinedAt | name | -qualityScore | -revenue | -dropsCount. KPI 'Pending Verification' is a count (fixes 'QAR 62')._
- **POST /admin/merchants** — Create merchant (Add Merchant multi-step form)  
  body: `MerchantCreate`  
  → `Merchant` · roles: super_admin, operations_admin  
  _Steps: Business → Legal & documents → Contact → Location & branches → Banking & commission → Review. Draft-save allowed via `?draft=true`._
- **POST /admin/merchants/validate** — Validate one step of Add Merchant  
  body: `{ step*: enum(business|legal|contact|location|banking), data*: object }`  
  → `{ valid*: boolean, errors: object }` · roles: super_admin, operations_admin
- **GET /admin/merchants/{merchantId}** — Merchant detail (header)  
  query: `market`  
  → `Merchant`
- **PATCH /admin/merchants/{merchantId}** — Edit merchant  
  body: `MerchantUpdate`  
  → `Merchant` · roles: super_admin, operations_admin
- **DELETE /admin/merchants/{merchantId}** — Delete merchant (soft)  
  → `204 No Content` · roles: super_admin
- **POST /admin/merchants/{merchantId}/verify** — Verify merchant  
  body: `ReasonBody`  
  → `Merchant` · roles: super_admin, operations_admin
- **POST /admin/merchants/{merchantId}/suspend** — Suspend merchant  
  body: `ReasonBody`  
  → `Merchant` · roles: super_admin, operations_admin
- **POST /admin/merchants/{merchantId}/reject** — Reject application  
  body: `ReasonBody`  
  → `Merchant` · roles: super_admin, operations_admin
- **POST /admin/merchants/{merchantId}/reactivate** — Reactivate merchant  
  body: `ReasonBody`  
  → `Merchant` · roles: super_admin, operations_admin
- **GET /admin/merchants/{merchantId}/overview** — Detail tab: Overview  
  query: `from to market`  
  → `MerchantDetailOverview`
- **GET /admin/merchants/{merchantId}/branches** — Detail tab: Branches  
  query: `market`  
  → `Paged<Branch>`
- **GET /admin/merchants/{merchantId}/listings** — Detail tab: Listings (the merchant's drops)  
  query: `status:DropStatus q page pageSize market`  
  → `Paged<Drop>`
- **POST /admin/merchants/{merchantId}/listings/{listingId}/force-disable** — Force-disable a merchant listing  
  body: `ReasonBody`  
  → `Listing` · roles: super_admin, operations_admin
- **GET /admin/merchants/{merchantId}/payouts** — Detail tab: Payouts  
  query: `status:PayoutStatus page pageSize from to market`  
  → `Paged<Payout>`
- **GET /admin/merchants/{merchantId}/compliance** — Detail tab: Compliance  
  query: `market`  
  → `MerchantComplianceTab`
- **GET /admin/merchants/{merchantId}/activity** — Detail tab: Activity  
  query: `page pageSize from to market`  
  → `Paged<Activity>`
- **GET /admin/merchants/summary** — KPI tiles only (merchants)  
  query: `q status:MerchantStatus category city from to market`  
  → `MerchantListSummary`  
  _Same object as the list response `summary`; lets KPI tiles load independently of the table._
- **GET /admin/merchants/{merchantId}/contract** — Merchant contract commission  
  query: `market`  
  → `MerchantContract` · roles: super_admin, operations_admin
- **PUT /admin/merchants/{merchantId}/contract** — Set / clear a merchant contract commission rate  
  body: `MerchantContractUpdate`  
  → `MerchantContract` · roles: super_admin  
  _`commissionRate: null` returns the merchant to the platform default. Same effect as PATCH /admin/merchants/{id} {commissionRate}._

### Consumers  — route `admin-consumers`
- **GET /admin/consumers** — List consumers  
  query: `q status:ConsumerStatus category city dietary sort page pageSize from to market`  
  → `Paged<Consumer> + summary: ConsumerSummary`
- **GET /admin/consumers/{consumerId}** — Consumer detail  
  query: `market`  
  → `ConsumerDetail`
- **PATCH /admin/consumers/{consumerId}** — Edit consumer  
  body: `ConsumerUpdate`  
  → `Consumer` · roles: super_admin, operations_admin, support_agent
- **DELETE /admin/consumers/{consumerId}** — Delete consumer (GDPR-style erase)  
  → `204 No Content` · roles: super_admin, operations_admin
- **POST /admin/consumers/{consumerId}/block** — Block consumer  
  body: `ReasonBody`  
  → `Consumer` · roles: super_admin, operations_admin, support_agent
- **POST /admin/consumers/{consumerId}/unblock** — Unblock consumer  
  → `Consumer` · roles: super_admin, operations_admin, support_agent
- **GET /admin/consumers/{consumerId}/orders** — Consumer orders  
  query: `status:OrderStatus page pageSize from to market`  
  → `Paged<OrderSummary>`
- **POST /admin/consumers/{consumerId}/notes** — Add internal note  
  body: `NoteBody`  
  → `Note` · roles: super_admin, operations_admin, support_agent
- **GET /admin/consumers/summary** — KPI tiles only (consumers)  
  query: `q status:ConsumerStatus city from to market`  
  → `ConsumerSummary`  
  _Same object as the list response `summary`; lets KPI tiles load independently of the table._

### Financials  — route `admin-financials`
- **GET /admin/financials/summary** — Financials dashboard (KPI grid + all cards)  
  query: `from to country:Country city category merchantId:id branchId fulfillment:FulfillmentType granularity:Granularity market`  
  → `FinancialsDashboard`  
  _Filters: All Countries / Cities / Categories / Merchants / Branches / Order Types. Each card's period selector re-calls the matching section endpoint below._
- **GET /admin/financials/revenue-snapshot** — Revenue & Margin Snapshot card  
  query: `from to country:Country city category merchantId:id branchId fulfillment:FulfillmentType period:PeriodPreset market`  
  → `RevenueSnapshot`
- **GET /admin/financials/gmv-trend** — GMV Trend (this vs previous period)  
  query: `from to country:Country city category merchantId:id branchId fulfillment:FulfillmentType granularity:Granularity market`  
  → `TrendCard`
- **GET /admin/financials/revenue-trend** — Revenue Trend (revenue vs net revenue)  
  query: `from to country:Country city category merchantId:id branchId fulfillment:FulfillmentType granularity:Granularity market`  
  → `TrendCard`
- **GET /admin/financials/monthly-trends** — Financial Trends (Monthly)  
  query: `from to country:Country city category merchantId:id branchId fulfillment:FulfillmentType months:int market`  
  → `[Series]`
- **GET /admin/financials/unit-economics** — Unit Economics  
  query: `from to country:Country city category merchantId:id branchId fulfillment:FulfillmentType market`  
  → `UnitEconomics`
- **GET /admin/financials/payouts** — Payouts & Settlements list  
  query: `q status:PayoutStatus merchantId:id sort page pageSize from to market`  
  → `Paged<Payout> + summary: { merchantGrossEarnings: Money, amountPaid: Money, pendingPayout: Money, failedHeld: Money, avgSettlementDays: number }`
- **GET /admin/financials/payouts/{payoutId}** — Payout detail  
  query: `market`  
  → `PayoutDetail`
- **POST /admin/financials/payouts/{payoutId}/process** — Process payout now  
  body: `ReasonBody`  
  → `Payout` · roles: super_admin, operations_admin
- **POST /admin/financials/payouts/{payoutId}/hold** — Put payout on hold  
  body: `ReasonBody`  
  → `Payout` · roles: super_admin, operations_admin
- **POST /admin/financials/payouts/{payoutId}/retry** — Retry failed payout  
  body: `ReasonBody`  
  → `Payout` · roles: super_admin, operations_admin
- **GET /admin/financials/refunds** — Refunds & Adjustments list  
  query: `q status:RefundStatus reason:RefundReason merchantId:id sort page pageSize from to market`  
  → `Paged<Refund> + summary: { refundAmount: Money, refundRate: number, cancellationValue: Money, creditsIssued: Money, chargebacks: Money }`
- **POST /admin/financials/refunds/{refundId}/approve** — Approve refund (manual review)  
  body: `ReasonBody`  
  → `Refund` · roles: super_admin, operations_admin
- **POST /admin/financials/refunds/{refundId}/reject** — Reject refund  
  body: `ReasonBody`  
  → `Refund` · roles: super_admin, operations_admin
- **GET /admin/financials/filter-options** — Financials filter row options (country → city → merchant → branch cascade)  
  query: `market`  
  → `FinancialFilterOptions`
- **GET /admin/financials/payouts-settlements** — Payouts & Settlements card (period selector)  
  query: `from to country:Country city category merchantId:id branchId fulfillment:FulfillmentType period:PeriodPreset market`  
  → `[Kpi]`  
  _Same as FinancialsDashboard.payoutsSettlements: merchantGrossEarnings, amountPaid, pendingPayout, failedHeldPayouts, avgSettlementTime._
- **GET /admin/financials/refunds-adjustments** — Refunds & Adjustments card (period selector)  
  query: `from to country:Country city category merchantId:id branchId fulfillment:FulfillmentType period:PeriodPreset market`  
  → `[Kpi]`  
  _Same as FinancialsDashboard.refundsAdjustments: refundAmount, refundRate, cancellationValue, creditsIssued, chargebacks._

### Operations Analytics  — route `admin-operations`
- **GET /admin/analytics/operations** — Operations Analytics dashboard  
  query: `from to city category merchantId:id granularity:Granularity market`  
  → `OperationsAnalytics`  
  _Card selectors ('Daily', 'This Period') pass `granularity` / `section` to the same endpoint._
- **GET /admin/analytics/operations/{section}** — One Operations Analytics card  
  query: `from to city granularity:Granularity period:PeriodPreset market`  
  → `obj`  
  _section ∈ operational-trends | fulfilment-funnel | marketplace-health | pickup-cancellation-health | quality-signals | drop-accuracy-trend | operations-summary; returns that property of OperationsAnalytics._

### Wallet Credit & Vouchers  — route `admin-wallet / admin-vouchers`
- **GET /admin/wallets** — Wallet Credit tab — wallet balances  
  query: `q status:WalletStatus source:WalletSource sort page pageSize from to market`  
  → `Paged<Wallet> + summary: WalletSummary`
- **GET /admin/wallets/{walletId}** — Wallet detail + transactions  
  query: `market`  
  → `WalletDetail`
- **POST /admin/wallets/credits** — Issue Credit (modal)  
  body: `IssueCredit`  
  → `{ issued*: integer, transactions*: WalletTxn[] }` · roles: super_admin, operations_admin, support_agent
- **POST /admin/wallets/{walletId}/adjust** — Adjust balance  
  body: `WalletAdjust`  
  → `WalletDetail` · roles: super_admin, operations_admin
- **POST /admin/wallets/{walletId}/freeze** — Freeze wallet  
  body: `ReasonBody`  
  → `Wallet` · roles: super_admin, operations_admin
- **POST /admin/wallets/{walletId}/unfreeze** — Unfreeze wallet  
  → `Wallet` · roles: super_admin, operations_admin
- **GET /admin/vouchers** — Vouchers tab — voucher codes  
  query: `q status:VoucherStatus type:VoucherType sort page pageSize from to market`  
  → `Paged<Voucher> + summary: WalletSummary`
- **POST /admin/vouchers** — Create voucher  
  body: `VoucherInput`  
  → `Voucher` · roles: super_admin, operations_admin  
  _409 `conflict` if code exists._
- **GET /admin/vouchers/{voucherId}** — Voucher detail + redemptions  
  query: `market`  
  → `VoucherDetail`
- **PATCH /admin/vouchers/{voucherId}** — Edit voucher  
  body: `VoucherInput`  
  → `Voucher` · roles: super_admin, operations_admin
- **DELETE /admin/vouchers/{voucherId}** — Delete voucher  
  → `204 No Content` · roles: super_admin, operations_admin
- **POST /admin/vouchers/{voucherId}/freeze** — Freeze voucher  
  body: `ReasonBody`  
  → `Voucher` · roles: super_admin, operations_admin
- **POST /admin/vouchers/{voucherId}/unfreeze** — Unfreeze voucher  
  → `Voucher` · roles: super_admin, operations_admin

### Quality & Safety  — route `admin-quality`
- **GET /admin/compliance** — Merchant Compliance list  
  query: `q complianceStatus:ComplianceStatus certificateStatus:CertificateStatus category city sort page pageSize from to market`  
  → `Paged<ComplianceRow> + summary: ComplianceSummary`  
  _KPI row uses the screen's own meaning (monitored / compliant / non-compliant / expiring certificates / avg hygiene score) instead of the copied consumer KPIs._
- **GET /admin/compliance/{merchantId}** — Compliance detail  
  query: `market`  
  → `ComplianceDetail`
- **PATCH /admin/compliance/{merchantId}** — Edit compliance record (status override)  
  body: `{ compliance: ComplianceStatus, note: string }`  
  → `ComplianceRow` · roles: super_admin, operations_admin
- **DELETE /admin/compliance/{merchantId}** — Remove from compliance monitoring  
  → `204 No Content` · roles: super_admin
- **POST /admin/compliance/{merchantId}/certificates** — Upload certificate  
  body: `CertificateInput`  
  → `Certificate` · roles: super_admin, operations_admin
- **PATCH /admin/compliance/certificates/{certificateId}** — Edit certificate (expiry, number)  
  body: `CertificateInput`  
  → `Certificate` · roles: super_admin, operations_admin
- **DELETE /admin/compliance/certificates/{certificateId}** — Delete certificate  
  → `204 No Content` · roles: super_admin, operations_admin
- **POST /admin/compliance/certificates/{certificateId}/approve** — Approve certificate  
  → `Certificate` · roles: super_admin, operations_admin
- **POST /admin/compliance/certificates/{certificateId}/reject** — Reject certificate  
  body: `ReasonBody`  
  → `Certificate` · roles: super_admin, operations_admin
- **POST /admin/compliance/{merchantId}/hygiene-score** — Record hygiene score  
  body: `HygieneScoreBody`  
  → `ComplianceRow` · roles: super_admin, operations_admin
- **POST /admin/compliance/{merchantId}/actions** — Compliance action (warn / request docs / inspect / suspend / clear)  
  body: `ComplianceActionBody`  
  → `ComplianceDetail` · roles: super_admin, operations_admin

### Issues & Alerts  — route `admin-issues`
- **GET /admin/cases** — Issues & Alerts (tabs All / Issues / Alerts / Moderation; severity chips)  
  query: `q kind:CaseKind severity:Severity status:CaseStatus assigneeId:id merchantId:id sort page pageSize from to market`  
  → `Paged<Case> + summary: CaseSummary`
- **GET /admin/cases/{caseId}** — Case detail drawer  
  query: `market`  
  → `CaseDetail`
- **PATCH /admin/cases/{caseId}** — Update case (severity / status)  
  body: `{ severity: Severity, status: CaseStatus }`  
  → `Case` · roles: super_admin, operations_admin, support_agent
- **POST /admin/cases/{caseId}/assign** — Assign case  
  body: `AssignBody`  
  → `Case` · roles: super_admin, operations_admin, support_agent
- **POST /admin/cases/{caseId}/resolve** — Resolve case (✓)  
  body: `ResolveBody`  
  → `Case` · roles: super_admin, operations_admin, support_agent
- **POST /admin/cases/{caseId}/escalate** — Escalate case  
  body: `EscalateBody`  
  → `Case` · roles: super_admin, operations_admin, support_agent
- **POST /admin/cases/{caseId}/reopen** — Reopen case  
  → `Case` · roles: super_admin, operations_admin, support_agent
- **POST /admin/cases/{caseId}/notes** — Add note  
  body: `NoteBody`  
  → `Note` · roles: super_admin, operations_admin, support_agent
- **GET /admin/cases/summary** — KPI tiles only (cases)  
  query: `kind:CaseKind severity:Severity from to market`  
  → `CaseSummary`  
  _Same object as the list response `summary`; lets KPI tiles load independently of the table._

### Moderation  — route `admin-moderation`
- **GET /admin/moderation** — Moderation queue (tabs All / Listings / Reviews / User Behaviour / Merchant Profile)  
  query: `q type:ModerationType severity:Severity status:CaseStatus reporter:ReporterSource sort page pageSize from to market`  
  → `Paged<ModerationItem> + summary: ModerationSummary`
- **GET /admin/moderation/{caseId}** — Moderation case detail  
  query: `market`  
  → `ModerationDetail`
- **POST /admin/moderation/{caseId}/approve** — Approve content (✓ — keep / no violation)  
  body: `ModerationDecision`  
  → `ModerationItem` · roles: super_admin, operations_admin, support_agent
- **POST /admin/moderation/{caseId}/reject** — Reject content (× — take action)  
  body: `ModerationDecision`  
  → `ModerationItem` · roles: super_admin, operations_admin, support_agent
- **POST /admin/moderation/{caseId}/escalate** — Escalate to Trust & Safety  
  body: `EscalateBody`  
  → `ModerationItem` · roles: super_admin, operations_admin, support_agent
- **GET /admin/moderation/summary** — KPI tiles only (moderation)  
  query: `type:ModerationType from to market`  
  → `ModerationSummary`  
  _Same object as the list response `summary`; lets KPI tiles load independently of the table._

### Support  — route `admin-support`
- **GET /admin/support/summary** — Support KPIs + Response Time (7d) + Tickets by Channel  
  query: `from to market`  
  → `SupportDashboard`
- **GET /admin/support/tickets** — Ticket list (priority tabs All/Urgent/High/Normal/Low)  
  query: `q priority:TicketPriority status:TicketStatus channel:TicketChannel assigneeId:id sort page pageSize from to market`  
  → `Paged<Ticket> + summary: SupportSummary`
- **POST /admin/support/tickets** — Open ticket on behalf of a user  
  body: `{ requester*: TicketRequester, subject*: string, channel*: TicketChannel, priority*: TicketPriority, body*: string, orderId: string }`  
  → `Ticket` · roles: super_admin, operations_admin, support_agent
- **GET /admin/support/tickets/{ticketId}** — Ticket detail + conversation  
  query: `market`  
  → `TicketDetail`
- **PATCH /admin/support/tickets/{ticketId}** — Update status / priority / assignee  
  body: `TicketUpdate`  
  → `Ticket` · roles: super_admin, operations_admin, support_agent
- **GET /admin/support/tickets/{ticketId}/messages** — Conversation messages  
  query: `page pageSize market`  
  → `Paged<TicketMessage>`
- **POST /admin/support/tickets/{ticketId}/messages** — Reply (or internal note)  
  body: `MessageBody`  
  → `TicketMessage` · roles: super_admin, operations_admin, support_agent
- **GET /admin/support/agents** — Assignable agents  
  query: `market`  
  → `[UserRef]`
- **GET /admin/support/report** — Response time report (View report)  
  query: `from to granularity:Granularity market`  
  → `PerformanceReport`

### Performance  — route `admin-performance`
- **GET /admin/analytics/performance** — Performance dashboard  
  query: `from to city category market`  
  → `PerformanceDashboard`
- **GET /admin/analytics/performance/merchants** — Merchant Performance Ranking (View all merchants)  
  query: `q status:QualityBadge city category sort page pageSize from to market`  
  → `Paged<MerchantPerformanceRow>`  
  _sort: -qualityScore (default) | qualityScore | -onTimePct | name_
- **GET /admin/analytics/performance/report** — Drop accuracy report (View report)  
  query: `from to city market`  
  → `PerformanceReport`
- **GET /admin/analytics/performance/merchants/{merchantId}** — Merchant performance detail drawer  
  query: `from to market`  
  → `MerchantPerformanceDetail`

### Sustainability & Impact  — route `admin-sustainability`
- **GET /admin/analytics/sustainability** — Sustainability & Impact dashboard  
  query: `from to city category market`  
  → `SustainabilityDashboard`
- **GET /admin/analytics/sustainability/breakdown** — Full breakdown (View full breakdown)  
  query: `from to city category groupBy:enum(city,merchant,category,month) market`  
  → `SustainabilityBreakdown`
- **GET /admin/analytics/sustainability/report** — Impact report (View report / Learn more)  
  query: `from to city market`  
  → `PerformanceReport`

### Listings & Templates (+ gallery)  — route `admin-listings-templates / admin-templates`
- **GET /admin/templates** — Listings & Templates list (category tabs All/Bakery/Grocery/Prepared Foods/Other) and gallery  
  query: `q category status:TemplateStatus source:TemplateSource sort page pageSize market`  
  → `Paged<Template> + summary: TemplateSummary`
- **POST /admin/templates** — New Template (builder with field chips)  
  body: `TemplateInput`  
  → `Template` · roles: super_admin, operations_admin
- **GET /admin/templates/fields** — Available field chips for builder  
  query: `market`  
  → `[TemplateField]`
- **GET /admin/templates/{templateId}** — Template detail  
  query: `market`  
  → `Template`
- **PATCH /admin/templates/{templateId}** — Edit template  
  body: `TemplateInput`  
  → `Template` · roles: super_admin, operations_admin
- **DELETE /admin/templates/{templateId}** — Delete template  
  → `204 No Content` · roles: super_admin, operations_admin
- **POST /admin/templates/{templateId}/duplicate** — Duplicate template  
  → `Template` · roles: super_admin, operations_admin
- **POST /admin/templates/{templateId}/publish** — Publish (draft → active)  
  → `Template` · roles: super_admin, operations_admin
- **POST /admin/templates/{templateId}/unpublish** — Move back to draft  
  → `Template` · roles: super_admin, operations_admin

### CMS (Pages · Banners · FAQ)  — route `admin-cms`
- **GET /admin/cms** — CMS content list (tabs All / Pages / Banners / FAQ)  
  query: `q type:CmsType status:CmsStatus authorId:id sort page pageSize market`  
  → `Paged<CmsItem> + summary: CmsSummary`
- **GET /admin/cms/pages** — List pages  
  query: `q status:CmsStatus page pageSize market`  
  → `Paged<CmsPage>`
- **POST /admin/cms/pages** — Create page (rich text editor)  
  body: `CmsPageInput`  
  → `CmsPage` · roles: super_admin, operations_admin
- **GET /admin/cms/pages/{pageId}** — Get page  
  query: `market`  
  → `CmsPage`
- **PATCH /admin/cms/pages/{pageId}** — Update page  
  body: `CmsPageInput`  
  → `CmsPage` · roles: super_admin, operations_admin
- **DELETE /admin/cms/pages/{pageId}** — Delete page  
  → `204 No Content` · roles: super_admin, operations_admin
- **GET /admin/cms/banners** — List banners (card grid)  
  query: `q status:CmsStatus audience:Audience page pageSize market`  
  → `Paged<Banner>`
- **POST /admin/cms/banners** — Create banner (image upload, audience, schedule)  
  body: `BannerInput`  
  → `Banner` · roles: super_admin, operations_admin
- **GET /admin/cms/banners/{bannerId}** — Get banner  
  query: `market`  
  → `Banner`
- **PATCH /admin/cms/banners/{bannerId}** — Update banner  
  body: `BannerInput`  
  → `Banner` · roles: super_admin, operations_admin
- **DELETE /admin/cms/banners/{bannerId}** — Delete banner  
  → `204 No Content` · roles: super_admin, operations_admin
- **GET /admin/cms/faqs** — List FAQs  
  query: `q status:CmsStatus audience:enum(consumers,merchants,all) page pageSize market`  
  → `Paged<Faq>`
- **POST /admin/cms/faqs** — Create FAQ  
  body: `FaqInput`  
  → `Faq` · roles: super_admin, operations_admin
- **GET /admin/cms/faqs/{faqId}** — Get FAQ  
  query: `market`  
  → `Faq`
- **PATCH /admin/cms/faqs/{faqId}** — Update FAQ  
  body: `FaqInput`  
  → `Faq` · roles: super_admin, operations_admin
- **DELETE /admin/cms/faqs/{faqId}** — Delete FAQ  
  → `204 No Content` · roles: super_admin, operations_admin
- **PUT /admin/cms/faqs/order** — Reorder FAQs  
  body: `{ ids*: string[] }`  
  → `204 No Content` · roles: super_admin, operations_admin
- **POST /admin/cms/{contentType}/{contentId}/publish** — Publish now  
  → `CmsItem` · roles: super_admin, operations_admin  
  _contentType ∈ pages | banners | faqs — the same plural segment as the content paths. The mock also registers generic `GET|PATCH|DELETE /admin/cms/{contentType}/{id}` and `POST /admin/cms/{contentType}`, which are exactly the concrete pages/banners/faqs endpoints above._
- **POST /admin/cms/{contentType}/{contentId}/unpublish** — Unpublish (→ draft)  
  → `CmsItem` · roles: super_admin, operations_admin
- **POST /admin/cms/{contentType}/{contentId}/schedule** — Schedule publish  
  body: `ScheduleBody`  
  → `CmsItem` · roles: super_admin, operations_admin

### Users & Access  — route `admin-users`
- **GET /admin/users** — Admin users list (role tabs)  
  query: `q role:Role status:UserStatus twoFactor:bool sort page pageSize market`  
  → `Paged<AdminUser> + summary: UsersSummary` · roles: super_admin
- **GET /admin/roles** — Role cards (counts + descriptions + permissions)  
  query: `market`  
  → `[RoleCard]` · roles: super_admin
- **POST /admin/users/invite** — Invite user (modal)  
  body: `InviteBody`  
  → `AdminUser` · roles: super_admin
- **GET /admin/users/{userId}** — User detail  
  query: `market`  
  → `AdminUser` · roles: super_admin
- **PATCH /admin/users/{userId}** — Edit role  
  body: `UserUpdate`  
  → `AdminUser` · roles: super_admin
- **DELETE /admin/users/{userId}** — Remove user / revoke invite  
  → `204 No Content` · roles: super_admin
- **POST /admin/users/{userId}/suspend** — Suspend user (⊘)  
  → `AdminUser` · roles: super_admin
- **POST /admin/users/{userId}/reactivate** — Reactivate user  
  → `AdminUser` · roles: super_admin
- **POST /admin/users/{userId}/resend-invite** — Resend invite  
  → `AdminUser` · roles: super_admin
- **POST /admin/users/{userId}/reset-2fa** — Reset user's 2FA  
  → `AdminUser` · roles: super_admin
- **GET /admin/sessions** — Active sessions  
  query: `userId:id page pageSize market`  
  → `Paged<{ id*: string, user*: UserRef, ip: string, device: string, lastSeenAt*: datetime }>` · roles: super_admin
- **DELETE /admin/sessions/{sessionId}** — Revoke session  
  → `204 No Content` · roles: super_admin

### Settings (Profile · General · Notifications · Security · Policies)  — route `admin-settings-*`
- **GET /admin/settings/general** — General (Platform Basics + Operational Defaults)  
  query: `market`  
  → `GeneralSettings`
- **PATCH /admin/settings/general** — Save General  
  body: `GeneralSettings`  
  → `GeneralSettings` · roles: super_admin
- **GET /admin/settings/notifications** — Notifications (Admin Alerts)  
  query: `market`  
  → `NotificationSettings`
- **PATCH /admin/settings/notifications** — Save Notifications  
  body: `NotificationSettings`  
  → `NotificationSettings` · roles: super_admin
- **GET /admin/settings/security** — Security (Authentication + Audit & Compliance)  
  query: `market`  
  → `SecuritySettings` · roles: super_admin
- **PATCH /admin/settings/security** — Save Security  
  body: `SecuritySettings`  
  → `SecuritySettings` · roles: super_admin
- **GET /admin/settings/policies** — Policies list  
  query: `market`  
  → `[PolicyListItem]`
- **GET /admin/settings/policies/{policyKey}** — Policy editor content (Refund & Cancellation incl. configuration table; About; Privacy; Terms)  
  query: `market`  
  → `Policy`
- **PUT /admin/settings/policies/{policyKey}** — Save policy content / configuration  
  body: `PolicyInput`  
  → `Policy` · roles: super_admin  
  _Refund policy `config` drives /admin/orders/{id}/refund-eligibility._
- **GET /admin/audit-log** — Audit log  
  query: `q actorId:id action:str entityType:str page pageSize from to market`  
  → `Paged<AuditEntry>` · roles: super_admin
- **POST /admin/audit-log/export** — Export audit log (CSV)  
  body: `AuditExportBody`  
  → `ExportJob` · roles: super_admin  
  _range ∈ 7d | 30d | 90d | 12m (Security screen selector)._
- **GET /shared/meta/timezones** — Timezones for Default Time Zone select  
  → `{  }` · roles: super_admin, operations_admin, support_agent, read_only, merchant_owner, merchant_staff
- **GET /admin/settings/profile** — Profile tab (Personal Info)  
  query: `market`  
  → `AdminProfile`
- **PATCH /admin/settings/profile** — Save Profile  
  body: `AdminProfile`  
  → `AdminProfile`  
  _Alias of PATCH /me scoped to profile fields._
- **GET /admin/settings/markets** — Settings → Markets: every market (enabled or not)  
  query: `market`  
  → `MarketList` · roles: super_admin, operations_admin
- **PATCH /admin/settings/markets/{code}** — Enable / disable a market, edit time zone, phone code, VAT  
  body: `MarketUpdate`  
  → `Market` · roles: super_admin  
  _Enabling takes effect immediately: the market appears in the admin market switcher, country/city filters, merchant sign-up and branch creation. 409 `conflict` when disabling the last enabled market or the market of the reporting currency. Also edits the market's support contacts (supportEmail, supportPhone, supportWhatsApp, supportHours) used by Need Help and merchant Help._
- **POST /admin/settings/markets/{code}/cities** — Add a city to a market  
  body: `MarketCityInput`  
  → `MarketCity` · roles: super_admin
- **PATCH /admin/settings/markets/{code}/cities/{cityId}** — Rename / hide a city  
  body: `MarketCityUpdate`  
  → `MarketCity` · roles: super_admin
- **GET /admin/settings/fx** — Reporting currency + manual FX rates  
  query: `market`  
  → `FxSettings` · roles: super_admin, operations_admin
- **PUT /admin/settings/fx** — Save reporting currency + FX rates  
  body: `FxUpdate`  
  → `FxSettings` · roles: super_admin
- **POST /admin/settings/markets/reset** — Demo only: reset markets + FX to the launch defaults (QA enabled, AE/SA disabled)  
  → `obj` · roles: super_admin  
  _Mock/demo helper; not part of the production API._
- **GET /admin/settings/commercial** — Settings → General → Commercial: platform commission (effective-dated) + contract overrides  
  query: `market`  
  → `CommercialSettings` · roles: super_admin, operations_admin  
  _Default 19 %. Every mock financial figure (payouts, net earnings, commission revenue) is computed from the effective rate of each order date._
- **PUT /admin/settings/commercial** — Schedule a new platform commission rate  
  body: `CommercialUpdate`  
  → `CommercialSettings` · roles: super_admin  
  _Closes the current period the day before `effectiveFrom`. 422 `validation_error` {defaultCommissionRate: range | effectiveFrom: order}._

## MERCHANT PORTAL (`/merchant/*`, all accept `branchId`)
### Overview  — route `m-overview`
- **GET /merchant/overview** — Overview aggregates  
  query: `branchId from to`  
  → `MerchantOverview`  
  _KPIs with sparklines, Sales Overview, Top Selling Bags, Recent Orders, Inventory Status donut, Operational Status, Reviews, Alerts & Notifications._
- **GET /merchant/overview/sales** — Sales Overview card (This Week / This Month)  
  query: `branchId period:PeriodPreset from to`  
  → `SalesOverviewCard`
- **GET /merchant/context** — Header: merchant + branch switcher options  
  → `MerchantContext`

### Orders & Pickups  — route `m-orders`
- **GET /merchant/orders** — Orders & Pickups list  
  query: `branchId q status:OrderStatus fulfillment:FulfillmentType assignment:DriverAssignment sort page pageSize from to`  
  → `Paged<MerchantOrder> + summary: MerchantOrderSummary`
- **GET /merchant/orders/{orderId}** — Order detail modal  
  → `MerchantOrderDetail`
- **POST /merchant/orders/{orderId}/assign-driver** — Assign driver  
  body: `AssignDriverBody`  
  → `MerchantOrder`  
  _409 `invalid_transition` `{from, to, allowed}` when the order state machine does not allow the move (terminal: completed, cancelled, refunded)._
- **POST /merchant/orders/{orderId}/unassign-driver** — Unassign driver  
  → `MerchantOrder`  
  _409 `invalid_transition` `{from, to, allowed}` when the order state machine does not allow the move (terminal: completed, cancelled, refunded)._
- **POST /merchant/orders/{orderId}/ready** — Mark ready  
  → `MerchantOrder`  
  _409 `invalid_transition` `{from, to, allowed}` when the order state machine does not allow the move (terminal: completed, cancelled, refunded)._
- **POST /merchant/orders/{orderId}/complete** — Mark order completed  
  body: `CompleteBody`  
  → `MerchantOrder`  
  _409 `invalid_transition` `{from, to, allowed}` when the order state machine does not allow the move (terminal: completed, cancelled, refunded). Self-pickup orders are completed only via POST /merchant/pickups/verify (`details.requires: pickup_verification`); delivery orders move out_for_delivery → delivered → completed._
- **POST /merchant/orders/{orderId}/cancel** — Cancel order  
  body: `CancelRequest`  
  → `MerchantOrder`  
  _409 `invalid_transition` `{from, to, allowed}` when the order state machine does not allow the move (terminal: completed, cancelled, refunded)._
- **POST /merchant/pickups/verify** — Verify customer pickup code → order completed  
  body: `PickupVerifyInput`  
  → `PickupVerifyResult`
- **POST /merchant/imports/preview** — Import dialog: validate file before import  
  body: `{ resource*: enum(merchant.orders|merchant.customers|merchant.listings), fileId: string, rows: integer }`  
  → `{ resource*: string, rows*: integer, valid*: integer, errors*: ImportError[] }`

### Listings (Bags) & Inventory (+ Add Listing, detail)  — route `m-listings / m-inventory / m-inventory-new / m-inventory-detail`
- **GET /merchant/listings** — Listings (Bags) / Inventory list  
  query: `branchId q status:ListingStatus stockStatus:StockStatus category city dietary sort page pageSize from to`  
  → `Paged<Listing> + summary: ListingSummary`  
  _Used by both Listings (Bags) and Inventory screens. sort: -createdAt | price | -sold | title._
- **POST /merchant/listings** — Add New Listing  
  body: `ListingInput`  
  → `Listing`  
  _`?draft=true` saves without publishing._
- **GET /merchant/listings/{listingId}** — Listing detail page (Listing incl. activity)  
  → `Listing`
- **PATCH /merchant/listings/{listingId}** — Edit listing  
  body: `ListingInput`  
  → `Listing`  
  _`remaining` changes only when `quantity` changes (remaining = quantity − reserved − collected); 422 `validation_error` `{quantity: below_committed, committed}` below what is already reserved/collected._
- **DELETE /merchant/listings/{listingId}** — Delete listing  
  → `204 No Content`  
  _409 if active reservations._
- **POST /merchant/listings/{listingId}/pause** — Pause listing  
  → `Listing`
- **POST /merchant/listings/{listingId}/resume** — Resume listing  
  → `Listing`
- **POST /merchant/listings/{listingId}/disable** — Disable listing  
  → `Listing`
- **POST /merchant/listings/{listingId}/enable** — Re-enable listing  
  → `Listing`
- **POST /merchant/listings/{listingId}/duplicate** — Duplicate listing  
  → `Listing`
- **POST /merchant/listings/{listingId}/save-as-template** — Save as template  
  body: `{ name*: LocalizedText }`  
  → `Template`
- **PATCH /merchant/listings/{listingId}/stock** — Quick stock update  
  body: `{ quantity*: number, reason: string }`  
  → `Listing`
- **PATCH /merchant/listings/{listingId}/settings** — Listing settings toggles  
  body: `ListingSettings`  
  → `Listing`
- **POST /merchant/listings/{listingId}/images** — Add image (after presign)  
  body: `{ fileId*: string }`  
  → `ListingImage`  
  _422 when the listing already has 10 images._
- **PUT /merchant/listings/{listingId}/images/order** — Reorder images / set cover  
  body: `ImageOrder`  
  → `[ListingImage]`
- **DELETE /merchant/listings/{listingId}/images/{imageId}** — Remove image  
  → `204 No Content`
- **GET /merchant/listings/{listingId}/activity** — Listing activity timeline  
  query: `page pageSize`  
  → `Paged<Activity>`
- **POST /merchant/listings/bulk** — Bulk action  
  body: `{ ids*: string[], action*: enum(pause|resume|disable|delete) }`  
  → `BulkResult`

### Create Product  — route `m-product-new`
- **GET /merchant/products** — List products  
  query: `branchId q category page pageSize`  
  → `Paged<Product>`
- **POST /merchant/products** — Create Product  
  body: `ProductInput`  
  → `Product`
- **GET /merchant/products/{productId}** — Get product  
  → `Product`
- **PATCH /merchant/products/{productId}** — Update product  
  body: `ProductInput`  
  → `Product`
- **DELETE /merchant/products/{productId}** — Delete product  
  → `204 No Content`

### Drivers  — route `m-drivers`
- **GET /merchant/drivers** — Your Drivers  
  query: `branchId q status:DriverStatus vehicle:VehicleType sort page pageSize`  
  → `Paged<Driver> + summary: DriverSummary`
- **POST /merchant/drivers** — Add Driver  
  body: `DriverInput`  
  → `Driver` · roles: merchant_owner
- **GET /merchant/drivers/{driverId}** — Driver detail  
  → `DriverDetail`
- **PATCH /merchant/drivers/{driverId}** — Edit driver / change status  
  body: `DriverInput`  
  → `Driver`
- **DELETE /merchant/drivers/{driverId}** — Remove driver  
  → `204 No Content` · roles: merchant_owner

### Sales & Analytics  — route `m-analytics`
- **GET /merchant/analytics/sales** — Sales & Analytics (sections A–H)  
  query: `branchId period:PeriodPreset granularity:Granularity from to`  
  → `SalesAnalytics`  
  _Day/Week/Month toggle = granularity daily/weekly/monthly; Today/7 Days/30 Days/3 Months/Custom = period._
- **GET /merchant/analytics/sales/performance** — A) Sales Performance chart only  
  query: `branchId period:PeriodPreset granularity:Granularity from to`  
  → `TrendCard`
- **GET /merchant/analytics/sales/days** — H) Breakdown by day (View all day records)  
  query: `branchId page pageSize sort from to`  
  → `Paged<DayRecord>`
- **GET /merchant/analytics/sales/days/export** — H) Export CSV of day breakdown  
  query: `branchId from to format:ExportFormat`  
  → `302 → signed URL`  
  _Convenience: 302 to a ready CSV for small ranges; otherwise use POST /shared/exports with resource merchant.sales_days._

### Customers  — route `m-customers / m-customer-new`
- **GET /merchant/customers** — Customers list  
  query: `branchId q status:ConsumerStatus category sort page pageSize from to`  
  → `Paged<Customer> + summary: CustomerSummary`
- **POST /merchant/customers** — Add Customer  
  body: `CustomerInput`  
  → `Customer`
- **GET /merchant/customers/{customerId}** — Customer detail  
  → `CustomerDetail`
- **PATCH /merchant/customers/{customerId}** — Edit customer  
  body: `CustomerInput`  
  → `Customer`
- **DELETE /merchant/customers/{customerId}** — Delete customer  
  → `204 No Content`

### Branches  — route `m-branches`
- **GET /merchant/branches** — Branch cards (also branch switcher, operating-hours select)  
  query: `q state:BranchState`  
  → `Paged<Branch> + summary: BranchesSummary`
- **POST /merchant/branches** — Add Branch (hours + map)  
  body: `BranchInput`  
  → `Branch` · roles: merchant_owner
- **GET /merchant/branches/{branchId}** — Branch detail  
  → `Branch`
- **PATCH /merchant/branches/{branchId}** — Edit Branch  
  body: `BranchInput`  
  → `Branch` · roles: merchant_owner
- **DELETE /merchant/branches/{branchId}** — Delete branch  
  → `204 No Content` · roles: merchant_owner  
  _409 if it has live listings or open orders._
- **PATCH /merchant/branches/{branchId}/state** — Open / closed state (card select; Overview 'Tap to change branch state')  
  body: `BranchStateBody`  
  → `Branch`
- **PUT /merchant/branches/{branchId}/hours** — Replace weekly hours  
  body: `HoursBody`  
  → `Branch`

### Vendors / Sub-vendors  — route `m-vendors`
- **GET /merchant/vendors** — Vendors list (status tabs)  
  query: `q status:VendorStatus sort page pageSize`  
  → `Paged<Vendor> + summary: VendorSummary` · roles: merchant_owner
- **POST /merchant/vendors** — Add New Sub Vendor  
  body: `VendorInput`  
  → `Vendor` · roles: merchant_owner
- **GET /merchant/vendors/{vendorId}** — Vendor detail  
  → `VendorDetail` · roles: merchant_owner
- **PATCH /merchant/vendors/{vendorId}** — Edit vendor  
  body: `VendorInput`  
  → `Vendor` · roles: merchant_owner
- **DELETE /merchant/vendors/{vendorId}** — Delete vendor  
  → `204 No Content` · roles: merchant_owner
- **PATCH /merchant/vendors/{vendorId}/status** — Change vendor status  
  body: `VendorStatusBody`  
  → `Vendor` · roles: merchant_owner

### Templates  — route `m-templates`
- **GET /merchant/templates** — Templates (WonderBites Templates + My Templates)  
  query: `source:enum(wonderbites,mine) category q page pageSize`  
  → `Paged<Template>`
- **POST /merchant/templates** — Create my template  
  body: `TemplateInput`  
  → `Template`
- **GET /merchant/templates/{templateId}** — Template detail  
  → `Template`
- **PATCH /merchant/templates/{templateId}** — Edit my template  
  body: `TemplateInput`  
  → `Template`  
  _403 for WonderBites templates._
- **DELETE /merchant/templates/{templateId}** — Delete my template  
  → `204 No Content`
- **POST /merchant/templates/{templateId}/create-product** — Create from Template → prefilled draft (Create Product / Add Listing)  
  body: `{ target: enum(listing|product), branchId: string }`  
  → `{ target*: enum(listing|product), draft*: ListingInput }`  
  _Returns a prefilled, unsaved draft used to open Create Product / Add Listing; increments usageCount when the draft is saved with templateId._

### Reviews  — route `m-reviews`
- **GET /merchant/reviews** — Reviews list + rating summary  
  query: `branchId rating:int sort:ReviewSort replied:bool page pageSize from to`  
  → `Paged<Review> + summary: RatingSummary`
- **POST /merchant/reviews/{reviewId}/reply** — Reply to review  
  body: `ReviewBody`  
  → `Review`
- **PATCH /merchant/reviews/{reviewId}/reply** — Edit reply  
  body: `ReviewBody`  
  → `Review`
- **DELETE /merchant/reviews/{reviewId}/reply** — Delete reply  
  → `204 No Content`
- **POST /merchant/reviews/{reviewId}/report** — Report review (goes to admin moderation)  
  body: `ReviewReport`  
  → `Review`
- **POST /merchant/reviews/feedback** — 'Write a Review' → merchant reviews WonderBites (partner feedback)  
  body: `PartnerFeedback`  
  → `{ id*: string, rating*: integer, body*: string, createdAt*: datetime }`

### Reports / Dispute  — route `m-reports`
- **GET /merchant/disputes** — Reports / Dispute tickets (tabs All/Open/In progress/Resolved/Closed)  
  query: `branchId q status:enum(all,open,in_progress,resolved,closed) type:DisputeType sort page pageSize from to`  
  → `Paged<Dispute> + summary: DisputeSummary`
- **POST /merchant/disputes** — Open dispute / report  
  body: `DisputeInput`  
  → `Dispute`
- **GET /merchant/disputes/{disputeId}** — View detail + thread  
  → `DisputeDetail`
- **POST /merchant/disputes/{disputeId}/replies** — Reply  
  body: `MessageBody`  
  → `TicketMessage`
- **POST /merchant/disputes/{disputeId}/close** — Close dispute  
  body: `{ note: string }`  
  → `Dispute`
- **POST /merchant/disputes/{disputeId}/reopen** — Reopen dispute  
  → `Dispute`

### Help (+ Need Help drawer)  — route `m-help`
- **GET /merchant/help/faqs** — Help FAQ (+ contact options in meta.contact)  
  query: `q`  
  → `Paged<Faq> + summary: { contact: object[] }`
- **GET /merchant/help/requests** — My help tickets  
  query: `status:TicketStatus page pageSize`  
  → `Paged<HelpRequest>`
- **POST /merchant/help/requests** — Submit help request (form / Need Help drawer)  
  body: `HelpRequestInput`  
  → `HelpRequest`  
  _Returns { id, number, subject, status, createdAt }._
- **GET /merchant/help/requests/{requestId}** — Help ticket detail  
  → `{ request*: HelpRequest, messages*: TicketMessage[] }`

### Settings (Profile · Store info · Security · Operating Hours · Language)  — route `m-settings-*`
- **GET /merchant/settings/profile** — Profile tab  
  → `MerchantProfile`
- **PATCH /merchant/settings/profile** — Save Profile  
  body: `MerchantProfile`  
  → `MerchantProfile`
- **GET /merchant/settings/store** — Store info tab  
  → `StoreInfo`
- **PATCH /merchant/settings/store** — Save Store info  
  body: `StoreInfoInput`  
  → `StoreInfo` · roles: merchant_owner
- **GET /merchant/settings/security** — Security tab  
  → `MerchantSecurity` · roles: merchant_owner
- **PATCH /merchant/settings/security** — Update business email / password (email-verified)  
  body: `MerchantSecurityInput`  
  → `MerchantSecurityResult` · roles: merchant_owner
- **GET /merchant/settings/operating-hours** — Operating Hours (per branch)  
  query: `branchId*`  
  → `OperatingHours`
- **PUT /merchant/settings/operating-hours** — Save Operating Hours  
  query: `branchId*`  
  body: `HoursBody`  
  → `OperatingHours` · roles: merchant_owner
- **GET /merchant/settings/language** — Language tab  
  → `LanguageSetting`
- **PATCH /merchant/settings/language** — Save language  
  body: `LanguageSetting`  
  → `LanguageSetting`

## Realtime — `/api/v1/stream` (WebSocket or SSE) + optional signed webhooks
Envelope `{ id, type, occurredAt, data }`.

- **order.status_changed** — Order status transition (both portals; merchant receives own branches). data: `{ orderId*: string, number*: string, merchantId*: string, branchId*: string, from*: OrderStatus, to*: OrderStatus, fulfillment*: FulfillmentType, driver: DriverRef?, actor: UserRef?, at*: datetime }`
- **pickup.verified** — Passport code verified at pickup. data: `{ pickupId*: string, orderId*: string, merchantId*: string, branchId*: string, consumer*: Ref, verifiedBy*: UserRef, method*: enum(passport_scan|manual_code), at*: datetime }`
- **alert.created** — New priority alert / case (admin) or merchant alert. data: `{ alert*: PriorityAlert, caseId: string?, audience*: enum(admin|merchant), merchantId: string? }`
- **ticket.updated** — Support ticket / dispute changed (status, assignee, new message). data: `{ ticketId*: string, kind*: enum(support|dispute|help), changes*: string[], status*: string, assignee: UserRef?, lastMessage: TicketMessage?, at*: datetime }`
- **payout.processed** — Payout paid / failed. data: `{ payoutId*: string, merchantId*: string, status*: PayoutStatus, net*: Money, reference: string?, failureReason: string?, at*: datetime }`
- **notification.created** — New notification for the current user. data: `Notification`
- **export.ready** — Export job finished. data: `ExportJob`

## Schemas (response / request shapes)
`*` = required.

- **Activity** `{ id: string, action: string, label: string, actor: UserRef, at*: datetime, meta: { score: number, max: number, doc: CertificateType, status: ComplianceStatus, dueAt: date, note: string }, type: string, status: string, by: string, note: string, detail: string }`
- **Address** `{ line1*: string, city*: string, state: string, postalCode: string, country*: Country, lat: number, lng: number }`
- **AdminProfile** `{ firstName*: string, lastName: string, email*: email, phone: string, avatarFileId: string?, avatarUrl: url?, phoneCountry: string }`
- **AdminUser** `{ id*: string, name*: string, email*: email, avatarUrl: url?, role*: Role, status*: UserStatus, invitedAt: datetime?, twoFactor*: boolean, lastActiveAt: datetime? }`
- **AlertSetting** `{ key*: enum(critical_issue|daily_digest|new_merchant_signup), label*: LocalizedText, description: LocalizedText, enabled*: boolean, email: boolean, push: boolean, sms: boolean }`
- **AssignBody** `{ assigneeId*: string }`
- **AssignDriverBody** `{ driverId*: string, notifyDriver: boolean }`
- **Attachment** `{ fileId*: string, name*: string, url*: url, contentType: string, size: integer }`
- **AuditEntry** `{ id*: string, actor*: UserRef, action*: string, entity: EntityRef, ip: string, at*: datetime, changes: object, target: string }`
- **AuditExportBody** `{ range*: AuditExportRange, from: datetime, to: datetime, format: ExportFormat }`
- **AuthTokens** `{ accessToken*: string, refreshToken*: string, expiresIn*: integer, user*: User }`
- **Banking** `{ bankName*: string, accountName*: string, iban*: string, payoutSchedule: enum(weekly|biweekly|monthly) }`
- **Banner** `{ id*: string, title*: LocalizedText, imageUrl*: url, imageUrlAr: url?, link: DeepLink?, ctaLabel: LocalizedText, audience*: Audience, cities: string[], placement*: enum(home_hero|home_carousel|merchant_dashboard), startsAt: datetime?, endsAt: datetime?, status*: CmsStatus, order: integer, updatedAt*: datetime, subtitle: LocalizedText }`
- **BannerInput** `{ title*: LocalizedText, imageFileId*: string, imageFileIdAr: string, link: DeepLink, ctaLabel: LocalizedText, audience*: Audience, cities: string[], placement*: enum(home_hero|home_carousel|merchant_dashboard), startsAt: datetime, endsAt: datetime, status: enum(draft|published), subtitle: LocalizedText }`
- **Branch** `{ id*: string, name*: LocalizedText, address*: LocalizedText, city*: string, lat: number?, lng: number?, phone: string, photoUrl: url?, manager: string?, state*: BranchState, isPrimary: boolean, pickupToday: TimeWindow?, hours: DayHours[] | string, createdAt: datetime, photo: integer, pickupWindow: TimeWindow, activeListings: integer, country: Country, currency: Currency, timeZone: string }`
- **BranchInput** `{ name*: LocalizedText, address*: LocalizedText, city*: string, lat: number, lng: number, phone*: string, photoFileId: string, manager: string, hours: DayHours[], state: BranchState, country: Country }`
- **BranchOption** `{ id*: string, name*: LocalizedText, city: string, state: BranchState, isPrimary: boolean, country: Country, currency: Currency, timeZone: string }`
- **BranchStateBody** `{ state*: BranchState, reopenAt: datetime? }`
- **BranchesSummary** `{ total*: integer, open*: integer }`
- **BulkDropAction** `{ ids*: string[], action*: enum(delete|flag|unflag|pause|activate), reason: string }`
- **BulkFailure** `{ id*: string, error*: string }`
- **BulkResult** `{ updated*: integer, failed*: BulkFailure[] }`
- **CancelRequest** `{ reason*: string, refund: boolean, destination: RefundDestination, notifyCustomer: boolean }`
- **Case** `{ id*: string, kind*: CaseKind, moderationType: ModerationType?, title*: string, description: string, merchant: Ref?, entity: EntityRef?, reporter: ReporterSource?, severity*: Severity, status*: CaseStatus, assignee: UserRef?, slaDueAt: datetime?, updatedAt*: datetime, createdAt*: datetime, assigneeId: string?, ageMinutes*: integer, market: Country }`
- **CaseDetail** `{ id*: string, kind*: CaseKind, moderationType: ModerationType?, title*: string, description: string, merchant: Ref?, entity: EntityRef?, reporter: ReporterSource?, severity*: Severity, status*: CaseStatus, assignee: UserRef?, slaDueAt: datetime?, updatedAt*: datetime, createdAt*: datetime, assigneeId: string?, ageMinutes*: integer, activity: Activity[], notes: Note[], related: EntityRef[], market: Country }`
- **CaseSummary** `{ critical*: integer, needsReview*: integer, underMonitoring*: integer, totalOpen*: integer, byKind: { all: integer, issue: integer, alert: integer, moderation: integer } }`
- **CategoryCount** `{ key*: string, count*: integer }`
- **Certificate** `{ id*: string, type*: CertificateType, number: string, issuedAt: date, expiresAt*: date, status*: CertificateStatus, file: Attachment?, reviewedBy: UserRef?, reviewNote: string? }`
- **CertificateInput** `{ type*: CertificateType, number: string, issuedAt: date, expiresAt*: date, fileId*: string, fileName: string, size: integer }`
- **ChannelCount** `{ key*: TicketChannel, count*: integer }`
- **ChannelToggle** `{ enabled*: boolean, email: boolean, push: boolean }`
- **City** `{ id*: string, name*: string, country*: Country }`
- **CmsItem** `{ id*: string, type*: CmsType, title*: LocalizedText, slug: string, status*: CmsStatus, author*: UserRef, updatedAt*: datetime, scheduledAt: datetime?, publishedAt: datetime?, thumbnailUrl: url?, subtitle: LocalizedText, subtype: enum(legal), publishAt: datetime?, imageUrl: string?, link: DeepLink?, audience: Audience, cities: string[], placement: string, startsAt: datetime?, endsAt: datetime? }`
- **CmsPage** `{ id*: string, title*: LocalizedText, slug*: string, body*: LocalizedText, seoDescription: LocalizedText, status*: CmsStatus, scheduledAt: datetime?, author*: UserRef, updatedAt*: datetime }`
- **CmsPageInput** `{ title*: LocalizedText, slug*: string, body*: LocalizedText, seoDescription: LocalizedText, type: enum(page|legal), status: enum(draft|published) }`
- **CmsSummary** `{ published*: integer, drafts*: integer, scheduled*: integer, nextScheduledAt: datetime?, lastPublishedAt: datetime?, lastPublishedTitle: string, counts: { all: integer, page: integer, banner: integer, faq: integer } }`
- **CommandCenter** `{ kpis*: Kpi[], priorityAlerts*: PriorityAlert[], recentOrders*: LiveDropRow[], passportMonitoring*: PassportMonitoring, issueAlerts*: IssueAlertRow[], dropAccuracy*: DropAccuracyCard, merchantQualityWatch*: MerchantQualityRow[], sustainability*: SustainabilityTiles }`
- **CommercialSettings** `{ defaultCommissionRate*: number, effectiveFrom*: date, history*: CommissionPeriod[], contracts: object, currencyNote: string, updatedAt: datetime, updatedBy: string }`
- **CommercialUpdate** `{ defaultCommissionRate*: number, effectiveFrom: date }`
- **CommissionPeriod** `{ rate*: number, from*: date, to: date?, note: string }`
- **CompleteBody** `{ pickupCode: string? }`
- **ComplianceActionBody** `{ action*: ComplianceAction, note: string, dueAt: date? }`
- **ComplianceDetail** `{ row: ComplianceRow, certificates*: Certificate[], indicators: Indicator[], hygieneHistory: Series, actions: Activity[], hygieneScore: number, status: ComplianceStatus, lastInspectionAt: datetime? }`
- **ComplianceRow** `{ merchant*: Ref, merchantCode*: string, logoUrl: url?, category*: Category, city*: string, foodSafety*: CertificateStatus, hygieneScore*: number, hygieneMax*: number, openIndicators*: integer, compliance*: ComplianceStatus, nextExpiry: date?, lastInspectionAt: datetime?, id: string, createdAt: datetime, suspended: boolean, market: Country }`
- **ComplianceSummary** `{ monitored*: integer, compliant*: integer, nonCompliant*: integer, expiringCertificates*: integer, avgHygieneScore*: number, hygieneMax: number }`
- **Consumer** `{ id*: string, name*: string, phone*: string, email*: email, city: string, createdAt: datetime, ordersCount*: integer, rescueScore*: integer, walletBalance: Money, totalSpent: Money, status*: ConsumerStatus, lastOrderAt: datetime?, mealsSaved: integer, co2KgAvoided: number, joinedAt: datetime, preferences: { categories: Category[], dietary: Dietary[] }, language: Language, marketingOptIn: boolean, blockReason: string?, nameI18n: LocalizedText, market: Country }`
- **ConsumerDetail** `{ id*: string, name*: string, phone*: string, email*: email, city: string, createdAt: datetime, ordersCount*: integer, rescueScore*: integer, walletBalance: Money, totalSpent: Money, status*: ConsumerStatus, lastOrderAt: datetime?, mealsSaved: integer, co2KgAvoided: number, joinedAt: datetime, preferences: { categories: Category[], dietary: Dietary[] }, language: Language, marketingOptIn: boolean, blockReason: string?, nameI18n: LocalizedText, recentOrders: OrderSummary[], wallet: Wallet?, notes: Note[], activity: Activity[], market: Country }`
- **ConsumerSummary** `{ totalUsers: integer, active*: integer, inactive*: integer, blocked*: integer, avgRescueScore*: number, total: integer }`
- **ConsumerUpdate** `{ name: string, phone: string, email: email, city: string }`
- **Customer** `{ id*: string, name*: string | LocalizedText, code: string, mobile*: string, email*: email, avatarUrl: url?, createdAt*: datetime, ordersCount*: integer, rescueScore*: integer, status*: ConsumerStatus, lastOrderAt: datetime?, totalSpent: Money, favoriteCategory: Category, city: string, mealsSaved: integer }`
- **CustomerDetail** `{ id*: string, name*: string | LocalizedText, code: string, mobile*: string, email*: email, avatarUrl: url?, createdAt*: datetime, ordersCount*: integer, rescueScore*: integer, status*: ConsumerStatus, lastOrderAt: datetime?, totalSpent: Money, favoriteCategory: Category, city: string, mealsSaved: integer, orders: MerchantOrder[], reviews: Review[] }`
- **CustomerInput** `{ name*: string, code*: string, mobile*: string, email*: email, password: string, confirmPassword: string, avatarFileId: string, status: ConsumerStatus }`
- **CustomerSummary** `{ total*: integer, active*: integer, inactive*: integer, blocked*: integer, avgRescueScore*: number }`
- **DayHours** `{ day*: Weekday, open*: string, close*: string, closed*: boolean }`
- **DayRecord** `{ date*: date, orders*: integer, boxes*: integer, grossSales*: Money, commission*: Money, adjustments*: Money, netEarnings*: Money, payout*: DayPayoutStatus, mealsSaved*: integer, foodKg*: number, co2T*: number, commissionRate: number, payoutId: string? }`
- **DeepLink** `{ route*: string, id: string?, params: object }`
- **Delivery** `{ address: Address?, addressNote: string, assignment*: DriverAssignment, driver: DriverRef? }`
- **DemoReservationInput** `{ listingId*: string, qty: integer, fulfillment: FulfillmentType, customer: string }`
- **DemoReservationResult** `{ order*: MerchantOrder, listing*: { id: string, remaining: integer, reserved: integer, status: ListingStatus } }`
- **DigestToggle** `{ enabled*: boolean, sendAt: string, email: boolean }`
- **Dispute** `{ id*: string, subject*: string | LocalizedText, type: DisputeType, orderId: string?, assignee: UserRef?, status*: DisputeStatus, createdAt*: datetime, updatedAt: datetime, number*: string, customer*: Ref, priority: TicketPriority, tab: DisputeTab, messagesCount: integer }`
- **DisputeDetail** `{ id*: string, subject*: string | LocalizedText, type: DisputeType, orderId: string?, assignee: UserRef?, status*: DisputeStatus, createdAt*: datetime, updatedAt: datetime, number*: string, customer*: Ref, priority: TicketPriority, tab: DisputeTab, messagesCount: integer, messages: TicketMessage[] }`
- **DisputeInput** `{ subject*: string, type*: DisputeType, orderId: string, body*: string, attachmentFileIds: string[] }`
- **DisputeSummary** `{ open*: integer, inProgress*: integer, resolved*: integer, closed: integer, total*: integer }`
- **DocumentInput** `{ type*: CertificateType, fileId*: string, number: string, expiresAt: date }`
- **Driver** `{ id*: string, code: string, name*: string | LocalizedText, phone*: string, vehicle*: VehicleType, plate: string?, licenseNo: string, deliveries*: integer, rating*: number, status*: DriverStatus, branch: Ref?, activeOrders: integer, branchId: string, onTime*: number, compliance: string, certificate: string, certificateExpiry: date?, joinedAt: datetime }`
- **DriverDetail** `{ id*: string, code: string, name*: string | LocalizedText, phone*: string, vehicle*: VehicleType, plate: string?, licenseNo: string, deliveries*: integer, rating*: number, status*: DriverStatus, branch: Ref, activeOrders: integer, branchId: string, onTime*: number, compliance: string, certificate: string, certificateExpiry: date?, joinedAt: datetime, orders: MerchantOrder[], activity: Activity[] }`
- **DriverInput** `{ name*: string, phone*: string, vehicle*: VehicleType, licenseNo*: string, plate: string, branchId*: string, status: DriverStatus, photoFileId: string, certificateExpiry: date, certificate: string }`
- **DriverRef** `{ id*: string, name*: string, vehicle*: VehicleType, phone: string }`
- **DriverSummary** `{ total*: integer, available*: integer, onDelivery*: integer, offline*: integer, avgOnTime*: number }`
- **Drop** `{ id*: string, code: string, title*: string | LocalizedText, imageUrl: url?, merchant*: Ref, branch*: Ref, category*: Category, dietary*: Dietary[], city*: string, price*: Money, originalPrice*: Money, discountPct*: number, quantity*: integer, reserved*: integer, collected: integer, remaining*: integer, pickupWindow*: TimeWindow, date*: date, status*: DropStatus, flagged*: boolean, flagReason: string?, createdAt*: datetime, updatedAt: datetime, thumb: string, merchantId: string, branchId: string, flagNote: string?, description: string, allergens: string[], titleI18n: LocalizedText, descriptionI18n: LocalizedText, market: Country }`
- **DropAccuracyCard** `{ value*: number, delta: number, deltaUnit: DeltaUnit, period*: PeriodPreset, series*: Series }`
- **DropDetail** `{ id*: string, code: string, title*: string | LocalizedText, imageUrl: url?, merchant*: Ref, branch*: Ref, category*: Category, dietary*: Dietary[], city*: string, price*: Money, originalPrice*: Money, discountPct*: number, quantity*: integer, reserved*: integer, collected: integer, remaining*: integer, pickupWindow*: TimeWindow, date*: date, status*: DropStatus, flagged*: boolean, flagReason: string?, createdAt*: datetime, updatedAt: datetime, thumb: string, merchantId: string, branchId: string, flagNote: string?, description: string, allergens: string[], titleI18n: LocalizedText, descriptionI18n: LocalizedText, reservations: OrderSummary[], activity: Activity[], market: Country }`
- **DropSummary** `{ totalDrops*: integer, bagsAvailableNow*: integer, reserved*: integer, collected*: integer, flaggedForReview*: integer }`
- **DropUpdate** `{ title: LocalizedText, category: Category, dietary: Dietary[], price: Money, originalPrice: Money, quantity: integer, pickupWindow: TimeWindow, date: date, status: DropStatus, description: LocalizedText }`
- **EarningsSplit** `{ key*: enum(netEarnings|commission|adjustments), label*: string, pct*: number }`
- **EarningsSummary** `{ grossSales*: Money, commission*: Money, refundAdjustments*: Money, netEarnings*: Money, paidToDate*: Money, pendingPayout*: Money, nextPayoutDate: date?, split*: EarningsSplit[], commissionRate: number }`
- **EntityRef** `{ type*: enum(drop|order|pickup|listing|review|consumer|merchant|ticket), id*: string, name*: string }`
- **EnumCatalog** `{ enums*: object }`
- **Error** `{ error*: { code: enum(validation_error|unauthorized|forbidden|not_found|conflict|policy_violation|rate_limited|internal), message: string, details: object } }`
- **EscalateBody** `{ to*: enum(trust_safety|operations_lead|legal|finance|super_admin), note: string, raiseSeverity: boolean }`
- **ExportJob** `{ id*: string, resource*: string, format*: ExportFormat, status*: ExportStatus, progress*: number, rows: integer, fileName: string, downloadUrl: url?, createdAt*: datetime, expiresAt: datetime }`
- **ExportRequest** `{ resource*: string, format*: ExportFormat, scope*: ExportScope, columns: string[], filters: object, from: datetime, to: datetime, branchId: string }`
- **Faq** `{ id*: string, question*: LocalizedText, answer*: LocalizedText, category*: string, audience*: enum(consumers|merchants|all), order*: integer, status*: CmsStatus, updatedAt*: datetime }`
- **FaqInput** `{ question*: LocalizedText, answer*: LocalizedText, category*: string, audience*: enum(consumers|merchants|all), order: integer, status: enum(draft|published) }`
- **FilterOption** `{ value*: string, label: LocalizedText, country: Country, city: string, category: Category, branches: FilterOption[] }`
- **FinancialFilterOptions** `{ countries*: FilterOption[], cities*: FilterOption[], categories*: FilterOption[], merchants*: FilterOption[], orderTypes*: FilterOption[] }`
- **FinancialsDashboard** `{ kpis*: Kpi[], revenueSnapshot*: RevenueSnapshot, gmvTrend*: TrendCard, revenueTrend*: TrendCard, payoutsSettlements*: Kpi[], refundsAdjustments*: Kpi[], monthlyTrends*: Series[], unitEconomics*: UnitEconomics, currency: Currency }`
- **FlagBody** `{ reason*: string, severity: Severity, note: string }`
- **FunnelCard** `{ steps*: FunnelStep[], conversionLabel*: string, conversion*: number, delta: number, period: PeriodPreset }`
- **FunnelStep** `{ key*: string, label*: string, value*: integer, rate: number }`
- **FxRate** `{ currency*: Currency, rate*: number }`
- **FxSettings** `{ reportingCurrency*: Currency, base: Currency, rates*: FxRate[], updatedAt: datetime, updatedBy: string }`
- **FxUpdate** `{ reportingCurrency*: Currency, rates*: FxRate[] }`
- **GeneralSettings** `{ platformName*: string, supportEmail: email, timezone*: string, defaultCurrency*: Currency, defaultLanguage: Language, countries: Country[], commissionRate: number, pickupWindowMinutes: integer, reservationHoldMinutes: integer, autoCancelUnclaimed*: boolean, requirePickupPassport*: boolean, allowMerchantSelfOnboarding*: boolean }`
- **HelpContent** `{ faqs*: Faq[], contact*: object[] }`
- **HelpRequest** `{ id*: string, name: string, phoneCountry: string, phone: string, description: string, status*: TicketStatus, createdAt*: datetime, number*: string, subject*: LocalizedText, topic: string, updatedAt: datetime, repliesCount: integer, lastReply: object }`
- **HelpRequestInput** `{ name*: string, phoneCountry*: string, phone*: string, description*: string, topic: string, attachmentFileIds: string[] }`
- **HoursBody** `{ hours*: DayHours[] }`
- **HygieneScoreBody** `{ score*: number, max: number, inspectedAt*: datetime, note: string }`
- **ImageOrder** `{ imageIds*: string[] }`
- **ImpactSummary** `{ period*: string, mealsSaved*: integer, co2Tonnes*: number, waterLitres*: number, foodKg: number }`
- **ImportError** `{ row*: integer, field: string, message*: string }`
- **ImportJob** `{ id*: string, resource*: string, status*: ImportStatus, total: integer, processed*: integer, failed*: integer, errors: ImportError[], createdAt*: datetime }`
- **ImportRequest** `{ resource*: enum(merchant.orders|merchant.customers|merchant.listings), fileId*: string, dryRun: boolean, branchId: string }`
- **Indicator** `{ key*: string, label*: string, count*: integer, severity*: Severity, open*: boolean }`
- **InvalidTransitionDetails** `{ from*: OrderStatus, to*: OrderStatus, allowed: OrderStatus[], requires: string? }`
- **InventoryStatusCard** `{ totalBags*: integer, segments*: Segment[] }`
- **InviteBody** `{ email*: email, name*: string, role*: Role, message: string }`
- **IssueAlertRow** `{ id*: string, type*: string, merchant*: Ref, status*: string, createdAt*: datetime }`
- **IssueCount** `{ key*: string, label*: string, count*: integer }`
- **IssueCredit** `{ consumerIds*: string[], amount*: Money, source*: WalletSource, reason*: string, expiresAt: date?, notify: boolean }`
- **Kpi** `{ key*: string, label*: string, value*: number | Money, format: KpiFormat, currency: Currency, delta: number, deltaUnit: DeltaUnit, trend: Trend, comparison: string, caption: string, sparkline: number[], badge: string, deltaDirection: Trend, hint: string }`
- **LanguageSetting** `{ language*: Language }`
- **Listing** `{ id*: string, title*: LocalizedText, shortDescription: LocalizedText, description: LocalizedText, category*: Category, listingType: ListingType, availability: Availability, dietary*: Dietary[], allergens: string[], branch*: Ref, address: LocalizedText, city: string, state: LocalizedText, zip: string, lat: number?, lng: number?, images: ListingImage[], price*: Money, originalPrice*: Money, discountPct: number, quantity*: number, unit: enum(bag|box|kg|item|portion), remaining*: number, pickupWindow*: TimeWindow, days: Weekday[], status*: ListingStatus, stockStatus: StockStatus, forceDisabled: boolean, settings: ListingSettings, stats: ListingStats, templateId: string?, activity: Activity[], createdAt*: datetime, updatedAt: datetime, thumb: string, imageUrl: string?, merchantId: string, branchId: string, titleI18n: LocalizedText, reserved*: integer, collected*: integer, market: Country, date: date, flagged: boolean, moderation: object }`
- **ListingDetail** `{ listing*: Listing, activity*: Activity[], stats*: Kpi[] }`
- **ListingImage** `{ id*: string, url: url?, fileId: string?, isCover: boolean, order: integer, tone: integer }`
- **ListingInput** `{ title*: LocalizedText, shortDescription*: LocalizedText, description*: LocalizedText, category*: Category, listingType*: ListingType, availability*: Availability, dietary: Dietary[], allergens: string[], branchId: string, address*: LocalizedText, city*: string, state*: LocalizedText, zip*: string, lat: number, lng: number, images: ListingImage[], imageFileIds: string[], price*: Money, originalPrice: Money, quantity: number, unit: string, pickupWindow: TimeWindow, days: Weekday[], settings: ListingSettings, status: ListingStatus, templateId: string? }`
- **ListingSettings** `{ publish*: boolean, featured*: boolean, allowNegotiation*: boolean, expiresOn: datetime? }`
- **ListingStats** `{ sold*: integer, revenue*: Money, views: integer }`
- **ListingSummary** `{ active*: integer, forceDisabled: integer, soldOut*: integer, total*: integer, disabled: integer, paused: integer }`
- **LiveDropRow** `{ dropId*: string, title*: string, imageUrl: url?, merchant*: Ref, location*: string, pickupWindow*: TimeWindow, status*: DropStatus, reserved*: integer, pickedUp*: integer }`
- **LocalizedText** `{ en*: string, ar*: string }`
- **LoginRequest** `{ email*: email, password*: string, portal*: Portal, remember: boolean }`
- **LoginResponse** `{ requires2fa*: boolean, challengeId: string?, sentTo: string?, accessToken: string, refreshToken: string, expiresIn: integer, user: User }`
- **Market** `{ code*: Country, name*: LocalizedText, currency*: Currency, currencyName: LocalizedText, currencyLabel*: LocalizedText, phoneCode*: string, phoneLength: integer, phonePlaceholder: string, supportPhone: string, supportPhoneLabel: string, timeZone*: string, utcOffset: string, locale: string, flag: string, vatRate*: number, enabled*: boolean, launchedAt: date?, cities*: MarketCity[], supportEmail*: email, merchantSupportEmail: email, supportWhatsApp: string, supportHours: LocalizedText }`
- **MarketCity** `{ id*: string, name*: LocalizedText, enabled: boolean }`
- **MarketCityInput** `{ name*: LocalizedText, enabled: boolean }`
- **MarketCityUpdate** `{ name: LocalizedText, enabled: boolean }`
- **MarketList** `{ data*: Market[], meta: { reportingCurrency: Currency, fx: { rates: FxRate[], updatedAt: datetime } } }`
- **MarketMeta** `{ scope*: Country[], converted*: boolean, reportingCurrency*: Currency }`
- **MarketUpdate** `{ enabled: boolean, timeZone: string, phoneCode: string, vatRate: number, locale: string, supportEmail: email, merchantSupportEmail: email, supportWhatsApp: string, supportHours: LocalizedText, supportPhone: string }`
- **Merchant** `{ id*: string, code: string, name*: string | LocalizedText, logoUrl: url?, category*: Category, description: LocalizedText, legal: MerchantLegal, contact*: MerchantContact, address: Address, banking: Banking, commissionRate*: number, status*: MerchantStatus, statusReason: string?, qualityScore: number?, rating: number, branchesCount: integer, joinedAt*: datetime, verifiedAt: datetime?, nameI18n: LocalizedText, thumb: string, city: string, country: Country, dropsCount: integer, activeListings: integer, ordersCount: integer, revenue: Money, complianceStatus: ComplianceStatus, business: MerchantLegal, commissionSource: CommissionSource, source: enum(admin|self_signup) }`
- **MerchantComplianceTab** `{ hygieneScore*: number, status*: ComplianceStatus, lastInspectionAt: datetime?, certificates*: Certificate[] }`
- **MerchantContact** `{ ownerName*: string, email*: email, phone*: Phone }`
- **MerchantContext** `{ merchantId*: string, name*: string, logoUrl: url?, verified: boolean, defaultBranchId: string, branches*: BranchOption[], currency*: Currency, country*: Country, timeZone*: string }`
- **MerchantContract** `{ merchantId*: string, commissionRate*: number, contract: CommissionPeriod?, platformDefault*: number }`
- **MerchantContractUpdate** `{ commissionRate: number?, effectiveFrom: date }`
- **MerchantCreate** `{ business*: { name: LocalizedText, category: Category, description: LocalizedText, logoFileId: string }, legal*: MerchantLegal, contact*: MerchantContact, address*: Address, branches: BranchInput[], banking*: Banking, documents: DocumentInput[], commissionRate*: number, sendInvite: boolean, location: Address }`
- **MerchantDetailOverview** `{ kpis*: Kpi[], salesTrend: Series, ratingSummary: RatingSummary, openCases: integer, complianceStatus: ComplianceStatus, ordersTrend: Series }`
- **MerchantImpactRow** `{ merchant*: Ref, mealsSaved*: integer, foodKg*: number, co2Tonnes*: number, waterLitres: number, city: LocalizedText? }`
- **MerchantLegal** `{ legalName*: string, tradeLicenseNo*: string, vatNo: string, licenseExpiresAt: date }`
- **MerchantListSummary** `{ pendingVerification*: integer, verifiedActive*: integer, suspended*: integer, avgQualityScore*: number, totalMerchants*: integer }`
- **MerchantOrder** `{ id*: string, number*: string, customer*: Ref, bag*: LocalizedText, bagImageUrl: url?, fulfillment*: FulfillmentType, delivery: Delivery?, pickupWindow*: TimeWindow, status*: OrderStatus, branch*: Ref, pickupCode: string?, listingId: string, total*: Money, driver: DriverRef?, createdAt*: datetime, deliveryAddress: LocalizedText?, timeline: OrderEvent[], allowedActions*: OrderAction[], active*: boolean, merchantId: string, branchId: string, dropId: string, consumerId: string, pickupDate: date, pickupId: string?, updatedAt: datetime, completedAt: datetime?, historical: boolean, cancelReason: string?, refund: object, paymentStatus: PaymentStatus, paymentMethod: object, fees: Money, items: OrderItem[], city: string, category: Category, dietary: Dietary[], market: Country }`
- **MerchantOrderDetail** `{ id*: string, number*: string, customer*: Ref, bag*: LocalizedText, bagImageUrl: url?, fulfillment*: FulfillmentType, delivery: Delivery?, pickupWindow*: TimeWindow, status*: OrderStatus, branch*: Ref, pickupCode: string?, listingId: string, total*: Money, driver: DriverRef?, createdAt*: datetime, deliveryAddress: LocalizedText?, timeline: OrderEvent[], items: OrderItem[], payment: PaymentInfo, availableDrivers: DriverRef[], allowedActions*: OrderAction[], active*: boolean, merchantId: string, branchId: string, dropId: string, consumerId: string, pickupDate: date, pickupId: string?, updatedAt: datetime, completedAt: datetime?, historical: boolean, cancelReason: string?, refund: object, paymentStatus: PaymentStatus, paymentMethod: object, fees: Money, city: string, category: Category, dietary: Dietary[], market: Country }`
- **MerchantOrderSummary** `{ total*: integer, readyForPickup*: integer, outForDelivery*: integer, awaitingDriver*: integer, activeDrivers*: integer, active: integer }`
- **MerchantOverview** `{ greetingName*: string, kpis*: Kpi[], salesOverview*: SalesOverviewCard, topSellingBags*: TopBag[], recentOrders*: RecentOrderRow[], inventoryStatus*: InventoryStatusCard, operationalStatus*: OperationalStatus, reviews*: RatingSummary, alerts*: Notification[], range: { from: date, to: date } }`
- **MerchantPerformanceDetail** `{ row*: MerchantPerformanceRow, kpis*: Kpi[], onTimeTrend*: Series, issues*: IssueCount[], city: string, category: Category }`
- **MerchantPerformanceRow** `{ merchant*: Ref, qualityScore*: number, trend*: number[], onTimePct*: number, status*: QualityBadge, fulfilmentRate: number, rating: number, orders: integer, id*: string, name: string, city: string, category: Category, market: Country }`
- **MerchantProfile** `{ firstName*: string, lastName: string, email*: email, phoneCountry: string, phone: string, avatarUrl: url?, avatarFileId: string? }`
- **MerchantQualityRow** `{ merchant*: Ref, score*: number, sparkline*: number[], badge*: QualityBadge }`
- **MerchantSecurity** `{ businessEmail*: email, twoFactor: boolean, lastPasswordChangeAt: datetime? }`
- **MerchantSecurityInput** `{ businessEmail: email, currentPassword: string, newPassword: string, confirmPassword: string }`
- **MerchantSecurityResult** `{ businessEmail*: email, twoFactor: boolean, lastPasswordChangeAt: datetime?, verificationSent*: boolean, sentTo: email }`
- **MerchantSummary** `{ id*: string, code: string, name*: string | LocalizedText, logoUrl: url?, category*: Category, city*: string, country*: Country, qualityScore: number?, dropsCount*: integer, revenue*: Money, commissionRate*: number, status*: MerchantStatus, complianceStatus: ComplianceStatus, joinedAt*: datetime, nameI18n: LocalizedText, thumb: string, rating: number, branchesCount: integer, activeListings: integer, ordersCount: integer, currency: Currency, commissionSource: CommissionSource, source: enum(admin|self_signup) }`
- **MerchantUpdate** `{ name: LocalizedText, category: Category, description: LocalizedText, legal: MerchantLegal, contact: MerchantContact, address: Address, banking: Banking, commissionRate: number }`
- **MessageAuthor** `{ type*: enum(agent|consumer|merchant|system), id: string, name*: string }`
- **MessageBody** `{ body*: string, attachmentFileIds: string[], internal: boolean, attachments: Attachment[] }`
- **ModerationDecision** `{ reason: string, action: enum(none|hide_content|remove_listing|warn_user|suspend_user|suspend_merchant), note: string }`
- **ModerationDetail** `{ id*: string, type*: ModerationType, reason*: string, reporter*: ReporterSource | string, severity*: Severity, status*: CaseStatus, reportsCount: integer, preview: ModerationPreview?, assignee: UserRef?, item*: string, createdAt*: datetime, content: string?, autoScore: number?, assigneeId: string?, decision: enum(approved|rejected), ageMinutes*: integer, notes: Note[], activity: Activity[] }`
- **ModerationItem** `{ id*: string, type*: ModerationType, reason*: string, reporter*: ReporterSource | string, severity*: Severity, status*: CaseStatus, reportsCount: integer, preview: ModerationPreview?, assignee: UserRef?, item*: string, createdAt*: datetime, content: string?, autoScore: number?, assigneeId: string?, decision: enum(approved|rejected), ageMinutes*: integer }`
- **ModerationPreview** `{ text: string?, imageUrls: url[] }`
- **ModerationSummary** `{ pendingReview*: integer, autoFlaggedToday*: integer, escalated*: integer, resolvedToday*: integer, resolvedDeltaVsYesterday: integer, byType: { all: integer, listing: integer, review: integer, user: integer, merchant_profile: integer } }`
- **Note** `{ id*: string, body*: string, author*: UserRef, createdAt*: datetime }`
- **NoteBody** `{ body*: string }`
- **Notification** `{ id*: string, type*: NotificationType, title*: string, body: string, severity: Severity, link: DeepLink, read*: boolean, createdAt*: datetime }`
- **NotificationSettings** `{ alerts*: AlertSetting[] }`
- **Ok** `{ ok*: boolean }`
- **OperatingHours** `{ branchId*: string, hours*: DayHours[], branches: BranchOption[], timeZone: string }`
- **OperationalStatus** `{ branch*: Ref, state*: BranchState, caption*: string, todayHours*: TimeWindow, pickupWindow*: TimeWindow }`
- **OperationsAnalytics** `{ kpis*: Kpi[], operationalTrends*: TrendCard, fulfilmentFunnel*: FunnelCard, marketplaceHealth*: Kpi[], pickupCancellationHealth*: Kpi[], qualitySignals*: Kpi[], dropAccuracyTrend*: TrendCard, operationsSummary*: Kpi[] }`
- **Order** `{ id*: string, number*: string, consumer*: Ref, merchant*: Ref, branch*: Ref, items*: OrderItem[], subtotal: Money, fees: Money, discount: Money, walletCreditUsed: Money, voucherCode: string?, total*: Money, refunded: Money, payment: PaymentInfo, fulfillment*: FulfillmentType, delivery: Delivery?, pickupWindow*: TimeWindow, pickupCode: string?, status*: OrderStatus, timeline*: OrderEvent[], placedAt: datetime, updatedAt: datetime, consumerId: string, merchantId: string, branchId: string, dropId: string, city: string, category: Category, dietary: Dietary[], paymentStatus: PaymentStatus, paymentMethod: { brand: CardBrand?, last4: string?, type: PaymentMethodType }, pickupId: string?, refund: OrderRefund?, createdAt: datetime, thumb: string, market: Country, allowedActions*: OrderAction[], active*: boolean, listingId: string, pickupDate: date, completedAt: datetime?, historical: boolean, cancelReason: string?, driver: DriverRef?, deliveryAddress: LocalizedText? }`
- **OrderEvent** `{ status*: OrderStatus, at*: datetime, by: string }`
- **OrderItem** `{ listingId*: string, title*: string, qty*: integer, unitPrice*: Money, originalPrice: Money }`
- **OrderListSummary** `{ totalOrders*: integer, revenue*: Money, avgOrderValue*: Money, refundedCancelled*: integer, pendingConfirmation*: integer }`
- **OrderRefund** `{ amount*: Money, reason*: RefundReason, reasonLabel: LocalizedText, outcome*: RefundOutcome, destination: RefundDestination, note: string, at*: datetime, by: string }`
- **OrderSummary** `{ id*: string, number*: string, bagTitle: string, consumer*: Ref, merchant*: Ref, branch*: Ref, city*: string, amount: Money, payment: PaymentInfo, fulfillment*: FulfillmentType, delivery: Delivery?, pickupWindow*: TimeWindow, status*: OrderStatus, placedAt: datetime, consumerId: string, merchantId: string, branchId: string, dropId: string, category: Category, dietary: Dietary[], items: OrderItem[], fees: Money, total: Money, paymentStatus: PaymentStatus, paymentMethod: { brand: CardBrand?, last4: string?, type: PaymentMethodType }, pickupCode: string?, pickupId: string?, refund: OrderRefund?, timeline: OrderEvent[], createdAt: datetime, thumb: string, market: Country, allowedActions*: OrderAction[], active*: boolean, listingId: string, pickupDate: date, updatedAt: datetime, completedAt: datetime?, historical: boolean, cancelReason: string?, driver: DriverRef?, deliveryAddress: LocalizedText? }`
- **OtpVerify** `{ challengeId*: string, code*: string, trustDevice: boolean }`
- **PartnerFeedback** `{ rating*: integer, body*: string, topic: string }`
- **PassportMonitoring** `{ total*: integer, segments*: Segment[], attentionCount*: integer }`
- **PasswordChange** `{ currentPassword*: string, newPassword*: string, confirmPassword*: string }`
- **PasswordChangeResult** `{ verificationSentTo*: email }`
- **PaymentInfo** `{ method*: PaymentMethodType, brand: CardBrand?, last4: string?, status*: PaymentStatus, transactionId: string }`
- **Payout** `{ id*: string, merchant: Ref, periodFrom: date, periodTo: date, gross*: Money, commission*: Money, fees*: Money, refunds: Money, adjustments: Money, net*: Money, status*: PayoutStatus, scheduledAt: datetime?, paidAt: datetime?, reference: string?, failureReason: string?, merchantId: string, period: { from: date, to: date }, market: Country, orders: integer, commissionRate: number, source: enum(orders) }`
- **PayoutDetail** `{ payout*: Payout, lines*: PayoutLine[], activity*: Activity[] }`
- **PayoutLine** `{ date*: date, orders*: integer, gross*: Money, commission*: Money, net*: Money }`
- **PerformanceDashboard** `{ kpis*: Kpi[], dropAccuracy*: Series, fulfilmentFunnel*: FunnelCard, ranking*: MerchantPerformanceRow[] }`
- **PerformanceReport** `{ title*: string, period*: string, sections*: ReportSection[], generatedAt*: datetime }`
- **Phone** `{ countryCode*: string, number*: string }`
- **Pickup** `{ id*: string, code*: string, orderId*: string, bagTitle: string, consumer*: Ref, merchant*: Ref, branch*: Ref, city*: string, window*: TimeWindow, date: date, passportCode: string, status*: PickupStatus, verifiedAt: datetime?, verifiedBy: UserRef?, consumerId: string, merchantId: string, branchId: string, dropId: string, category: Category, dietary: Dietary[], flagReason: string?, quantity: integer, createdAt: datetime, codeMasked: string, bag: { id: string, title: string, thumb: string }, market: Country, expiresAt*: datetime, usedAt: datetime? }`
- **PickupDetail** `{ id*: string, code*: string, orderId*: string, bagTitle: string, consumer*: Ref, merchant*: Ref, branch*: Ref, city*: string, window*: TimeWindow, date: date, passportCode: string, status*: PickupStatus, verifiedAt: datetime?, verifiedBy: UserRef?, consumerId: string, merchantId: string, branchId: string, dropId: string, category: Category, dietary: Dietary[], flagReason: string?, quantity: integer, createdAt: datetime, codeMasked: string, bag: { id: string, title: string, thumb: string }, order: OrderSummary, activity: Activity[], market: Country, expiresAt: datetime, usedAt: datetime? }`
- **PickupSummary** `{ totalToday*: integer, completed*: integer, upcomingReady*: integer, missed*: integer, onTimeRatePct*: number }`
- **PickupVerifyInput** `{ code*: string, orderId: string, branchId: string }`
- **PickupVerifyResult** `{ valid*: boolean, order*: MerchantOrder, pickup*: { id: string, orderId: string, status: PickupStatus, usedAt: datetime, expiresAt: datetime } }`
- **Policy** `{ key*: PolicyKey, title*: LocalizedText, content*: LocalizedText, config: RefundPolicyConfig?, updatedAt*: datetime, updatedBy: UserRef, live: boolean }`
- **PolicyInput** `{ content*: LocalizedText, config: RefundPolicyConfig }`
- **PolicyListItem** `{ key*: PolicyKey, title*: LocalizedText, updatedAt*: datetime, live: boolean, hasContent: boolean }`
- **PolicyReason** `{ key*: RefundReason, label*: LocalizedText, outcome*: RefundOutcome }`
- **PresignRequest** `{ fileName*: string, contentType*: string, size*: integer, purpose*: UploadPurpose }`
- **PresignResponse** `{ fileId*: string, uploadUrl*: url, method*: enum(PUT|POST), headers: object, fileUrl*: url, expiresAt*: datetime }`
- **PriorityAlert** `{ id*: string, title*: string, type*: AlertType, severity*: Severity, source: string, subtitle: string, link: DeepLink, createdAt*: datetime }`
- **Product** `{ id*: string, name*: LocalizedText, category*: Category, description*: LocalizedText, images*: ListingImage[], price*: Money, quantity*: integer, listingId: string?, branchId: string, templateId: string?, createdAt*: datetime }`
- **ProductInput** `{ name*: LocalizedText, category*: Category, description*: LocalizedText, images: ListingImage[], imageFileIds: string[], price*: Money, quantity*: integer, branchId: string, templateId: string?, saveAsTemplate: boolean }`
- **ProfileUpdate** `{ firstName: string, lastName: string, email: email, phone: Phone, avatarFileId: string?, language: Language, theme: enum(night|day) }`
- **RatingBucket** `{ stars*: integer, count*: integer }`
- **RatingSummary** `{ average*: number, total: integer, count: integer, distribution*: RatingBucket[], replied: integer, reported: integer, removed: integer }`
- **ReasonBody** `{ reason: string, notify: boolean, note: string, refund: boolean }`
- **RecentOrderRow** `{ id*: string, number*: string, customerName*: string, itemsSold: integer, status*: OrderStatus, amount*: Money, placedAt*: datetime }`
- **Ref** `{ id*: string, name*: string | LocalizedText }`
- **Refund** `{ id*: string, order*: Ref, consumer*: Ref, merchant*: Ref, amount*: Money, reason*: RefundReason, outcome: RefundOutcome, destination*: RefundDestination, status*: RefundStatus, requestedAt*: datetime, processedAt: datetime?, processedBy: UserRef?, merchantId: string, market: Country }`
- **RefundEligibility** `{ eligible*: boolean, maxAmount*: Money, suggestedOutcome: RefundOutcome, policyRule: RefundRule, freeCancellationHours: integer, requiresApproval: boolean, reasons*: string[], hoursSincePlaced: number, hoursToWindow: number, insideCancellationDeadline: boolean, collected: boolean, policy: { key: PolicyKey, version: string, freeCancellationHours: integer, refundDestinationDefault: RefundDestination }, outcomes: PolicyReason[] }`
- **RefundPolicyConfig** `{ key: string, version: string, freeCancellationHours*: integer, refundDestinationDefault*: RefundDestination, outcomes: RefundOutcome[], reasons*: PolicyReason[] }`
- **RefundRequest** `{ reason*: RefundReason, amount*: Money, destination: RefundDestination, note: string, approved: boolean, overridePolicy: boolean, outcome: RefundOutcome, toWallet: boolean }`
- **RefundRule** `{ reason*: RefundReason, outcome*: RefundOutcome }`
- **RegionImpact** `{ region*: string, mealsSaved*: integer, share: number, co2Tonnes: number, foodKg: number, key: string }`
- **ReportSection** `{ key*: string, title*: string, kpis: Kpi[], series: Series[], rows: object[] }`
- **ResolveBody** `{ resolution*: string, note: string, notifyReporter: boolean }`
- **RevenueSnapshot** `{ metrics*: Kpi[], composition*: Segment[], centerValue*: Money, period: PeriodPreset }`
- **Review** `{ id*: string, rating*: integer, body*: LocalizedText, reply: ReviewReply?, status*: ReviewStatus, report: ReviewReport?, createdAt*: datetime, customer*: Ref, listing: { id: string, title: string }, helpful: integer }`
- **ReviewBody** `{ body*: string }`
- **ReviewReply** `{ body*: LocalizedText, author: UserRef, at*: datetime }`
- **ReviewReport** `{ reason*: enum(abusive|spam|fake|off_topic|other), note: string }`
- **RoleCard** `{ role*: Role, label*: LocalizedText, description*: LocalizedText, usersCount*: integer, permissions*: string[] }`
- **SalesAnalytics** `{ kpis*: Kpi[], salesPerformance*: Series[], surplusRecovery*: SurplusRecovery, topOffers*: TopOffer[], ordersPickups*: { reserved: integer, collected: integer, completionRate: number, customerCancellations: integer, merchantCancellations: integer, noShows: integer, refunds: integer }, earnings*: EarningsSummary, customerInsights*: { newCustomers: integer, returningCustomers: integer, repeatRate: number, avgRating: number, reviews: integer }, impact*: { mealsSaved: integer, foodKgSaved: number, co2TAvoided: number, foodWasteValueSaved: Money }, period*: PeriodPreset, days*: DayRecord[], daysTotal: integer, from: date, to: date, commissionRate: number }`
- **SalesOverviewCard** `{ total*: Money, delta*: number, comparison*: string, period*: PeriodPreset, series*: Series }`
- **ScheduleBody** `{ publishAt*: datetime, unpublishAt: datetime? }`
- **SearchGroup** `{ type*: SearchScope, label*: string, total*: integer, items*: SearchItem[] }`
- **SearchItem** `{ id*: string, title*: string, subtitle: string, link*: DeepLink }`
- **SearchResult** `{ groups*: SearchGroup[] }`
- **SecuritySettings** `{ require2fa*: boolean, sso*: boolean, sessionTimeoutMinutes*: integer, auditLog*: boolean, auditRetentionDays: integer, auditExportRange: AuditExportRange, passwordPolicy: { minLength: integer, requireSymbol: boolean }, ipAllowlist: string[] }`
- **Segment** `{ key*: string, label*: string, value*: number, share: number }`
- **Series** `{ key*: string, label*: string, kind: enum(line|bar|area), unit: KpiFormat, points*: SeriesPoint[] }`
- **SeriesPoint** `{ x*: string, y*: number }`
- **SignupRequest** `{ businessName*: LocalizedText, ownerFirstName*: string, ownerLastName*: string, email*: email, phone*: Phone, password*: string, country*: Country, city*: string, category*: Category, tradeLicenseNo: string, acceptTerms*: boolean }`
- **SignupResponse** `{ merchantId*: string, status*: MerchantStatus, challengeId*: string }`
- **StoreInfo** `{ name*: LocalizedText, address*: LocalizedText, logoUrl: url?, category*: Category, description: LocalizedText }`
- **StoreInfoInput** `{ name: LocalizedText, address: LocalizedText, logoFileId: string, category: Category, description: LocalizedText }`
- **StreamEnvelope** `{ id*: string, type*: StreamEvent, occurredAt*: datetime, data*: object }`
- **SupportDashboard** `{ kpis*: { openTickets: integer, unassigned: integer, avgFirstResponseMinutes: number, firstResponseSlaMinutes: integer, avgResolutionHours: number, resolutionDeltaMinutes: number, csat: number, csatScale: integer, csatPeriodDays: integer }, responseTrend*: Series, byChannel*: ChannelCount[], byPriority*: { all: integer, urgent: integer, high: integer, medium: integer, low: integer } }`
- **SupportSummary** `{ all*: integer, urgent*: integer, high*: integer, medium*: integer, low*: integer, unassigned: integer }`
- **SurplusRecovery** `{ recoveryRate*: number, listed*: integer, sold*: integer, unsold*: integer, recoveredRevenue*: Money, retailValueSaved*: Money }`
- **SustainabilityBreakdown** `{ byCity*: RegionImpact[], byMerchant*: MerchantImpactRow[], byCategory*: Segment[], monthly*: Series[], groupBy: enum(city|merchant|category|month) }`
- **SustainabilityDashboard** `{ hero*: Kpi[], equivalentText: string, mealsSavedTrend*: Series, impactByCategory*: Segment[], impactByRegion*: RegionImpact[], equivalentCars*: integer }`
- **SustainabilityTiles** `{ mealsSaved*: Kpi, co2Offset*: Kpi, waterSaved*: Kpi, wasteDiverted*: Kpi, equivalentCarMiles: integer, equivalentText: string }`
- **Template** `{ id*: string, name*: LocalizedText, category*: Category, description: LocalizedText, icon: string, fields: TemplateField[], defaults*: TemplateDefaults, merchantId: string?, usedByMerchants: integer, usageCount*: integer, status*: TemplateStatus, updatedAt*: datetime, source*: TemplateSource, createdBy: Ref, suggestedPrice: Money }`
- **TemplateDefaults** `{ title: LocalizedText, category: Category, quantity: integer, pickupWindow: TimeWindow, suggestedPrice: Money, originalPrice: Money, dietary: Dietary[], allergenNote: LocalizedText, instructions: LocalizedText, days: Weekday[], name: LocalizedText, description: LocalizedText, price: number }`
- **TemplateField** `{ key*: string, label*: LocalizedText, type*: TemplateFieldType, required: boolean, options: string[] }`
- **TemplateInput** `{ name*: LocalizedText, category*: Category, description: LocalizedText, icon: string, fields*: TemplateField[], defaults: TemplateDefaults, status: TemplateStatus, quantity: integer, suggestedPrice: Money }`
- **TemplateSummary** `{ total*: integer, categories*: integer, active*: integer, drafts*: integer, mostUsed*: TemplateUsage?, byCategory: CategoryCount[] }`
- **TemplateUsage** `{ id*: string, name*: LocalizedText, usageCount*: integer }`
- **Ticket** `{ id*: string, requester*: TicketRequester, subject*: string, channel*: TicketChannel, priority*: TicketPriority, status*: TicketStatus, assignee: UserRef?, createdAt*: datetime, lastMessageAt: datetime, category: string, assigneeId: string?, relatedOrderId: string?, messageCount: integer, ageMinutes*: integer, market: Country }`
- **TicketDetail** `{ id*: string, requester*: TicketRequester, subject*: string, channel*: TicketChannel, priority*: TicketPriority, status*: TicketStatus, assignee: UserRef?, createdAt*: datetime, lastMessageAt: datetime, category: string, assigneeId: string?, relatedOrderId: string?, messageCount: integer, ageMinutes*: integer, messages: TicketMessage[], activity: Activity[], market: Country }`
- **TicketMessage** `{ id*: string, author: MessageAuthor, body*: string | LocalizedText, attachments: Attachment[], internal: boolean, createdAt: datetime, from: { id: string, name: string }, role: enum(customer|merchant|support|agent|system), at: datetime }`
- **TicketRequester** `{ type*: enum(consumer|merchant), id*: string, name*: string, email: email }`
- **TicketUpdate** `{ status: TicketStatus, priority: TicketPriority, assigneeId: string? }`
- **TimeWindow** `{ start*: string, end*: string, date: date }`
- **TopBag** `{ rank*: integer, listing*: Ref, imageUrl: url?, sold*: integer, revenue*: Money }`
- **TopOffer** `{ imageUrl: url?, sold*: integer, revenue*: Money, id*: string, title*: LocalizedText, sellThrough*: number, tone: integer }`
- **TrendCard** `{ series*: Series[], totals*: Kpi[], granularity: Granularity, currency: Currency, week: { from: date, to: date } }`
- **UnitEconomics** `{ metrics*: Kpi[] }`
- **User** `{ id: string, firstName: string, lastName: string, name: string, email*: email, phone: Phone, avatarUrl: url?, role: Role, portal: Portal, language: Language, theme: enum(night|day), twoFactorEnabled: boolean, merchant: MerchantContext?, permissions: string[], phoneCountry: string, country: Country, timeZone: string }`
- **UserRef** `{ id*: string, name*: string, avatarUrl: url?, role: Role }`
- **UserUpdate** `{ role: Role, name: string }`
- **UsersSummary** `{ total*: integer, roles*: integer, activeSessions*: integer, pendingInvites*: integer, twoFactorAdoption*: number, withoutTwoFa*: integer, byRole*: { super_admin: integer, operations_admin: integer, support_agent: integer, read_only: integer } }`
- **Vendor** `{ id*: string, name*: string | LocalizedText, initials: string, category*: string, email*: email, phone*: string, branchesCount*: integer, joinedAt*: datetime, status*: VendorStatus, parentId: string?, tradeLicenseNo: string, commissionRate: number, city: string, listingsCount: integer, ordersCount: integer }`
- **VendorDetail** `{ id*: string, name*: string | LocalizedText, initials: string, category*: string, email*: email, phone*: string, branchesCount*: integer, joinedAt*: datetime, status*: VendorStatus, parentId: string?, tradeLicenseNo: string, commissionRate: number, city: string, listingsCount: integer, ordersCount: integer, branches: Ref[], activity: Activity[] }`
- **VendorInput** `{ name*: string, category*: Category, email*: email, phone*: string, branchIds: string[], tradeLicenseNo*: string, parentId: string, logoFileId: string, city: string, commissionRate: number }`
- **VendorStatusBody** `{ status*: VendorStatus, reason: string }`
- **VendorSummary** `{ total*: integer, active*: integer, pending*: integer, suspended*: integer, inactive: integer }`
- **VerifyCode** `{ code*: string }`
- **VerifyResult** `{ valid*: boolean, pickup: Pickup, message: string, order: Order, reason: PickupCodeError? }`
- **Voucher** `{ id*: string, code*: string, name: LocalizedText, type*: VoucherType, value*: number, valueMoney: Money?, minOrder: Money?, maxDiscount: Money?, usageLimit*: integer, perUserLimit: integer, used*: integer, audience*: Audience, merchantIds: string[], cities: string[], startsAt: datetime, expiresAt*: datetime, status*: VoucherStatus, createdAt*: datetime }`
- **VoucherDetail** `{ voucher*: Voucher, redemptions*: VoucherRedemption[] }`
- **VoucherInput** `{ code*: string, name: LocalizedText, type*: VoucherType, value*: number, minOrder: Money, maxDiscount: Money, usageLimit*: integer, perUserLimit: integer, audience*: Audience, merchantIds: string[], cities: string[], startsAt: datetime, expiresAt*: datetime, status: enum(draft|scheduled|active) }`
- **VoucherRedemption** `{ orderId*: string, consumer*: Ref, discount*: Money, at*: datetime }`
- **Wallet** `{ id*: string, consumer*: Ref, balance*: Money, source*: WalletSource, lastTransactionAt*: datetime, lifetimeCredit: Money, status*: WalletStatus, frozenReason: string?, consumerId: string, market: Country }`
- **WalletAdjust** `{ direction*: enum(credit|debit), amount*: Money, reason*: string }`
- **WalletDetail** `{ wallet*: Wallet, transactions*: WalletTxn[] }`
- **WalletSummary** `{ totalWalletBalance*: Money, activeVouchers*: integer, voucherRedemptions*: integer, avgBalancePerUser*: Money, walletUsers*: integer }`
- **WalletTxn** `{ id*: string, type*: WalletTxnType, source: WalletSource, amount*: Money, balanceAfter*: Money, reason: string, orderId: string?, expiresAt: datetime?, actor: UserRef?, createdAt*: datetime }`
