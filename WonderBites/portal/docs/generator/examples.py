"""Field-aware, realistic example values for the WonderBites API docs.

ex(schema, name, depth, ctx) walks a JSON schema and returns a sample value. `name` is the property
name and `ctx` is the nearest named schema (e.g. "Drop", "AdminUser"). Values are chosen by
(ctx, name) first, then by name, then by type. The rules: bag names only appear in bag / listing / drop
fields, merchant names in merchant fields, people in person fields, UAE/Qatar places, valid enums,
Money as {amount, currency}, and IDs in the format the mocks use.
"""
from model import SCHEMAS

DT, DATE = "2026-11-19T16:30:00Z", "2026-11-19"

def L(en, ar): return {"en": en, "ar": ar}
BAG = L("Morning Pastry Box", "صندوق معجنات الصباح")
BAG_DESC = L("Today's croissants, danishes and muffins — contents vary with the day's surplus.", "كرواسون ودانش ومافن اليوم — يختلف المحتوى حسب فائض اليوم.")
BAG_SHORT = L("Assorted pastries from this morning's bake", "معجنات متنوعة من خبز الصباح")
MERCHANT = L("Sunrise Bakehouse", "مخبز الشروق")
MY_MERCHANT = L("Fig & Bloom Bakery", "مخبز فيج آند بلوم")
BRANCH = L("West Bay Branch", "فرع الخليج الغربي")
CONSUMER = L("Aisha Al Mansoori", "عائشة المنصوري")
CUSTOMER = L("Yusuf Al Amiri", "يوسف العامري")
DRIVER = L("Rashid Al Ketbi", "راشد الكتبي")
TEMPLATE = L("Bakery Surplus Box", "صندوق فائض المخبز")
ADDRESS = L("Al Corniche St 214, West Bay", "شارع الكورنيش 214، الخليج الغربي")
DUBAI = L("Doha", "الدوحة")
AGENT = "Dana K."

BAG_CTX = {"Drop", "DropDetail", "DropUpdate", "Listing", "ListingInput", "ListingDetail", "Product", "ProductInput", "TopOffer", "MerchantOrder",
           "MerchantOrderDetail", "LiveDropRow", "OrderItem", "TemplateDefaults", "TopBag", "Pickup", "PickupDetail", "OrderSummary", "Order"}
MERCHANT_CTX = {"Merchant", "MerchantSummary", "MerchantCreate", "MerchantUpdate", "MerchantPerformanceRow", "MerchantImpactRow", "MerchantQualityRow", "MerchantContext"}
PERSON_CTX = {"Consumer", "ConsumerDetail", "ConsumerUpdate", "Customer", "CustomerDetail", "CustomerInput", "TicketRequester", "HelpRequest", "HelpRequestInput", "Review"}
AGENT_CTX = {"AdminUser", "UserRef", "InviteBody", "UserUpdate", "MessageAuthor", "ReviewReply", "Note"}

