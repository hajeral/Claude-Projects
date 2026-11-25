from model import *

A_ALL = ["super_admin", "operations_admin", "support_agent", "read_only"]
A_W = ["super_admin", "operations_admin"]
A_SUP = ["super_admin", "operations_admin", "support_agent"]
A_FIN = ["super_admin", "operations_admin"]
SA = ["super_admin"]
M = ["merchant_owner", "merchant_staff"]
MO = ["merchant_owner"]
ANY = A_ALL + M
PUBLIC = []

# screens: key -> (portal, label, route)
SCREENS = {}
def screen(key, portal, label, route): SCREENS[key] = (portal, label, route)
for k, p, l, r in [
 ("auth", "shared", "Auth (login · sign-up · forgot/reset · OTP)", "admin-login / m-login / m-signup / forgot / reset / otp"),
 ("shell", "shared", "Global shell (search · notifications · export · uploads · language · impact card)", "top bar + sidebar"),
 ("a-cc", "admin", "Command Center", "admin-command-center"),
 ("a-drops", "admin", "Drops", "admin-drops"),
 ("a-pickups", "admin", "Pickups", "admin-pickups"),
 ("a-orders", "admin", "Orders & Reservations", "admin-orders"),
 ("a-merchants", "admin", "Merchants (+ Add Merchant, detail tabs)", "admin-merchants / admin-merchant-new / admin-merchant"),
 ("a-consumers", "admin", "Consumers", "admin-consumers"),
 ("a-fin", "admin", "Financials", "admin-financials"),
 ("a-ops", "admin", "Operations Analytics", "admin-operations"),
 ("a-wallet", "admin", "Wallet Credit & Vouchers", "admin-wallet / admin-vouchers"),
 ("a-qs", "admin", "Quality & Safety", "admin-quality"),
 ("a-issues", "admin", "Issues & Alerts", "admin-issues"),
 ("a-mod", "admin", "Moderation", "admin-moderation"),
 ("a-support", "admin", "Support", "admin-support"),
 ("a-perf", "admin", "Performance", "admin-performance"),
 ("a-sus", "admin", "Sustainability & Impact", "admin-sustainability"),
 ("a-tpl", "admin", "Listings & Templates (+ gallery)", "admin-listings-templates / admin-templates"),
 ("a-cms", "admin", "CMS (Pages · Banners · FAQ)", "admin-cms"),
 ("a-users", "admin", "Users & Access", "admin-users"),
 ("a-settings", "admin", "Settings (Profile · General · Notifications · Security · Policies)", "admin-settings-*"),
 ("m-ov", "merchant", "Overview", "m-overview"),
 ("m-orders", "merchant", "Orders & Pickups", "m-orders"),
 ("m-listings", "merchant", "Listings (Bags) & Inventory (+ Add Listing, detail)", "m-listings / m-inventory / m-inventory-new / m-inventory-detail"),
 ("m-product", "merchant", "Create Product", "m-product-new"),
 ("m-drivers", "merchant", "Drivers", "m-drivers"),
 ("m-sales", "merchant", "Sales & Analytics", "m-analytics"),
 ("m-customers", "merchant", "Customers", "m-customers / m-customer-new"),
 ("m-branches", "merchant", "Branches", "m-branches"),
 ("m-vendors", "merchant", "Vendors / Sub-vendors", "m-vendors"),
 ("m-tpl", "merchant", "Templates", "m-templates"),
 ("m-reviews", "merchant", "Reviews", "m-reviews"),
 ("m-disputes", "merchant", "Reports / Dispute", "m-reports"),
 ("m-help", "merchant", "Help (+ Need Help drawer)", "m-help"),
 ("m-settings", "merchant", "Settings (Profile · Store info · Security · Operating Hours · Language)", "m-settings-*"),
]: screen(k, p, l, r)

EP = []
def E(scr, method, path, summary, q="", body=None, resp=None, lst=None, lsum=None, roles=None, code=None, desc=None, also=None, auth=True, ctype=None, deprecated=False):
    EP.append(dict(screen=scr, method=method, path=path, summary=summary, q=q.split(), body=body, resp=resp, lst=lst, lsum=lsum,
                   roles=roles if roles is not None else (A_ALL if path.startswith("/admin") else M if path.startswith("/merchant") else ANY),
                   code=code or _code(method, summary, resp, lst), desc=desc, also=also or [], auth=auth, ctype=ctype, deprecated=deprecated))

def _code(method, summary, resp, lst):
    if resp is None and lst is None: return 204
    if method == "POST" and resp and summary.lower().startswith(("create", "add", "invite", "issue", "upload", "request", "open", "start", "sign")): return 201
    return 200

LISTQ = "q sort page pageSize"
# ================================================================ AUTH
E("auth", "POST", "/auth/login", "Sign in (admin or merchant portal)", body="LoginRequest", resp="LoginResponse", roles=PUBLIC, auth=False, code=200,
  desc="If the account has 2FA, returns `requires2fa: true` + `challengeId` and no tokens; continue with /auth/otp/verify. 401 `unauthorized` on bad credentials; 403 `forbidden` if the role does not belong to the requested portal; 423-like lock is returned as 429 `rate_limited` after 5 attempts.")
E("auth", "POST", "/auth/otp/verify", "Verify OTP / 2FA code", body="OtpVerify", resp="AuthTokens", roles=PUBLIC, auth=False)
E("auth", "POST", "/auth/otp/resend", "Resend OTP", body=O({"challengeId*": "str"}), resp=O({"sentTo*": "str", "retryAfter*": "int=30"}), roles=PUBLIC, auth=False)
E("auth", "POST", "/auth/merchant/signup", "Sign up a merchant (self-onboarding)", body="SignupRequest", resp="SignupResponse", roles=PUBLIC, auth=False, code=201,
  desc="Creates merchant in `pending` (or `verified` if General setting allowMerchantSelfOnboarding = true) and sends an OTP to verify email/phone.")
E("auth", "POST", "/auth/password/forgot", "Request password reset link", body=O({"email*": "email", "portal*": "Portal"}), roles=PUBLIC, auth=False,
  desc="Always 204 (no account enumeration).")
E("auth", "POST", "/auth/password/reset", "Reset password with emailed token", body=O({"token*": "str", "password*": "str", "confirmPassword*": "str"}), roles=PUBLIC, auth=False)
E("auth", "POST", "/auth/refresh", "Rotate tokens", body=O({"refreshToken*": "str"}), resp="AuthTokens", roles=PUBLIC, auth=False,
  desc="Refresh tokens are single-use (rotation). Reuse revokes the family → 401.")
E("auth", "POST", "/auth/logout", "Sign out (revoke refresh token)", body=O({"refreshToken*": "str", "allDevices": "bool=false"}))
E("auth", "GET", "/me", "Current user + merchant context + permissions", resp="User", also=["shell"])
E("auth", "PATCH", "/me", "Update own profile (Admin Settings → Profile; Merchant Settings → Profile)", body="ProfileUpdate", resp="User", also=["a-settings", "m-settings"])
E("auth", "POST", "/me/password", "Change own password (verified via emailed link)", body="PasswordChange", resp="PasswordChangeResult", code=202, also=["m-settings"])
E("auth", "POST", "/me/2fa/setup", "Start 2FA enrolment", resp=O({"otpauthUrl*": "uri", "secret*": "str", "recoveryCodes*": "[str]"}))
E("auth", "POST", "/me/2fa/enable", "Confirm 2FA enrolment", body=O({"code*": "str"}), resp=O({"enabled*": "bool=true"}))
E("auth", "POST", "/me/2fa/disable", "Disable 2FA", body=O({"code*": "str", "password*": "str"}), resp=O({"enabled*": "bool=false"}))

# ================================================================ SHARED
E("shell", "GET", "/shared/notifications", "Notifications panel (tabs All / Unread / Downloads)", q="tab:enum(all,unread,downloads) portal:Portal type:NotificationType page pageSize branchId", lst="Notification",
  lsum=O({"unreadCount*": "int=4"}))
E("shell", "PATCH", "/shared/notifications/{notificationId}", "Mark one notification read / unread", body=O({"read*": "bool=true"}), resp="Notification")
E("shell", "POST", "/shared/notifications/read-all", "Mark all read", body=O({"portal": "Portal"}), resp=O({"updated*": "int=4"}))
E("shell", "GET", "/shared/search", "Global search (results popover)", q="q* portal:Portal scope:SearchScope limit:int branchId", resp="SearchResult",
  desc="Admin searches drops, merchants, orders, pickups, consumers, tickets, cases. Merchant search is scoped to own listings, orders, customers.")
