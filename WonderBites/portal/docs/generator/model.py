# WonderBites API model: enums, schemas, endpoints. Single source for openapi.yaml, api.html, API_CONTRACT.md
import json

# ---------------------------------------------------------------- enums
ENUMS = {
 "Currency": ("QAR QAR SAR", "Money currency"),
 "Language": ("en ar", "UI / content language"),
 "Role": ("super_admin operations_admin support_agent read_only merchant_owner merchant_staff", "Access role"),
 "Portal": ("admin merchant", "Portal"),
 "Country": ("AE QA SA", "ISO country"),
 "Category": ("bakery restaurant grocery cafe desserts meals produce prepared_foods deli meat_poultry beverages other", "Food / business category"),
 "Dietary": ("vegetarian vegan halal gluten_free dairy_free nut_free", "Dietary tag (fixes 'Dietary tages')"),
 "DropStatus": ("live scheduled sold_out completed expired draft flagged paused removed", "Admin Drops pill (live = 'Active')"),
 "PickupStatus": ("upcoming ready verified picked_up missed flagged cancelled", "Admin Pickups pill (ready = 'Ready for Pickup')"),
 "OrderStatus": ("reserved confirmed ready_for_pickup driver_assigned out_for_delivery picked_up delivered completed failed cancelled no_show refunded partially_refunded", "Order pill (admin + merchant). Labels: reserved='Placed' (KPI 'Pending Confirmation'), confirmed='Confirmed'/'Processing', ready_for_pickup='Ready'. Merchant table shows 'Unassigned' when fulfillment=delivery and delivery.assignment=unassigned"),
 "PaymentStatus": ("paid pending authorized failed refunded partially_refunded", "Payment state"),
 "PaymentMethodType": ("card apple_pay google_pay wallet", "Payment method"),
 "CardBrand": ("visa mastercard amex mada", "Card brand"),
 "FulfillmentType": ("pickup delivery", "Fulfillment chip (pickup = 'Self-Pickup', delivery = 'Driver Delivery')"),
 "DriverAssignment": ("unassigned assigned", "Delivery driver assignment"),
 "MerchantStatus": ("pending verified active suspended rejected inactive", "Merchant pill"),
 "QualityBadge": ("excellent good watch needs_review", "Merchant quality / performance pill"),
 "ConsumerStatus": ("active inactive blocked deleted", "Consumer / customer pill"),
 "WalletStatus": ("active frozen blocked", "Wallet pill"),
 "WalletSource": ("promotional refund compensation referral adjustment", "Wallet credit source"),
 "WalletTxnType": ("credit debit adjustment refund expiry voucher", "Wallet transaction type"),
 "VoucherType": ("percentage fixed free_bag", "Voucher type"),
 "VoucherStatus": ("draft scheduled active frozen expired exhausted", "Voucher pill"),
 "CertificateStatus": ("valid expiring_soon expired missing pending_review rejected", "Food-safety / certificate pill"),
 "CertificateType": ("food_safety trade_license health_permit halal hygiene_training other", "Certificate type"),
 "ComplianceStatus": ("compliant expiring_soon expired non_compliant under_review", "Compliance pill"),
 "ComplianceAction": ("warn request_documents schedule_inspection suspend clear", "Compliance action"),
 "Severity": ("critical high medium low", "Severity chip. Labels: critical='Critical', high='Warning', medium='Information', low='Low'"),
 "CaseKind": ("issue alert moderation", "Issues & Alerts tab"),
 "CaseStatus": ("open in_progress escalated resolved closed", "Case / moderation pill"),
 "ModerationType": ("listing review user merchant", "Moderation tab (Listings / Reviews / User Behaviour / Merchant Profile)"),
 "ReporterSource": ("automated_filter consumer_report merchant_report system_pattern onboarding_team compliance_check admin", "Who reported"),
 "AlertType": ("merchant warning information monitor", "Priority alert category"),
 "TicketChannel": ("in_app email chat phone social", "Support channel"),
 "TicketPriority": ("urgent high medium low", "Ticket priority tab/pill (medium = 'Normal')"),
 "TicketStatus": ("open pending in_progress escalated resolved closed", "Ticket pill"),
 "PayoutStatus": ("scheduled pending processing paid failed on_hold", "Payout pill"),
 "RefundStatus": ("requested approved rejected processed failed", "Refund pill"),
 "RefundOutcome": ("full_refund partial_refund wallet_credit manual_review no_refund", "Refund policy outcome"),
 "RefundReason": ("store_closed box_unavailable serious_food_concern app_payment_issue missed_collection late_cancellation change_of_mind personal_preference wrong_location", "Refund reason (policy configuration rows)"),
 "RefundDestination": ("original_payment wallet_credit", "Where refund goes"),
 "TemplateStatus": ("published draft archived", "Template pill (published = 'Active')"),
 "TemplateFieldType": ("text number select multiselect photo date time_range boolean", "Template field input type"),
 "CmsType": ("page banner faq legal", "CMS type chip"),
 "CmsStatus": ("draft scheduled published archived", "CMS pill"),
 "Audience": ("all_users star_users premium_users new_users merchants", "Banner / voucher target audience"),
 "UserStatus": ("active invited suspended", "Admin user pill"),
 "ListingStatus": ("draft active paused sold_out disabled expired", "Listing (bag) pill"),
 "StockStatus": ("in_stock low_stock sold_out paused expired", "Inventory status donut segment"),
 "ListingType": ("surprise_bag fixed_item bundle", "Listing type"),
 "Availability": ("available_now daily scheduled recurring", "Listing availability"),
 "DriverStatus": ("available on_delivery offline inactive", "Driver pill"),
 "VehicleType": ("bicycle motorbike car van", "Driver vehicle"),
 "BranchState": ("open closed temporarily_closed", "Branch open/closed state"),
 "VendorStatus": ("active pending suspended inactive", "Vendor pill"),
 "ReviewStatus": ("published replied reported hidden", "Review state"),
 "ReviewSort": ("newest oldest highest lowest", "Review sort"),
 "DisputeStatus": ("open in_review awaiting_merchant resolved closed", "Reports/Dispute pill (in_review = 'In progress')"),
 "DisputeType": ("refund_request order_issue payment app_issue account other", "Dispute type"),
 "DayPayoutStatus": ("pending paid", "Payout pill in day breakdown"),
 "ExportFormat": ("csv xlsx pdf", "Export format"),
 "ExportStatus": ("queued processing ready failed expired", "Export job state"),
 "ExportScope": ("current_page filtered all", "Export scope"),
 "ImportStatus": ("queued validating processing completed completed_with_errors failed", "Import job state"),
 "UploadPurpose": ("listing_image product_image banner certificate avatar branch_photo merchant_logo import attachment", "Upload purpose"),
 "NotificationType": ("order pickup alert issue ticket payout export review inventory system", "Notification type"),
 "Granularity": ("hourly daily weekly monthly", "Chart bucket"),
 "PeriodPreset": ("today 7d 30d this_week this_month 3m 6m custom", "Period selector"),
 "KpiFormat": ("number money percent duration_minutes duration_hours days rating weight_kg tonnes litres gallons", "How to format Kpi.value"),
 "DeltaUnit": ("pct pp abs minutes hours days", "Unit of Kpi.delta"),
 "Trend": ("up down flat", "Delta direction"),
 "PassportSegment": ("active_verified expiring_soon needs_attention inactive", "Pickup passport donut segment"),
 "Weekday": ("mon tue wed thu fri sat sun", "Day of week"),
 "SearchScope": ("all drops merchants orders pickups consumers tickets cases listings customers", "Global search scope"),
 "PolicyKey": ("refund about privacy terms", "Policy page"),
 "StreamEvent": ("order.status_changed pickup.verified alert.created ticket.updated payout.processed notification.created export.ready", "Realtime event type"),
}

def enum_values(n): return ENUMS[n][0].split()

# ---------------------------------------------------------------- shorthand -> JSON schema
BASE = {
 "str": {"type": "string"}, "int": {"type": "integer"}, "num": {"type": "number"}, "bool": {"type": "boolean"},
 "dt": {"type": "string", "format": "date-time"}, "date": {"type": "string", "format": "date"},
 "time": {"type": "string", "pattern": "^[0-2][0-9]:[0-5][0-9]$"}, "uri": {"type": "string", "format": "uri"},
 "email": {"type": "string", "format": "email"}, "id": {"type": "string"}, "pct": {"type": "number", "description": "Percent 0-100"},
 "html": {"type": "string", "description": "Sanitised HTML (rich text)"}, "obj": {"type": "object", "additionalProperties": True},
 "any": {},
}

def S(t):
    if isinstance(t, dict):
        return t
    desc = None
    if "#" in t:
        t, desc = t.split("#", 1)
    ex = None
    if "=" in t:
        t, ex = t.split("=", 1)
    nullable = t.startswith("?")
    if nullable:
        t = t[1:]
    if t.startswith("["):
        sch = {"type": "array", "items": S(t[1:-1])}
    elif t.startswith("enum("):
        sch = {"type": "string", "enum": t[5:-1].split(",")}
    elif t in BASE:
        sch = dict(BASE[t])
    elif t[0].isupper():
        sch = {"$ref": "#/components/schemas/" + t}
    else:
        raise ValueError("bad type " + t)
    if nullable:
        if "$ref" in sch:
            sch = {"anyOf": [sch, {"type": "null"}]}
        else:
            sch["type"] = [sch["type"], "null"]
    if ex is not None:
        try:
            v = json.loads(ex)
        except Exception:
            v = ex
        if sch.get("type") in ("string", ["string", "null"]) and not isinstance(v, str):
            v = ex  # keep string-typed examples as strings (e.g. phone "501112233", version "3")
        sch["examples"] = [v]
    if desc:
        sch["description"] = desc.strip()
    return sch

def O(props, desc=None):
    req, p = [], {}
    for k, v in props.items():
        if k.endswith("*"):
            k = k[:-1]; req.append(k)
        p[k] = S(v)
    o = {"type": "object", "properties": p}
    if req: o["required"] = req
    if desc: o["description"] = desc
    return o

SCHEMAS = {}
def schema(name, props, desc=None):
    SCHEMAS[name] = O(props, desc)

# ---------------------------------------------------------------- common schemas
SCHEMAS["Money"] = {"type": "object", "required": ["amount", "currency"], "description": "Money value",
    "properties": {"amount": {"type": "number", "examples": [15]}, "currency": {"$ref": "#/components/schemas/Currency"}}}
schema("LocalizedText", {"en*": "str=Deli Surprise Box", "ar*": "str=صندوق المفاجآت"}, "Localized content field")
schema("Ref", {"id*": "id=mer_094", "name*": "str=Sunrise Bakehouse"}, "Lightweight reference")
schema("UserRef", {"id*": "id=usr_118", "name*": "str=Dana K.", "avatarUrl": "?uri"})
schema("TimeWindow", {"start*": "time=20:00", "end*": "time=21:00"}, "Local pickup window (branch time zone)")
schema("Phone", {"countryCode*": "str=+974", "number*": "str=55112233"})
schema("Address", {"line1*": "str=Al Corniche St 214, West Bay", "city*": "str=Doha", "state": "str", "postalCode": "str", "country*": "Country", "lat": "num=25.2048", "lng": "num=55.2708"})
schema("Kpi", {"key*": "str=liveDrops", "label*": "str=Live Drops", "value*": "num=18", "format*": "KpiFormat", "currency": "Currency",
    "delta": "num=3", "deltaUnit": "DeltaUnit", "trend": "Trend", "comparison": "str=vs. yesterday#Caption after delta",
    "caption": "str=Across all restaurants#Secondary caption", "sparkline": "[num]", "badge": "str=01 Critical"}, "KPI tile / metric row")
schema("SeriesPoint", {"x*": "str=2026-07-20#ISO date / datetime / label", "y*": "num=220342.76"})
schema("Series", {"key*": "str=revenue", "label*": "str=Revenue (QAR)", "kind": "enum(line,bar,area)", "unit": "KpiFormat", "points*": "[SeriesPoint]"})
schema("Segment", {"key*": "str=commission", "label*": "str=Commission", "value*": "num=90.1", "share": "pct=90.1"}, "Donut / distribution segment")
schema("FunnelStep", {"key*": "str=reserved", "label*": "str=Reserved", "value*": "int=12480", "rate": "pct=100"})
schema("Activity", {"id*": "id", "action*": "str=listing.updated", "label*": "str=Listing updated", "actor": "UserRef", "at*": "dt", "meta": "obj"}, "Timeline entry")
schema("Note", {"id*": "id", "body*": "str", "author*": "UserRef", "createdAt*": "dt"})
schema("Attachment", {"fileId*": "id=fil_77", "name*": "str=receipt.jpg", "url*": "uri", "contentType": "str=image/jpeg", "size": "int"})
SCHEMAS["Error"] = {"type": "object", "required": ["error"], "properties": {"error": O({"code*": "enum(validation_error,unauthorized,forbidden,not_found,conflict,policy_violation,rate_limited,internal)",
    "message*": "str=Pickup code does not match", "details": "obj#Field errors: { field: message }"})}}