LOC = {  # (ctx or None, field) -> LocalizedText
    (None, "title"): L("Recurring missed pickup windows", "تكرار تفويت مواعيد الاستلام"),
    (None, "subject"): L("Order never arrived – refund request", "الطلب لم يصل – طلب استرداد"),
    (None, "description"): L("Neighbourhood bakery with daily surplus bags.", "مخبز الحي مع أكياس فائض يومية."),
    (None, "shortDescription"): BAG_SHORT, (None, "address"): ADDRESS, (None, "deliveryAddress"): ADDRESS,
    (None, "state"): DUBAI, (None, "city"): DUBAI, (None, "bag"): BAG, (None, "titleI18n"): BAG, (None, "descriptionI18n"): BAG_DESC,
    (None, "body"): L("Thanks — we've issued a refund to your wallet.", "شكرًا — أعدنا المبلغ إلى محفظتك."),
    (None, "question"): L("How does the pickup passport work?", "كيف يعمل جواز الاستلام؟"),
    (None, "answer"): L("Show the code in the app at the counter; staff verify it before handing over your bag.", "اعرض الرمز في التطبيق عند الكاونتر ليتحقق منه الموظف قبل تسليم الكيس."),
    (None, "ctaLabel"): L("Shop now", "تسوّق الآن"), (None, "subtitle"): L("Up to 70% off surplus bags this week", "خصم حتى 70٪ على أكياس الفائض هذا الأسبوع"),
    (None, "seoDescription"): L("How WonderBites rescues surplus food near you.", "كيف تنقذ وندر بايتس فائض الطعام بالقرب منك."),
    (None, "reasonLabel"): L("Store closed", "المتجر مغلق"), (None, "allergenNote"): L("Contains gluten, dairy and eggs", "يحتوي على الغلوتين والألبان والبيض"),
    (None, "instructions"): L("Collect from the front counter and show your pickup passport.", "استلم من الكاونتر الأمامي واعرض جواز الاستلام."),
    (None, "message"): L("Thanks for rescuing food with us!", "شكرًا لإنقاذ الطعام معنا!"),
    (None, "content"): L("<h2>Refund & Cancellation Policy</h2><p>Customers may cancel up to 2 hours before the collection window.</p>", "<h2>سياسة الاسترداد والإلغاء</h2><p>يمكن الإلغاء قبل ساعتين من موعد الاستلام.</p>"),
    (None, "about"): L("A chef's selection of today's best dishes at a fraction of the price.", "تشكيلة الشيف من أفضل أطباق اليوم بجزء من السعر."),
    (None, "label"): L("Store closed", "المتجر مغلق"), (None, "name"): MERCHANT, (None, "businessName"): MY_MERCHANT,
    ("Template", "name"): TEMPLATE, ("TemplateInput", "name"): TEMPLATE, ("TemplateUsage", "name"): TEMPLATE, ("TemplateDefaults", "name"): BAG,
    ("Template", "description"): L("Pastry category, standard quantity, morning pickup window and a suggested price.", "فئة المعجنات، كمية قياسية، موعد استلام صباحي وسعر مقترح."),
    ("TemplateInput", "description"): L("Pastry category, standard quantity, morning pickup window and a suggested price.", "فئة المعجنات، كمية قياسية، موعد استلام صباحي وسعر مقترح."),
    ("TemplateField", "label"): L("Portion size", "حجم الحصة"), ("PolicyReason", "label"): L("Store closed", "المتجر مغلق"),
    ("AlertSetting", "label"): L("Critical issue alerts", "تنبيهات المشكلات الحرجة"),
    ("AlertSetting", "description"): L("Email and push when a Critical severity issue is opened.", "بريد وإشعار عند فتح مشكلة حرجة."),
    ("RoleCard", "label"): L("Operations Admin", "مسؤول العمليات"), ("RoleCard", "description"): L("Drops, pickups, merchants, and quality & trust tooling.", "العروض والاستلام والتجار وأدوات الجودة والثقة."),
    ("CmsItem", "title"): L("How WonderBites Works", "كيف تعمل وندر بايتس"), ("CmsPage", "title"): L("How WonderBites Works", "كيف تعمل وندر بايتس"),
    ("CmsPageInput", "title"): L("How WonderBites Works", "كيف تعمل وندر بايتس"),
    ("CmsPage", "body"): L("<p>Restaurants list today's surplus as bags; you reserve and collect.</p>", "<p>تعرض المطاعم فائض اليوم في أكياس؛ تحجز وتستلم.</p>"),
    ("CmsPageInput", "body"): L("<p>Restaurants list today's surplus as bags; you reserve and collect.</p>", "<p>تعرض المطاعم فائض اليوم في أكياس؛ تحجز وتستلم.</p>"),
    ("Banner", "title"): L("Summer Rescue Sale", "تخفيضات الإنقاذ الصيفية"), ("BannerInput", "title"): L("Summer Rescue Sale", "تخفيضات الإنقاذ الصيفية"),
    ("Voucher", "name"): L("Welcome 20% off", "خصم ترحيبي 20٪"), ("VoucherInput", "name"): L("Welcome 20% off", "خصم ترحيبي 20٪"),
    ("Review", "body"): L("Great value pastry box, still fresh at pickup.", "صندوق معجنات بقيمة رائعة وما زال طازجًا عند الاستلام."),
    ("HelpRequest", "subject"): L("Payout not received for last week", "لم أستلم دفعة الأسبوع الماضي"),
    ("StoreInfo", "description"): L("A chef's selection of today's best dishes at a fraction of the price.", "تشكيلة الشيف من أفضل أطباق اليوم بجزء من السعر."),
    ("StoreInfoInput", "description"): L("A chef's selection of today's best dishes at a fraction of the price.", "تشكيلة الشيف من أفضل أطباق اليوم بجزء من السعر."),
    ("StoreInfo", "name"): MY_MERCHANT, ("StoreInfoInput", "name"): MY_MERCHANT, ("MerchantContext", "name"): MY_MERCHANT,
    ("Branch", "name"): BRANCH, ("BranchInput", "name"): BRANCH, ("BranchOption", "name"): BRANCH,
    ("Driver", "name"): DRIVER, ("DriverDetail", "name"): DRIVER, ("Customer", "name"): CUSTOMER, ("CustomerDetail", "name"): CUSTOMER,
    ("Vendor", "name"): MY_MERCHANT, ("VendorDetail", "name"): MY_MERCHANT, ("Policy", "title"): L("Refund & Cancellation Policy", "سياسة الاسترداد والإلغاء"),
    ("PolicyListItem", "title"): L("Refund & Cancellation Policy", "سياسة الاسترداد والإلغاء"), ("Dispute", "subject"): L("Order never arrived – refund request", "الطلب لم يصل – طلب استرداد"),
    ("MerchantCreate", "name"): MY_MERCHANT, ("MerchantCreate", "description"): L("Neighbourhood bakery with daily surplus bags.", "مخبز الحي مع أكياس فائض يومية."),
    ("Merchant", "description"): L("Neighbourhood bakery with daily surplus bags.", "مخبز الحي مع أكياس فائض يومية."),
    ("MerchantImpactRow", "city"): DUBAI, ("TicketMessage", "body"): L("Thanks — we've issued a refund to your wallet.", "شكرًا — أعدنا المبلغ إلى محفظتك."),
    ("SignupRequest", "businessName"): MY_MERCHANT, ("PartnerFeedback", "body"): L("The new templates save us a lot of time.", "القوالب الجديدة توفر علينا الكثير من الوقت."),
}
for c in BAG_CTX:
    for f in ("title", "name"): LOC.setdefault((c, f), BAG)
    LOC.setdefault((c, "description"), BAG_DESC)