E("shell", "POST", "/shared/exports", "Start export (Export dialog: format, scope, columns)", body="ExportRequest", resp="ExportJob", code=202,
  desc="Async. When ready: `export.ready` stream event + notification of type `export`. Resources: admin.drops, admin.pickups, admin.orders, admin.merchants, admin.consumers, admin.payouts, admin.refunds, admin.wallets, admin.vouchers, admin.compliance, admin.cases, admin.moderation, admin.tickets, admin.templates, admin.users, admin.audit_log, admin.financials, admin.operations, admin.performance, admin.sustainability, merchant.orders, merchant.listings, merchant.customers, merchant.drivers, merchant.sales_days, merchant.reviews, merchant.disputes.")
E("shell", "GET", "/shared/exports", "My exports (downloads list)", q="status:ExportStatus page pageSize", lst="ExportJob")
E("shell", "GET", "/shared/exports/{exportId}", "Export status", resp="ExportJob")
E("shell", "GET", "/shared/exports/{exportId}/download", "Download export file", code=302, desc="302 redirect to a signed URL (valid 15 min). 409 `conflict` if not ready.")
E("shell", "POST", "/shared/uploads/presign", "Presign a direct upload (images, certificates, import files)", body="PresignRequest", resp="PresignResponse",
  desc="Client PUTs the bytes to `uploadUrl`, then references `fileId` in create/update bodies. Images: JPG/PNG/WEBP ≤ 5 MB; documents: PDF/JPG/PNG ≤ 20 MB; imports: CSV/XLSX ≤ 10 MB.")
E("shell", "POST", "/shared/imports", "Start import (merchant orders / customers / listings)", body="ImportRequest", resp="ImportJob", code=202, roles=M, also=["m-orders", "m-customers"])
E("shell", "GET", "/shared/imports/{importId}", "Import status + row errors", resp="ImportJob", roles=M)
E("shell", "GET", "/shared/imports/templates/{resource}", "Download CSV import template", code=302, roles=M, desc="resource: merchant.orders | merchant.customers | merchant.listings")
E("shell", "GET", "/shared/settings/language", "Get my language", resp="LanguageSetting", also=["m-settings"])
E("shell", "PATCH", "/shared/settings/language", "Set my language (EN/AR)", body="LanguageSetting", resp="LanguageSetting", also=["m-settings"])
E("shell", "GET", "/shared/impact", "Sidebar 'This month's impact' card", q="period:str branchId", resp="ImpactSummary",
  desc="Admin: platform-wide; merchant: own merchant (optionally one branch). `period` = YYYY-MM (default current month).")
E("shell", "GET", "/shared/meta/enums", "All enums with localized labels (for pills, filters)", resp="EnumCatalog")
E("shell", "GET", "/shared/meta/cities", "Cities for filters", q="country:Country", resp="[City]")
E("shell", "GET", "/stream", "Realtime stream (WebSocket upgrade or SSE)", q="token:str events:str branchId",
  desc="WebSocket: `wss://…/api/v1/stream?token=<access>`; SSE: `Accept: text/event-stream` + Authorization header. Messages are StreamEnvelope; see Realtime section / `webhooks`.", code=101)

# ================================================================ ADMIN
E("a-cc", "GET", "/admin/dashboard", "Command Center aggregates", q="from to city", resp="CommandCenter",
  desc="KPIs (Live Drops, Reserved Today, Pickups Completed + fulfilment %, Open Issues + critical badge, Drop Accuracy), Priority Alerts, Recent Orders (live drops), Pickup Passport Monitoring donut, Issue Alerts table, Drop Accuracy chart, Merchant Quality Watch, Sustainability Impact.")
E("a-cc", "GET", "/admin/dashboard/drop-accuracy", "Drop Accuracy card (period selector)", q="period:PeriodPreset from to city", resp="DropAccuracyCard")
E("a-cc", "GET", "/admin/alerts", "Priority alerts (View All)", q="severity:Severity type:AlertType status:enum(active,dismissed) page pageSize", lst="PriorityAlert", also=["a-issues"])
E("a-cc", "POST", "/admin/alerts/{alertId}/dismiss", "Dismiss a priority alert (×)", roles=A_SUP)
E("a-cc", "GET", "/admin/passports", "Pickup Passport Monitoring → Review Now", q="segment:PassportSegment q city page pageSize", lst=O({"consumer*": "Ref", "segment*": "PassportSegment", "expiresAt": "?dt", "issue": "?str"}))

# Drops
E("a-drops", "GET", "/admin/drops", "List drops", q="q status:DropStatus category city dietary merchantId:id flagged:bool sort page pageSize from to", lst="Drop", lsum="DropSummary",
  desc="sort: `-createdAt` (Newest First, default) | `createdAt` | `price` | `-price` | `-reserved` | `pickupWindow`. `q` matches title or code (DR-xxxx).")
E("a-drops", "GET", "/admin/drops/{dropId}", "Drop detail (view drawer)", resp="DropDetail")
E("a-drops", "PATCH", "/admin/drops/{dropId}", "Edit drop", body="DropUpdate", resp="Drop", roles=A_W)
E("a-drops", "DELETE", "/admin/drops/{dropId}", "Delete drop (confirm)", q="force:bool", roles=A_W, desc="409 `conflict` (with `details.reserved`) if live reservations exist unless `?force=true` (cancels + refunds them per policy).")
E("a-drops", "POST", "/admin/drops/{dropId}/flag", "Flag drop for review", body="FlagBody", resp="Drop", roles=A_SUP)
E("a-drops", "POST", "/admin/drops/{dropId}/unflag", "Clear flag", resp="Drop", roles=A_W)
E("a-drops", "POST", "/admin/drops/bulk", "Bulk action on selected drops", body="BulkDropAction", resp="BulkResult", roles=A_W)

# Pickups
E("a-pickups", "GET", "/admin/pickups", "List pickups", q="q status:PickupStatus category city dietary merchantId:id branchId sort page pageSize from to", lst="Pickup", lsum="PickupSummary")
E("a-pickups", "GET", "/admin/pickups/{pickupId}", "Pickup detail", resp="PickupDetail")
E("a-pickups", "PATCH", "/admin/pickups/{pickupId}", "Edit pickup (window / status)", body=O({"window": "TimeWindow", "status": "PickupStatus", "note": "str"}), resp="Pickup", roles=A_W)
E("a-pickups", "DELETE", "/admin/pickups/{pickupId}", "Cancel/delete pickup", roles=A_W)
E("a-pickups", "POST", "/admin/pickups/{pickupId}/verify", "Verify pickup passport code (modal)", body="VerifyCode", resp="VerifyResult", roles=A_SUP,
  desc="Returns `valid:false` with message on mismatch (200), 409 if already verified. Emits `pickup.verified`.")

# Orders
E("a-orders", "GET", "/admin/orders", "List orders & reservations", q="q status:OrderStatus paymentStatus:PaymentStatus fulfillment:FulfillmentType category city dietary merchantId:id consumerId:id sort page pageSize from to",
  lst="OrderSummary", lsum="OrderListSummary")
E("a-orders", "GET", "/admin/orders/{orderId}", "Order detail drawer", resp="Order")
E("a-orders", "GET", "/admin/orders/{orderId}/refund-eligibility", "Refund policy check (refund flow step 1)", q="reason:RefundReason", resp="RefundEligibility")
E("a-orders", "POST", "/admin/orders/{orderId}/refund", "Issue refund", body="RefundRequest", resp="Refund", roles=A_SUP, code=201,
  desc="422 `policy_violation` when outside policy and `overridePolicy` not set (only super_admin may override).")
E("a-orders", "POST", "/admin/orders/{orderId}/cancel", "Cancel order", body="CancelRequest", resp="Order", roles=A_SUP)
E("a-orders", "POST", "/admin/orders/{orderId}/confirm", "Confirm pending reservation", resp="Order", roles=A_W)

# Merchants
E("a-merchants", "GET", "/admin/merchants", "List merchants", q="q status:MerchantStatus category city dietary country:Country sort page pageSize from to", lst="MerchantSummary", lsum="MerchantListSummary",
  desc="sort: -joinedAt | name | -qualityScore | -revenue | -dropsCount. KPI 'Pending Verification' is a count (fixes 'QAR 62').")
E("a-merchants", "POST", "/admin/merchants", "Create merchant (Add Merchant multi-step form)", body="MerchantCreate", resp="Merchant", roles=A_W, code=201,
  desc="Steps: Business → Legal & documents → Contact → Location & branches → Banking & commission → Review. Draft-save allowed via `?draft=true`.")
