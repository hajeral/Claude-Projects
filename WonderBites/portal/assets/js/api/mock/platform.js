/* =====================================================================
   WonderBites mock module: ADMIN PLATFORM  (owner: D3)
   Screens: Listings & Templates, Templates gallery, CMS, Users & Access,
            Admin Settings (profile/general/notifications/security/policies)
   Paths follow docs/API_CONTRACT.md (base /api/v1 omitted).
   Handler signature: (req) => body   where req = { method, path, params, query, body, lang }
   Throw MockError(status, code, message, details) for API errors.
   ===================================================================== */
(function () {
  const W = (window.WBMock = window.WBMock || { modules: {} });
  const MockError = (status, code, message, details) =>
    (window.api && typeof window.api.error === 'function') ? window.api.error(status, code, message, details)
      : Object.assign(new Error(message), { status, code, error: { code, message, details } });
  const L = (en, ar) => ({ en, ar });
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const now = () => api.demoIso(); // (v1.4) demo clock
  let seq = 1000;
  const nid = (p) => `${p}_${++seq}`;
  const paginate = (rows, q) => {
    const page = Math.max(1, +q.page || 1), pageSize = Math.min(100, +q.pageSize || 20);
    return { data: rows.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: rows.length };
  };
  const matchQ = (q, ...vals) => !q || vals.some((v) => String(typeof v === 'object' && v ? `${v.en} ${v.ar}` : v || '').toLowerCase().includes(String(q).toLowerCase()));
  const sortBy = (rows, sort) => {
    if (!sort) return rows;
    const desc = sort[0] === '-', k = desc ? sort.slice(1) : sort;
    return rows.slice().sort((a, b) => { const x = a[k], y = b[k]; const r = (typeof x === 'object' ? x.en : x) > (typeof y === 'object' ? y.en : y) ? 1 : -1; return desc ? -r : r; });
  };
  const need = (body, keys) => {
    const missing = keys.filter((k) => body == null || body[k] == null || body[k] === '' || (typeof body[k] === 'object' && !Array.isArray(body[k]) && !body[k].en && !body[k].ar && Object.keys(body[k]).length === 0));
    if (missing.length) throw MockError(422, 'validation_error', 'Some fields need attention.', Object.fromEntries(missing.map((k) => [k, 'required'])));
  };
  const find = (arr, id, what) => { const x = arr.find((r) => r.id === id); if (!x) throw MockError(404, 'not_found', `${what} not found`); return x; };

  /* ------------------------------------------------------------------
     FIELD LIBRARY (template builder chips)
     ------------------------------------------------------------------ */
  const FIELD_LIBRARY = [
    { key: 'photo', label: L('Photo', 'صورة'), type: 'image' },
    { key: 'portion_size', label: L('Portion size', 'حجم الحصة'), type: 'select' },
    { key: 'allergens', label: L('Allergens', 'مسببات الحساسية'), type: 'multiselect' },
    { key: 'pickup_window', label: L('Pickup window', 'نافذة الاستلام'), type: 'timerange' },
    { key: 'weight', label: L('Weight', 'الوزن'), type: 'number' },
    { key: 'expiry_date', label: L('Expiry date', 'تاريخ الانتهاء'), type: 'date' },
    { key: 'category_tags', label: L('Category tags', 'وسوم الفئة'), type: 'tags' },
    { key: 'cuisine', label: L('Cuisine', 'المطبخ'), type: 'select' },
    { key: 'reheat_instructions', label: L('Reheat instructions', 'تعليمات التسخين'), type: 'text' },
    { key: 'item_count', label: L('Item count', 'عدد القطع'), type: 'number' },
    { key: 'organic_flag', label: L('Organic flag', 'علامة عضوي'), type: 'boolean' },
    { key: 'serving_size', label: L('Serving size', 'حجم الحصة للأفراد'), type: 'number' },
    { key: 'season_tag', label: L('Season tag', 'وسم الموسم'), type: 'tags' },
    { key: 'occasion_tag', label: L('Occasion tag', 'وسم المناسبة'), type: 'tags' },
    { key: 'event_type', label: L('Event type', 'نوع المناسبة'), type: 'select' },
    { key: 'volume', label: L('Volume', 'الحجم'), type: 'number' },
    { key: 'dietary', label: L('Dietary tags', 'الوسوم الغذائية'), type: 'multiselect' },
    { key: 'quantity', label: L('Quantity', 'الكمية'), type: 'number' },
    { key: 'suggested_price', label: L('Suggested price', 'السعر المقترح'), type: 'money' },
  ];
  const F = (...keys) => keys.map((k) => { const f = FIELD_LIBRARY.find((x) => x.key === k); return { key: f.key, label: f.label, type: f.type, required: k === 'photo' }; });

  /* ------------------------------------------------------------------
     TEMPLATES  (admin-17 list + admin-21 gallery)
     ------------------------------------------------------------------ */
  const templates = [
    ['tpl_101', L('Bakery Surplus Box', 'صندوق فائض المخبز'), 'bakery', F('photo', 'portion_size', 'allergens', 'pickup_window'), 'published', 84, '2026-07-20', 15, L('Pastry category, standard quantity, morning pickup window and a suggested price.', 'فئة المعجنات وكمية قياسية ونافذة استلام صباحية وسعر مقترح.'), 'wonderbites'],
    ['tpl_102', L('Fresh Grocery Bundle', 'حزمة البقالة الطازجة'), 'grocery', F('photo', 'weight', 'expiry_date', 'category_tags'), 'published', 61, '2026-07-18', 20, L('Mixed fresh produce and pantry items with weight and expiry.', 'منتجات طازجة ومؤن متنوعة مع الوزن وتاريخ الانتهاء.'), 'wonderbites'],
    ['tpl_103', L("Chef's Surplus Plate", 'طبق فائض الشيف'), 'meals', F('photo', 'cuisine', 'allergens', 'reheat_instructions'), 'published', 47, '2026-07-19', 25, L("A chef's selection of today's dishes with reheat guidance.", 'تشكيلة الشيف من أطباق اليوم مع إرشادات التسخين.'), 'wonderbites'],
    ['tpl_104', L('Daily Pastry Assortment', 'تشكيلة المعجنات اليومية'), 'bakery', F('photo', 'item_count', 'allergens'), 'published', 39, '2026-07-15', 15, L('Assorted pastries counted per box, with an allergen note.', 'معجنات متنوعة بعدد محدد لكل صندوق مع ملاحظة الحساسية.'), 'wonderbites'],
    ['tpl_105', L('Produce Rescue Crate', 'صندوق إنقاذ الخضار'), 'grocery', F('photo', 'weight', 'organic_flag'), 'published', 28, '2026-07-12', 18, L('Imperfect but delicious produce sold by weight.', 'خضار وفواكه غير مثالية الشكل لكنها لذيذة تُباع بالوزن.'), 'wonderbites'],
    ['tpl_106', L('Family Meal Kit', 'وجبة العائلة'), 'meals', F('photo', 'serving_size', 'cuisine', 'allergens'), 'published', 22, '2026-07-10', 35, L('Serves a family of four with a mix of mains and sides.', 'تكفي عائلة من أربعة أفراد مع أطباق رئيسية وجانبية.'), 'wonderbites'],
    ['tpl_107', L('Seasonal Farm Box', 'صندوق المزرعة الموسمي'), 'grocery', F('photo', 'weight', 'season_tag'), 'draft', 0, '2026-07-22', 22, L("This season's harvest from local farms.", 'حصاد هذا الموسم من المزارع المحلية.'), 'mine'],
    ['tpl_108', L('Bakery Holiday Special', 'عرض المخبز للعطلات'), 'bakery', F('photo', 'occasion_tag', 'allergens'), 'draft', 0, '2026-07-21', 20, L('Festive bakes for holidays and occasions.', 'مخبوزات احتفالية للعطلات والمناسبات.'), 'mine'],
    ['tpl_109', L('Catering Leftover Box', 'صندوق بقايا الضيافة'), 'other', F('photo', 'event_type', 'serving_size'), 'published', 14, '2026-07-08', 30, L('Surplus from catered events, packed by serving size.', 'فائض المناسبات المُقدَّمة معبأ حسب عدد الحصص.'), 'wonderbites'],
    ['tpl_110', L('Beverage Surplus Pack', 'حزمة فائض المشروبات'), 'other', F('photo', 'volume', 'expiry_date'), 'draft', 0, '2026-07-23', 12, L('Juices and drinks close to their best-before date.', 'عصائر ومشروبات قريبة من تاريخ أفضل استخدام.'), 'mine'],
  ].map(([id, name, category, fields, status, usageCount, d, price, description, source]) => ({
    id, name, category, fields, status, usageCount, description, source,
    defaults: { quantity: 8, pickupWindow: { start: '18:00', end: '20:00' }, suggestedPrice: { amount: price, currency: 'QAR' } },
    updatedAt: `${d}T09:00:00Z`, createdBy: source === 'mine' ? { id: 'usr_1', name: 'Sarah Al Manasoori' } : { id: 'sys', name: 'WonderBites' },
  }));

  function templateSummary() {
    const cats = new Set(templates.map((t) => t.category));
    const top = templates.slice().sort((a, b) => b.usageCount - a.usageCount)[0];
    return {
      total: templates.length, categories: cats.size,
      active: templates.filter((t) => t.status === 'published').length,
      drafts: templates.filter((t) => t.status === 'draft').length,
      mostUsed: top ? { id: top.id, name: top.name, usageCount: top.usageCount } : null,
      byCategory: ['bakery', 'grocery', 'meals', 'other'].map((c) => ({ key: c, count: templates.filter((t) => t.category === c).length })),
    };
  }

  /* ------------------------------------------------------------------
     CMS  (admin-18 all/pages/banners/faq)
     ------------------------------------------------------------------ */
  const AUTHORS = { nadia: { id: 'usr_5', name: 'Nadia F.' }, theo: { id: 'usr_4', name: 'Theo R.' }, dana: { id: 'usr_3', name: 'Dana K.' }, legal: { id: 'usr_9', name: 'Legal Team' }, marcus: { id: 'usr_2', name: 'Marcus L.' } };
  const html = (en, ar) => L(`<p>${en}</p>`, `<p>${ar}</p>`);
  const cms = [
    { id: 'ban_1', type: 'banner', title: L('Home Page — Hero Banner', 'الصفحة الرئيسية — اللافتة الرئيسية'), status: 'published', author: AUTHORS.nadia, updatedAt: '2026-07-23T08:00:00Z', imageUrl: 'placeholder:banner-1', link: { route: 'm-overview' }, audience: 'all', cities: [], placement: 'home_hero', startsAt: '2026-07-01T00:00:00Z', endsAt: '2026-08-31T23:59:00Z', subtitle: L('Rescue tonight\'s best bakes for less', 'أنقذ أفضل مخبوزات الليلة بسعر أقل') },
    { id: 'pg_1', type: 'page', title: L('How WonderBites Works', 'كيف تعمل WonderBites'), slug: 'how-it-works', status: 'published', author: AUTHORS.nadia, updatedAt: '2026-07-20T14:00:00Z', body: html('Reserve a surprise bag from a nearby store, pick it up in the collection window, and enjoy good food that would otherwise go to waste.', 'احجز كيس مفاجآت من متجر قريب، واستلمه خلال نافذة الاستلام، واستمتع بطعام جيد كان سيُهدر.') },
    { id: 'ban_2', type: 'banner', title: L('Summer Savings Banner', 'لافتة توفير الصيف'), status: 'scheduled', author: AUTHORS.nadia, updatedAt: '2026-07-25T09:00:00Z', publishAt: '2026-07-25T09:00:00Z', imageUrl: 'placeholder:banner-2', link: { route: 'm-templates' }, audience: 'consumers', cities: ['doha'], placement: 'home_carousel', startsAt: '2026-07-25T09:00:00Z', endsAt: '2026-08-25T23:59:00Z', subtitle: L('Up to 70% off surplus bags', 'خصم يصل إلى 70% على أكياس الفائض') },
    { id: 'pg_2', type: 'page', title: L('Merchant Onboarding Guide', 'دليل انضمام التجار'), slug: 'merchant-onboarding', status: 'draft', author: AUTHORS.theo, updatedAt: '2026-07-22T16:30:00Z', body: html('Everything a new partner needs: documents, listing your first bag, and getting paid.', 'كل ما يحتاجه الشريك الجديد: المستندات، ونشر أول كيس، واستلام المدفوعات.') },
    { id: 'faq_1', type: 'faq', title: L('FAQ — Pickup Passport', 'الأسئلة الشائعة — جواز الاستلام'), question: L('What is the Pickup Passport?', 'ما هو جواز الاستلام؟'), answer: L('A one-time code shown in the app that the store scans to confirm your collection.', 'رمز لمرة واحدة يظهر في التطبيق ويمسحه المتجر لتأكيد استلامك.'), category: 'pickups', order: 1, audience: 'consumers', status: 'published', author: AUTHORS.dana, updatedAt: '2026-07-17T11:00:00Z' },
    { id: 'faq_2', type: 'faq', title: L('FAQ — Refunds & Cancellations', 'الأسئلة الشائعة — الاسترداد والإلغاء'), question: L('Can I cancel my reservation?', 'هل يمكنني إلغاء حجزي؟'), answer: L('Yes, for a full refund up to 2 hours before the collection window begins.', 'نعم، مع استرداد كامل حتى ساعتين قبل بدء نافذة الاستلام.'), category: 'payments', order: 2, audience: 'all', status: 'published', author: AUTHORS.dana, updatedAt: '2026-07-14T11:00:00Z' },
    { id: 'pg_3', type: 'page', subtype: 'legal', title: L('Terms of Service', 'شروط الخدمة'), slug: 'terms', status: 'published', author: AUTHORS.legal, updatedAt: '2026-06-30T10:00:00Z', body: html('These terms govern your use of WonderBites.', 'تحكم هذه الشروط استخدامك لـ WonderBites.') },
    { id: 'pg_4', type: 'page', subtype: 'legal', title: L('Privacy Policy', 'سياسة الخصوصية'), slug: 'privacy', status: 'draft', author: AUTHORS.legal, updatedAt: '2026-07-22T18:00:00Z', body: html('How we collect, use and protect your data.', 'كيف نجمع بياناتك ونستخدمها ونحميها.') },
    { id: 'pg_5', type: 'page', title: L('Sustainability Impact Page', 'صفحة أثر الاستدامة'), slug: 'impact', status: 'published', author: AUTHORS.nadia, updatedAt: '2026-07-21T13:00:00Z', body: html('Every bag rescued saves meals, CO₂ and water. Here is our impact so far.', 'كل كيس يُنقذ يوفّر وجبات وثاني أكسيد الكربون والمياه. هذا أثرنا حتى الآن.') },
    { id: 'ban_3', type: 'banner', title: L('Holiday Promo Banner', 'لافتة عروض العطلات'), status: 'draft', author: AUTHORS.marcus, updatedAt: '2026-07-23T09:15:00Z', imageUrl: 'placeholder:banner-3', link: { route: 'm-templates' }, audience: 'all', cities: [], placement: 'home_carousel', startsAt: '2026-12-01T00:00:00Z', endsAt: '2026-12-31T23:59:00Z', subtitle: L('Festive bags from your favourite bakeries', 'أكياس احتفالية من مخابزك المفضلة') },
    { id: 'ban_4', type: 'banner', title: L('New Merchants Onboard', 'تجار جدد انضموا'), status: 'published', author: AUTHORS.nadia, updatedAt: '2026-07-18T10:00:00Z', imageUrl: 'placeholder:banner-4', link: { route: 'm-overview' }, audience: 'star_users', cities: [], placement: 'home_carousel', startsAt: '2026-07-18T00:00:00Z', endsAt: '2026-08-18T23:59:00Z', subtitle: L('Discover 12 new partners near you', 'اكتشف 12 شريكًا جديدًا بالقرب منك') },
    { id: 'ban_5', type: 'banner', title: L('Rescue Score Rewards', 'مكافآت نقاط الإنقاذ'), status: 'published', author: AUTHORS.marcus, updatedAt: '2026-07-16T10:00:00Z', imageUrl: 'placeholder:banner-5', link: { route: 'm-overview' }, audience: 'premium_users', cities: [], placement: 'profile', startsAt: '2026-07-16T00:00:00Z', endsAt: '2026-09-16T23:59:00Z', subtitle: L('Earn credit for every bag you rescue', 'اكسب رصيدًا مقابل كل كيس تنقذه') },
    { id: 'faq_3', type: 'faq', title: L('FAQ — Payouts for merchants', 'الأسئلة الشائعة — مدفوعات التجار'), question: L('When do merchants get paid?', 'متى يحصل التجار على مستحقاتهم؟'), answer: L('Payouts are settled weekly, every Tuesday, to the registered bank account.', 'تتم تسوية المدفوعات أسبوعيًا كل يوم ثلاثاء إلى الحساب البنكي المسجّل.'), category: 'payments', order: 3, audience: 'merchants', status: 'published', author: AUTHORS.dana, updatedAt: '2026-07-10T11:00:00Z' },
  ];
  const cmsKind = { pages: 'page', banners: 'banner', faqs: 'faq', page: 'page', banner: 'banner', faq: 'faq' };
  function cmsSummary() {
    const sched = cms.filter((c) => c.status === 'scheduled').sort((a, b) => (a.publishAt || '').localeCompare(b.publishAt || ''));
    const pub = cms.filter((c) => c.status === 'published').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return {
      published: 28 + cms.filter((c) => c.status === 'published').length - 9, // anchored to Figma (28)
      drafts: cms.filter((c) => c.status === 'draft').length + 3,
      scheduled: sched.length + 2,
      nextScheduledAt: sched[0] ? sched[0].publishAt : null,
      lastPublishedAt: '2026-11-19T08:15:00Z', lastPublishedTitle: pub[0] ? pub[0].title : null,
      counts: { all: cms.length, page: cms.filter((c) => c.type === 'page').length, banner: cms.filter((c) => c.type === 'banner').length, faq: cms.filter((c) => c.type === 'faq').length },
    };
  }

  /* ------------------------------------------------------------------
     USERS & ACCESS  (admin-19)
     ------------------------------------------------------------------ */
  const ROLES = [
    { role: 'super_admin', label: L('Super Admin', 'مسؤول أعلى'), description: L('Full platform access, including billing and role management.', 'وصول كامل إلى المنصة بما في ذلك الفوترة وإدارة الأدوار.'), permissions: ['*'] },
    { role: 'operations_admin', label: L('Operations Admin', 'مسؤول العمليات'), description: L('Drops, pickups, merchants, and quality & trust tooling.', 'العروض والاستلامات والتجار وأدوات الجودة والثقة.'), permissions: ['drops.*', 'pickups.*', 'merchants.*', 'quality.*'] },
    { role: 'support_agent', label: L('Support Agent', 'وكيل دعم'), description: L('Support tickets and moderation queue, read access elsewhere.', 'تذاكر الدعم وقائمة الإشراف، مع صلاحية القراءة في باقي الأقسام.'), permissions: ['support.*', 'moderation.*', '*.read'] },
    { role: 'read_only', label: L('Read-Only', 'قراءة فقط'), description: L('Dashboards and reports only, no edit permissions.', 'لوحات المعلومات والتقارير فقط، دون صلاحيات تعديل.'), permissions: ['*.read'] },
  ];
  const users = [
    ['usr_1', 'Priya Anand', 'priya.anand@wonderbites.example.com', 'super_admin', 'active', true, '2026-07-23T10:35:00Z'],
    ['usr_2', 'Marcus Lee', 'marcus.lee@wonderbites.example.com', 'super_admin', 'active', true, '2026-07-23T09:12:00Z'],
    ['usr_3', 'Dana Kowalski', 'dana.k@wonderbites.example.com', 'support_agent', 'active', true, '2026-07-23T08:50:00Z'],
    ['usr_4', 'Theo Reyes', 'theo.reyes@wonderbites.example.com', 'operations_admin', 'active', true, '2026-07-23T07:40:00Z'],
    ['usr_5', 'Nadia Fischer', 'nadia.f@wonderbites.example.com', 'operations_admin', 'active', false, '2026-07-22T18:15:00Z'],
    ['usr_6', 'Sam Okafor', 'sam.okafor@wonderbites.example.com', 'support_agent', 'suspended', true, '2026-07-10T15:20:00Z'],
    ['usr_7', 'Lena Fontaine', 'lena.f@wonderbites.example.com', 'read_only', 'active', true, '2026-07-21T14:00:00Z'],
    ['usr_8', 'Aleksei Petrov', 'aleksei.p@wonderbites.example.com', 'operations_admin', 'active', true, '2026-07-22T11:45:00Z'],
    ['usr_9', 'Kenji Yamada', 'kenji.y@wonderbites.example.com', 'read_only', 'active', true, '2026-07-19T09:30:00Z'],
    ['usr_10', 'Omar Haddad', 'omar.h@wonderbites.example.com', 'support_agent', 'invited', false, null],
    ['usr_11', 'Fatima Al Suwaidi', 'fatima.s@wonderbites.example.com', 'operations_admin', 'active', true, '2026-07-23T06:10:00Z'],
  ].map(([id, name, email, role, status, twoFactor, lastActiveAt]) => ({ id, name, email, role, status, twoFactor, lastActiveAt, invitedAt: status === 'invited' ? '2026-11-17T10:00:00Z' : null }));
  function usersSummary() {
    const total = 19 - 11 + users.length; // Figma anchor: 19 admin users
    const withoutTwoFa = users.filter((u) => !u.twoFactor && u.status !== 'invited').length;
    return {
      total, roles: ROLES.length, activeSessions: 12,
      pendingInvites: users.filter((u) => u.status === 'invited').length + 1,
      twoFactorAdoption: Math.round((1 - withoutTwoFa / total) * 100), withoutTwoFa,
      byRole: Object.fromEntries(ROLES.map((r) => [r.role, users.filter((u) => u.role === r.role).length + ({ super_admin: 1, operations_admin: 4, support_agent: 3, read_only: 0 }[r.role] || 0)])),
    };
  }

  /* ------------------------------------------------------------------
     ADMIN SETTINGS  (admin-05, admin-20-*)
     ------------------------------------------------------------------ */
  const settings = {
    profile: { firstName: 'Sarah', lastName: 'Al Manasoori', email: 'sarah@wonderbites.qa', phoneCountry: '+974', phone: '5512 3456', avatarUrl: null },
    general: { platformName: 'WonderBites', supportEmail: 'support@wonderbites.qa', timezone: 'Asia/Qatar', defaultCurrency: 'QAR', defaultLanguage: 'en', countries: ['AE', 'QA', 'SA'], commissionRate: 20, pickupWindowMinutes: 60, reservationHoldMinutes: 15, autoCancelUnclaimed: true, requirePickupPassport: true, allowMerchantSelfOnboarding: false },
    notifications: { alerts: [
      { key: 'critical_issue', label: L('Critical issue alerts', 'تنبيهات المشكلات الحرجة'), description: L('Email and push when a Critical severity issue is opened.', 'بريد إلكتروني وإشعار عند فتح مشكلة بدرجة حرجة.'), enabled: true, email: true, push: true, sms: false },
      { key: 'daily_digest', label: L('Daily operations digest', 'ملخص العمليات اليومي'), description: L('Summary of drops, pickups, and issues sent every morning at 6:00 AM.', 'ملخص للعروض والاستلامات والمشكلات يُرسل كل صباح الساعة 6:00.'), enabled: true, email: true, push: false, sms: false },
      { key: 'merchant_signup', label: L('New merchant sign-up', 'تسجيل تاجر جديد'), description: L('Notify Operations Admins when a merchant completes onboarding.', 'إشعار مسؤولي العمليات عند إكمال تاجر للتسجيل.'), enabled: false, email: true, push: false, sms: false },
    ] },
    security: { require2fa: true, sso: true, sessionTimeoutMinutes: 30, auditLog: true, auditRetentionDays: 365, auditExportRange: '30d', passwordPolicy: { minLength: 10, requireSymbol: true }, ipAllowlist: [] },
  };
  const REFUND_REASONS = [
    ['store_closed', L('Store closed', 'المتجر مغلق'), 'full_refund'],
    ['box_unavailable', L('Box unavailable', 'الصندوق غير متوفر'), 'full_refund'],
    ['food_concern', L('Serious food concern', 'مشكلة جدية في الطعام'), 'manual_review'],
    ['app_payment_issue', L('App or payment issue', 'مشكلة في التطبيق أو الدفع'), 'full_refund'],
    ['missed_collection', L('Missed collection', 'فوات الاستلام'), 'no_refund'],
    ['late_cancellation', L('Late cancellation (inside 2h window)', 'إلغاء متأخر (خلال ساعتين)'), 'no_refund'],
    ['change_of_mind', L('Change of mind', 'تغيير الرأي'), 'no_refund'],
    ['personal_preference', L('Personal preference (contents)', 'تفضيل شخصي (المحتويات)'), 'no_refund'],
    ['wrong_location', L('Wrong store or location selected', 'اختيار متجر أو موقع خاطئ'), 'no_refund'],
  ];
  const REFUND_OUTCOMES = ['full_refund', 'partial_refund', 'wallet_credit', 'manual_review', 'no_refund'];
  const policies = {
    refund: {
      key: 'refund', title: L('Refund & Cancellation Policy', 'سياسة الاسترداد والإلغاء'), updatedAt: '2026-08-04T09:00:00Z', live: true,
      content: L(
        '<p>Every WonderBites order reserves a limited food box that might otherwise go to waste. This policy protects that food while ensuring customers are treated fairly when something genuinely goes wrong.</p><h3>When a refund may be issued</h3><p>A customer may receive a refund when a confirmed order cannot be completed because of the partner store or a verified WonderBites system issue — store closed, box unavailable, a serious food concern, or an app/payment issue.</p><h3>When a refund will not normally be issued</h3><p>Once the cancellation deadline has passed, the box is reserved for the customer and may no longer be available to another customer — so missed collection, late cancellation, change of mind, personal preference, and wrong-location selections are not normally refunded.</p><h3>Cancelling an order</h3><p>Customers may cancel through the app and receive a full refund up to 2 hours before the collection window begins. After this deadline, the order becomes non-refundable unless the store cannot fulfil it or a verified issue prevents collection.</p><h3>Receiving a refund</h3><p>Approved refunds may be returned to the original payment method (3–10 business days) or issued as WonderBites Wallet Credit, depending on the refund type and the customer\'s selection.</p>',
        '<p>كل طلب على WonderBites يحجز صندوق طعام محدودًا كان من الممكن أن يُهدر. تحمي هذه السياسة ذلك الطعام وتضمن معاملة العملاء بإنصاف عندما يحدث خطأ حقيقي.</p><h3>متى يمكن إصدار استرداد</h3><p>يمكن للعميل الحصول على استرداد عندما يتعذر إكمال طلب مؤكد بسبب المتجر الشريك أو خلل موثّق في نظام WonderBites — كأن يكون المتجر مغلقًا، أو الصندوق غير متوفر، أو وجود مشكلة جدية في الطعام، أو مشكلة في التطبيق أو الدفع.</p><h3>متى لا يُصدر استرداد عادةً</h3><p>بعد انقضاء موعد الإلغاء يكون الصندوق محجوزًا للعميل وقد لا يتاح لعميل آخر، لذلك لا تُسترد عادةً حالات فوات الاستلام، والإلغاء المتأخر، وتغيير الرأي، والتفضيل الشخصي، واختيار موقع خاطئ.</p><h3>إلغاء الطلب</h3><p>يمكن للعملاء الإلغاء عبر التطبيق والحصول على استرداد كامل حتى ساعتين قبل بدء نافذة الاستلام. بعد ذلك يصبح الطلب غير قابل للاسترداد ما لم يتعذر على المتجر تنفيذه أو تمنع مشكلة موثّقة الاستلام.</p><h3>استلام المبلغ المسترد</h3><p>تُعاد المبالغ المعتمدة إلى وسيلة الدفع الأصلية (خلال 3–10 أيام عمل) أو تُصرف رصيدًا في محفظة WonderBites، حسب نوع الاسترداد واختيار العميل.</p>'),
      config: { freeCancellationHours: 2, refundDestinationDefault: 'original_method', outcomes: REFUND_OUTCOMES, reasons: REFUND_REASONS.map(([key, label, outcome]) => ({ key, label, outcome })) },
    },
    about: { key: 'about', title: L('About Us', 'من نحن'), updatedAt: '2026-06-12T09:00:00Z', content: L('', '') },
    privacy: { key: 'privacy', title: L('Privacy Policy', 'سياسة الخصوصية'), updatedAt: '2026-05-02T09:00:00Z', content: L('', '') },
    terms: { key: 'terms', title: L('Terms & Conditions', 'الشروط والأحكام'), updatedAt: '2026-06-12T09:00:00Z', content: L('', '') },
  };
  const policyList = () => ['refund', 'about', 'privacy', 'terms'].map((k) => ({ key: k, title: policies[k].title, updatedAt: policies[k].updatedAt, hasContent: !!(policies[k].content.en || policies[k].content.ar) }));

  /* ------------------------------------------------------------------
     HANDLERS
     ------------------------------------------------------------------ */
  const routes = {
    /* Templates */
    'GET /admin/templates': ({ query: q }) => {
      let rows = templates.filter((t) => (!q.category || q.category === 'all' || t.category === q.category) && (!q.status || t.status === q.status) && (!q.source || t.source === q.source) && matchQ(q.q, t.name, t.category));
      rows = sortBy(rows, q.sort || '-updatedAt');
      return { ...paginate(clone(rows), q), summary: templateSummary() };
    },
    'GET /admin/templates/fields': () => ({ data: clone(FIELD_LIBRARY) }),
    // the client may match ':id' before the static '/fields' path, so the id handler delegates
    'GET /admin/templates/:id': ({ params }) => (params.id === 'fields' ? { data: clone(FIELD_LIBRARY) } : clone(find(templates, params.id, 'Template'))),
    'POST /admin/templates': ({ body }) => {
      need(body, ['name', 'category']);
      if (!body.fields || !body.fields.length) throw MockError(422, 'validation_error', 'Add at least one field.', { fields: 'required' });
      const t = { id: nid('tpl'), status: body.status || 'draft', usageCount: 0, source: 'mine', description: body.description || L('', ''), defaults: body.defaults || {}, ...body, updatedAt: now(), createdBy: { id: 'usr_1', name: 'Sarah Al Manasoori' } };
      templates.unshift(t); return clone(t);
    },
    'PATCH /admin/templates/:id': ({ params, body }) => { const t = find(templates, params.id, 'Template'); Object.assign(t, body, { updatedAt: now() }); return clone(t); },
    'DELETE /admin/templates/:id': ({ params }) => { const i = templates.findIndex((t) => t.id === params.id); if (i < 0) throw MockError(404, 'not_found', 'Template not found'); templates.splice(i, 1); return null; },
    'POST /admin/templates/:id/duplicate': ({ params }) => { const t = find(templates, params.id, 'Template'); const c = { ...clone(t), id: nid('tpl'), name: L(`${t.name.en} (copy)`, `${t.name.ar} (نسخة)`), status: 'draft', usageCount: 0, source: 'mine', updatedAt: now() }; templates.unshift(c); return c; },
    'POST /admin/templates/:id/publish': ({ params }) => { const t = find(templates, params.id, 'Template'); t.status = 'published'; t.updatedAt = now(); return clone(t); },
    'POST /admin/templates/:id/unpublish': ({ params }) => { const t = find(templates, params.id, 'Template'); t.status = 'draft'; t.updatedAt = now(); return clone(t); },

    /* CMS */
    'GET /admin/cms': ({ query: q }) => {
      const type = cmsKind[q.type] || null;
      let rows = cms.filter((c) => (!type || c.type === type) && (!q.status || c.status === q.status) && matchQ(q.q, c.title));
      rows = sortBy(rows, q.sort || '-updatedAt');
      return { ...paginate(clone(rows), { pageSize: 50, ...q }), summary: cmsSummary() };
    },
    'GET /admin/cms/:kind/:id': ({ params }) => clone(find(cms.filter((c) => c.type === cmsKind[params.kind]), params.id, 'Content')),
    'POST /admin/cms/:kind': ({ params, body }) => {
      const type = cmsKind[params.kind]; if (!type) throw MockError(404, 'not_found', 'Unknown content type');
      need(body, type === 'faq' ? ['question', 'answer'] : ['title']);
      if (type === 'banner' && !body.imageUrl) throw MockError(422, 'validation_error', 'Upload a banner image.', { imageUrl: 'required' });
      const c = { id: nid(type === 'page' ? 'pg' : type === 'banner' ? 'ban' : 'faq'), type, status: body.status || 'draft', author: AUTHORS.nadia, ...body, title: body.title || body.question, updatedAt: now() };
      cms.unshift(c); return clone(c);
    },
    'PATCH /admin/cms/:kind/:id': ({ params, body }) => { const c = find(cms, params.id, 'Content'); Object.assign(c, body, { updatedAt: now() }); if (c.type === 'faq' && body.question) c.title = body.question; return clone(c); },
    'DELETE /admin/cms/:kind/:id': ({ params }) => { const i = cms.findIndex((c) => c.id === params.id); if (i < 0) throw MockError(404, 'not_found', 'Content not found'); cms.splice(i, 1); return null; },
    'POST /admin/cms/:kind/:id/publish': ({ params }) => { const c = find(cms, params.id, 'Content'); c.status = 'published'; c.publishAt = null; c.updatedAt = now(); return clone(c); },
    'POST /admin/cms/:kind/:id/unpublish': ({ params }) => { const c = find(cms, params.id, 'Content'); c.status = 'draft'; c.updatedAt = now(); return clone(c); },
    'POST /admin/cms/:kind/:id/schedule': ({ params, body }) => { need(body, ['publishAt']); const c = find(cms, params.id, 'Content'); c.status = 'scheduled'; c.publishAt = body.publishAt; c.updatedAt = now(); return clone(c); },

    /* Users & Access */
    'GET /admin/roles': () => ({ data: clone(ROLES).map((r) => ({ ...r, usersCount: usersSummary().byRole[r.role] })) }),
    'GET /admin/users': ({ query: q }) => {
      let rows = users.filter((u) => (!q.role || q.role === 'all' || u.role === q.role) && (!q.status || u.status === q.status) && matchQ(q.q, u.name, u.email));
      return { ...paginate(clone(rows), q), summary: usersSummary() };
    },
    'POST /admin/users/invite': ({ body }) => {
      need(body, ['email', 'name', 'role']);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) throw MockError(422, 'validation_error', 'Enter a valid email address.', { email: 'invalid' });
      if (users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) throw MockError(409, 'conflict', 'A user with this email already exists.', { email: 'taken' });
      const u = { id: nid('usr'), name: body.name, email: body.email, role: body.role, status: 'invited', twoFactor: false, lastActiveAt: null, invitedAt: now() };
      users.push(u); return clone(u);
    },
    'PATCH /admin/users/:id': ({ params, body }) => { const u = find(users, params.id, 'User'); if (body.role) u.role = body.role; if (body.name) u.name = body.name; return clone(u); },
    'POST /admin/users/:id/suspend': ({ params }) => { const u = find(users, params.id, 'User'); u.status = 'suspended'; return clone(u); },
    'POST /admin/users/:id/reactivate': ({ params }) => { const u = find(users, params.id, 'User'); u.status = 'active'; return clone(u); },
    'POST /admin/users/:id/resend-invite': ({ params }) => { const u = find(users, params.id, 'User'); if (u.status !== 'invited') throw MockError(409, 'conflict', 'Only invited users can be re-sent an invite.'); u.invitedAt = now(); return clone(u); },
    'DELETE /admin/users/:id': ({ params }) => { const i = users.findIndex((u) => u.id === params.id); if (i < 0) throw MockError(404, 'not_found', 'User not found'); users.splice(i, 1); return null; },

    /* Settings */
    'GET /admin/settings/profile': () => clone(settings.profile),
    'PATCH /admin/settings/profile': ({ body }) => { need(body, ['firstName', 'email']); Object.assign(settings.profile, body); return clone(settings.profile); },
    'GET /admin/settings/general': () => clone(settings.general),
    'PATCH /admin/settings/general': ({ body }) => { if (body.platformName === '') throw MockError(422, 'validation_error', 'Platform name is required.', { platformName: 'required' }); Object.assign(settings.general, body); return clone(settings.general); },
    'GET /admin/settings/notifications': () => clone(settings.notifications),
    'PATCH /admin/settings/notifications': ({ body }) => { (body.alerts || []).forEach((a) => { const x = settings.notifications.alerts.find((y) => y.key === a.key); if (x) Object.assign(x, a); }); return clone(settings.notifications); },
    'GET /admin/settings/security': () => clone(settings.security),
    'PATCH /admin/settings/security': ({ body }) => { Object.assign(settings.security, body); return clone(settings.security); },
    'GET /admin/settings/policies': () => ({ data: policyList() }),
    'GET /admin/settings/policies/:key': ({ params }) => { const p = policies[params.key]; if (!p) throw MockError(404, 'not_found', 'Policy not found'); return clone(p); },
    'PUT /admin/settings/policies/:key': ({ params, body }) => {
      const p = policies[params.key]; if (!p) throw MockError(404, 'not_found', 'Policy not found');
      if (body.config) {
        const h = +body.config.freeCancellationHours;
        if (!(h >= 0 && h <= 48)) throw MockError(422, 'validation_error', 'Free cancellation period must be between 0 and 48 hours.', { freeCancellationHours: 'range' });
        p.config = { ...p.config, ...body.config, freeCancellationHours: h };
      }
      if (body.content) p.content = { ...p.content, ...body.content };
      p.updatedAt = now(); return clone(p);
    },
    'GET /admin/audit-log': ({ query: q }) => paginate([
      { id: 'aud_1', actor: { id: 'usr_1', name: 'Priya Anand' }, action: 'policy.updated', target: 'refund', at: '2026-11-18T09:12:00Z' },
      { id: 'aud_2', actor: { id: 'usr_4', name: 'Theo Reyes' }, action: 'merchant.verified', target: 'Fig & Bloom Bakery', at: '2026-11-17T15:40:00Z' },
      { id: 'aud_3', actor: { id: 'usr_2', name: 'Marcus Lee' }, action: 'user.invited', target: 'omar.h@wonderbites.example.com', at: '2026-11-17T10:00:00Z' },
    ], q),
    'POST /admin/audit-log/export': ({ body }) => ({ id: nid('exp'), status: 'queued', resource: 'audit_log', format: (body && body.format) || 'csv', progress: 0, fileName: `audit-log-${(body && body.range) || '30d'}.csv`, createdAt: now(), expiresAt: new Date(Date.now() + 864e5).toISOString() }),
  };

  W.modules.platform = { routes, data: { templates, cms, users, ROLES, FIELD_LIBRARY, settings, policies, REFUND_OUTCOMES } };

  /* ---- registration via core api.mock (CONVENTIONS §6). Lists → { data, meta:{page,pageSize,total,summary} } ---- */
  function wrap(fn) {
    return (req) => {
      const r = fn({ ...req, query: req.query || {}, params: req.params || {}, body: req.body || {} });
      if (r && Array.isArray(r.data) && 'total' in r) { const { data, page, pageSize, total, ...extra } = r; return { data, meta: { page, pageSize, total, ...extra } }; }
      if (r && Array.isArray(r.data)) { const { data, ...extra } = r; return { data, meta: extra }; }
      return { data: r === undefined ? null : r };
    };
  }
  function registerAll() {
    if (!(window.api && typeof window.api.mock === 'function')) return false;
    Object.entries(routes).forEach(([k, fn]) => { const [m, p] = k.split(' '); window.api.mock(m, p, wrap(fn)); });
    return true;
  }
  if (!registerAll()) document.addEventListener('wb:api-ready', registerAll, { once: true });
})();