for c in MERCHANT_CTX: LOC.setdefault((c, "name"), MERCHANT)

REF = {
    "merchant": ("mer_094", "Sunrise Bakehouse"), "branch": ("BR-01", "West Bay Branch"), "consumer": ("con_48291", "Aisha Al Mansoori"),
    "customer": ("cus_118", "Yusuf Al Amiri"), "user": ("con_48291", "Amira Hassan"), "author": ("con_77", "Alex K."), "requester": ("con_48291", "Aisha Al Mansoori"),
    "bag": ("LIS-2412", "Harvest Veg Box"), "listing": ("LIS-2412", "Morning Pastry Box"), "order": ("ord_77410", "ORD-77410"),
    "template": ("tpl_12", "Bakery Surplus Box"), "driver": ("drv_04", "Rashid Al Ketbi"), "assignee": ("usr_118", "Dana K."),
    "createdBy": ("usr_121", "Nadia F."), "actor": ("usr_118", "Dana K."), "verifiedBy": ("usr_118", "Dana K."), "reviewedBy": ("usr_101", "Priya Anand"),
    "processedBy": ("usr_101", "Priya Anand"), "updatedBy": ("usr_101", "Priya Anand"), "drop": ("drp_3391", "Deli Surprise Box"),
}
PLURAL = {"merchants": "merchant", "branches": "branch", "consumers": "consumer", "customers": "customer", "listings": "listing", "templates": "template",
          "drivers": "driver", "orders": "order", "users": "user", "agents": "assignee", "related": "drop"}
REF_CTX = {"OperatingHours": "branch", "MerchantContext": "branch", "VendorDetail": "branch", "TemplateUsage": "template", "TopBag": "listing"}

MONEY = [("originalPrice", 45), ("suggestedPrice", 15), ("valueMoney", 10), ("minOrder", 30), ("maxDiscount", 20), ("unitPrice", 15), ("price", 15),
         ("walletCreditUsed", 5), ("discount", 5), ("subtotal", 15), ("total", 15), ("refunded", 0), ("refundAdjustments", 250), ("refund", 15),
         ("revenue", 8240), ("grossSales", 26540), ("gross", 21400), ("netEarnings", 22040), ("net", 18240), ("commission", 4250), ("fees", 1.2),
         ("balance", 60), ("lifetimeCredit", 180), ("totalSpent", 342), ("paidToDate", 18360), ("pendingPayout", 3680), ("retailValue", 58900),
         ("recovered", 26540), ("adjustments", 12), ("chargebacks", 160), ("credits", 1842), ("centerValue", 19120), ("amount", 15), ("maxAmount", 15)]