E("a-merchants", "POST", "/admin/merchants/validate", "Validate one step of Add Merchant", body=O({"step*": "enum(business,legal,contact,location,banking)", "data*": "obj"}), resp=O({"valid*": "bool", "errors": "obj"}), roles=A_W)
E("a-merchants", "GET", "/admin/merchants/{merchantId}", "Merchant detail (header)", resp="Merchant")
E("a-merchants", "PATCH", "/admin/merchants/{merchantId}", "Edit merchant", body="MerchantUpdate", resp="Merchant", roles=A_W)
E("a-merchants", "DELETE", "/admin/merchants/{merchantId}", "Delete merchant (soft)", roles=SA)
for act, s in [("verify", "Verify merchant"), ("suspend", "Suspend merchant"), ("reject", "Reject application"), ("reactivate", "Reactivate merchant")]:
    E("a-merchants", "POST", "/admin/merchants/{merchantId}/" + act, s, body="ReasonBody", resp="Merchant", roles=A_W)
E("a-merchants", "GET", "/admin/merchants/{merchantId}/overview", "Detail tab: Overview", q="from to", resp="MerchantDetailOverview")
E("a-merchants", "GET", "/admin/merchants/{merchantId}/branches", "Detail tab: Branches", lst="Branch")
E("a-merchants", "GET", "/admin/merchants/{merchantId}/listings", "Detail tab: Listings (the merchant's drops)", q="status:DropStatus q page pageSize", lst="Drop")
E("a-merchants", "POST", "/admin/merchants/{merchantId}/listings/{listingId}/force-disable", "Force-disable a merchant listing", body="ReasonBody", resp="Listing", roles=A_W)
E("a-merchants", "GET", "/admin/merchants/{merchantId}/payouts", "Detail tab: Payouts", q="status:PayoutStatus page pageSize from to", lst="Payout")
E("a-merchants", "GET", "/admin/merchants/{merchantId}/compliance", "Detail tab: Compliance", resp="MerchantComplianceTab")
E("a-merchants", "GET", "/admin/merchants/{merchantId}/activity", "Detail tab: Activity", q="page pageSize from to", lst="Activity")

# Consumers
E("a-consumers", "GET", "/admin/consumers", "List consumers", q="q status:ConsumerStatus category city dietary sort page pageSize from to", lst="Consumer", lsum="ConsumerSummary")
E("a-consumers", "GET", "/admin/consumers/{consumerId}", "Consumer detail", resp="ConsumerDetail")
E("a-consumers", "PATCH", "/admin/consumers/{consumerId}", "Edit consumer", body="ConsumerUpdate", resp="Consumer", roles=A_SUP)
E("a-consumers", "DELETE", "/admin/consumers/{consumerId}", "Delete consumer (GDPR-style erase)", roles=A_W)
E("a-consumers", "POST", "/admin/consumers/{consumerId}/block", "Block consumer", body="ReasonBody", resp="Consumer", roles=A_SUP)
E("a-consumers", "POST", "/admin/consumers/{consumerId}/unblock", "Unblock consumer", resp="Consumer", roles=A_SUP)
E("a-consumers", "GET", "/admin/consumers/{consumerId}/orders", "Consumer orders", q="status:OrderStatus page pageSize from to", lst="OrderSummary")
E("a-consumers", "POST", "/admin/consumers/{consumerId}/notes", "Add internal note", body="NoteBody", resp="Note", roles=A_SUP, code=201)

# Financials
FQ = "from to country:Country city category merchantId:id branchId fulfillment:FulfillmentType"
E("a-fin", "GET", "/admin/financials/summary", "Financials dashboard (KPI grid + all cards)", q=FQ + " granularity:Granularity", resp="FinancialsDashboard",
  desc="Filters: All Countries / Cities / Categories / Merchants / Branches / Order Types. Each card's period selector re-calls the matching section endpoint below.")
E("a-fin", "GET", "/admin/financials/revenue-snapshot", "Revenue & Margin Snapshot card", q=FQ + " period:PeriodPreset", resp="RevenueSnapshot")
E("a-fin", "GET", "/admin/financials/gmv-trend", "GMV Trend (this vs previous period)", q=FQ + " granularity:Granularity", resp="TrendCard")
E("a-fin", "GET", "/admin/financials/revenue-trend", "Revenue Trend (revenue vs net revenue)", q=FQ + " granularity:Granularity", resp="TrendCard")
E("a-fin", "GET", "/admin/financials/monthly-trends", "Financial Trends (Monthly)", q=FQ + " months:int", resp="[Series]")
E("a-fin", "GET", "/admin/financials/unit-economics", "Unit Economics", q=FQ, resp="UnitEconomics")
E("a-fin", "GET", "/admin/financials/payouts", "Payouts & Settlements list", q="q status:PayoutStatus merchantId:id sort page pageSize from to", lst="Payout",
  lsum=O({"merchantGrossEarnings*": "Money", "amountPaid*": "Money", "pendingPayout*": "Money", "failedHeld*": "Money", "avgSettlementDays*": "num=2.4"}))
E("a-fin", "GET", "/admin/financials/payouts/{payoutId}", "Payout detail", resp="PayoutDetail")
for act, s in [("process", "Process payout now"), ("hold", "Put payout on hold"), ("retry", "Retry failed payout")]:
    E("a-fin", "POST", "/admin/financials/payouts/{payoutId}/" + act, s, body="ReasonBody", resp="Payout", roles=A_FIN)
E("a-fin", "GET", "/admin/financials/refunds", "Refunds & Adjustments list", q="q status:RefundStatus reason:RefundReason merchantId:id sort page pageSize from to", lst="Refund",
  lsum=O({"refundAmount*": "Money", "refundRate*": "pct=0.2", "cancellationValue*": "Money", "creditsIssued*": "Money", "chargebacks*": "Money"}), also=["a-orders"])
E("a-fin", "POST", "/admin/financials/refunds/{refundId}/approve", "Approve refund (manual review)", body="ReasonBody", resp="Refund", roles=A_FIN)
E("a-fin", "POST", "/admin/financials/refunds/{refundId}/reject", "Reject refund", body="ReasonBody", resp="Refund", roles=A_FIN)

# Ops analytics
E("a-ops", "GET", "/admin/analytics/operations", "Operations Analytics dashboard", q="from to city category merchantId:id granularity:Granularity", resp="OperationsAnalytics",
  desc="Card selectors ('Daily', 'This Period') pass `granularity` / `section` to the same endpoint.")
E("a-ops", "GET", "/admin/analytics/operations/{section}", "One Operations Analytics card", q="from to city granularity:Granularity period:PeriodPreset", resp="obj",
  desc="section ∈ operational-trends | fulfilment-funnel | marketplace-health | pickup-cancellation-health | quality-signals | drop-accuracy-trend | operations-summary; returns that property of OperationsAnalytics.")

# Wallet & vouchers
E("a-wallet", "GET", "/admin/wallets", "Wallet Credit tab — wallet balances", q="q status:WalletStatus source:WalletSource sort page pageSize from to", lst="Wallet", lsum="WalletSummary")
E("a-wallet", "GET", "/admin/wallets/{walletId}", "Wallet detail + transactions", resp="WalletDetail")
E("a-wallet", "POST", "/admin/wallets/credits", "Issue Credit (modal)", body="IssueCredit", resp=O({"issued*": "int=1", "transactions*": "[WalletTxn]"}), roles=A_SUP, code=201)
E("a-wallet", "POST", "/admin/wallets/{walletId}/adjust", "Adjust balance", body="WalletAdjust", resp="WalletDetail", roles=A_FIN)
E("a-wallet", "POST", "/admin/wallets/{walletId}/freeze", "Freeze wallet", body="ReasonBody", resp="Wallet", roles=A_W)
E("a-wallet", "POST", "/admin/wallets/{walletId}/unfreeze", "Unfreeze wallet", resp="Wallet", roles=A_W)
E("a-wallet", "GET", "/admin/vouchers", "Vouchers tab — voucher codes", q="q status:VoucherStatus type:VoucherType sort page pageSize from to", lst="Voucher", lsum="WalletSummary")
E("a-wallet", "POST", "/admin/vouchers", "Create voucher", body="VoucherInput", resp="Voucher", roles=A_W, code=201, desc="409 `conflict` if code exists.")
E("a-wallet", "GET", "/admin/vouchers/{voucherId}", "Voucher detail + redemptions", resp="VoucherDetail")
E("a-wallet", "PATCH", "/admin/vouchers/{voucherId}", "Edit voucher", body="VoucherInput", resp="Voucher", roles=A_W)
E("a-wallet", "DELETE", "/admin/vouchers/{voucherId}", "Delete voucher", roles=A_W)
E("a-wallet", "POST", "/admin/vouchers/{voucherId}/freeze", "Freeze voucher", body="ReasonBody", resp="Voucher", roles=A_W)
E("a-wallet", "POST", "/admin/vouchers/{voucherId}/unfreeze", "Unfreeze voucher", resp="Voucher", roles=A_W)