schema("BulkResult", {"updated*": "int=3", "failed*": "[BulkFailure]"})
schema("BulkFailure", {"id*": "id", "error*": "str"})
schema("ReasonBody", {"reason": "str=Repeated missed pickup windows", "notify": "bool=true"})
schema("Ok", {"ok*": "bool=true"})

# ---------------------------------------------------------------- auth / shared
schema("User", {"id*": "id=usr_001", "firstName*": "str=Sarah", "lastName*": "str=Al Manasoori", "name*": "str=Sarah Al Manasoori", "email*": "email=sarah@wonderbites.example.com",
    "phone": "Phone", "avatarUrl": "?uri", "role*": "Role", "portal*": "Portal", "language*": "Language", "theme": "enum(night,day)", "twoFactorEnabled": "bool",
    "merchant": "?MerchantContext", "permissions*": "[str]#e.g. drops:write, refunds:approve"})
schema("MerchantContext", {"merchantId*": "id=mer_201", "name*": "str=Fig & Bloom Bakery", "logoUrl": "?uri", "verified": "bool=true", "defaultBranchId": "id=br_alwasl",
    "branches*": "[Ref]", "currency*": "Currency"})
schema("LoginRequest", {"email*": "email", "password*": "str", "portal*": "Portal", "remember": "bool=true"})
schema("AuthTokens", {"accessToken*": "str=eyJhbGciOi...", "refreshToken*": "str=rt_9f2c...", "expiresIn*": "int=900#seconds", "user*": "User"})
schema("LoginResponse", {"requires2fa*": "bool=false", "challengeId": "?str#Present when requires2fa", "sentTo": "?str=+974 •• ••• 2233",
    "accessToken": "str", "refreshToken": "str", "expiresIn": "int", "user": "User"})
schema("OtpVerify", {"challengeId*": "str=chl_31", "code*": "str=482913", "trustDevice": "bool"})
schema("SignupRequest", {"businessName*": "LocalizedText", "ownerFirstName*": "str", "ownerLastName*": "str", "email*": "email", "phone*": "Phone", "password*": "str",
    "country*": "Country", "city*": "str", "category*": "Category", "tradeLicenseNo": "str", "acceptTerms*": "bool=true"})
schema("SignupResponse", {"merchantId*": "id", "status*": "MerchantStatus", "challengeId*": "str#Email/phone OTP challenge"})
schema("ProfileUpdate", {"firstName": "str", "lastName": "str", "email": "email", "phone": "Phone", "avatarFileId": "?id", "language": "Language", "theme": "enum(night,day)"})
schema("PasswordChange", {"currentPassword*": "str", "newPassword*": "str", "confirmPassword*": "str"})
schema("PasswordChangeResult", {"verificationSentTo*": "email#Password change confirmed via emailed secure link"})
schema("Notification", {"id*": "id=ntf_51", "type*": "NotificationType", "title*": "str=3 bags sold out", "body": "str=Artisan Bread Bag reached zero stock",
    "severity": "Severity", "link": "DeepLink", "read*": "bool=false", "createdAt*": "dt"})
schema("DeepLink", {"route*": "str=admin-orders#Hash route name", "id": "?id", "params": "obj"})
schema("SearchResult", {"groups*": "[SearchGroup]"})
schema("SearchGroup", {"type*": "SearchScope", "label*": "str=Merchants", "total*": "int", "items*": "[SearchItem]"})
schema("SearchItem", {"id*": "id", "title*": "str=Sunrise Bakehouse", "subtitle": "str=MER-094 · Doha", "link*": "DeepLink"})
schema("ExportRequest", {"resource*": "str=admin.drops#Resource key (see x-exportResources)", "format*": "ExportFormat", "scope*": "ExportScope",
    "columns": "[str]", "filters": "obj#Same query params as the list endpoint", "from": "dt", "to": "dt", "branchId": "id"})
schema("ExportJob", {"id*": "id=exp_812", "resource*": "str", "format*": "ExportFormat", "status*": "ExportStatus", "progress*": "pct=100", "rows": "int",
    "fileName": "str=drops-2026-07-20.csv", "downloadUrl": "?uri", "createdAt*": "dt", "expiresAt": "dt"})
schema("ImportRequest", {"resource*": "enum(merchant.orders,merchant.customers,merchant.listings)", "fileId*": "id", "dryRun": "bool=false", "branchId": "id"})
schema("ImportJob", {"id*": "id=imp_20", "resource*": "str", "status*": "ImportStatus", "total": "int", "processed*": "int", "failed*": "int",
    "errors": "[ImportError]", "createdAt*": "dt"})
schema("ImportError", {"row*": "int=14", "field": "str=email", "message*": "str"})
schema("PresignRequest", {"fileName*": "str=pastry.webp", "contentType*": "str=image/webp", "size*": "int=812000#bytes (max 5 MB images, 20 MB docs)", "purpose*": "UploadPurpose"})
schema("PresignResponse", {"fileId*": "id=fil_77", "uploadUrl*": "uri", "method*": "enum(PUT,POST)", "headers": "obj", "fileUrl*": "uri", "expiresAt*": "dt"})
schema("LanguageSetting", {"language*": "Language"})
schema("ImpactSummary", {"period*": "str=2026-07", "mealsSaved*": "int=52400", "co2Tonnes*": "num=24.1", "waterLitres*": "num=11800", "foodKg": "num"}, "Sidebar 'This month's impact' card")
schema("EnumCatalog", {"enums*": "obj#{ EnumName: [{ value, label }] } localized by Accept-Language"})
schema("BranchOption", {"id*": "id=all#`all` = every branch", "name*": "LocalizedText", "city": "str=Doha", "state": "BranchState", "isPrimary": "bool"})
schema("City", {"id*": "id=dubai", "name*": "str=Doha", "country*": "Country"})
schema("StreamEnvelope", {"id*": "id=evt_9001", "type*": "StreamEvent", "occurredAt*": "dt", "data*": "obj"})

# ---------------------------------------------------------------- admin: dashboard
schema("PriorityAlert", {"id*": "id=alt_1187", "title*": "str=Green Bowl Kitchen — spoiled inventory reported", "type*": "AlertType", "severity*": "Severity",
    "source": "str=Merchant · Critical", "subtitle": "str=15 min left", "link": "DeepLink", "createdAt*": "dt"})
schema("LiveDropRow", {"dropId*": "id=drp_3021", "title*": "str=Morning Pastry Box", "imageUrl": "?uri", "merchant*": "Ref", "location*": "str=Al Corniche St",
    "pickupWindow*": "TimeWindow", "status*": "DropStatus", "reserved*": "int=24", "pickedUp*": "int=18"})
schema("PassportMonitoring", {"total*": "int=1842", "segments*": "[Segment]#keys = PassportSegment", "attentionCount*": "int=78"})
schema("IssueAlertRow", {"id*": "id=ISS-1092", "type*": "str=Spoiled inventory", "merchant*": "Ref", "status*": "str=blocked", "createdAt*": "dt"})
schema("MerchantQualityRow", {"merchant*": "Ref", "score*": "num=24", "sparkline*": "[num]", "badge*": "QualityBadge"})
schema("SustainabilityTiles", {"mealsSaved*": "Kpi", "co2Offset*": "Kpi", "waterSaved*": "Kpi", "wasteDiverted*": "Kpi", "equivalentCarMiles": "int=9300", "equivalentText": "str"})
schema("CommandCenter", {"kpis*": "[Kpi]#liveDrops, reservedToday, pickupsCompleted, openIssues, dropAccuracy", "priorityAlerts*": "[PriorityAlert]",
    "recentOrders*": "[LiveDropRow]", "passportMonitoring*": "PassportMonitoring", "issueAlerts*": "[IssueAlertRow]",
    "dropAccuracy*": "DropAccuracyCard", "merchantQualityWatch*": "[MerchantQualityRow]", "sustainability*": "SustainabilityTiles"})
schema("DropAccuracyCard", {"value*": "pct=96.4", "delta": "num=1.2", "deltaUnit": "DeltaUnit", "period*": "PeriodPreset", "series*": "Series"})

# ---------------------------------------------------------------- admin: drops / pickups / orders
schema("Drop", {"id*": "id=drp_3391", "code*": "str=DR-3391", "title*": "LocalizedText", "imageUrl": "?uri", "merchant*": "Ref", "branch*": "Ref", "category*": "Category",
    "dietary*": "[Dietary]", "city*": "str=Doha", "price*": "Money", "originalPrice*": "Money", "discountPct*": "pct=67", "quantity*": "int=20", "reserved*": "int=14",
    "collected": "int=10", "remaining*": "int=6", "pickupWindow*": "TimeWindow", "date*": "date", "status*": "DropStatus", "flagged*": "bool=false", "flagReason": "?str",
    "createdAt*": "dt", "updatedAt*": "dt"})
schema("DropDetail", {"drop*": "Drop", "description": "LocalizedText", "allergens": "[str]", "reservations*": "[OrderSummary]", "activity*": "[Activity]"})
schema("DropUpdate", {"title": "LocalizedText", "category": "Category", "dietary": "[Dietary]", "price": "Money", "originalPrice": "Money", "quantity": "int",
    "pickupWindow": "TimeWindow", "date": "date", "status": "DropStatus"})
schema("DropSummary", {"totalDrops*": "int=10", "bagsAvailableNow*": "int=14", "reserved*": "int=82", "collected*": "int=53", "flaggedForReview*": "int=2"})
schema("FlagBody", {"reason*": "str=Misleading photo", "severity": "Severity"})
schema("BulkDropAction", {"ids*": "[id]", "action*": "enum(delete,flag,unflag,pause,activate)", "reason": "str"})
schema("Pickup", {"id*": "id=pk_58183", "code*": "str=PK-58183", "orderId*": "id=ord_77410", "bagTitle*": "str=Deli Surprise Box", "consumer*": "Ref", "merchant*": "Ref",
    "branch*": "Ref", "city*": "str=Doha", "window*": "TimeWindow", "date*": "date", "passportCode*": "str=K3D8E1#Pickup passport code (shown masked for read_only)",
    "status*": "PickupStatus", "verifiedAt": "?dt", "verifiedBy": "?UserRef"})
schema("PickupDetail", {"pickup*": "Pickup", "order*": "OrderSummary", "activity*": "[Activity]"})
schema("PickupSummary", {"totalToday*": "int=10", "completed*": "int=14", "upcomingReady*": "int=82", "missed*": "int=53", "onTimeRate*": "pct=92.4"})
schema("VerifyCode", {"code*": "str=K3D8E1"})
schema("VerifyResult", {"valid*": "bool=true", "pickup": "Pickup", "message": "str"})
schema("PaymentInfo", {"method*": "PaymentMethodType", "brand": "?CardBrand", "last4": "?str=\"6620\"", "status*": "PaymentStatus", "transactionId": "str"})
schema("OrderItem", {"listingId*": "id", "title*": "str=Deli Surprise Box", "qty*": "int=1", "unitPrice*": "Money", "originalPrice": "Money"})
schema("Delivery", {"address": "?Address", "addressNote": "str=Address on file with customer profile", "assignment*": "DriverAssignment", "driver": "?DriverRef"})
schema("DriverRef", {"id*": "id=drv_04", "name*": "str=Rashid Al Ketbi", "vehicle*": "VehicleType", "phone": "str"})
schema("OrderSummary", {"id*": "id=ord_77410", "number*": "str=ORD-77410", "bagTitle*": "str=Deli Surprise Box", "consumer*": "Ref", "merchant*": "Ref", "branch*": "Ref",
    "city*": "str=Doha", "amount*": "Money", "payment*": "PaymentInfo", "fulfillment*": "FulfillmentType", "delivery": "?Delivery", "pickupWindow*": "TimeWindow",
    "status*": "OrderStatus", "placedAt*": "dt"})
schema("Order", {"id*": "id", "number*": "str=MO-5187", "consumer*": "Ref", "merchant*": "Ref", "branch*": "Ref", "items*": "[OrderItem]", "subtotal*": "Money",
    "fees": "Money", "discount": "Money", "walletCreditUsed": "Money", "voucherCode": "?str", "total*": "Money", "refunded": "Money", "payment*": "PaymentInfo",
    "fulfillment*": "FulfillmentType", "delivery": "?Delivery", "pickupWindow*": "TimeWindow", "pickupCode": "?str", "status*": "OrderStatus",
    "timeline*": "[Activity]", "placedAt*": "dt", "updatedAt*": "dt"})
schema("OrderListSummary", {"totalOrders*": "int=10", "revenue*": "Money", "avgOrderValue*": "Money", "refundedCancelled*": "int=2", "pendingConfirmation*": "int=2"})
schema("RefundEligibility", {"eligible*": "bool", "maxAmount*": "Money", "suggestedOutcome*": "RefundOutcome", "policyRule": "RefundRule",
    "freeCancellationHours": "int=2", "requiresApproval*": "bool=false#e.g. already picked-up orders", "reasons*": "[str]#Human-readable policy checks"})
schema("RefundRequest", {"reason*": "RefundReason", "amount*": "Money", "destination*": "RefundDestination", "note": "str", "approved": "bool#Manager approval (required when eligibility.requiresApproval)", "overridePolicy": "bool=false#super_admin only"})
schema("CancelRequest", {"reason*": "str", "refund": "bool=true", "destination": "RefundDestination", "notifyCustomer": "bool=true"})