ID_BY_NAME = {"merchantId": "mer_094", "branchId": "BR-01", "consumerId": "con_48291", "customerId": "cus_118", "orderId": "ord_77410", "listingId": "LIS-2412",
    "dropId": "drp_3391", "driverId": "drv_04", "templateId": "tpl_12", "fileId": "fil_77", "assigneeId": "usr_118", "userId": "usr_118", "pickupId": "pk_58183",
    "caseId": "ISS-2291", "ticketId": "SUP-8841", "payoutId": "po_311", "challengeId": "chl_31", "notificationId": "ntf_51", "exportId": "exp_812",
    "importId": "imp_20", "merchantIdRef": "mer_094", "defaultBranchId": "BR-01", "parentId": "ven_1", "relatedOrderId": "ord_77410", "transactionId": "txn_8f21c",
    "avatarFileId": "fil_88", "logoFileId": "fil_89", "photoFileId": "fil_90", "imageFileId": "fil_91", "imageFileIdAr": "fil_92", "actorId": "usr_101",
    "voucherId": "vch_1", "walletId": "wal_12", "reviewId": "rev_1", "certificateId": "cert_5", "requestId": "hr_3", "disputeId": "TK-1042", "imageId": "IMG-1"}
ID_BY_CTX = {"Drop": "drp_3391", "Listing": "LIS-2412", "Order": "ord_77410", "OrderSummary": "ord_77410", "MerchantOrder": "mo_5187", "Pickup": "pk_58183",
    "Merchant": "mer_094", "MerchantSummary": "mer_094", "Consumer": "con_48291", "Customer": "cus_118", "Driver": "drv_04", "Branch": "BR-01",
    "Vendor": "ven_1", "Template": "tpl_12", "Case": "ISS-2291", "ModerationItem": "MOD-0552", "Ticket": "SUP-8841", "Dispute": "TK-1042", "Review": "rev_1",
    "Payout": "po_311", "Refund": "rf_41", "Wallet": "wal_12", "WalletTxn": "wtx_901", "Voucher": "vch_1", "Certificate": "cert_5", "AdminUser": "usr_118",
    "CmsItem": "cms_1", "CmsPage": "cms_1", "Banner": "bnr_3", "Faq": "faq_8", "Notification": "ntf_51", "ExportJob": "exp_812", "ImportJob": "imp_20",
    "Activity": "act_301", "Note": "note_12", "TicketMessage": "msg_77", "AuditEntry": "aud_5521", "HelpRequest": "hr_3", "Product": "PRD-9",
    "ListingImage": "IMG-1", "User": "usr_001", "PriorityAlert": "alt_1187", "StreamEnvelope": "evt_9001", "MerchantPerformanceRow": "mer_094",
    "ComplianceRow": "mer_094", "OrderItem": "LIS-2412", "SearchItem": "mer_094", "BranchOption": "BR-01", "DeepLink": "ord_77410", "EntityRef": "drp_3391",
    "TicketRequester": "con_48291", "MessageAuthor": "usr_118", "BulkFailure": "drp_3391", "TopOffer": "LIS-2412", "RecentOrderRow": "mo_3021",
    "TemplateUsage": "tpl_12", "LiveDropRow": "drp_3021", "IssueAlertRow": "ISS-1092", None: "ses_7781"}