# Quality & safety
E("a-qs", "GET", "/admin/compliance", "Merchant Compliance list", q="q complianceStatus:ComplianceStatus certificateStatus:CertificateStatus category city sort page pageSize from to", lst="ComplianceRow", lsum="ComplianceSummary",
  desc="KPI row uses the screen's own meaning (monitored / compliant / non-compliant / expiring certificates / avg hygiene score) instead of the copied consumer KPIs.")
E("a-qs", "GET", "/admin/compliance/{merchantId}", "Compliance detail", resp="ComplianceDetail")
E("a-qs", "PATCH", "/admin/compliance/{merchantId}", "Edit compliance record (status override)", body=O({"compliance": "ComplianceStatus", "note": "str"}), resp="ComplianceRow", roles=A_W)
E("a-qs", "DELETE", "/admin/compliance/{merchantId}", "Remove from compliance monitoring", roles=SA)
E("a-qs", "POST", "/admin/compliance/{merchantId}/certificates", "Upload certificate", body="CertificateInput", resp="Certificate", roles=A_W, code=201)
E("a-qs", "PATCH", "/admin/compliance/certificates/{certificateId}", "Edit certificate (expiry, number)", body="CertificateInput", resp="Certificate", roles=A_W)
E("a-qs", "DELETE", "/admin/compliance/certificates/{certificateId}", "Delete certificate", roles=A_W)
E("a-qs", "POST", "/admin/compliance/certificates/{certificateId}/approve", "Approve certificate", resp="Certificate", roles=A_W)
E("a-qs", "POST", "/admin/compliance/certificates/{certificateId}/reject", "Reject certificate", body="ReasonBody", resp="Certificate", roles=A_W)
E("a-qs", "POST", "/admin/compliance/{merchantId}/hygiene-score", "Record hygiene score", body="HygieneScoreBody", resp="ComplianceRow", roles=A_W)
E("a-qs", "POST", "/admin/compliance/{merchantId}/actions", "Compliance action (warn / request docs / inspect / suspend / clear)", body="ComplianceActionBody", resp="ComplianceDetail", roles=A_W)

# Issues & alerts
E("a-issues", "GET", "/admin/cases", "Issues & Alerts (tabs All / Issues / Alerts / Moderation; severity chips)", q="q kind:CaseKind severity:Severity status:CaseStatus assigneeId:id merchantId:id sort page pageSize from to", lst="Case", lsum="CaseSummary")
E("a-issues", "GET", "/admin/cases/{caseId}", "Case detail drawer", resp="CaseDetail", also=["a-mod"])
E("a-issues", "PATCH", "/admin/cases/{caseId}", "Update case (severity / status)", body=O({"severity": "Severity", "status": "CaseStatus"}), resp="Case", roles=A_SUP)
E("a-issues", "POST", "/admin/cases/{caseId}/assign", "Assign case", body="AssignBody", resp="Case", roles=A_SUP, also=["a-mod"])
E("a-issues", "POST", "/admin/cases/{caseId}/resolve", "Resolve case (✓)", body="ResolveBody", resp="Case", roles=A_SUP, also=["a-mod"])
E("a-issues", "POST", "/admin/cases/{caseId}/escalate", "Escalate case", body="EscalateBody", resp="Case", roles=A_SUP, also=["a-mod"])
E("a-issues", "POST", "/admin/cases/{caseId}/reopen", "Reopen case", resp="Case", roles=A_SUP)
E("a-issues", "POST", "/admin/cases/{caseId}/notes", "Add note", body="NoteBody", resp="Note", roles=A_SUP, code=201, also=["a-mod"])

# Moderation
E("a-mod", "GET", "/admin/moderation", "Moderation queue (tabs All / Listings / Reviews / User Behaviour / Merchant Profile)", q="q type:ModerationType severity:Severity status:CaseStatus reporter:ReporterSource sort page pageSize from to", lst="ModerationItem", lsum="ModerationSummary")
E("a-mod", "GET", "/admin/moderation/{caseId}", "Moderation case detail", resp="ModerationDetail")
E("a-mod", "POST", "/admin/moderation/{caseId}/approve", "Approve content (✓ — keep / no violation)", body="ModerationDecision", resp="ModerationItem", roles=A_SUP)
E("a-mod", "POST", "/admin/moderation/{caseId}/reject", "Reject content (× — take action)", body="ModerationDecision", resp="ModerationItem", roles=A_SUP)
E("a-mod", "POST", "/admin/moderation/{caseId}/escalate", "Escalate to Trust & Safety", body="EscalateBody", resp="ModerationItem", roles=A_SUP)

# Support
E("a-support", "GET", "/admin/support/summary", "Support KPIs + Response Time (7d) + Tickets by Channel", q="from to", resp="SupportDashboard")
E("a-support", "GET", "/admin/support/tickets", "Ticket list (priority tabs All/Urgent/High/Normal/Low)", q="q priority:TicketPriority status:TicketStatus channel:TicketChannel assigneeId:id sort page pageSize from to", lst="Ticket", lsum="SupportSummary")
E("a-support", "POST", "/admin/support/tickets", "Open ticket on behalf of a user", body=O({"requester*": "TicketRequester", "subject*": "str", "channel*": "TicketChannel", "priority*": "TicketPriority", "body*": "str", "orderId": "id"}), resp="Ticket", roles=A_SUP, code=201)
E("a-support", "GET", "/admin/support/tickets/{ticketId}", "Ticket detail + conversation", resp="TicketDetail")
E("a-support", "PATCH", "/admin/support/tickets/{ticketId}", "Update status / priority / assignee", body="TicketUpdate", resp="Ticket", roles=A_SUP)
E("a-support", "GET", "/admin/support/tickets/{ticketId}/messages", "Conversation messages", q="page pageSize", lst="TicketMessage")
E("a-support", "POST", "/admin/support/tickets/{ticketId}/messages", "Reply (or internal note)", body="MessageBody", resp="TicketMessage", roles=A_SUP, code=201)
E("a-support", "GET", "/admin/support/agents", "Assignable agents", resp="[UserRef]")
E("a-support", "GET", "/admin/support/report", "Response time report (View report)", q="from to granularity:Granularity", resp="PerformanceReport")

# Performance
E("a-perf", "GET", "/admin/analytics/performance", "Performance dashboard", q="from to city category", resp="PerformanceDashboard")
E("a-perf", "GET", "/admin/analytics/performance/merchants", "Merchant Performance Ranking (View all merchants)", q="q status:QualityBadge city category sort page pageSize from to", lst="MerchantPerformanceRow",
  desc="sort: -qualityScore (default) | qualityScore | -onTimePct | name")
E("a-perf", "GET", "/admin/analytics/performance/report", "Drop accuracy report (View report)", q="from to city", resp="PerformanceReport")

# Sustainability
E("a-sus", "GET", "/admin/analytics/sustainability", "Sustainability & Impact dashboard", q="from to city category", resp="SustainabilityDashboard", also=["a-cc"])
E("a-sus", "GET", "/admin/analytics/sustainability/breakdown", "Full breakdown (View full breakdown)", q="from to city category groupBy:enum(city,merchant,category,month)", resp="SustainabilityBreakdown")
E("a-sus", "GET", "/admin/analytics/sustainability/report", "Impact report (View report / Learn more)", q="from to city", resp="PerformanceReport")

# Templates (admin)
E("a-tpl", "GET", "/admin/templates", "Listings & Templates list (category tabs All/Bakery/Grocery/Prepared Foods/Other) and gallery", q="q category status:TemplateStatus source:TemplateSource sort page pageSize", lst="Template", lsum="TemplateSummary")
E("a-tpl", "POST", "/admin/templates", "New Template (builder with field chips)", body="TemplateInput", resp="Template", roles=A_W, code=201)
E("a-tpl", "GET", "/admin/templates/fields", "Available field chips for builder", resp="[TemplateField]")
E("a-tpl", "GET", "/admin/templates/{templateId}", "Template detail", resp="Template")
E("a-tpl", "PATCH", "/admin/templates/{templateId}", "Edit template", body="TemplateInput", resp="Template", roles=A_W)
E("a-tpl", "DELETE", "/admin/templates/{templateId}", "Delete template", roles=A_W)
E("a-tpl", "POST", "/admin/templates/{templateId}/duplicate", "Duplicate template", resp="Template", roles=A_W, code=201)
E("a-tpl", "POST", "/admin/templates/{templateId}/publish", "Publish (draft → active)", resp="Template", roles=A_W)
E("a-tpl", "POST", "/admin/templates/{templateId}/unpublish", "Move back to draft", resp="Template", roles=A_W)