# ---------------------------------------------------------------- merchants (admin)
schema("MerchantSummary", {"id*": "id=mer_094", "code*": "str=MER-094", "name*": "LocalizedText", "logoUrl": "?uri", "category*": "Category", "city*": "str=Doha",
    "country*": "Country", "qualityScore": "?num=94#null renders '--'", "dropsCount*": "int=38", "revenue*": "Money", "commissionRate*": "pct=20",
    "status*": "MerchantStatus", "complianceStatus": "ComplianceStatus", "joinedAt*": "dt"})
schema("MerchantListSummary", {"total*": "int=10", "pendingVerification*": "int=62", "verifiedActive*": "int=4", "suspended*": "int=1", "avgQualityScore*": "num=82"})
schema("Merchant", {"id*": "id", "code*": "str", "name*": "LocalizedText", "logoUrl": "?uri", "category*": "Category", "description": "LocalizedText",
    "legal*": "MerchantLegal", "contact*": "MerchantContact", "address*": "Address", "banking": "Banking", "commissionRate*": "pct=20", "status*": "MerchantStatus",
    "statusReason": "?str", "qualityScore": "?num", "rating": "num=4.7", "branchesCount*": "int", "joinedAt*": "dt", "verifiedAt": "?dt"})
schema("MerchantLegal", {"legalName*": "str", "tradeLicenseNo*": "str=CN-1234567", "vatNo": "str", "licenseExpiresAt": "date"})
schema("MerchantContact", {"ownerName*": "str=Sara Haddad", "email*": "email", "phone*": "Phone"})
schema("Banking", {"bankName*": "str=Emirates NBD", "accountName*": "str", "iban*": "str=QA00 DEMO 0000 0000 0000 0000 0000 000", "payoutSchedule": "enum(weekly,biweekly,monthly)"})
schema("MerchantCreate", {"business*": O({"name*": "LocalizedText", "category*": "Category", "description": "LocalizedText", "logoFileId": "id"}),
    "legal*": "MerchantLegal", "contact*": "MerchantContact", "address*": "Address", "branches": "[BranchInput]", "banking*": "Banking",
    "documents": "[DocumentInput]", "commissionRate*": "pct=20", "sendInvite": "bool=true"})
schema("DocumentInput", {"type*": "CertificateType", "fileId*": "id", "number": "str", "expiresAt": "date"})
schema("MerchantUpdate", {"name": "LocalizedText", "category": "Category", "description": "LocalizedText", "legal": "MerchantLegal", "contact": "MerchantContact",
    "address": "Address", "banking": "Banking", "commissionRate": "pct"})
schema("MerchantDetailOverview", {"kpis*": "[Kpi]", "salesTrend*": "Series", "ratingSummary*": "RatingSummary", "openCases*": "int", "complianceStatus*": "ComplianceStatus"})

# ---------------------------------------------------------------- consumers / wallet / vouchers
schema("Consumer", {"id*": "id=con_48291", "name*": "str=Aisha Al Mansoori", "phone*": "str=+974 5550 2233", "email*": "email=aisha.mansoori@example.com",
    "city": "str=Doha", "createdAt*": "dt", "ordersCount*": "int=8", "rescueScore*": "int=95", "walletBalance": "Money", "totalSpent": "Money",
    "status*": "ConsumerStatus", "lastOrderAt": "?dt"})
schema("ConsumerDetail", {"consumer*": "Consumer", "recentOrders*": "[OrderSummary]", "wallet": "?Wallet", "notes*": "[Note]", "activity*": "[Activity]"})
schema("ConsumerUpdate", {"name": "str", "phone": "str", "email": "email", "city": "str"})
schema("ConsumerSummary", {"totalUsers*": "int=10", "active*": "int=7", "inactive*": "int=4", "blocked*": "int=1", "avgRescueScore*": "num=82"})
schema("Wallet", {"id*": "id=wal_12", "consumer*": "Ref", "balance*": "Money", "source*": "WalletSource#Most recent credit source", "lastTransactionAt*": "dt",
    "lifetimeCredit": "Money", "status*": "WalletStatus", "frozenReason": "?str"})
schema("WalletTxn", {"id*": "id", "type*": "WalletTxnType", "source": "WalletSource", "amount*": "Money", "balanceAfter*": "Money", "reason": "str",
    "orderId": "?id", "expiresAt": "?dt", "actor": "?UserRef", "createdAt*": "dt"})
schema("WalletDetail", {"wallet*": "Wallet", "transactions*": "[WalletTxn]"})
schema("WalletSummary", {"totalWalletBalance*": "Money", "activeVouchers*": "int=2", "voucherRedemptions*": "int=1453", "avgBalancePerUser*": "Money", "walletUsers*": "int=5"})
schema("IssueCredit", {"consumerIds*": "[id]", "amount*": "Money", "source*": "WalletSource", "reason*": "str", "expiresAt": "?date", "notify": "bool=true"})
schema("WalletAdjust", {"direction*": "enum(credit,debit)", "amount*": "Money", "reason*": "str"})
schema("Voucher", {"id*": "id=vch_1", "code*": "str=WELCOME20", "name": "LocalizedText", "type*": "VoucherType", "value*": "num=20#percent or amount",
    "valueMoney": "?Money#for fixed", "minOrder": "?Money", "maxDiscount": "?Money", "usageLimit*": "int=1000", "perUserLimit": "int=1", "used*": "int=642",
    "audience*": "Audience", "merchantIds": "[id]", "cities": "[str]", "startsAt": "dt", "expiresAt*": "dt", "status*": "VoucherStatus", "createdAt*": "dt"})
schema("VoucherInput", {"code*": "str=RAMADAN10", "name": "LocalizedText", "type*": "VoucherType", "value*": "num", "minOrder": "Money", "maxDiscount": "Money",
    "usageLimit*": "int", "perUserLimit": "int", "audience*": "Audience", "merchantIds": "[id]", "cities": "[str]", "startsAt": "dt", "expiresAt*": "dt",
    "status": "enum(draft,scheduled,active)"})
schema("VoucherDetail", {"voucher*": "Voucher", "redemptions*": "[VoucherRedemption]"})
schema("VoucherRedemption", {"orderId*": "id", "consumer*": "Ref", "discount*": "Money", "at*": "dt"})

# ---------------------------------------------------------------- quality & safety
schema("Certificate", {"id*": "id=cert_5", "type*": "CertificateType", "number": "str", "issuedAt": "date", "expiresAt*": "date", "status*": "CertificateStatus",
    "file": "?Attachment", "reviewedBy": "?UserRef", "reviewNote": "?str"})
schema("ComplianceRow", {"merchant*": "Ref", "merchantCode*": "str=DR-3391", "logoUrl": "?uri", "category*": "Category", "city*": "str=Doha",
    "foodSafety*": "CertificateStatus", "hygieneScore*": "num=14", "hygieneMax*": "num=20", "openIndicators*": "int=1", "compliance*": "ComplianceStatus",
    "nextExpiry": "?date", "lastInspectionAt": "?dt"})
schema("ComplianceSummary", {"monitored*": "int=10", "compliant*": "int=7", "nonCompliant*": "int=2", "expiringCertificates*": "int=4", "avgHygieneScore*": "num=16.2"})
schema("Indicator", {"key*": "str=temperature_alerts", "label*": "str=Temperature alerts", "count*": "int=3", "severity*": "Severity", "open*": "bool"})
schema("ComplianceDetail", {"row*": "ComplianceRow", "certificates*": "[Certificate]", "indicators*": "[Indicator]", "hygieneHistory*": "Series", "actions*": "[Activity]"})
schema("CertificateInput", {"type*": "CertificateType", "number": "str", "issuedAt": "date", "expiresAt*": "date", "fileId*": "id"})
schema("ComplianceActionBody", {"action*": "ComplianceAction", "note": "str", "dueAt": "?date"})
schema("HygieneScoreBody", {"score*": "num=16", "max": "num=20", "inspectedAt*": "dt", "note": "str"})

# ---------------------------------------------------------------- cases / moderation
schema("Case", {"id*": "id=ISS-2291", "kind*": "CaseKind", "moderationType": "?ModerationType", "title*": "str=Recurring missed pickup windows",
    "description": "str", "merchant": "?Ref", "entity": "?EntityRef", "reporter": "?ReporterSource", "severity*": "Severity", "status*": "CaseStatus",
    "assignee": "?UserRef", "reportedAt*": "dt", "ageHours*": "num=2", "slaDueAt": "?dt", "updatedAt*": "dt"})
schema("EntityRef", {"type*": "enum(drop,order,pickup,listing,review,consumer,merchant,ticket)", "id*": "id", "name*": "str"})
schema("CaseDetail", {"case*": "Case", "notes*": "[Note]", "activity*": "[Activity]", "related*": "[EntityRef]"})
schema("CaseSummary", {"critical*": "int=5", "needsReview*": "int=4", "underMonitoring*": "int=5", "totalOpen*": "int=14"})
schema("AssignBody", {"assigneeId*": "id"})
schema("ResolveBody", {"resolution*": "str", "note": "str", "notifyReporter": "bool=true"})
schema("EscalateBody", {"to*": "enum(trust_safety,operations_lead,legal,finance,super_admin)", "note": "str", "raiseSeverity": "bool=false#Raise to critical"})
schema("NoteBody", {"body*": "str"})
schema("ModerationItem", {"id*": "id=MOD-0552", "type*": "ModerationType", "reportedItem*": "EntityRef", "reason*": "str=Misleading photo", "reporter*": "ReporterSource",
    "severity*": "Severity", "status*": "CaseStatus", "reportsCount": "int=1", "preview": "?ModerationPreview", "assignee": "?UserRef", "reportedAt*": "dt", "ageHours*": "num=16"})
schema("ModerationPreview", {"text": "?str", "imageUrls": "[uri]"})
schema("ModerationSummary", {"pendingReview*": "int=9", "autoFlaggedToday*": "int=23", "escalated*": "int=3", "resolvedToday*": "int=17", "resolvedDelta": "int=4"})
schema("ModerationDecision", {"reason": "str", "action": "enum(none,hide_content,remove_listing,warn_user,suspend_user,suspend_merchant)", "note": "str"})

# ---------------------------------------------------------------- support
schema("TicketRequester", {"type*": "enum(consumer,merchant)", "id*": "id", "name*": "str=J. Alvarez"})
schema("Ticket", {"id*": "id=SUP-8841", "requester*": "TicketRequester", "subject*": "str=Refund not received for missed drop", "channel*": "TicketChannel",
    "priority*": "TicketPriority", "status*": "TicketStatus", "assignee": "?UserRef", "orderId": "?id", "ageHours*": "num=0.4", "createdAt*": "dt", "lastMessageAt": "dt"})
schema("TicketMessage", {"id*": "id", "author*": "MessageAuthor", "body*": "str", "attachments*": "[Attachment]", "internal*": "bool=false", "createdAt*": "dt"})
schema("MessageAuthor", {"type*": "enum(agent,consumer,merchant,system)", "id*": "id", "name*": "str"})
schema("TicketDetail", {"ticket*": "Ticket", "messages*": "[TicketMessage]", "activity*": "[Activity]"})
schema("TicketUpdate", {"status": "TicketStatus", "priority": "TicketPriority", "assigneeId": "?id"})
schema("MessageBody", {"body*": "str", "attachmentFileIds": "[id]", "internal": "bool=false"})
schema("SupportDashboard", {"kpis*": "[Kpi]#openTickets(caption: unassigned), avgFirstResponse, avgResolutionTime, csat", "responseTime*": "Series#Last 7 days",
    "ticketsByChannel*": "[Segment]"})
schema("SupportSummary", {"all*": "int", "urgent*": "int", "high*": "int", "medium*": "int", "low*": "int", "unassigned": "int"})

# ---------------------------------------------------------------- financials
schema("FinancialsDashboard", {"kpis*": "[Kpi]#gmv, wonderbitesRevenue, commissionRevenue, pendingMerchantPayouts, refundValue, contributionMargin, netRevenue, paymentProcessingFees, voucherCreditLiability, subscriptionRevenue, revenuePerOrder, revenuePerBox",
    "revenueSnapshot*": "RevenueSnapshot", "gmvTrend*": "TrendCard", "revenueTrend*": "TrendCard", "payoutsSettlements*": "[Kpi]", "refundsAdjustments*": "[Kpi]",
    "monthlyTrends*": "[Series]#gmv, netRevenue, commissionRevenue — last 6 months", "unitEconomics*": "UnitEconomics"})
schema("RevenueSnapshot", {"metrics*": "[Kpi]#grossRevenue, netRevenue, contributionMargin, netMargin", "composition*": "[Segment]#commission, subscriptions, other", "centerValue*": "Money"})
schema("TrendCard", {"series*": "[Series]#this period vs previous period / revenue vs net revenue", "totals*": "[Kpi]"})
schema("UnitEconomics", {"metrics*": "[Kpi]#revenuePerOrder, revenuePerBox, commissionPerOrder, paymentFeePerOrder, contributionPerOrder, contributionMargin, refundRate, chargebackRate"})
schema("Payout", {"id*": "id=po_311", "merchant*": "Ref", "periodFrom*": "date", "periodTo*": "date", "gross*": "Money", "commission*": "Money", "fees*": "Money",
    "refunds*": "Money", "adjustments": "Money", "net*": "Money", "status*": "PayoutStatus", "scheduledAt": "?dt", "paidAt": "?dt", "reference": "?str", "failureReason": "?str"})