STR_BY_CTX = {
    ("AdminUser", "name"): "Priya Anand", ("AdminUser", "email"): "priya.anand@wonderbites.example.com", ("InviteBody", "name"): "Theo Reyes",
    ("InviteBody", "email"): "theo.reyes@wonderbites.example.com", ("UserUpdate", "name"): "Priya Anand", ("UserRef", "name"): AGENT,
    ("MessageAuthor", "name"): AGENT, ("Consumer", "name"): "Aisha Al Mansoori", ("ConsumerUpdate", "name"): "Aisha Al Mansoori",
    ("Customer", "name"): "Yusuf Al Amiri", ("CustomerInput", "name"): "Yusuf Al Amiri", ("TicketRequester", "name"): "J. Alvarez",
    ("HelpRequest", "name"): "Sara Haddad", ("HelpRequestInput", "name"): "Sara Haddad", ("DriverRef", "name"): "Rashid Al Ketbi",
    ("DriverInput", "name"): "Rashid Al Ketbi", ("Driver", "name"): "Rashid Al Ketbi", ("VendorInput", "name"): "Olive Grove Deli",
    ("City", "name"): "Doha", ("SearchItem", "title"): "Sunrise Bakehouse", ("SearchGroup", "label"): "Merchants",
    ("ReportSection", "title"): "Drop accuracy", ("PerformanceReport", "title"): "Weekly performance report", ("Notification", "title"): "3 bags sold out",
    ("Case", "title"): "Recurring missed pickup windows", ("Case", "description"): "Three customers missed the 20:00 window this week; branch closed early twice.",
    ("CaseDetail", "description"): "Three customers missed the 20:00 window this week; branch closed early twice.", ("EntityRef", "name"): "Morning Pastry Box · DR-3391", ("Voucher", "code"): "WELCOME20", ("VoucherInput", "code"): "WELCOME20",
    ("Drop", "code"): "DR-3391", ("Merchant", "code"): "MER-094", ("MerchantSummary", "code"): "MER-094", ("Driver", "code"): "DRV-04",
    ("Pickup", "code"): "K3D8E1", ("VerifyCode", "code"): "K3D8E1", ("OtpVerify", "code"): "482913", ("Customer", "code"): "+974",
    ("CustomerInput", "code"): "+974", ("Order", "number"): "MO-5187", ("Dispute", "number"): "TK-1042", ("HelpRequest", "number"): "HR-1003",
    ("Certificate", "number"): "HACCP-2026-0112", ("CertificateInput", "number"): "HACCP-2026-0112", ("DocumentInput", "number"): "CN-1234567",
    ("Phone", "number"): "501112233", ("Kpi", "label"): "Live Drops", ("Series", "label"): "Revenue (QAR)", ("Segment", "label"): "Commission",
    ("FunnelStep", "label"): "Reserved", ("IssueCount", "label"): "Late pickups", ("EarningsSplit", "label"): "Net Earnings",
    ("Activity", "label"): "Listing updated", ("Activity", "type"): "updated", ("Activity", "by"): AGENT, ("Activity", "detail"): "Status changed to Verified",
    ("Category", "name"): "Bakery", ("MerchantPerformanceRow", "name"): "Sunrise Bakehouse", ("Vendor", "category"): "Bakery",
    ("PriorityAlert", "title"): "Green Bowl Kitchen — spoiled inventory reported", ("LiveDropRow", "title"): "Morning Pastry Box",
    ("CmsItem", "slug"): "how-wonderbites-works", ("IssueAlertRow", "type"): "Spoiled inventory", ("IssueAlertRow", "status"): "blocked",
    ("ModerationItem", "item"): "Green Leaf Kitchen — \"Fresh Garden Box\"", ("TopBag", "listing"): "Morning Pastry Box",
    ("MerchantContact", "email"): "hello@figandbloom.example.com", ("Vendor", "email"): "hello@figandbloom.example.com", ("VendorInput", "email"): "contact@olivegrove.example.com",
    ("MerchantSecurity", "businessEmail"): "hello@figandbloom.example.com", ("TicketRequester", "email"): "j.alvarez@example.com",
}
STR_BY_NAME = {
    "firstName": "Sara", "lastName": "Haddad", "ownerName": "Sara Haddad", "ownerFirstName": "Sara", "ownerLastName": "Haddad", "name": "Sunrise Bakehouse",
    "email": "aisha.mansoori@example.com", "businessEmail": "hello@figandbloom.example.com", "verificationSentTo": "s•••@figandbloom.example.com", "sentTo": "+974 •••• 2233",
    "phone": "+974 5550 2233", "phoneCountry": "+974", "countryCode": "+974", "mobile": "5511 2233", "code": "WELCOME20", "number": "MO-5187",
    "city": "Doha", "region": "Doha", "state": "Doha", "postalCode": "00000", "zip": "00000", "line1": "Al Corniche St 214, West Bay",
    "address": "Al Corniche St 214, West Bay", "addressNote": "Address on file with customer profile", "timezone": "Asia/Doha", "defaultTimezone": "Asia/Doha",
    "title": "Morning Pastry Box", "bagTitle": "Morning Pastry Box", "subject": "Refund not received for missed drop", "label": "Store closed",
    "reason": "Repeated missed pickup windows", "note": "Checked with the branch manager", "body": "Thanks — we've issued a refund to your wallet.",
    "message": "Please check the pickup window for today.", "description": "Pastry category, standard quantity, morning pickup window.",
    "resolution": "Refund issued to wallet", "content": "Misleading photo in listing", "text": "Photo does not match the bag contents",
    "slug": "how-wonderbites-works", "thumb": "pastry-1", "icon": "box", "initials": "FB", "plate": "D 12345", "licenseNo": "DL-448812",
    "certificate": "Food handler card", "compliance": "valid", "vatNo": "100234567800003", "iban": "QA00 DEMO 0000 0000 0000 0000 0000 000", "bankName": "Emirates NBD",
    "accountName": "Fig & Bloom Bakery LLC", "legalName": "Fig & Bloom Bakery LLC", "tradeLicenseNo": "CN-1234567", "period": "2026-07", "version": "3",
    "resource": "admin.drops", "reference": "PO-2026-0711", "failureReason": "Bank rejected the IBAN", "frozenReason": "Suspected abuse — under review",
    "flagReason": "Misleading photo", "flagNote": "Photo shows a different bag", "statusReason": "Missing trade licence", "blockReason": "Repeated no-shows",
    "category": "Bakery", "topic": "Payouts", "route": "admin-orders", "action": "listing.updated", "target": "Voucher WELCOME20", "entityType": "voucher",
    "by": AGENT, "detail": "Status changed to Verified", "caption": "Across all restaurants", "comparison": "vs. previous period", "hint": "vs previous 30 days",
    "badge": "01 Critical", "key": "revenue", "source": "Merchant · Critical", "subtitle": "15 min left", "location": "Al Corniche St", "type": "updated",
    "status": "open", "role": "support_agent", "item": "Green Leaf Kitchen — \"Fresh Garden Box\"", "tab": "open", "x": DATE, "value": "AE",
    "token": "rst_4b1e9c", "accessToken": "eyJhbGciOiJIUzI1NiJ9…", "refreshToken": "rt_9f2c41…", "secret": "JBSWY3DPEHPK3PXP", "password": "••••••••",
    "currentPassword": "••••••••", "newPassword": "••••••••", "confirmPassword": "••••••••", "ip": "185.12.4.20", "device": "Chrome 131 · macOS",
    "fileName": "pastry.webp", "contentType": "image/webp", "passportCode": "K3D8E1", "pickupCode": "K3D8E1", "codeMasked": "K3••E1",
    "transactionId": "txn_8f21c", "last4": "6620", "equivalentText": "Equivalent to taking 14 cars off the road for a year.", "conversionLabel": "Conversion (Reserved → Rated)",
    "greetingName": "Sara", "lastPublishedTitle": "Home banner update", "favoriteCategory": "bakery", "groupBy": "city", "week": "2026-W29",
    "manager": "Omar R.", "placement": "home_hero", "unit": "bag", "error": "Drop has live reservations", "issue": "Passport expires in 3 days", "schedule": "weekly", "otpauthUrl": "otpauth://totp/WonderBites:sara@figandbloom.example.com?secret=JBSWY3DPEHPK3PXP",
}
URLS = {"imageUrl": "https://cdn.wonderbites.app/bags/morning-pastry.webp", "logoUrl": "https://cdn.wonderbites.app/merchants/sunrise.webp",
        "avatarUrl": "https://cdn.wonderbites.app/avatars/usr_118.webp", "thumbnailUrl": "https://cdn.wonderbites.app/cms/banner-1.webp",
        "photoUrl": "https://cdn.wonderbites.app/branches/al-wasl.webp", "downloadUrl": "https://files.wonderbites.app/exports/exp_812.csv?sig=…",
        "uploadUrl": "https://uploads.wonderbites.app/fil_77?X-Amz-Signature=…", "fileUrl": "https://cdn.wonderbites.app/files/fil_77.webp",
        "url": "https://cdn.wonderbites.app/bags/morning-pastry.webp", "imageUrlAr": "https://cdn.wonderbites.app/cms/banner-1-ar.webp"}