# CMS
E("a-cms", "GET", "/admin/cms", "CMS content list (tabs All / Pages / Banners / FAQ)", q="q type:CmsType status:CmsStatus authorId:id sort page pageSize", lst="CmsItem", lsum="CmsSummary")
E("a-cms", "GET", "/admin/cms/pages", "List pages", q="q status:CmsStatus page pageSize", lst="CmsPage")
E("a-cms", "POST", "/admin/cms/pages", "Create page (rich text editor)", body="CmsPageInput", resp="CmsPage", roles=A_W, code=201)
E("a-cms", "GET", "/admin/cms/pages/{pageId}", "Get page", resp="CmsPage")
E("a-cms", "PATCH", "/admin/cms/pages/{pageId}", "Update page", body="CmsPageInput", resp="CmsPage", roles=A_W)
E("a-cms", "DELETE", "/admin/cms/pages/{pageId}", "Delete page", roles=A_W)
E("a-cms", "GET", "/admin/cms/banners", "List banners (card grid)", q="q status:CmsStatus audience:Audience page pageSize", lst="Banner")
E("a-cms", "POST", "/admin/cms/banners", "Create banner (image upload, audience, schedule)", body="BannerInput", resp="Banner", roles=A_W, code=201)
E("a-cms", "GET", "/admin/cms/banners/{bannerId}", "Get banner", resp="Banner")
E("a-cms", "PATCH", "/admin/cms/banners/{bannerId}", "Update banner", body="BannerInput", resp="Banner", roles=A_W)
E("a-cms", "DELETE", "/admin/cms/banners/{bannerId}", "Delete banner", roles=A_W)
E("a-cms", "GET", "/admin/cms/faqs", "List FAQs", q="q status:CmsStatus audience:enum(consumers,merchants,all) page pageSize", lst="Faq")
E("a-cms", "POST", "/admin/cms/faqs", "Create FAQ", body="FaqInput", resp="Faq", roles=A_W, code=201)
E("a-cms", "GET", "/admin/cms/faqs/{faqId}", "Get FAQ", resp="Faq")
E("a-cms", "PATCH", "/admin/cms/faqs/{faqId}", "Update FAQ", body="FaqInput", resp="Faq", roles=A_W)
E("a-cms", "DELETE", "/admin/cms/faqs/{faqId}", "Delete FAQ", roles=A_W)
E("a-cms", "PUT", "/admin/cms/faqs/order", "Reorder FAQs", body=O({"ids*": "[id]"}), roles=A_W)
E("a-cms", "POST", "/admin/cms/{contentType}/{contentId}/publish", "Publish now", resp="CmsItem", roles=A_W, desc="contentType ∈ pages | banners | faqs — the same plural segment as the content paths. The mock also registers generic `GET|PATCH|DELETE /admin/cms/{contentType}/{id}` and `POST /admin/cms/{contentType}`, which are exactly the concrete pages/banners/faqs endpoints above.")
E("a-cms", "POST", "/admin/cms/{contentType}/{contentId}/unpublish", "Unpublish (→ draft)", resp="CmsItem", roles=A_W)
E("a-cms", "POST", "/admin/cms/{contentType}/{contentId}/schedule", "Schedule publish", body="ScheduleBody", resp="CmsItem", roles=A_W)

# Users & access
E("a-users", "GET", "/admin/users", "Admin users list (role tabs)", q="q role:Role status:UserStatus twoFactor:bool sort page pageSize", lst="AdminUser", lsum="UsersSummary", roles=SA)
E("a-users", "GET", "/admin/roles", "Role cards (counts + descriptions + permissions)", resp="[RoleCard]", roles=SA)
E("a-users", "POST", "/admin/users/invite", "Invite user (modal)", body="InviteBody", resp="AdminUser", roles=SA, code=201)
E("a-users", "GET", "/admin/users/{userId}", "User detail", resp="AdminUser", roles=SA)
E("a-users", "PATCH", "/admin/users/{userId}", "Edit role", body="UserUpdate", resp="AdminUser", roles=SA)
E("a-users", "DELETE", "/admin/users/{userId}", "Remove user / revoke invite", roles=SA)
for act, s in [("suspend", "Suspend user (⊘)"), ("reactivate", "Reactivate user"), ("resend-invite", "Resend invite"), ("reset-2fa", "Reset user's 2FA")]:
    E("a-users", "POST", "/admin/users/{userId}/" + act, s, resp="AdminUser", roles=SA)
E("a-users", "GET", "/admin/sessions", "Active sessions", q="userId:id page pageSize", lst=O({"id*": "id", "user*": "UserRef", "ip": "str", "device": "str", "lastSeenAt*": "dt"}), roles=SA)
E("a-users", "DELETE", "/admin/sessions/{sessionId}", "Revoke session", roles=SA)

# Settings
E("a-settings", "GET", "/admin/settings/general", "General (Platform Basics + Operational Defaults)", resp="GeneralSettings")
E("a-settings", "PATCH", "/admin/settings/general", "Save General", body="GeneralSettings", resp="GeneralSettings", roles=SA)
E("a-settings", "GET", "/admin/settings/notifications", "Notifications (Admin Alerts)", resp="NotificationSettings")
E("a-settings", "PATCH", "/admin/settings/notifications", "Save Notifications", body="NotificationSettings", resp="NotificationSettings", roles=SA)
E("a-settings", "GET", "/admin/settings/security", "Security (Authentication + Audit & Compliance)", resp="SecuritySettings", roles=SA)
E("a-settings", "PATCH", "/admin/settings/security", "Save Security", body="SecuritySettings", resp="SecuritySettings", roles=SA)
E("a-settings", "GET", "/admin/settings/policies", "Policies list", resp="[PolicyListItem]")
E("a-settings", "GET", "/admin/settings/policies/{policyKey}", "Policy editor content (Refund & Cancellation incl. configuration table; About; Privacy; Terms)", resp="Policy")
E("a-settings", "PUT", "/admin/settings/policies/{policyKey}", "Save policy content / configuration", body="PolicyInput", resp="Policy", roles=SA,
  desc="Refund policy `config` drives /admin/orders/{id}/refund-eligibility.")
E("a-settings", "GET", "/admin/audit-log", "Audit log", q="q actorId:id action:str entityType:str page pageSize from to", lst="AuditEntry", roles=SA)
E("a-settings", "POST", "/admin/audit-log/export", "Export audit log (CSV)", body="AuditExportBody", resp="ExportJob", roles=SA, code=202, desc="range ∈ 7d | 30d | 90d | 12m (Security screen selector).")
E("a-settings", "GET", "/shared/meta/timezones", "Timezones for Default Time Zone select", resp={"type": "array", "items": {"type": "string", "examples": ["Asia/Doha"]}})

# ================================================================ MERCHANT
BQ = "branchId"
E("m-ov", "GET", "/merchant/overview", "Overview aggregates", q="branchId from to", resp="MerchantOverview",
  desc="KPIs with sparklines, Sales Overview, Top Selling Bags, Recent Orders, Inventory Status donut, Operational Status, Reviews, Alerts & Notifications.")
E("m-ov", "GET", "/merchant/overview/sales", "Sales Overview card (This Week / This Month)", q="branchId period:PeriodPreset from to", resp="SalesOverviewCard")
E("m-ov", "GET", "/merchant/context", "Header: merchant + branch switcher options", resp="MerchantContext", also=["shell"])

# Orders
E("m-orders", "GET", "/merchant/orders", "Orders & Pickups list", q="branchId q status:OrderStatus fulfillment:FulfillmentType assignment:DriverAssignment sort page pageSize from to", lst="MerchantOrder", lsum="MerchantOrderSummary", also=["m-ov"])
E("m-orders", "GET", "/merchant/orders/{orderId}", "Order detail modal", resp="MerchantOrderDetail")
E("m-orders", "POST", "/merchant/orders/{orderId}/assign-driver", "Assign driver", body="AssignDriverBody", resp="MerchantOrder", also=["m-drivers"])
E("m-orders", "POST", "/merchant/orders/{orderId}/unassign-driver", "Unassign driver", resp="MerchantOrder")
E("m-orders", "POST", "/merchant/orders/{orderId}/ready", "Mark ready", resp="MerchantOrder")
E("m-orders", "POST", "/merchant/orders/{orderId}/complete", "Mark order completed", body="CompleteBody", resp="MerchantOrder")
E("m-orders", "POST", "/merchant/orders/{orderId}/cancel", "Cancel order", body="CancelRequest", resp="MerchantOrder")
E("m-orders", "POST", "/merchant/pickups/verify", "Verify customer pickup code → order completed", body="PickupVerifyInput", resp="PickupVerifyResult")