schema("PayoutDetail", {"payout*": "Payout", "lines*": "[PayoutLine]", "activity*": "[Activity]"})
schema("PayoutLine", {"date*": "date", "orders*": "int", "gross*": "Money", "commission*": "Money", "net*": "Money"})
schema("Refund", {"id*": "id=rf_41", "order*": "Ref", "consumer*": "Ref", "merchant*": "Ref", "amount*": "Money", "reason*": "RefundReason", "outcome": "RefundOutcome",
    "destination*": "RefundDestination", "status*": "RefundStatus", "requestedAt*": "dt", "processedAt": "?dt", "processedBy": "?UserRef"})

# ---------------------------------------------------------------- analytics
schema("OperationsAnalytics", {"kpis*": "[Kpi]#fulfilmentRate, pickupCompletionRate, dropAccuracy, merchantCancellationRate, noShowRate, openCriticalIssues, ordersAtRisk, customerCancellationRate, refundRate, avgPickupVerificationSuccess, merchantActivationRate, platformUptime",
    "operationalTrends*": "TrendCard#orders (bar), pickupsCompleted (bar), fulfilmentRate (line %)", "fulfilmentFunnel*": "FunnelCard",
    "marketplaceHealth*": "[Kpi]#activeMerchants, merchantsListingToday, activeConsumers, liveDrops, sellThroughRate, averageRating",
    "pickupCancellationHealth*": "[Kpi]#pickupCompletion, merchantCancellations, customerCancellations, noShows, refundRate, ordersAtRisk",
    "qualitySignals*": "[Kpi]#temperatureAlerts, pickupDelays, listingMismatches, verificationFailures, openComplaints, criticalEscalations",
    "dropAccuracyTrend*": "TrendCard", "operationsSummary*": "[Kpi]#avgFulfilmentTime, avgPickupDelay, pickupsCompleted, ordersProcessed, ratedOrders, verificationAttentionCases, wasteDiverted, mealsSaved"})
schema("FunnelCard", {"steps*": "[FunnelStep]", "conversionLabel*": "str=Conversion (Reserved → Rated)", "conversion*": "pct=65.8", "delta": "num=2.3"})
schema("PerformanceDashboard", {"kpis*": "[Kpi]#dropAccuracy, onTimePickupRate, fulfilmentRate, avgFulfilmentTime, platformUptime", "dropAccuracy*": "Series#Last 7 days",
    "fulfilmentFunnel*": "FunnelCard", "ranking*": "[MerchantPerformanceRow]#top 6"})
schema("MerchantPerformanceRow", {"merchant*": "Ref", "qualityScore*": "num=98", "trend*": "[num]", "onTimePct*": "pct=97", "status*": "QualityBadge",
    "fulfilmentRate": "pct", "rating": "num", "orders": "int"})
schema("PerformanceReport", {"title*": "str", "period*": "str", "sections*": "[ReportSection]", "generatedAt*": "dt"})
schema("ReportSection", {"key*": "str", "title*": "str", "kpis": "[Kpi]", "series": "[Series]", "rows": "[obj]"})
schema("SustainabilityDashboard", {"hero*": "[Kpi]#mealsSaved (MTD), co2Offset (t), waterSaved (L), foodWasteDiverted (t)", "equivalentText*": "str=Equivalent to taking 14 cars off the road for a year.",
    "mealsSavedTrend*": "Series#Last 7 days", "impactByCategory*": "[Segment]", "impactByRegion*": "[RegionImpact]"})
schema("RegionImpact", {"region*": "str=Doha", "mealsSaved*": "int=14720", "share": "pct", "co2Tonnes": "num", "foodKg": "num"})
schema("SustainabilityBreakdown", {"byCity*": "[RegionImpact]", "byMerchant*": "[MerchantImpactRow]", "byCategory*": "[Segment]", "monthly*": "[Series]"})
schema("MerchantImpactRow", {"merchant*": "Ref", "mealsSaved*": "int", "foodKg*": "num", "co2Tonnes*": "num", "waterLitres": "num"})

# ---------------------------------------------------------------- templates / cms / users / settings
schema("TemplateField", {"key*": "str=portion_size", "label*": "LocalizedText", "type*": "TemplateFieldType", "required*": "bool=false", "options": "[str]"})
schema("Template", {"id*": "id=tpl_12", "name*": "LocalizedText", "category*": "Category", "description": "LocalizedText", "icon": "str=box",
    "fields*": "[TemplateField]#Chips: Photo, Portion size, Allergens, Pickup window…", "defaults*": "TemplateDefaults", "owner*": "enum(wonderbites,merchant)",
    "merchantId": "?id", "usedByMerchants*": "int=84", "usageCount*": "int=24#'Used 24 times'", "status*": "TemplateStatus", "updatedAt*": "dt"})
schema("TemplateDefaults", {"title": "LocalizedText", "category": "Category", "quantity": "int=8", "pickupWindow": "TimeWindow", "suggestedPrice": "Money",
    "originalPrice": "Money", "dietary": "[Dietary]", "allergenNote": "LocalizedText", "instructions": "LocalizedText", "days": "[Weekday]"})
schema("TemplateInput", {"name*": "LocalizedText", "category*": "Category", "description": "LocalizedText", "icon": "str", "fields*": "[TemplateField]",
    "defaults": "TemplateDefaults", "status": "TemplateStatus"})
schema("TemplateSummary", {"total*": "int=22", "categories*": "int=4", "active*": "int=17", "drafts*": "int=5", "mostUsed*": "?TemplateUsage"})
schema("TemplateUsage", {"template*": "Ref", "merchants*": "int=84"})
schema("CmsItem", {"id*": "id=cms_1", "type*": "CmsType", "title*": "LocalizedText", "slug": "str=how-wonderbites-works", "status*": "CmsStatus",
    "author*": "UserRef", "updatedAt*": "dt", "scheduledAt": "?dt", "publishedAt": "?dt", "thumbnailUrl": "?uri"})
schema("CmsSummary", {"published*": "int=28", "drafts*": "int=6", "scheduled*": "int=3", "nextScheduledAt": "?dt", "lastPublishedAt": "?dt", "lastPublishedTitle": "str=Home banner update"})
schema("CmsPage", {"id*": "id", "title*": "LocalizedText", "slug*": "str", "body*": "LocalizedText#HTML", "seoDescription": "LocalizedText", "status*": "CmsStatus",
    "scheduledAt": "?dt", "author*": "UserRef", "updatedAt*": "dt"})
schema("CmsPageInput", {"title*": "LocalizedText", "slug*": "str", "body*": "LocalizedText", "seoDescription": "LocalizedText", "type": "enum(page,legal)", "status": "enum(draft,published)"})
schema("Banner", {"id*": "id=bnr_3", "title*": "LocalizedText", "imageUrl*": "uri", "imageUrlAr": "?uri", "link": "?DeepLink", "ctaLabel": "LocalizedText",
    "audience*": "Audience", "cities": "[str]", "placement*": "enum(home_hero,home_carousel,merchant_dashboard)", "startsAt": "?dt", "endsAt": "?dt",
    "status*": "CmsStatus", "order": "int", "updatedAt*": "dt"})
schema("BannerInput", {"title*": "LocalizedText", "imageFileId*": "id", "imageFileIdAr": "id", "link": "DeepLink", "ctaLabel": "LocalizedText", "audience*": "Audience",
    "cities": "[str]", "placement*": "enum(home_hero,home_carousel,merchant_dashboard)", "startsAt": "dt", "endsAt": "dt", "status": "enum(draft,published)"})
schema("Faq", {"id*": "id=faq_8", "question*": "LocalizedText", "answer*": "LocalizedText", "category*": "str=Pickup Passport", "audience*": "enum(consumers,merchants,all)",
    "order*": "int", "status*": "CmsStatus", "updatedAt*": "dt"})
schema("FaqInput", {"question*": "LocalizedText", "answer*": "LocalizedText", "category*": "str", "audience*": "enum(consumers,merchants,all)", "order": "int", "status": "enum(draft,published)"})
schema("ScheduleBody", {"publishAt*": "dt", "unpublishAt": "?dt"})
schema("AdminProfile", {"firstName*": "str=Moni", "lastName": "str=Roy", "email*": "email", "phone": "Phone", "avatarFileId": "?id", "avatarUrl": "?uri"})
schema("AdminUser", {"id*": "id=usr_118", "name*": "str=Priya Anand", "email*": "email=priya.anand@wonderbites.example.com", "avatarUrl": "?uri", "role*": "Role",
    "status*": "UserStatus", "twoFactorEnabled*": "bool=true", "lastLoginAt": "?dt", "invitedAt": "?dt"})
schema("RoleCard", {"role*": "Role", "label*": "str=Operations Admin", "description*": "str=Drops, pickups, merchants, and quality & trust tooling.", "usersCount*": "int=8", "permissions*": "[str]"})
schema("UsersSummary", {"totalAdminUsers*": "int=19", "roles*": "int=4", "activeSessions*": "int=12", "pendingInvites*": "int=2", "twoFactorAdoption*": "pct=89", "usersWithout2fa*": "int=2"})
schema("InviteBody", {"email*": "email", "name*": "str", "role*": "Role", "message": "str"})
schema("UserUpdate", {"role": "Role", "name": "str"})
schema("GeneralSettings", {"platformName*": "str=WonderBites", "defaultTimezone*": "str=Asia/Qatar", "defaultCurrency*": "Currency", "defaultLanguage": "Language",
    "autoCancelUnclaimedDrops*": "bool=true", "requirePickupPassportVerification*": "bool=true", "allowMerchantSelfOnboarding*": "bool=false"})
schema("NotificationSettings", {"criticalIssueAlerts*": "ChannelToggle", "dailyOperationsDigest*": "DigestToggle", "newMerchantSignup*": "ChannelToggle"})
schema("ChannelToggle", {"enabled*": "bool=true", "email": "bool=true", "push": "bool=true"})
schema("DigestToggle", {"enabled*": "bool=true", "sendAt": "time=06:00", "email": "bool=true"})
schema("SecuritySettings", {"require2fa*": "bool=true#Enforced for Operations Admin and higher", "ssoEnabled*": "bool=true", "ssoProvider": "enum(google_workspace)",
    "sessionTimeoutMinutes*": "int=30", "adminAuditLog*": "bool=true", "auditRetentionMonths": "int=12"})
schema("PolicyListItem", {"key*": "PolicyKey", "title*": "LocalizedText", "updatedAt*": "dt", "live": "bool"})
schema("Policy", {"key*": "PolicyKey", "title*": "LocalizedText", "content*": "LocalizedText#HTML", "config": "?RefundPolicyConfig#Refund policy only", "updatedAt*": "dt", "updatedBy": "UserRef"})
schema("PolicyInput", {"content*": "LocalizedText", "config": "RefundPolicyConfig"})
schema("RefundPolicyConfig", {"freeCancellationHours*": "int=2", "rules*": "[RefundRule]"})
schema("RefundRule", {"reason*": "RefundReason", "outcome*": "RefundOutcome"})
schema("AuditEntry", {"id*": "id", "actor*": "UserRef", "action*": "str=voucher.freeze", "entity": "EntityRef", "ip": "str", "at*": "dt", "changes": "obj"})
schema("AuditExportBody", {"range*": "enum(30m,24h,7d,30d,12m,custom)#Selector on Security screen", "from": "dt", "to": "dt", "format": "ExportFormat"})

# ---------------------------------------------------------------- merchant portal
schema("RatingSummary", {"average*": "num=4.2", "count*": "int=842", "distribution*": "[RatingBucket]"})
schema("RatingBucket", {"stars*": "int=5", "count*": "int=420"})
schema("TopBag", {"rank*": "int=1", "listing*": "Ref", "imageUrl": "?uri", "sold*": "int=86", "revenue*": "Money"})
schema("RecentOrderRow", {"id*": "id", "number*": "str=MO-3021", "customerName*": "str=Amina K.", "itemsSold": "int", "status*": "OrderStatus", "amount*": "Money", "placedAt*": "dt"})
schema("OperationalStatus", {"branch*": "Ref", "state*": "BranchState", "caption*": "str=Accepting pickups", "todayHours*": "TimeWindow", "pickupWindow*": "TimeWindow"})
schema("MerchantOverview", {"greetingName*": "str=Sara", "kpis*": "[Kpi]#totalSales, totalOrders, pendingPickups, completedOrders, cancelledOrders (with sparkline)",
    "salesOverview*": "SalesOverviewCard", "topSellingBags*": "[TopBag]", "recentOrders*": "[RecentOrderRow]", "inventoryStatus*": "InventoryStatusCard",
    "operationalStatus*": "OperationalStatus", "reviews*": "RatingSummary", "alerts*": "[Notification]"})