EMAIL_CTX = {"AdminUser", "AdminProfile", "InviteBody", "User"}
NUM_BY_NAME = {"rating": 4.7, "average": 4.7, "lat": 25.2048, "lng": 55.2708, "page": 1, "pageSize": 10, "retryAfter": 30, "expiresIn": 900, "size": 812000,
    "progress": 100, "stars": 5, "order": 0, "qualityScore": 94, "hygieneScore": 14, "hygieneMax": 20, "max": 20, "score": 16, "rescueScore": 95,
    "quantity": 8, "remaining": 6, "reserved": 14, "collected": 10, "sold": 86, "qty": 1, "usageLimit": 1000, "perUserLimit": 1, "used": 642,
    "value": 20, "delta": 3.4, "share": 90.1, "rate": 91, "pct": 83, "commissionRate": 20, "commissionPct": 20, "discountPct": 67, "onTime": 98,
    "onTimePct": 97, "ageMinutes": 120, "ageHours": 2, "freeCancellationHours": 2, "hoursSincePlaced": 1.5, "hoursToWindow": 3, "sessionTimeoutMinutes": 30,
    "x": 1, "y": 220342.76, "count": 42, "total": 42, "updated": 3, "processed": 120, "failed": 2, "row": 14, "rows": 12, "valid": 11, "mealsSaved": 640,
    "foodKg": 478, "co2T": 0.25, "co2Tonnes": 24.1, "waterLitres": 11800, "boxes": 37, "orders": 34, "deliveries": 25, "equivalentCars": 14, "tone": 1,
    "minLength": 10, "usageCount": 24, "usedByMerchants": 84, "branchesCount": 2, "dropsCount": 38, "ordersCount": 8, "activeListings": 4,
    "messageCount": 3, "messagesCount": 3, "reportsCount": 1, "helpful": 3, "daysTotal": 30, "listed": 1090, "unsold": 175, "attentionCount": 78}