# Listings / inventory
E("m-listings", "GET", "/merchant/listings", "Listings (Bags) / Inventory list", q="branchId q status:ListingStatus stockStatus:StockStatus category city dietary sort page pageSize from to", lst="Listing", lsum="ListingSummary",
  desc="Used by both Listings (Bags) and Inventory screens. sort: -createdAt | price | -sold | title.")
E("m-listings", "POST", "/merchant/listings", "Add New Listing", body="ListingInput", resp="Listing", code=201, also=["m-tpl"], desc="`?draft=true` saves without publishing.")
E("m-listings", "GET", "/merchant/listings/{listingId}", "Listing detail page (Listing incl. activity)", resp="Listing")
E("m-listings", "PATCH", "/merchant/listings/{listingId}", "Edit listing", body="ListingInput", resp="Listing")
E("m-listings", "DELETE", "/merchant/listings/{listingId}", "Delete listing", desc="409 if active reservations.")
for act, s in [("pause", "Pause listing"), ("resume", "Resume listing"), ("disable", "Disable listing"), ("enable", "Re-enable listing")]:
    E("m-listings", "POST", "/merchant/listings/{listingId}/" + act, s, resp="Listing")
E("m-listings", "POST", "/merchant/listings/{listingId}/duplicate", "Duplicate listing", resp="Listing", code=201)
E("m-listings", "POST", "/merchant/listings/{listingId}/save-as-template", "Save as template", body=O({"name*": "LocalizedText"}), resp="Template", code=201, also=["m-tpl"])
E("m-listings", "PATCH", "/merchant/listings/{listingId}/stock", "Quick stock update", body=O({"quantity*": "num", "reason": "str"}), resp="Listing")
E("m-listings", "PATCH", "/merchant/listings/{listingId}/settings", "Listing settings toggles", body="ListingSettings", resp="Listing")
E("m-listings", "POST", "/merchant/listings/{listingId}/images", "Add image (after presign)", body=O({"fileId*": "id"}), resp="ListingImage", code=201, desc="422 when the listing already has 10 images.")
E("m-listings", "PUT", "/merchant/listings/{listingId}/images/order", "Reorder images / set cover", body="ImageOrder", resp="[ListingImage]")
E("m-listings", "DELETE", "/merchant/listings/{listingId}/images/{imageId}", "Remove image")
E("m-listings", "GET", "/merchant/listings/{listingId}/activity", "Listing activity timeline", q="page pageSize", lst="Activity")
E("m-listings", "POST", "/merchant/listings/bulk", "Bulk action", body=O({"ids*": "[id]", "action*": "enum(pause,resume,disable,delete)"}), resp="BulkResult")

# Products
E("m-product", "GET", "/merchant/products", "List products", q="branchId q category page pageSize", lst="Product")
E("m-product", "POST", "/merchant/products", "Create Product", body="ProductInput", resp="Product", code=201, also=["m-tpl"])
E("m-product", "GET", "/merchant/products/{productId}", "Get product", resp="Product")
E("m-product", "PATCH", "/merchant/products/{productId}", "Update product", body="ProductInput", resp="Product")
E("m-product", "DELETE", "/merchant/products/{productId}", "Delete product")

# Drivers
E("m-drivers", "GET", "/merchant/drivers", "Your Drivers", q="branchId q status:DriverStatus vehicle:VehicleType sort page pageSize", lst="Driver", lsum="DriverSummary", also=["m-orders"])
E("m-drivers", "POST", "/merchant/drivers", "Add Driver", body="DriverInput", resp="Driver", code=201, roles=MO)
E("m-drivers", "GET", "/merchant/drivers/{driverId}", "Driver detail", resp="DriverDetail")
E("m-drivers", "PATCH", "/merchant/drivers/{driverId}", "Edit driver / change status", body="DriverInput", resp="Driver")
E("m-drivers", "DELETE", "/merchant/drivers/{driverId}", "Remove driver", roles=MO)

# Sales analytics
SQ = "branchId period:PeriodPreset granularity:Granularity from to"
E("m-sales", "GET", "/merchant/analytics/sales", "Sales & Analytics (sections A–H)", q=SQ, resp="SalesAnalytics",
  desc="Day/Week/Month toggle = granularity daily/weekly/monthly; Today/7 Days/30 Days/3 Months/Custom = period.")
E("m-sales", "GET", "/merchant/analytics/sales/performance", "A) Sales Performance chart only", q=SQ, resp="TrendCard")
E("m-sales", "GET", "/merchant/analytics/sales/days", "H) Breakdown by day (View all day records)", q="branchId page pageSize sort from to", lst="DayRecord")
E("m-sales", "GET", "/merchant/analytics/sales/days/export", "H) Export CSV of day breakdown", q="branchId from to format:ExportFormat", code=302,
  desc="Convenience: 302 to a ready CSV for small ranges; otherwise use POST /shared/exports with resource merchant.sales_days.")

# Customers
E("m-customers", "GET", "/merchant/customers", "Customers list", q="branchId q status:ConsumerStatus category sort page pageSize from to", lst="Customer", lsum="CustomerSummary")
E("m-customers", "POST", "/merchant/customers", "Add Customer", body="CustomerInput", resp="Customer", code=201)
E("m-customers", "GET", "/merchant/customers/{customerId}", "Customer detail", resp="CustomerDetail")
E("m-customers", "PATCH", "/merchant/customers/{customerId}", "Edit customer", body="CustomerInput", resp="Customer")
E("m-customers", "DELETE", "/merchant/customers/{customerId}", "Delete customer")

# Branches
E("m-branches", "GET", "/merchant/branches", "Branch cards (also branch switcher, operating-hours select)", q="q state:BranchState", lst="Branch", lsum="BranchesSummary", also=["shell", "m-settings"])
E("m-branches", "POST", "/merchant/branches", "Add Branch (hours + map)", body="BranchInput", resp="Branch", code=201, roles=MO)
E("m-branches", "GET", "/merchant/branches/{branchId}", "Branch detail", resp="Branch")
E("m-branches", "PATCH", "/merchant/branches/{branchId}", "Edit Branch", body="BranchInput", resp="Branch", roles=MO)
E("m-branches", "DELETE", "/merchant/branches/{branchId}", "Delete branch", roles=MO, desc="409 if it has live listings or open orders.")
E("m-branches", "PATCH", "/merchant/branches/{branchId}/state", "Open / closed state (card select; Overview 'Tap to change branch state')", body="BranchStateBody", resp="Branch", also=["m-ov"])
E("m-branches", "PUT", "/merchant/branches/{branchId}/hours", "Replace weekly hours", body="HoursBody", resp="Branch", also=["m-settings"])

# Vendors
E("m-vendors", "GET", "/merchant/vendors", "Vendors list (status tabs)", q="q status:VendorStatus sort page pageSize", lst="Vendor", lsum="VendorSummary", roles=MO)
E("m-vendors", "POST", "/merchant/vendors", "Add New Sub Vendor", body="VendorInput", resp="Vendor", code=201, roles=MO)
E("m-vendors", "GET", "/merchant/vendors/{vendorId}", "Vendor detail", resp="VendorDetail", roles=MO)
E("m-vendors", "PATCH", "/merchant/vendors/{vendorId}", "Edit vendor", body="VendorInput", resp="Vendor", roles=MO)
E("m-vendors", "DELETE", "/merchant/vendors/{vendorId}", "Delete vendor", roles=MO)
E("m-vendors", "PATCH", "/merchant/vendors/{vendorId}/status", "Change vendor status", body="VendorStatusBody", resp="Vendor", roles=MO)

# Templates
E("m-tpl", "GET", "/merchant/templates", "Templates (WonderBites Templates + My Templates)", q="source:enum(wonderbites,mine) category q page pageSize", lst="Template", also=["m-ov", "a-tpl"])
E("m-tpl", "POST", "/merchant/templates", "Create my template", body="TemplateInput", resp="Template", code=201)
E("m-tpl", "GET", "/merchant/templates/{templateId}", "Template detail", resp="Template")
E("m-tpl", "PATCH", "/merchant/templates/{templateId}", "Edit my template", body="TemplateInput", resp="Template", desc="403 for WonderBites templates.")
E("m-tpl", "DELETE", "/merchant/templates/{templateId}", "Delete my template")
E("m-tpl", "POST", "/merchant/templates/{templateId}/create-product", "Create from Template → prefilled draft (Create Product / Add Listing)", body=O({"target": "enum(listing,product)", "branchId": "id"}),
  resp=O({"target*": "enum(listing,product)", "draft*": "ListingInput"}), desc="Returns a prefilled, unsaved draft used to open Create Product / Add Listing; increments usageCount when the draft is saved with templateId.")