schema("SalesOverviewCard", {"total*": "Money", "delta*": "num=18.6", "comparison*": "str=last week", "period*": "PeriodPreset", "series*": "Series"})
schema("InventoryStatusCard", {"totalBags*": "int=45", "segments*": "[Segment]#keys = StockStatus"})
schema("MerchantOrder", {"id*": "id=mo_5187", "number*": "str=MO-5187", "customer*": "Ref", "bag*": "Ref", "bagImageUrl": "?uri", "amount*": "Money", "fulfillment*": "FulfillmentType",
    "delivery": "?Delivery", "pickupWindow*": "TimeWindow", "status*": "OrderStatus", "branch*": "Ref", "pickupCode": "?str", "placedAt*": "dt"})
schema("MerchantOrderDetail", {"order*": "MerchantOrder", "items*": "[OrderItem]", "payment*": "PaymentInfo", "timeline*": "[Activity]", "availableDrivers*": "[DriverRef]"})
schema("MerchantOrderSummary", {"total*": "int=8", "ready*": "int=2", "outForDelivery*": "int=1", "unassigned*": "int=2", "completed*": "int=2", "activeDrivers*": "int=5"})
schema("AssignDriverBody", {"driverId*": "id=drv_04", "notifyDriver": "bool=true"})
schema("CompleteBody", {"pickupCode": "?str#Required for self_pickup when passport verification is on"})
schema("Listing", {"id*": "id=LIS-2412", "title*": "LocalizedText", "shortDescription": "LocalizedText", "description": "LocalizedText#HTML rich text (max 2000)",
    "category*": "Category", "listingType*": "ListingType", "availability*": "Availability", "dietary*": "[Dietary]", "allergens": "[str]",
    "branch*": "Ref", "address": "LocalizedText", "city": "str=Doha", "state": "LocalizedText", "zip": "str=00000", "lat": "?num", "lng": "?num",
    "images*": "[ListingImage]", "price*": "Money", "originalPrice*": "Money", "discountPct": "pct=28",
    "quantity*": "num=8", "unit": "enum(bag,box,kg,item,portion)", "remaining*": "num=8", "pickupWindow*": "TimeWindow", "days": "[Weekday]",
    "status*": "ListingStatus", "stockStatus": "StockStatus", "forceDisabled": "bool=false#Disabled by WonderBites admin ('Force-Disabled' KPI)", "settings*": "ListingSettings",
    "stats*": "ListingStats", "templateId": "?id", "activity": "[Activity]", "createdAt*": "dt", "updatedAt": "dt"})
schema("ListingStats", {"sold*": "int=86", "revenue*": "Money", "views": "int=1240"})
schema("ListingImage", {"id*": "id=IMG-1", "url": "?uri", "fileId": "?id", "isCover": "bool=true", "order": "int=0", "tone": "int=1#Mock-only placeholder tone (no remote images)"})
schema("ListingSettings", {"publish*": "bool=true#Publish Listing (Visibility: visible to everyone)", "featured*": "bool=false", "allowNegotiation*": "bool=true", "expiresOn": "?dt#Auto expiry"})
schema("ListingInput", {"title*": "LocalizedText", "shortDescription*": "LocalizedText#max 150", "description*": "LocalizedText#max 2000", "category*": "Category",
    "listingType*": "ListingType", "availability*": "Availability", "dietary": "[Dietary]", "allergens": "[str]", "branchId": "id",
    "address*": "LocalizedText", "city*": "str", "state*": "LocalizedText", "zip*": "str", "lat": "num", "lng": "num",
    "images": "[ListingImage]#or imageFileIds", "imageFileIds": "[id]#max 10; JPG/PNG/WEBP ≤5MB; first = cover", "price*": "Money", "originalPrice": "Money", "quantity": "num", "unit": "str",
    "pickupWindow": "TimeWindow", "days": "[Weekday]", "settings": "ListingSettings", "status": "ListingStatus", "templateId": "?id"})
schema("ListingSummary", {"active*": "int=2", "forceDisabled*": "int=4", "soldOut*": "int=1", "total*": "int=7"})
schema("ListingDetail", {"listing*": "Listing", "activity*": "[Activity]", "stats*": "[Kpi]"})
schema("ImageOrder", {"imageIds*": "[id]#New order; first is cover"})
schema("Product", {"id*": "id=PRD-9", "name*": "LocalizedText", "category*": "Category", "description*": "LocalizedText", "images*": "[ListingImage]",
    "price*": "Money", "quantity*": "int=10", "listingId": "?id#Inventory listing created from the product", "branchId": "id", "templateId": "?id", "createdAt*": "dt"})
schema("ProductInput", {"name*": "LocalizedText", "category*": "Category", "description*": "LocalizedText", "images": "[ListingImage]", "imageFileIds": "[id]",
    "price*": "Money", "quantity*": "int", "branchId": "id", "templateId": "?id", "saveAsTemplate": "bool=false"})
schema("Driver", {"id*": "id=drv_04", "code*": "str=DRV-04", "name*": "str=Zubair Khan", "phone*": "str=+974 5550 7890", "vehicle*": "VehicleType", "plate": "?str", "licenseNo": "str=DL-448812",
    "deliveries*": "int=25", "onTimePct*": "pct=98", "rating*": "num=4.9", "status*": "DriverStatus", "branch": "?Ref", "activeOrders": "int"})
schema("DriverInput", {"name*": "str", "phone*": "str", "vehicle*": "VehicleType", "licenseNo*": "str", "plate": "str", "branchId*": "id", "status": "DriverStatus", "photoFileId": "id"})
schema("DriverDetail", {"driver*": "Driver", "recentDeliveries*": "[MerchantOrder]", "activity*": "[Activity]"})
schema("DriverSummary", {"total*": "int=4", "available*": "int=2", "onDelivery*": "int=1", "offline*": "int=1", "avgOnTimeRate*": "pct=99.98"})
schema("SalesAnalytics", {"kpis*": "[Kpi]#salesRevenue, ordersSold, boxesSold, averageOrderValue, sellThroughRate, netEarnings, pendingPayout, nextPayout, uniqueCustomers, repeatPurchaseRate, averageRating, recoveryRate",
    "salesPerformance*": "TrendCard#A) revenue + orders", "surplusRecovery*": "SurplusRecovery#B", "topOffers*": "[TopOffer]#C",
    "ordersPickups*": "[Kpi]#D) ordersReserved, ordersCollected, pickupCompletionRate, customerCancellations, merchantCancellations, noShows, refunds",
    "earnings*": "EarningsSummary#E", "customerInsights*": "[Kpi]#F) newCustomers, returningCustomers, repeatPurchaseRate, averageRating, reviews",
    "impact*": "[Kpi]#G) mealsSaved, foodSavedKg, co2AvoidedT, foodWasteValueSaved", "dayBreakdown*": "[DayRecord]#H) latest 5"})
schema("SurplusRecovery", {"recoveryRate*": "pct=45", "listed*": "int=1090", "sold*": "int=915", "unsold*": "int=175", "recoveredRevenue*": "Money", "retailValueSaved*": "Money"})
schema("TopOffer", {"listing*": "Ref", "imageUrl": "?uri", "sold*": "int=210", "revenue*": "Money", "sellThroughPct*": "pct=95"})
schema("EarningsSummary", {"grossSales*": "Money", "commission*": "Money", "refundAdjustments*": "Money", "netEarnings*": "Money", "paidToDate*": "Money",
    "pendingPayout*": "Money", "nextPayoutDate": "?date", "composition*": "[Segment]#netEarnings, commission, adjustments"})
schema("DayRecord", {"date*": "date", "orders*": "int=34", "boxes*": "int=37", "grossSales*": "Money", "commission*": "Money", "adjustments*": "Money",
    "netEarnings*": "Money", "payout*": "DayPayoutStatus", "mealsSaved*": "int=640", "foodKg*": "num=478", "co2Tonnes*": "num=0.25"})
schema("Customer", {"id*": "id=cus_1", "name*": "str=Sofia", "code": "str=+974", "mobile*": "str=5511 2233", "email*": "email", "avatarUrl": "?uri", "createdAt*": "dt",
    "ordersCount*": "int=2", "rescueScore*": "int=95", "status*": "ConsumerStatus", "lastOrderAt": "?dt", "totalSpent": "Money"})
schema("CustomerInput", {"name*": "str", "code*": "str=+974#Country code", "mobile*": "str=55112233", "email*": "email", "password": "str#Required on create", "confirmPassword": "str", "avatarFileId": "id", "status": "ConsumerStatus"})
schema("CustomerDetail", {"customer*": "Customer", "orders*": "[MerchantOrder]", "reviews*": "[Review]"})
schema("Branch", {"id*": "id=BR-01", "name*": "LocalizedText", "address*": "LocalizedText", "city*": "str=Doha", "lat": "?num", "lng": "?num", "phone*": "str=+974 5550 6789", "photoUrl": "?uri", "manager": "?str",
    "state*": "BranchState", "isPrimary": "bool", "pickupToday*": "?TimeWindow", "hours*": "[DayHours]", "createdAt*": "dt"})
schema("DayHours", {"day*": "Weekday", "enabled*": "bool=true", "open*": "time=08:00", "close*": "time=22:00"})
schema("BranchInput", {"name*": "LocalizedText", "address*": "LocalizedText", "city*": "str", "lat": "num", "lng": "num", "phone*": "str", "photoFileId": "id", "manager": "str", "hours": "[DayHours]", "state": "BranchState"})
schema("BranchStateBody", {"state*": "BranchState", "reopenAt": "?dt"})
schema("HoursBody", {"hours*": "[DayHours]"})
schema("Vendor", {"id*": "id=ven_1", "name*": "str=Fig & Bloom Bakery", "initials": "str=FB", "category*": "str=Bakery", "email*": "email=hello@figandbloom.example.com",
    "phone*": "str=+974 5550 2233", "branchesCount*": "int=2", "joinedAt*": "dt", "status*": "VendorStatus", "parentId": "?id"})
schema("VendorInput", {"name*": "str", "category*": "Category", "email*": "email", "phone*": "str", "branchIds": "[id]", "tradeLicenseNo*": "str", "parentId": "id", "logoFileId": "id"})
schema("VendorStatusBody", {"status*": "VendorStatus", "reason": "str"})
schema("VendorSummary", {"total*": "int=6", "active*": "int=3", "pending*": "int=2", "suspended*": "int=1"})
schema("VendorDetail", {"vendor*": "Vendor", "branches*": "[Ref]", "listingsCount": "int", "activity*": "[Activity]"})
schema("Review", {"id*": "id=rev_1", "rating*": "int=5", "author*": "Ref", "authorInitials": "str=AK", "bag": "?Ref#Bag reviewed (replaces 'job title')",
    "body*": "LocalizedText", "reply": "?ReviewReply", "status*": "ReviewStatus", "report": "?ReviewReport", "createdAt*": "dt"})
schema("ReviewReply", {"body*": "LocalizedText", "author": "UserRef", "at*": "dt"})
schema("ReviewBody", {"body*": "str"})
schema("ReviewReport", {"reason*": "enum(abusive,spam,fake,off_topic,other)", "note": "str"})
schema("PartnerFeedback", {"rating*": "int=5", "body*": "str", "topic": "str"}, "'Write a Review' = merchant review of WonderBites")
schema("Dispute", {"id*": "id=TK-1042", "user*": "Ref", "subject*": "str=Order never arrived – refund request", "type": "DisputeType", "orderId": "?id",
    "assignee": "?UserRef", "status*": "DisputeStatus", "createdAt*": "dt", "updatedAt*": "dt"})
schema("DisputeDetail", {"dispute*": "Dispute", "messages*": "[TicketMessage]"})
schema("DisputeInput", {"subject*": "str", "type*": "DisputeType", "orderId": "id", "body*": "str", "attachmentFileIds": "[id]"})
schema("DisputeSummary", {"open*": "int=2", "inProgress*": "int=4", "resolved*": "int=2", "closed": "int", "total*": "int=7"})
schema("HelpRequest", {"id*": "id=hr_3", "name*": "str", "phoneCountry*": "str=+974", "phone*": "str=55112233", "description*": "str", "status*": "TicketStatus", "createdAt*": "dt"})
schema("HelpRequestInput", {"name*": "str", "phoneCountry*": "str=+974", "phone*": "str=55112233", "description*": "str", "topic": "str", "attachmentFileIds": "[id]"})
schema("HelpContent", {"faqs*": "[Faq]", "contact*": O({"phone": "str=+974 5000 0000", "email": "email=merchants@wonderbites.example.com", "whatsapp": "str", "hours": "str=Sun–Thu 9:00–18:00"})})
schema("StoreInfo", {"name*": "LocalizedText", "address*": "Address", "businessCategory*": "Category", "about": "LocalizedText", "logoUrl": "?uri"})
schema("StoreInfoInput", {"name": "LocalizedText", "address": "Address", "businessCategory": "Category", "about": "LocalizedText", "logoFileId": "id"})
schema("MerchantSecurity", {"businessEmail*": "email", "twoFactorEnabled": "bool"})
schema("MerchantSecurityInput", {"businessEmail": "email", "currentPassword": "str", "newPassword": "str", "confirmPassword": "str"})
schema("OperatingHours", {"branchId*": "id", "hours*": "[DayHours]"})