def humanize(n): return "".join(" " + c.lower() if c.isupper() else c for c in (n or "value")).strip().capitalize()
def money(name):
    for k, v in MONEY:
        if name and name.lower().endswith(k.lower()): return {"amount": v, "currency": "QAR"}
    return {"amount": 120, "currency": "QAR"}
def loc(name, ctx):
    return LOC.get((ctx, name)) or LOC.get((None, name)) or L(humanize(name), humanize(name))
def ref(name, ctx):
    k = name if name in REF else PLURAL.get(name) or REF_CTX.get(ctx)
    i, n = REF.get(k, ("mer_094", "Sunrise Bakehouse"))
    return {"id": i, "name": n}
def string(name, ctx):
    if (ctx, name) in STR_BY_CTX: return STR_BY_CTX[(ctx, name)]
    if name in URLS: return URLS[name]
    if name == "email" and ctx in EMAIL_CTX: return "sara@wonderbites.example.com"
    if name == "name" and ctx in AGENT_CTX: return AGENT
    if name == "name" and ctx in PERSON_CTX: return "Aisha Al Mansoori"
    if name == "id": return ID_BY_CTX.get(ctx, (ctx or "obj")[:3].lower() + "_1024")
    if name in ID_BY_NAME: return ID_BY_NAME[name]
    if name in STR_BY_NAME: return STR_BY_NAME[name]
    if name:
        low = name.lower()
        for k in ("email", "phone", "reason", "note", "title", "description", "address", "city", "code", "label"):
            if low.endswith(k): return STR_BY_NAME[k]
        if low.endswith("id"): return ID_BY_NAME.get(name, name[:-2][:3].lower() + "_1024")
        if low.endswith("url"): return URLS["url"]
    return humanize(name)

OVERRIDE = {
    ("FinancialFilterOptions", "countries"): [{"value": "AE", "label": L("United Arab Emirates", "الإمارات العربية المتحدة")}, {"value": "QA", "label": L("Qatar", "قطر")}],
    ("FinancialFilterOptions", "cities"): [{"value": "dubai", "label": DUBAI, "country": "AE"}, {"value": "doha", "label": L("Doha", "الدوحة"), "country": "QA"}],
    ("FinancialFilterOptions", "categories"): [{"value": "bakery"}, {"value": "restaurant"}, {"value": "grocery"}],
    ("FinancialFilterOptions", "merchants"): [{"value": "mer_094", "label": MERCHANT, "country": "AE", "city": "dubai", "category": "bakery",
                                               "branches": [{"value": "BR-01", "label": BRANCH}]}],
    ("FinancialFilterOptions", "orderTypes"): [{"value": "pickup"}, {"value": "delivery"}],
    ("City", "id"): "dubai", ("Pickup", "bag"): {"id": "LIS-2412", "title": "Morning Pastry Box", "thumb": "pastry-1"},
    ("PickupDetail", "bag"): {"id": "LIS-2412", "title": "Morning Pastry Box", "thumb": "pastry-1"}, ("ExportRequest", "resource"): "admin.drops", ("ImportJob", "resource"): "merchant.customers",
    ("ExportJob", "resource"): "admin.drops", ("ExportJob", "fileName"): "drops-2026-07-20.csv", ("ImportRequest", "fileId"): "fil_77",
    ("SupportDashboard", "byChannel"): [{"key": "in_app", "count": 42}, {"key": "chat", "count": 51}, {"key": "email", "count": 30}],
    ("EnumCatalog", "enums"): {"OrderStatus": [{"value": "reserved", "label": "Placed"}, {"value": "confirmed", "label": "Confirmed"}]},
    ("SearchResult", "groups"): [{"type": "merchants", "label": "Merchants", "total": 1, "items": [{"id": "mer_094", "title": "Sunrise Bakehouse",
                                   "subtitle": "MER-094 · Doha", "link": {"route": "admin-merchant", "id": "mer_094"}}]}],
}