# Reviews
E("m-reviews", "GET", "/merchant/reviews", "Reviews list + rating summary", q="branchId rating:int sort:ReviewSort replied:bool page pageSize from to", lst="Review", lsum="RatingSummary", also=["m-ov"])
E("m-reviews", "POST", "/merchant/reviews/{reviewId}/reply", "Reply to review", body="ReviewBody", resp="Review", code=201)
E("m-reviews", "PATCH", "/merchant/reviews/{reviewId}/reply", "Edit reply", body="ReviewBody", resp="Review")
E("m-reviews", "DELETE", "/merchant/reviews/{reviewId}/reply", "Delete reply")
E("m-reviews", "POST", "/merchant/reviews/{reviewId}/report", "Report review (goes to admin moderation)", body="ReviewReport", resp="Review")
E("m-reviews", "POST", "/merchant/reviews/feedback", "'Write a Review' → merchant reviews WonderBites (partner feedback)", body="PartnerFeedback", resp=O({"id*": "id=fb_1", "rating*": "int", "body*": "str", "createdAt*": "dt"}), code=201)

# Disputes
E("m-disputes", "GET", "/merchant/disputes", "Reports / Dispute tickets (tabs All/Open/In progress/Resolved/Closed)", q="branchId q status:enum(all,open,in_progress,resolved,closed) type:DisputeType sort page pageSize from to", lst="Dispute", lsum="DisputeSummary")
E("m-disputes", "POST", "/merchant/disputes", "Open dispute / report", body="DisputeInput", resp="Dispute", code=201)
E("m-disputes", "GET", "/merchant/disputes/{disputeId}", "View detail + thread", resp="DisputeDetail")
E("m-disputes", "POST", "/merchant/disputes/{disputeId}/replies", "Reply", body="MessageBody", resp="TicketMessage", code=201)
E("m-disputes", "POST", "/merchant/disputes/{disputeId}/close", "Close dispute", body=O({"note": "str"}), resp="Dispute")
E("m-disputes", "POST", "/merchant/disputes/{disputeId}/reopen", "Reopen dispute", resp="Dispute")

# Help
E("m-help", "GET", "/merchant/help/faqs", "Help FAQ (+ contact options in meta.contact)", q="q", lst="Faq", lsum=O({"contact": "[obj]#Contact options (phone, email, WhatsApp, hours)"}))
E("m-help", "GET", "/merchant/help/requests", "My help tickets", q="status:TicketStatus page pageSize", lst="HelpRequest")
E("m-help", "POST", "/merchant/help/requests", "Submit help request (form / Need Help drawer)", body="HelpRequestInput", resp="HelpRequest", code=201, desc="Returns { id, number, subject, status, createdAt }.")
E("m-help", "GET", "/merchant/help/requests/{requestId}", "Help ticket detail", resp=O({"request*": "HelpRequest", "messages*": "[TicketMessage]"}))

# Settings
E("m-settings", "GET", "/merchant/settings/profile", "Profile tab", resp="MerchantProfile")
E("m-settings", "PATCH", "/merchant/settings/profile", "Save Profile", body="MerchantProfile", resp="MerchantProfile")
E("m-settings", "GET", "/merchant/settings/store", "Store info tab", resp="StoreInfo")
E("m-settings", "PATCH", "/merchant/settings/store", "Save Store info", body="StoreInfoInput", resp="StoreInfo", roles=MO)
E("m-settings", "GET", "/merchant/settings/security", "Security tab", resp="MerchantSecurity", roles=MO)
E("m-settings", "PATCH", "/merchant/settings/security", "Update business email / password (email-verified)", body="MerchantSecurityInput", resp="MerchantSecurityResult", code=202, roles=MO)
E("m-settings", "GET", "/merchant/settings/operating-hours", "Operating Hours (per branch)", q="branchId*", resp="OperatingHours")
E("m-settings", "PUT", "/merchant/settings/operating-hours", "Save Operating Hours", q="branchId*", body="HoursBody", resp="OperatingHours", roles=MO)
E("m-settings", "GET", "/merchant/settings/language", "Language tab", resp="LanguageSetting")
E("m-settings", "PATCH", "/merchant/settings/language", "Save language", body="LanguageSetting", resp="LanguageSetting")


# ---- additions used by builders' screens (summary-only endpoints, meta, aliases)
for res, scr, sch, qq in [("drops", "a-drops", "DropSummary", "q status:DropStatus category city dietary merchantId:id from to"),
                          ("pickups", "a-pickups", "PickupSummary", "q status:PickupStatus category city dietary from to"),
                          ("orders", "a-orders", "OrderListSummary", "q status:OrderStatus category city dietary from to"),
                          ("merchants", "a-merchants", "MerchantListSummary", "q status:MerchantStatus category city from to"),
                          ("consumers", "a-consumers", "ConsumerSummary", "q status:ConsumerStatus city from to"),
                          ("cases", "a-issues", "CaseSummary", "kind:CaseKind severity:Severity from to"),
                          ("moderation", "a-mod", "ModerationSummary", "type:ModerationType from to")]:
    E(scr, "GET", f"/admin/{res}/summary", f"KPI tiles only ({res})", q=qq, resp=sch, desc="Same object as the list response `summary`; lets KPI tiles load independently of the table.")
E("a-drops", "GET", "/admin/ops/meta", "Filter options for operations screens (cities, categories, dietary, agents, refund policy)",
  resp=O({"cities*": "[City]", "markets": "[Country]#(v1.3) markets in scope", "categories*": "[Category]", "dietary*": "[Dietary]", "agents*": "[UserRef]", "refundPolicy": "RefundPolicyConfig"}),
  also=["a-pickups", "a-orders", "a-merchants", "a-consumers", "a-issues", "a-mod", "a-support"])
E("a-pickups", "POST", "/admin/pickups/{pickupId}/cancel", "Cancel pickup", body="ReasonBody", resp="Pickup", roles=A_W)
E("a-settings", "GET", "/admin/settings/profile", "Profile tab (Personal Info)", resp="AdminProfile")
E("a-settings", "PATCH", "/admin/settings/profile", "Save Profile", body="AdminProfile", resp="AdminProfile", desc="Alias of PATCH /me scoped to profile fields.")
E("m-orders", "POST", "/merchant/imports/preview", "Import dialog: validate file before import", body=O({"resource*": "enum(merchant.orders,merchant.customers,merchant.listings)", "fileId": "id", "rows": "int#mock only"}),
  resp=O({"resource*": "str", "rows*": "int=12", "valid*": "int=11", "errors*": "[ImportError]"}), also=["m-customers"])


# ---- shared additions / aliases (lead overlays + builders)
E("shell", "POST", "/shared/exports/{exportId}/complete", "MOCK ONLY — simulate export completion", resp="ExportJob", deprecated=True,
  desc="Exists only in the mock adapter to flip a job to `ready`; the real backend completes jobs itself and emits `export.ready`.")
E("shell", "GET", "/shared/help/faqs", "Need Help drawer FAQ (per portal)", q="portal:Portal q", resp="[Faq]", also=["m-help"])
E("shell", "POST", "/shared/support/tickets", "Need Help drawer → open support ticket", body=O({"subject*": "str", "message*": "str", "category": "str", "portal*": "Portal", "orderId": "id", "attachmentFileIds": "[id]"}),
  resp="Ticket", code=201, also=["m-help"])
# (v1.3) markets registry — Qatar launch market; UAE / KSA are enabled from Admin → Settings → Markets
E("shell", "GET", "/shared/markets", "Markets registry (currency, phone code, time zone, cities, VAT, enabled). Loaded at app boot", q="enabled:bool", resp="MarketList", roles=ANY, auth=False,
  desc="Public: the sign-up screen needs it. `enabled=true` returns only enabled markets. meta.reportingCurrency + meta.fx give the conversion settings for 'All markets' totals.")
E("shell", "GET", "/shared/markets/{code}", "One market", resp="Market", roles=ANY, auth=False)
E("a-settings", "GET", "/admin/settings/markets", "Settings → Markets: every market (enabled or not)", resp="MarketList", roles=A_W)
E("a-settings", "PATCH", "/admin/settings/markets/{code}", "Enable / disable a market, edit time zone, phone code, VAT", body="MarketUpdate", resp="Market", roles=SA,
  desc="Enabling takes effect immediately: the market appears in the admin market switcher, country/city filters, merchant sign-up and branch creation. 409 `conflict` when disabling the last enabled market or the market of the reporting currency.")