# =====================================================================================================
# v1.1 RECONCILIATION with the final screen code + mock adapters (assets/js/api/mock/*.js), 2026-11-19.
# Generated docs must describe what the code returns. Mock-internal helper keys (`_n`, `_s`, `sort*`) are
# NOT part of the contract and are intentionally undocumented.
# =====================================================================================================
import copy as _copy
def patch(name, add=None, drop=(), opt=(), req=(), desc=None):
    s = SCHEMAS[name]
    for k in drop:
        s["properties"].pop(k, None)
        if k in s.get("required", []): s["required"].remove(k)
    for k in opt:
        if k in s.get("required", []): s["required"].remove(k)
    for k, v in (add or {}).items():
        r = k.endswith("*"); k = k.rstrip("*")
        s["properties"][k] = S(v)
        if r and k not in s.setdefault("required", []): s["required"].append(k)
    for k in req:
        if k not in s.setdefault("required", []): s["required"].append(k)
    if not s.get("required"): s.pop("required", None)
    if desc: s["description"] = desc
def flat(name, base, extra, desc):
    s = _copy.deepcopy(SCHEMAS[base])
    for k, v in extra.items(): s["properties"][k.rstrip("*")] = S(v)
    s["description"] = desc
    SCHEMAS[name] = s
LTXT = {"anyOf": [{"type": "string"}, {"$ref": "#/components/schemas/LocalizedText"}],
        "description": "Plain string localized per Accept-Language, or LocalizedText {en, ar} for merchant-authored content"}

# enums used by the final code
ENUMS["ModerationType"] = ("listing review user merchant merchant_profile", "Moderation tab (Listings / Reviews / User Behaviour / Merchant Profile)")
ENUMS["CaseStatus"] = ("open pending in_review in_progress escalated resolved closed", "Case / moderation pill (pending & open = 'Open', in_review & in_progress = 'In Progress')")
ENUMS["TemplateSource"] = ("wonderbites mine", "Template gallery section (WonderBites Templates / My Templates)")
ENUMS["DisputeTab"] = ("open in_progress resolved closed", "Reports/Dispute tab group (in_progress = in_review + awaiting_merchant)")
ENUMS["AuditExportRange"] = ("7d 30d 90d 12m", "Audit log export range")

# --- primitives
SCHEMAS["Ref"]["properties"]["name"] = dict(LTXT, examples=["Sunrise Bakehouse"])
patch("TimeWindow", {"date": "date#Present on pickups / order windows"})
patch("UserRef", {"role": "Role"})
patch("Kpi", {"deltaDirection": "Trend#Alias of trend (merchant analytics)", "hint": "str=vs previous 30 days"}, opt=["format"])
SCHEMAS["Kpi"]["properties"]["value"] = {"anyOf": [{"type": "number"}, {"$ref": "#/components/schemas/Money"}], "description": "number, or Money for money KPIs in merchant analytics", "examples": [18]}
patch("Activity", {"type": "str=created#Event type (mocks use type; action is the backend alias)", "status": "str#Order timeline: status reached",
    "by": "str=Dana K.#Actor display name", "note": "str", "detail": "str",
    "meta": O({"score": "num", "max": "num", "doc": "CertificateType", "status": "ComplianceStatus", "dueAt": "date", "note": "str"})},
    opt=["id", "action", "label"],
    desc="Timeline entry. Action/type values — payouts: created|paid|failed|hold|process|retry; compliance: onboarded|inspection|status_override|certificate_uploaded|certificate_updated|certificate_deleted|certificate_approved|certificate_rejected|warn|request_documents|schedule_inspection|suspend|clear; listings: created|updated|price|pause|resume|disable|duplicate; cases: assigned|resolved|escalated|note|reopened")
patch("TicketMessage", {"from": O({"id": "id", "name": "str"}), "role": "enum(customer,merchant,support,agent,system)", "at": "dt"},
      opt=["author", "attachments", "internal", "createdAt"])
SCHEMAS["TicketMessage"]["properties"]["body"] = dict(LTXT)
patch("MessageAuthor", opt=["id"])
patch("User", {"phoneCountry": "str"}, opt=["id", "name", "role", "portal", "language", "permissions", "firstName", "lastName"])

# --- admin ops (D1)
patch("Drop", {"thumb": "str#Placeholder art key (no remote images)", "merchantId": "id", "branchId": "id", "flagNote": "?str", "description": "str",
    "allergens": "[str]", "titleI18n": "LocalizedText", "descriptionI18n": "LocalizedText"}, opt=["code", "updatedAt"])
SCHEMAS["Drop"]["properties"]["title"] = dict(LTXT)
flat("DropDetail", "Drop", {"reservations": "[OrderSummary]", "activity": "[Activity]"}, "Drop detail drawer = Drop (+ reservations, activity when available)")
patch("Pickup", {"consumerId": "id", "merchantId": "id", "branchId": "id", "dropId": "id", "category": "Category", "dietary": "[Dietary]",
    "flagReason": "?str", "quantity": "int=1", "createdAt": "dt", "code": "str=K3D8E1", "codeMasked": "str=K3••E1#Shown to read_only",
    "bag": O({"id*": "id", "title*": "str=Deli Surprise Box", "thumb": "str"})}, opt=["bagTitle", "passportCode", "date"])
flat("PickupDetail", "Pickup", {"order": "OrderSummary", "activity": "[Activity]"}, "Pickup detail = Pickup + order (+ activity)")
patch("PickupSummary", {"onTimeRatePct*": "pct=92.4"}, drop=["onTimeRate"])
SCHEMAS["OrderEvent"] = O({"status*": "OrderStatus", "at*": "dt", "by": "str=system"}, "Order timeline step")
for nm in ("OrderSummary", "Order"):
    patch(nm, {"consumerId": "id", "merchantId": "id", "branchId": "id", "dropId": "id", "city": "str", "category": "Category", "dietary": "[Dietary]",
        "items": "[OrderItem]", "fees": "Money", "total": "Money", "paymentStatus": "PaymentStatus",
        "paymentMethod": O({"brand": "?CardBrand", "last4": "?str=\"6620\"", "type": "PaymentMethodType"}), "pickupCode": "?str", "pickupId": "?id",
        "refund": "?OrderRefund", "timeline": "[OrderEvent]", "createdAt": "dt", "thumb": "str"},
        opt=["bagTitle", "amount", "placedAt", "payment", "subtotal", "updatedAt"])
SCHEMAS["OrderRefund"] = O({"amount*": "Money", "reason*": "RefundReason", "reasonLabel": "LocalizedText", "outcome*": "RefundOutcome", "destination": "RefundDestination",
                            "note": "str", "at*": "dt", "by": "str"}, "Refund applied to an order")
patch("OrderListSummary", opt=[])
patch("RefundEligibility", {"hoursSincePlaced": "num=1.5", "hoursToWindow": "num=3", "insideCancellationDeadline": "bool", "collected": "bool",
    "policy": O({"key": "PolicyKey", "version": "str=3", "freeCancellationHours": "int=2", "refundDestinationDefault": "RefundDestination"}),
    "outcomes": "[PolicyReason]#Reason picker options with their configured outcome"}, opt=["requiresApproval", "suggestedOutcome", "policyRule", "freeCancellationHours"])
patch("RefundRequest", {"outcome": "RefundOutcome"}, opt=["destination"])
patch("MerchantSummary", {"nameI18n": "LocalizedText", "thumb": "str", "rating": "num=4.6", "branchesCount": "int", "activeListings": "int", "ordersCount": "int"}, opt=["code"])
SCHEMAS["MerchantSummary"]["properties"]["name"] = dict(LTXT)
patch("MerchantListSummary", {"totalMerchants*": "int=10"}, drop=["total"])
patch("Merchant", {"nameI18n": "LocalizedText", "thumb": "str", "city": "str", "country": "Country", "dropsCount": "int", "activeListings": "int",
    "ordersCount": "int", "revenue": "Money", "complianceStatus": "ComplianceStatus", "business": "MerchantLegal#Legal/business block (alias of legal)"},
    opt=["code", "legal", "address", "branchesCount"])
SCHEMAS["Merchant"]["properties"]["name"] = dict(LTXT)
patch("MerchantDetailOverview", {"ordersTrend": "Series"}, opt=["salesTrend", "ratingSummary", "openCases", "complianceStatus"])
SCHEMAS["MerchantComplianceTab"] = O({"hygieneScore*": "num=14", "status*": "ComplianceStatus", "lastInspectionAt": "?dt",
    "certificates*": "[Certificate]"}, "Merchant detail → Compliance tab")
patch("Branch", {"photo": "int#Placeholder photo tone", "pickupWindow": "TimeWindow", "activeListings": "int"}, opt=["createdAt", "phone", "pickupToday"])
SCHEMAS["Branch"]["properties"]["hours"] = {"anyOf": [{"type": "array", "items": {"$ref": "#/components/schemas/DayHours"}}, {"type": "string"}],
    "description": "Weekly hours; admin merchant-detail tab returns a display string (e.g. '08:00–22:00')"}
SCHEMAS["Branch"]["required"] = [r for r in SCHEMAS["Branch"].get("required", []) if r != "hours"]
patch("Payout", {"merchantId": "id", "period": O({"from*": "date", "to*": "date"})}, opt=["merchant", "periodFrom", "periodTo", "refunds"])
patch("Consumer", {"mealsSaved": "int", "co2KgAvoided": "num", "joinedAt": "dt", "preferences": O({"categories": "[Category]", "dietary": "[Dietary]"}),
    "language": "Language", "marketingOptIn": "bool", "blockReason": "?str", "nameI18n": "LocalizedText"}, opt=["createdAt"])
flat("ConsumerDetail", "Consumer", {"recentOrders": "[OrderSummary]", "wallet": "?Wallet", "notes": "[Note]", "activity": "[Activity]"},
     "Consumer detail = Consumer (+ recentOrders/wallet/notes/activity when available)")
patch("ConsumerSummary", {"total": "int#Merchant Customers screen name for totalUsers"}, opt=["totalUsers"])
patch("Case", {"createdAt*": "dt", "assigneeId": "?id", "ageMinutes*": "int=120"}, drop=["reportedAt", "ageHours"])
flat("CaseDetail", "Case", {"activity": "[Activity]", "notes": "[Note]", "related": "[EntityRef]"}, "Case detail drawer = Case + activity")
patch("CaseSummary", {"byKind": O({"all": "int", "issue": "int", "alert": "int", "moderation": "int"})})
patch("ModerationItem", {"item*": "str=Green Leaf Kitchen — \"Fresh Garden Box\"#Reported item label", "createdAt*": "dt", "content": "?str",
    "autoScore": "?num", "assigneeId": "?id", "decision": "?enum(approved,rejected)", "ageMinutes*": "int=960"}, drop=["reportedItem", "reportedAt", "ageHours"])
SCHEMAS["ModerationItem"]["properties"]["reporter"] = {"anyOf": [{"$ref": "#/components/schemas/ReporterSource"}, {"type": "string"}]}
flat("ModerationDetail", "ModerationItem", {"notes": "[Note]", "activity": "[Activity]"}, "Moderation case detail")
patch("ModerationSummary", {"resolvedDeltaVsYesterday": "int=4", "byType": O({"all": "int", "listing": "int", "review": "int", "user": "int", "merchant_profile": "int"})}, drop=["resolvedDelta"])
patch("ModerationDecision", {"reason": "str"})
patch("Ticket", {"category": "str", "assigneeId": "?id", "relatedOrderId": "?id", "messageCount": "int", "ageMinutes*": "int=24"}, drop=["ageHours", "orderId"])
patch("TicketRequester", {"email": "email"})
flat("TicketDetail", "Ticket", {"messages": "[TicketMessage]", "activity": "[Activity]"}, "Ticket detail = Ticket (+ messages via /messages)")
SCHEMAS["SupportDashboard"] = O({
    "kpis*": O({"openTickets*": "int=31", "unassigned*": "int=6", "avgFirstResponseMinutes*": "num=6.4", "firstResponseSlaMinutes": "int=10",
                "avgResolutionHours*": "num=2.1", "resolutionDeltaMinutes": "num=18", "csat*": "num=4.6", "csatScale": "int=5", "csatPeriodDays": "int=7"}),
    "responseTrend*": "Series#Response Time — Last 7 Days", "byChannel*": "[ChannelCount]#Tickets by Channel",
    "byPriority*": O({"all": "int", "urgent": "int", "high": "int", "medium": "int", "low": "int"})}, "Support KPIs + charts")
SCHEMAS["ChannelCount"] = O({"key*": "TicketChannel", "count*": "int=42"})