def ex(s, name=None, depth=0, ctx=None):
    if "$ref" in s:
        n = s["$ref"].split("/")[-1]
        t = SCHEMAS[n]
        if "enum" in t: return t["enum"][0]
        if n == "LocalizedText": return loc(name, ctx)
        if n == "Ref": return ref(name, ctx)
        if n == "Money": return money(name)
        if n == "UserRef":
            i, nm = REF.get(name, ("usr_118", AGENT))
            return {"id": i, "name": nm}
        return ex(t, name, depth, n)
    if "anyOf" in s:
        alts = [a for a in s["anyOf"] if a.get("type") != "null"]
        if any(a.get("$ref", "").endswith("/LocalizedText") for a in alts) and name in ("title", "bag", "subject") and ctx in BAG_CTX | {"Dispute", "DisputeDetail"}:
            return loc(name, ctx)
        if "examples" in s: return s["examples"][0]
        return ex(alts[0], name, depth, ctx)
    if "examples" in s: return s["examples"][0]
    if "enum" in s: return s["enum"][0]
    t = s.get("type")
    if isinstance(t, list): t = [x for x in t if x != "null"][0]
    if t == "object" or "properties" in s:
        out, req = {}, set(s.get("required", []))
        for k, v in s.get("properties", {}).items():
            if (depth > 3 and k not in req) or depth > 6: continue
            out[k] = OVERRIDE[(ctx, k)] if (ctx, k) in OVERRIDE else ex(v, k, depth + 1, ctx)
        return out
    if t == "array":
        if depth >= 7: return []
        it = s.get("items", {})
        child = PLURAL.get(name, name)
        if it.get("$ref", "").endswith("/Ref"): return [ref(child, ctx)]
        if it.get("type") == "string" and "format" not in it and "enum" not in it and "examples" not in it:
            if name == "ids": return [ID_BY_CTX.get(ctx, "drp_3391") if ctx else "drp_3391", "drp_3392"]
            if name == "options": return ["Small", "Medium", "Large"]
            if name and name.lower().endswith("ids"): return [ID_BY_NAME.get(name[:-1], "fil_93" if "File" in name else name[:-3][:3].lower() + "_1024")]
            return [{"cities": "Doha", "countries": "AE", "categories": "bakery", "allergens": "gluten", "dietary": "vegetarian", "permissions": "drops:write",
                     "reasons": "Inside the free cancellation window", "recoveryCodes": "7KQ2-MX9P", "options": "Medium", "ipAllowlist": "185.12.4.0/24", "columns": "title"}.get(name, humanize(name))]
        return [ex(it, name, depth + 1, ctx)]
    if t == "integer":
        v = NUM_BY_NAME.get(name, 12)
        return int(v) if float(v).is_integer() else int(round(v))
    if t == "number": return NUM_BY_NAME.get(name, 12.5)
    if t == "boolean": return not (name or "").startswith(("flagged", "forceDisabled", "overridePolicy", "dryRun", "internal", "reported", "suspended", "featured", "collected"))
    f = s.get("format")
    if f == "date-time": return DT
    if f == "date": return DATE
    if f == "uri": return URLS.get(name, URLS["url"])
    if f == "email":
        if (ctx, name) in STR_BY_CTX: return STR_BY_CTX[(ctx, name)]
        return "sara@wonderbites.example.com" if ctx in EMAIL_CTX else STR_BY_NAME.get(name, "aisha.mansoori@example.com") if "@" in STR_BY_NAME.get(name, "@") else "aisha.mansoori@example.com"
    if s.get("pattern"): return {"end": "21:00", "close": "22:00", "open": "08:00", "sendAt": "06:00"}.get(name, "18:00")
    return string(name, ctx)