E("a-settings", "POST", "/admin/settings/markets/{code}/cities", "Add a city to a market", body="MarketCityInput", resp="MarketCity", code=201, roles=SA)
E("a-settings", "PATCH", "/admin/settings/markets/{code}/cities/{cityId}", "Rename / hide a city", body="MarketCityUpdate", resp="MarketCity", roles=SA)
E("a-settings", "GET", "/admin/settings/fx", "Reporting currency + manual FX rates", resp="FxSettings", roles=A_W)
E("a-settings", "PUT", "/admin/settings/fx", "Save reporting currency + FX rates", body="FxUpdate", resp="FxSettings", roles=SA)
E("a-settings", "POST", "/admin/settings/markets/reset", "Demo only: reset markets + FX to the launch defaults (QA enabled, AE/SA disabled)", resp="obj", roles=SA, desc="Mock/demo helper; not part of the production API.")
E("shell", "GET", "/merchant/me/branches", "Branch switcher options (header)", resp="[BranchOption]", roles=M, also=["m-ov"])
E("shell", "POST", "/uploads/presign", "Alias of POST /shared/uploads/presign", body="PresignRequest", resp="PresignResponse", deprecated=True)
E("shell", "POST", "/imports", "Alias of POST /shared/imports", body="ImportRequest", resp="ImportJob", code=202, roles=M, deprecated=True)


# ---- v1.1 reconciliation: endpoints added by D2 (admin-business mock)
E("a-fin", "GET", "/admin/financials/filter-options", "Financials filter row options (country → city → merchant → branch cascade)", resp="FinancialFilterOptions")
E("a-fin", "GET", "/admin/financials/payouts-settlements", "Payouts & Settlements card (period selector)", q=FQ + " period:PeriodPreset", resp="[Kpi]",
  desc="Same as FinancialsDashboard.payoutsSettlements: merchantGrossEarnings, amountPaid, pendingPayout, failedHeldPayouts, avgSettlementTime.")
E("a-fin", "GET", "/admin/financials/refunds-adjustments", "Refunds & Adjustments card (period selector)", q=FQ + " period:PeriodPreset", resp="[Kpi]",
  desc="Same as FinancialsDashboard.refundsAdjustments: refundAmount, refundRate, cancellationValue, creditsIssued, chargebacks.")
E("a-perf", "GET", "/admin/analytics/performance/merchants/{merchantId}", "Merchant performance detail drawer", q="from to", resp="MerchantPerformanceDetail")

# ---- v1.4 audit fixes
E("a-settings", "GET", "/admin/settings/commercial", "Settings → General → Commercial: platform commission (effective-dated) + contract overrides", resp="CommercialSettings", roles=A_W,
  desc="Default 19 %. Every mock financial figure (payouts, net earnings, commission revenue) is computed from the effective rate of each order date.")
E("a-settings", "PUT", "/admin/settings/commercial", "Schedule a new platform commission rate", body="CommercialUpdate", resp="CommercialSettings", roles=SA,
  desc="Closes the current period the day before `effectiveFrom`. 422 `validation_error` {defaultCommissionRate: range | effectiveFrom: order}.")
E("a-merchants", "GET", "/admin/merchants/{merchantId}/contract", "Merchant contract commission", resp="MerchantContract", roles=A_W)
E("a-merchants", "PUT", "/admin/merchants/{merchantId}/contract", "Set / clear a merchant contract commission rate", body="MerchantContractUpdate", resp="MerchantContract", roles=SA,
  desc="`commissionRate: null` returns the merchant to the platform default. Same effect as PATCH /admin/merchants/{id} {commissionRate}.")
E("shell", "POST", "/shared/demo/reservations", "Demo only: reserve a bag as a customer (stand-in for the consumer app checkout)", body="DemoReservationInput", resp="DemoReservationResult", code=201, roles=ANY,
  desc="Mock/demo helper; not part of the production API. Holds stock (reserved +qty, remaining −qty). 409 `sold_out` / `invalid_transition` when the listing is not active.")
TRANSITION = "409 `invalid_transition` `{from, to, allowed}` when the order state machine does not allow the move (terminal: completed, cancelled, refunded)."
for _e in EP:
    if _e["method"] == "POST" and any(_e["path"].endswith(x) for x in ("/assign-driver", "/complete", "/cancel", "/refund", "/ready", "/unassign-driver", "/confirm")) and "/orders/" in _e["path"]:
        _e["x409"] = "InvalidTransition"; _e["desc"] = ((_e["desc"] or "") + " " + TRANSITION).strip()
        if _e["path"].endswith("/complete") and _e["path"].startswith("/merchant"):
            _e["desc"] += " Self-pickup orders are completed only via POST /merchant/pickups/verify (`details.requires: pickup_verification`); delivery orders move out_for_delivery → delivered → completed."
for _e in EP:
    if _e["path"] in ("/merchant/pickups/verify", "/admin/pickups/{pickupId}/verify"):
        _e["x409"] = "PickupCode"
    if _e["path"] == "/admin/pickups/{pickupId}/verify":
        _e["desc"] = "Same helper as the merchant portal: verifies the code, marks it used and completes the order (one `pickup_verified` timeline event); response includes `order`. Wrong code → 200 `valid:false, reason: invalid_code`; 409 `code_used` / `invalid_transition`; 422 `code_expired`. Emits `pickup.verified`."
    if _e["path"] == "/auth/login":
        _e["desc"] += " Merchant accounts: 403 `pending_verification` (sign-up awaiting admin approval), `account_rejected`, `account_suspended`."
    if _e["path"] == "/auth/otp/verify":
        _e["desc"] = "For a merchant sign-up challenge the code only verifies the email: returns `{ verified: true, status: pending_verification, merchantId }` and no tokens — the merchant signs in after Admin → Merchants approves it."
    if _e["path"] == "/auth/merchant/signup":
        _e["desc"] = ((_e["desc"] or "") + " Creates a Pending verification merchant in Admin → Merchants (`source: self_signup`).").strip()
    if _e["path"] in ("/merchant/listings/{listingId}", "/admin/drops/{dropId}") and _e["method"] == "PATCH":
        _e["desc"] = ((_e["desc"] or "") + " `remaining` changes only when `quantity` changes (remaining = quantity − reserved − collected); 422 `validation_error` `{quantity: below_committed, committed}` below what is already reserved/collected.").strip()
    if _e["path"] == "/admin/settings/markets/{code}" and _e["method"] == "PATCH":
        _e["desc"] += " Also edits the market's support contacts (supportEmail, supportPhone, supportWhatsApp, supportHours) used by Need Help and merchant Help."

# ================================================================ REALTIME EVENTS
EVENTS = [
 ("order.status_changed", "Order status transition (both portals; merchant receives own branches)",
  O({"orderId*": "id=mo_5187", "number*": "str=MO-5187", "merchantId*": "id", "branchId*": "id", "from*": "OrderStatus", "to*": "OrderStatus",
     "fulfillment*": "FulfillmentType", "driver": "?DriverRef", "actor": "?UserRef", "at*": "dt"}), ["a-orders", "a-cc", "m-orders", "m-ov"]),
 ("pickup.verified", "Passport code verified at pickup",
  O({"pickupId*": "id", "orderId*": "id", "merchantId*": "id", "branchId*": "id", "consumer*": "Ref", "verifiedBy*": "UserRef", "method*": "enum(passport_scan,manual_code)", "at*": "dt"}), ["a-pickups", "a-cc", "m-orders"]),
 ("alert.created", "New priority alert / case (admin) or merchant alert",
  O({"alert*": "PriorityAlert", "caseId": "?id", "audience*": "enum(admin,merchant)", "merchantId": "?id"}), ["a-cc", "a-issues", "m-ov"]),
 ("ticket.updated", "Support ticket / dispute changed (status, assignee, new message)",
  O({"ticketId*": "id=SUP-8841", "kind*": "enum(support,dispute,help)", "changes*": "[str]#e.g. status, assignee, message", "status*": "str", "assignee": "?UserRef", "lastMessage": "?TicketMessage", "at*": "dt"}), ["a-support", "m-disputes", "m-help"]),
 ("payout.processed", "Payout paid / failed",
  O({"payoutId*": "id", "merchantId*": "id", "status*": "PayoutStatus", "net*": "Money", "reference": "?str", "failureReason": "?str", "at*": "dt"}), ["a-fin", "m-ov", "m-sales"]),
 ("notification.created", "New notification for the current user", "Notification", ["shell"]),
 ("export.ready", "Export job finished", "ExportJob", ["shell"]),
]

# (v1.3) market convention: every admin-portal read accepts `market` (also global search)
for _e in EP:
    if _e["method"] == "GET" and (_e["path"].startswith("/admin/") or _e["path"] == "/shared/search") and "market" not in [t.split(":")[0].rstrip("*") for t in _e["q"]]:
        _e["q"].append("market")