# --- admin business (D2)
patch("FinancialsDashboard", {"currency": "Currency"})
for nm in ("TrendCard",): patch(nm, {"granularity": "Granularity", "currency": "Currency", "week": O({"from": "date", "to": "date"})})
patch("RevenueSnapshot", {"period": "PeriodPreset"})
patch("FunnelCard", {"period": "PeriodPreset"})
patch("Refund", {"merchantId": "id"})
patch("Wallet", {"consumerId": "id"})
patch("IssueCredit", {})
patch("ComplianceRow", {"id": "id", "createdAt": "dt", "suspended": "bool"})
patch("ComplianceSummary", {"hygieneMax": "num=20"})
patch("CertificateInput", {"fileName": "str=haccp-2026.pdf", "size": "int"})
patch("ComplianceDetail", {"hygieneScore": "num", "status": "ComplianceStatus", "lastInspectionAt": "?dt"}, opt=["row", "indicators", "hygieneHistory", "actions"])
patch("MerchantPerformanceRow", {"id*": "id", "name": "str", "city": "str", "category": "Category"})
patch("SustainabilityDashboard", {"equivalentCars*": "int=14#Hero line is a localized template: 'Equivalent to taking {n} cars off the road for a year.'"}, opt=["equivalentText"])
patch("RegionImpact", {"key": "str=dubai"})
patch("SustainabilityBreakdown", {"groupBy": "enum(city,merchant,category,month)"})
patch("MerchantImpactRow", {"city": "?LocalizedText"})
SCHEMAS["FilterOption"] = O({"value*": "str=AE", "label": "LocalizedText", "country": "Country", "city": "str", "category": "Category", "branches": "[FilterOption]"})
SCHEMAS["FinancialFilterOptions"] = O({"countries*": "[FilterOption]#Only countries with merchants", "cities*": "[FilterOption]#value, label, country",
    "categories*": "[FilterOption]", "merchants*": "[FilterOption]#value, label, country, city, category, branches[]", "orderTypes*": "[FilterOption]"},
    "Financials filter row cascade: country → city → merchant → branch")
SCHEMAS["MerchantPerformanceDetail"] = O({"row*": "MerchantPerformanceRow", "kpis*": "[Kpi]", "onTimeTrend*": "Series", "issues*": "[IssueCount]",
    "city": "str", "category": "Category"}, "Merchant performance detail drawer")
SCHEMAS["IssueCount"] = O({"key*": "str=late_pickup", "label*": "str=Late pickups", "count*": "int=3"})

# --- platform + merchant account (D3)
patch("Template", {"source*": "TemplateSource", "createdBy": "Ref", "suggestedPrice": "Money"}, drop=["owner"], opt=["usedByMerchants", "fields"])
patch("TemplateDefaults", {"name": "LocalizedText", "description": "LocalizedText", "price": "num#Merchant templates: suggested price amount"})
patch("TemplateField", opt=["required"])
patch("TemplateSummary", {"byCategory": "[CategoryCount]"})
SCHEMAS["CategoryCount"] = O({"key*": "str=bakery", "count*": "int=8"})
SCHEMAS["TemplateUsage"] = O({"id*": "id", "name*": "LocalizedText", "usageCount*": "int=84"}, "Most used template")
patch("CmsItem", {"subtitle": "LocalizedText", "subtype": "enum(legal)#Legal pages show the 'Legal' chip", "publishAt": "?dt", "imageUrl": "?str", "link": "?DeepLink",
    "audience": "Audience", "cities": "[str]", "placement": "str", "startsAt": "?dt", "endsAt": "?dt"})
patch("CmsSummary", {"counts": O({"all": "int", "page": "int", "banner": "int", "faq": "int"})})
patch("Banner", {"subtitle": "LocalizedText"})
patch("BannerInput", {"subtitle": "LocalizedText"})
patch("AdminUser", {"twoFactor*": "bool=true", "lastActiveAt": "?dt"}, drop=["twoFactorEnabled", "lastLoginAt"])
SCHEMAS["UsersSummary"] = O({"total*": "int=19", "roles*": "int=4", "activeSessions*": "int=12", "pendingInvites*": "int=2", "twoFactorAdoption*": "pct=89",
    "withoutTwoFa*": "int=2", "byRole*": O({"super_admin": "int", "operations_admin": "int", "support_agent": "int", "read_only": "int"})})
SCHEMAS["RoleCard"]["properties"]["label"] = S("LocalizedText"); SCHEMAS["RoleCard"]["properties"]["description"] = S("LocalizedText")
patch("AuditEntry", {"target": "str#Target display label"})
patch("AdminProfile", {"phoneCountry": "str=+974", "phone": "str=55112233"})
SCHEMAS["MerchantProfile"] = O({"firstName*": "str=Sara", "lastName": "str", "email*": "email", "phoneCountry": "str=+974", "phone": "str", "avatarUrl": "?uri", "avatarFileId": "?id"}, "Merchant Settings → Profile")
SCHEMAS["GeneralSettings"] = O({"platformName*": "str=WonderBites", "supportEmail": "email", "timezone*": "str=Asia/Qatar", "defaultCurrency*": "Currency",
    "defaultLanguage": "Language", "countries": "[Country]", "commissionRate": "pct=20", "pickupWindowMinutes": "int=60", "reservationHoldMinutes": "int=15",
    "autoCancelUnclaimed*": "bool=true#Auto-cancel unclaimed drops", "requirePickupPassport*": "bool=true#Require pickup passport verification",
    "allowMerchantSelfOnboarding*": "bool=false"}, "General = Platform Basics + Operational Defaults")
SCHEMAS["NotificationSettings"] = O({"alerts*": "[AlertSetting]"}, "Notifications = Admin Alerts")
SCHEMAS["AlertSetting"] = O({"key*": "enum(critical_issue,daily_digest,new_merchant_signup)", "label*": "LocalizedText", "description": "LocalizedText",
    "enabled*": "bool=true", "email": "bool", "push": "bool", "sms": "bool"})
SCHEMAS["SecuritySettings"] = O({"require2fa*": "bool=true", "sso*": "bool=true#Google Workspace SSO", "sessionTimeoutMinutes*": "int=30",
    "auditLog*": "bool=true", "auditRetentionDays": "int=365", "auditExportRange": "AuditExportRange",
    "passwordPolicy": O({"minLength": "int=10", "requireSymbol": "bool"}), "ipAllowlist": "[str]"}, "Security = Authentication + Audit & Compliance")
patch("AuditExportBody", {"range*": "AuditExportRange"})
patch("PolicyListItem", {"hasContent": "bool"})
patch("Policy", {"live": "bool"})
SCHEMAS["PolicyReason"] = O({"key*": "RefundReason", "label*": "LocalizedText", "outcome*": "RefundOutcome"})
SCHEMAS["RefundPolicyConfig"] = O({"key": "str=refund", "version": "str=3", "freeCancellationHours*": "int=2#0–48",
    "refundDestinationDefault*": "RefundDestination", "outcomes": "[RefundOutcome]", "reasons*": "[PolicyReason]"},
    "Refund & Cancellation configuration — read by GET /admin/orders/{id}/refund-eligibility and enforced by POST /refund")
patch("StoreInfo", {"category*": "Category", "description": "LocalizedText"}, drop=["businessCategory", "about"])
SCHEMAS["StoreInfo"]["properties"]["address"] = S("LocalizedText")
patch("StoreInfoInput", {"category": "Category", "description": "LocalizedText"}, drop=["businessCategory", "about"])
SCHEMAS["StoreInfoInput"]["properties"]["address"] = S("LocalizedText")
patch("MerchantSecurity", {"twoFactor": "bool", "lastPasswordChangeAt": "?dt"}, drop=["twoFactorEnabled"])
SCHEMAS["MerchantSecurityResult"] = O({"businessEmail*": "email", "twoFactor": "bool", "lastPasswordChangeAt": "?dt", "verificationSent*": "bool=true", "sentTo": "email"})
patch("DayHours", {"closed*": "bool=false"}, drop=["enabled"])
patch("OperatingHours", {"branches": "[Ref]"})
patch("HelpRequest", {"number*": "str=HR-1003", "subject*": "LocalizedText", "topic": "str", "updatedAt": "dt"}, opt=["name", "phoneCountry", "phone", "description"])
patch("HelpRequestInput", {"topic": "str"})
patch("Review", {"customer*": "Ref", "listing": O({"id*": "id", "title*": "str=Morning Pastry Box"}), "helpful": "int=3"}, drop=["author", "authorInitials", "bag"])
SCHEMAS["RatingSummary"] = O({"average*": "num=4.7", "total": "int=578#Reviews screen", "count": "int=842#Overview card (same meaning as total)", "distribution*": "[RatingBucket]", "replied": "int", "reported": "int"})
patch("Dispute", {"number*": "str=TK-1042", "customer*": "Ref", "priority": "TicketPriority", "tab": "DisputeTab", "messagesCount": "int"}, drop=["user"], opt=["updatedAt"])
SCHEMAS["Dispute"]["properties"]["subject"] = dict(LTXT)
flat("DisputeDetail", "Dispute", {"messages*": "[TicketMessage]"}, "Dispute detail = Dispute + thread (messages: { id, from, role, body, at })")

# --- merchant ops (D4)
patch("MerchantOrder", {"listingId": "?id", "total*": "Money", "driver": "?DriverRef", "createdAt*": "dt", "deliveryAddress": "?LocalizedText",
    "timeline": "[OrderEvent]"}, drop=["amount", "placedAt"])
SCHEMAS["MerchantOrder"]["properties"]["bag"] = S("LocalizedText#Bag title")
flat("MerchantOrderDetail", "MerchantOrder", {"items": "[OrderItem]", "payment": "PaymentInfo", "availableDrivers": "[DriverRef]"}, "Order detail modal = MerchantOrder (+ items/payment/availableDrivers when available)")
SCHEMAS["MerchantOrderSummary"] = O({"total*": "int=8", "readyForPickup*": "int=2", "outForDelivery*": "int=1", "awaitingDriver*": "int=2", "activeDrivers*": "int=5"})
patch("Listing", {"thumb": "str", "imageUrl": "?str", "merchantId": "id", "branchId": "id", "titleI18n": "LocalizedText"},
      opt=["availability", "images", "listingType", "settings", "stats"])
patch("ListingSummary", {"disabled": "int", "paused": "int"}, opt=["forceDisabled"])
patch("Driver", {"branchId": "id", "onTime*": "pct=98", "compliance": "str", "certificate": "str", "certificateExpiry": "?date", "joinedAt": "dt"}, drop=["onTimePct"], opt=["code"])
SCHEMAS["Driver"]["properties"]["name"] = dict(LTXT)
flat("DriverDetail", "Driver", {"branch": "Ref", "orders": "[MerchantOrder]", "activity": "[Activity]"}, "Driver detail = Driver + branch + orders")
SCHEMAS["DriverSummary"] = O({"total*": "int=4", "available*": "int=2", "onDelivery*": "int=1", "offline*": "int=1", "avgOnTime*": "pct=99.98"})
patch("Customer", {"favoriteCategory": "Category", "city": "str", "mealsSaved": "int"})
SCHEMAS["Customer"]["properties"]["name"] = dict(LTXT)
flat("CustomerDetail", "Customer", {"orders": "[MerchantOrder]", "reviews": "[Review]"}, "Customer detail = Customer + orders")
SCHEMAS["CustomerSummary"] = O({"total*": "int=10", "active*": "int=7", "inactive*": "int=4", "blocked*": "int=1", "avgRescueScore*": "num=82"})
patch("Vendor", {"tradeLicenseNo": "str", "commissionRate": "pct", "city": "str", "listingsCount": "int", "ordersCount": "int"})
SCHEMAS["Vendor"]["properties"]["name"] = dict(LTXT)
flat("VendorDetail", "Vendor", {"branches": "[Ref]", "activity": "[Activity]"}, "Vendor detail = Vendor")
patch("VendorSummary", {"inactive": "int"})
patch("DayRecord", {"co2T*": "num=0.25"}, drop=["co2Tonnes"])
patch("TopOffer", {"id*": "id", "title*": "LocalizedText", "sellThrough*": "pct=95", "tone": "int"}, drop=["listing", "sellThroughPct"])
patch("EarningsSummary", {"split*": "[Segment]#netEarnings, commission, adjustments"}, drop=["composition"])
patch("SalesAnalytics", {"period*": "PeriodPreset", "days*": "[DayRecord]#H) latest records", "daysTotal": "int=30"}, drop=["dayBreakdown"])
SCHEMAS["SalesAnalytics"]["properties"]["salesPerformance"] = S("[Series]#A) revenue + orders")
SCHEMAS["SalesAnalytics"]["properties"]["ordersPickups"] = O({"reserved*": "int=870", "collected*": "int=842", "completionRate*": "pct=96.8", "customerCancellations*": "int=12",
    "merchantCancellations*": "int=3", "noShows*": "int=10", "refunds*": "int=7"}, "D) Orders & Pickups")
SCHEMAS["SalesAnalytics"]["properties"]["customerInsights"] = O({"newCustomers*": "int=402", "returningCustomers*": "int=222", "repeatRate*": "pct=36", "avgRating*": "num=4.8", "reviews*": "int=186"}, "F) Customer Insights")
SCHEMAS["SalesAnalytics"]["properties"]["impact"] = O({"mealsSaved*": "int=15800", "foodKgSaved*": "num=11800", "co2TAvoided*": "num=6.3", "foodWasteValueSaved*": "Money"}, "G) Your Impact")
SCHEMAS["EarningsSummary"]["properties"]["split"] = S("[EarningsSplit]")
SCHEMAS["EarningsSplit"] = O({"key*": "enum(netEarnings,commission,adjustments)", "label*": "str=Net Earnings", "pct*": "pct=83"})
patch("EarningsSummary", opt=["nextPayoutDate"])
SCHEMAS["BranchesSummary"] = O({"total*": "int=3", "open*": "int=3"})

# request-body fields accepted by the final mocks
patch("DriverInput", {"certificateExpiry": "date", "certificate": "str"})
patch("VendorInput", {"city": "str", "commissionRate": "pct"})
patch("TemplateInput", {"quantity": "int=8", "suggestedPrice": "Money"})
patch("DropUpdate", {"description": "LocalizedText"})
patch("FlagBody", {"note": "str"})
patch("ReasonBody", {"note": "str", "refund": "bool#Pickup cancel: refund per policy"})
patch("RefundRequest", {"toWallet": "bool#Legacy alias of destination=wallet_credit"})
patch("MerchantCreate", {"location": "Address#Alias of address (form step 'Location')"})
patch("MessageBody", {"attachments": "[Attachment]"})

# ---------------------------------------------------------------- (v1.3) markets
ENUMS["Country"] = ("QA AE SA", "Market country (ISO 3166-1 alpha-2). QA is the launch market; enabled markets come from GET /shared/markets")
schema("MarketCity", {"id*": "id=doha", "name*": "LocalizedText", "enabled": "bool=true"}, "City of a market (ids are unique across markets)")
schema("Market", {"code*": "Country", "name*": "LocalizedText", "currency*": "Currency", "currencyName": "LocalizedText", "currencyLabel*": "LocalizedText#Display label, e.g. QAR / ر.ق",
    "phoneCode*": "str=+974", "phoneLength": "int=8", "phonePlaceholder": "str=5512 3456", "supportPhone": "str=+97455500800", "supportPhoneLabel": "str=4400 0800",
    "timeZone*": "str=Asia/Qatar#IANA time zone; branch-local times (hours, pickup windows) use it", "utcOffset": "str=+03:00", "locale": "str=en-QA", "flag": "str=qa",
    "vatRate*": "pct=0", "enabled*": "bool=true#Only enabled markets appear in the admin switcher, filters, merchant sign-up and branch creation", "launchedAt": "?date", "cities*": "[MarketCity]"},
    "A country the platform operates in. Adding UAE/KSA = enabling them here — no code changes.")
schema("MarketUpdate", {"enabled": "bool", "timeZone": "str=Asia/Qatar", "phoneCode": "str=+974", "vatRate": "pct=0", "locale": "str"})
schema("MarketCityInput", {"name*": "LocalizedText", "enabled": "bool=true"})
schema("MarketCityUpdate", {"name": "LocalizedText", "enabled": "bool"})
schema("FxRate", {"currency*": "Currency", "rate*": "num=0.9913#1 unit of `currency` in the reporting currency"})
schema("FxSettings", {"reportingCurrency*": "Currency#Used when 'All markets' combines amounts in different currencies (default QAR)", "base": "Currency", "rates*": "[FxRate]",
    "updatedAt": "dt", "updatedBy": "str=Sarah Al Manasoori"}, "Manual FX rates (reporting currency rate = 1)")
schema("FxUpdate", {"reportingCurrency*": "Currency", "rates*": "[FxRate]"})
schema("MarketMeta", {"scope*": "[Country]#Markets the response covers", "converted*": "bool#true when amounts from several currencies were converted", "reportingCurrency*": "Currency"},
    "meta.market on aggregate (KPI/chart) responses read with market=all")
schema("MarketList", {"data*": "[Market]", "meta": O({"reportingCurrency": "Currency", "fx": O({"rates": "[FxRate]", "updatedAt": "dt"})})})
MK_ROW = "Country#Market of the row — admin lists are filtered by the `market` query param"
for nm in ("Drop", "DropDetail", "Order", "OrderSummary", "Pickup", "PickupDetail", "Consumer", "ConsumerDetail", "Case", "CaseDetail", "Ticket", "TicketDetail", "Payout", "Refund", "ComplianceRow", "MerchantPerformanceRow", "Wallet"):
    if nm in SCHEMAS: patch(nm, {"market": MK_ROW})
MK_FIELDS = {"country": "Country", "currency": "Currency#From the market", "timeZone": "str=Asia/Qatar#From the market"}
for nm in ("Branch", "BranchOption"):
    patch(nm, dict(MK_FIELDS))
patch("BranchInput", {"country": "Country#Must be an enabled market (default QA); city must belong to it"})
patch("User", {"country": "Country", "timeZone": "str=Asia/Qatar"})
patch("MerchantContext", {"country*": "Country", "timeZone*": "str=Asia/Qatar"})
SCHEMAS["MerchantContext"]["properties"]["branches"] = S("[BranchOption]")
patch("OperatingHours", {"timeZone": "str=Asia/Qatar#Branch time zone of the hours", "branches": "[BranchOption]"})
for nm in ("MerchantSummary", "MerchantDetail"):
    if nm in SCHEMAS: patch(nm, {"currency": "Currency#Currency of the merchant's market"})

# =====================================================================================================
# v1.4 AUDIT FIXES — one shared demo store for both portals (assets/js/api/mock/store.js), order state machine,
# pickup codes, stock accounting, commission settings, support contacts, merchant approval.
# =====================================================================================================
ENUMS["OrderAction"] = ("verify_pickup assign_driver mark_delivered complete cancel refund",
    "Actions the order state machine allows right now (UI shows only these). verify_pickup = self-pickup completion via code; complete = delivered → completed")
ENUMS["CommissionSource"] = ("platform_default contract", "Where a merchant's commission rate comes from")
ENUMS["PickupCodeError"] = ("invalid_code code_used code_expired invalid_transition", "Pickup verification failure codes (422 invalid_code / code_expired, 409 code_used / invalid_transition)")
ENUMS["AccountStatusError"] = ("pending_verification account_rejected account_suspended", "403 codes of POST /auth/login for merchant accounts that may not sign in")
SM = "#Order state machine: reserved→confirmed→ready_for_pickup→completed (pickup, via code) · confirmed→driver_assigned→out_for_delivery→delivered→completed (delivery). completed / cancelled / refunded are terminal (completed accepts only refund events)."
ORDER_V14 = {"allowedActions*": "[OrderAction]" + SM, "active*": "bool#Paid and not yet collected, regardless of the pickup date",
             "merchantId": "id=MER-066", "branchId": "id=BR-01", "listingId": "id=LIS-2412", "dropId": "id=LIS-2412#Same id as the merchant listing", "consumerId": "id=CON-48291",
             "pickupDate": "date", "pickupId": "?id=PK-60001", "updatedAt": "dt", "completedAt": "?dt", "historical": "bool#Demo history (completed orders of the last 4 weeks)",
             "cancelReason": "?str", "refund": "?obj", "paymentStatus": "PaymentStatus", "paymentMethod": "obj", "fees": "Money", "items": "[OrderItem]", "city": "str", "category": "Category", "dietary": "[Dietary]",
             "market": "Country", "driver": "?DriverRef", "deliveryAddress": "?LocalizedText"}
for nm in ("MerchantOrder", "MerchantOrderDetail"):
    patch(nm, dict(ORDER_V14))
for nm in ("Order", "OrderSummary"):
    patch(nm, {k: v for k, v in ORDER_V14.items() if k in ("allowedActions*", "active*", "listingId", "driver", "pickupDate", "deliveryAddress", "updatedAt", "historical", "cancelReason", "completedAt")})
patch("MerchantOrderSummary", {"active": "int=6#Paid, not yet collected"})
patch("Listing", {"reserved*": "int=2#Held by paid, uncollected orders", "collected*": "int=0#Handed over today", "market": "Country", "date": "date",
                  "flagged": "bool#Disabled by WonderBites (Admin → Drops flag)", "moderation": "?obj#{ by, reason, note, at } when flagged"},
      desc="A merchant listing — the same record is an admin Drop (same id). remaining = quantity − reserved − collected; remaining changes only when quantity, reservations or collections change.")
patch("Pickup", {"expiresAt*": "dt#Pickup window end (branch time) + 30 min grace", "usedAt": "?dt#Set once — codes are single-use"})
patch("PickupDetail", {"expiresAt": "dt", "usedAt": "?dt"})
SCHEMAS["Pickup"]["properties"]["passportCode"] = S("str=K3D8E7#6 characters, A–Z/2–9 without ambiguous 0 O 1 I L; single-use; expires at window end + grace")
SCHEMAS["VerifyCode"]["properties"]["code"] = S("str=K3D8E7")
patch("VerifyResult", {"order": "Order#The order after verification (status completed)", "reason": "?PickupCodeError#valid:false → invalid_code"})
schema("PickupVerifyInput", {"code*": "str=K3D8E7#Case-insensitive", "orderId": "id=MO-5210#Verify against this order (merchant order modal)", "branchId": "id"})
schema("PickupVerifyResult", {"valid*": "bool=true", "order*": "MerchantOrder#status completed; timeline gains one pickup_verified event",
    "pickup*": O({"id*": "id=PK-60001", "orderId*": "id=MO-5210", "status*": "PickupStatus", "usedAt*": "dt", "expiresAt*": "dt"})},
    "Atomic: verifies the code, marks it used and completes the order. 422 invalid_code (wrong / unknown code) or code_expired; 409 code_used or invalid_transition.")
schema("InvalidTransitionDetails", {"from*": "OrderStatus", "to*": "OrderStatus", "allowed": "[OrderStatus]", "requires": "?str=pickup_verification"})
schema("CommissionPeriod", {"rate*": "pct=19", "from*": "date=2026-01-01", "to": "?date", "note": "str=Platform default"})
schema("CommercialSettings", {"defaultCommissionRate*": "pct=19#Platform default, applied to the gross value of completed orders", "effectiveFrom*": "date=2026-01-01",
    "history*": "[CommissionPeriod]#Effective-dated; a new rate closes the previous period", "contracts": "obj#merchantId → [CommissionPeriod] (merchant contract overrides)",
    "currencyNote": "str", "updatedAt": "dt", "updatedBy": "str=Sarah Al Manasoori"}, "Admin → Settings → General → Commercial")
schema("CommercialUpdate", {"defaultCommissionRate*": "pct=20#0–50", "effectiveFrom": "date#Default today; must be after the current period's start"})
schema("MerchantContract", {"merchantId*": "id=MER-071", "commissionRate*": "pct=17#Effective rate today", "contract": "?CommissionPeriod#null = platform default", "platformDefault*": "pct=19"})
schema("MerchantContractUpdate", {"commissionRate": "?pct=17#null or empty = use the platform default", "effectiveFrom": "date"})
schema("DemoReservationInput", {"listingId*": "id=LIS-2412", "qty": "int=1", "fulfillment": "FulfillmentType", "customer": "str=Aisha Al Mansoori"})
schema("DemoReservationResult", {"order*": "MerchantOrder", "listing*": O({"id*": "id", "remaining*": "int=5", "reserved*": "int=3", "status*": "ListingStatus"})},
    "Demo-only stand-in for the consumer app checkout: creates a paid order in the shared store and holds stock")
for nm in ("Merchant", "MerchantSummary"):
    patch(nm, {"commissionSource": "CommissionSource", "source": "enum(admin,self_signup)#self_signup = created by merchant sign-up (Pending verification)"})
patch("Payout", {"orders": "int=63", "commissionRate": "pct=19", "source": "enum(orders)#Computed from the merchant's completed orders (shared store)"})
patch("EarningsSummary", {"commissionRate": "pct=19"})
patch("DayRecord", {"commissionRate": "pct=19", "payoutId": "?id"})
patch("SalesAnalytics", {"from": "date", "to": "date", "commissionRate": "pct=19"})
patch("MerchantOverview", {"range": O({"from": "date", "to": "date"})}, desc="Derived from the same orders/listings as Orders & Pickups and Inventory (pending pickups = active pickup orders; completed/cancelled in range; top bags from completed orders).")
patch("RatingSummary", {"removed": "int=0"})
patch("HelpRequest", {"repliesCount": "int=1", "lastReply": "?obj#{ body, at, by } — latest WonderBites reply (Admin → Support)"})
SUPPORT = {"supportEmail*": "email=support@wonderbites.qa", "merchantSupportEmail": "email=partners@wonderbites.qa", "supportWhatsApp": "str=+97455500801",
           "supportHours": "LocalizedText#e.g. Daily 8:00–22:00"}
patch("Market", dict(SUPPORT))
SCHEMAS["Market"]["properties"]["supportPhoneLabel"] = S("str=5550 0800")
patch("MarketUpdate", {k.rstrip("*"): v for k, v in SUPPORT.items()} | {"supportPhone": "str=+974 5550 0800"})
SCHEMAS["HelpContent"]["properties"]["contact"] = S("[obj]#[{ key: phone|email|whatsapp, label, value, href, hours }] — from the merchant's market in the markets registry")

for n, (vals, d) in ENUMS.items():
    SCHEMAS[n] = {"type": "string", "enum": vals.split(), "description": d}
