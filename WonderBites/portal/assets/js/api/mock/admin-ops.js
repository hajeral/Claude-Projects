/* (v1.4 dates) seeded dates rebased onto api.DEMO_TODAY = 2026-11-19 by qa/rebase_dates.py */
/* =====================================================================
   WonderBites mock module: ADMIN OPERATIONS  (owner: D1)
   Screens: Drops, Pickups, Orders & Reservations, Merchants (+ Add, detail),
            Consumers (+ detail), Issues & Alerts (cases), Moderation, Support (+ ticket)
   Paths/shapes follow docs/API_CONTRACT.md (base /api/v1 omitted).
   Handler: (req) => body, req = { method, path, params, query, body, lang }.
   Errors are thrown (api.error if available, else MockError-compatible object).
   Data is in-memory and mutable, so actions persist for the session.
   ===================================================================== */
(function () {
  'use strict';
  const W = (window.WBMock = window.WBMock || { modules: {} });
  W.modules = W.modules || {};
  const ERR = (status, code, message, details) => {
    if (window.api && typeof window.api.error === 'function') return window.api.error(status, code, message, details);
    if (W.MockError) return W.MockError(status, code, message, details);
    const e = new Error(message); e.status = status; e.code = code; e.details = details || null; e.error = { code, message, details: details || null }; return e;
  };
  const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const NOW = api.demoNow ? Date.parse(api.DEMO_TODAY + 'T10:00:00Z') : Date.parse('2026-11-19T10:00:00Z'); // (v1.4) from api.DEMO_TODAY
  const ago = (min) => new Date(NOW - min * 60000).toISOString();
  const nowIso = () => (api.demoIso ? api.demoIso() : new Date(NOW).toISOString());
  const S = window.WBStore; // (v1.4) shared demo store (api/mock/store.js)
  let seq = 900;
  const nid = (p) => `${p}-${++seq}`;
  const langOf = (req) => (req && (req.lang || (req.headers && (req.headers['Accept-Language'] || req.headers['accept-language'])))) || (window.App && App.state && App.state.lang) || 'en';
  const L = (en, ar) => ({ en, ar: ar || en });
  const loc = (v, lang) => (v && typeof v === 'object' && 'en' in v ? (lang === 'ar' ? v.ar : v.en) : v);
  const money = (amount, currency = 'QAR') => ({ amount: +(+amount).toFixed(2), currency });
  const ref = (o, lang) => (o ? { id: o.id, name: loc(o.name, lang) } : null);

  function paginate(rows, q, def = 10) {
    const page = Math.max(1, +q.page || 1), pageSize = Math.min(100, +q.pageSize || def);
    return { data: rows.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total: rows.length }, page, pageSize, total: rows.length };
  }
  const has = (v) => v !== undefined && v !== null && v !== '' && v !== 'all';
  const matchQ = (q, ...vals) => !has(q) || vals.some((v) => String(v && typeof v === 'object' ? `${v.en} ${v.ar}` : v ?? '').toLowerCase().includes(String(q).toLowerCase()));
  function sortRows(rows, sort, getters) {
    if (!sort) return rows;
    const desc = sort[0] === '-', k = desc ? sort.slice(1) : sort; const g = getters[k] || ((r) => r[k]);
    return rows.slice().sort((a, b) => { const x = g(a), y = g(b); const r = x > y ? 1 : x < y ? -1 : 0; return desc ? -r : r; });
  }
  const find = (arr, id, what) => { const x = arr.find((r) => r.id === id); if (!x) throw ERR(404, 'not_found', `${what} not found`, { id }); return x; };
  const need = (cond, field, msg, rule = 'required') => { if (!cond) throw ERR(422, 'validation_error', msg, { [field]: rule }); };

  /* ------------------------------------------------------------------ reference data */
  /* (v1.3) cities come from the markets registry (core mock); Qatar is the launch market */
  const CITIES = ['doha', 'al_rayyan', 'al_wakrah', 'lusail'];
  const MKT = () => (window.api && api.markets) || null;
  const countryOfCity = (c) => { const m = MKT() && MKT().all().find((x) => x.cities.some((y) => y.id === c)); return m ? m.code : 'QA'; };
  const curOf = (country) => (MKT() ? MKT().currencyOf(country) : 'QAR');
  const targetCur = () => { const sc = (window.api && api.scope && api.scope()) || ['QA']; const curs = [...new Set(sc.map(curOf))]; return curs.length === 1 ? curs[0] : MKT() ? MKT().fx().reportingCurrency : 'QAR'; };
  const toTarget = (m) => (MKT() ? MKT().convert(m.amount, m.currency, targetCur()) : m.amount);
  const SC = (arr) => (window.api && api.scoped ? api.scoped(arr) : arr); // market-scoped live view (see api.scoped)
  const CATEGORIES = ['bakery', 'restaurant', 'grocery', 'cafe', 'desserts', 'meals'];
  const DIETARY = ['vegetarian', 'vegan', 'halal', 'gluten_free', 'dairy_free', 'nut_free'];
  const PEOPLE = [
    L('Saeed Al Mazrouei', 'سعيد المزروعي'), L('Noora Al Kaabi', 'نورة الكعبي'), L('Hamdan Al Falasi', 'حمدان الفلاسي'),
    L('Mariam Al Nuaimi', 'مريم النعيمي'), L('Aisha Al Mansoori', 'عائشة المنصوري'), L('Yusuf Al Amiri', 'يوسف العامري'),
    L('Khalid Rahman', 'خالد رحمن'), L('Layla Hassan', 'ليلى حسن'), L('Omar Al Suwaidi', 'عمر السويدي'),
    L('Fatima Al Zaabi', 'فاطمة الزعابي'), L('Rashid Al Ketbi', 'راشد الكتبي'), L('Hessa Al Shamsi', 'حصة الشامسي'),
  ];
  const AGENTS = [
    { id: 'usr_11', name: L('Dana K.', 'دانة ك.'), role: 'support_agent' },
    { id: 'usr_12', name: L('Theo R.', 'ثيو ر.'), role: 'support_agent' },
    { id: 'usr_13', name: L('Marcus L.', 'ماركوس ل.'), role: 'support_agent' },
    { id: 'usr_05', name: L('Omar Khalil', 'عمر خليل'), role: 'operations_admin' },
    { id: 'usr_01', name: L('Sarah Al Manasoori', 'سارة المنصوري'), role: 'super_admin' },
  ];
  const ME = AGENTS[4];
  const agent = (id) => AGENTS.find((a) => a.id === id) || null;

  /* ------------------------------------------------------------------ merchants */
  const M = (id, en, ar, category, city, quality, drops, revenue, commissionRate, status) => ({ id, name: L(en, ar), category, city, qualityScore: quality, dropsCount: drops, revenue, commissionRate, status });
  let merchants = [
    M('MER-094', 'Sunrise Bakehouse', 'مخبز صن رايز', 'bakery', 'doha', 52, 21, 2380, 22, 'rejected'),
    M('MER-079', 'Olive Grove Café', 'مقهى أوليف جروف', 'cafe', 'doha', null, 0, 0, 20, 'suspended'),
    M('MER-071', 'Marina Grill House', 'مارينا جريل هاوس', 'restaurant', 'lusail', 94, 38, 8240, 20, 'verified'),
    M('MER-047', 'Corner Deli Co.', 'كورنر ديلي', 'grocery', 'al_wakrah', 86, 29, 5620, 18, 'verified'),
    M('MER-041', 'Sugar & Sage', 'شوجر آند سيج', 'desserts', 'dubai', 68, 52, 7110, 20, 'verified'),
    M('MER-051', 'Harvest & Co.', 'هارفست آند كو', 'grocery', 'al_wakrah', 45, 12, 1460, 16, 'pending'),
    M('MER-066', 'Fig & Bloom Bakery', 'مخبز فيغ آند بلوم', 'bakery', 'doha', 92, 64, 11460, 18, 'verified'),
    M('MER-058', 'Green Bowl Kitchen', 'مطبخ جرين بول', 'restaurant', 'al_rayyan', 61, 33, 4210, 20, 'verified'),
    M('MER-036', 'Fresh Fig Co.', 'فريش فيغ', 'grocery', 'doha', null, 0, 0, 18, 'pending'),
    M('MER-030', 'Copper Kettle Café', 'مقهى كوبر كيتل', 'cafe', 'abu_dhabi', 74, 18, 2950, 20, 'verified'),
  ];
  const BRANCH_NAMES = [L('West Bay Branch', 'فرع الخليج الغربي'), L('The Pearl Branch', 'فرع اللؤلؤة'), L('Msheireb Branch', 'فرع مشيرب'), L('Al Sadd Branch', 'فرع السد')];
  const ADDRS = [L('Al Corniche St, Doha', 'شارع الكورنيش، الدوحة'), L('Porto Arabia, The Pearl, Doha', 'بورتو أرابيا، اللؤلؤة، الدوحة'), L('Msheireb Downtown 4, Doha', 'مشيرب قلب الدوحة 4، الدوحة'), L('Al Sadd St, Doha', 'شارع السد، الدوحة')];
  const OWNERS = [L('Sara Al Hammadi', 'سارة الحمادي'), L('Omar Haddad', 'عمر حداد'), L('Lina Saeed', 'لينا سعيد'), L('Rami Nasser', 'رامي ناصر'), L('Huda Karim', 'هدى كريم')];
  const PERIODS = [['2026-10-23', '2026-10-29'], ['2026-10-30', '2026-11-05'], ['2026-11-06', '2026-11-12'], ['2026-11-13', '2026-11-19']];
  /* (v1.4) commission comes from Admin → Settings → Commercial (19 % default) unless a merchant contract overrides it */
  const CONTRACT = { 'MER-071': 17 };
  const withRate = (m) => { Object.defineProperty(m, 'commissionRate', { enumerable: true, configurable: true, get: () => S.rateFor(m.id), set: (v) => S.setContractRate(m.id, v === S.commercial.defaultCommissionRate ? null : v) }); return m; };
  Object.keys(CONTRACT).forEach((id) => S.setContractRate(id, CONTRACT[id], '2026-01-01'));
  merchants.forEach((m, i) => {
    delete m.commissionRate; withRate(m);
    m.country = countryOfCity(m.city); m.currency = curOf(m.country); // UAE merchants (MER-041, MER-030) only appear once UAE is enabled
    m.rating = m.qualityScore ? +(3.4 + m.qualityScore / 100 * 1.5).toFixed(1) : null;
    m.joinedAt = new Date(Date.UTC(2026, 4 + 1 + (i % 4), 3 + i * 2, 8)).toISOString();
    m.business = { legalName: m.name.en.replace(/\.$/, '') + ' LLC', tradeLicenseNo: `TL-${720130 + i * 37}`, vatNo: `100${348201 + i * 113}` };
    m.contact = { ownerName: OWNERS[i % 5], email: m.name.en.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 12) + '@example.com', phone: m.country === 'AE' ? `+971 55 550 ${4100 + i * 7}` : `+974 5550 ${4100 + i * 7}` };
    m.banking = { bankName: m.country === 'AE' ? 'Emirates NBD' : ['QNB', 'Commercial Bank', 'Doha Bank', 'QIB'][i % 4], iban: m.country === 'AE' ? `AE00 •••• •••• •••• ••${10 + i} (demo)` : `QA00 •••• •••• •••• ••${10 + i} (demo)`, accountName: m.business.legalName };
    m.branches = Array.from({ length: 1 + (i % 3) }, (_, b) => ({
      id: `${m.id}-B${b + 1}`, name: BRANCH_NAMES[(i + b) % 4], address: ADDRS[(i + b) % 4], city: m.city,
      hours: '08:00–21:00', pickupWindow: { start: '18:00', end: '20:00' },
      state: m.status === 'verified' ? (b === 2 ? 'temporarily_closed' : 'open') : 'closed', activeListings: m.status === 'verified' ? 2 + b : 0,
    }));
    if (m.id === 'MER-066') m.branches = Object.values(S.BRANCHES).map((br, b) => ({ id: br.id, name: br.name, address: ADDRS[b % 4], city: 'doha', hours: '08:00–22:00', pickupWindow: { start: '18:00', end: '20:00' }, state: b === 2 ? 'closed' : 'open', activeListings: 0 })); // same branches as the merchant portal
    m.payouts = m.revenue ? PERIODS.map((pr, p) => {
      const gross = Math.round(m.revenue / 4 * (0.8 + p * 0.1)), commission = +(gross * S.rateFor(m.id, pr[1]) / 100).toFixed(2), fees = 0;
      return { id: `PO-${5520 + i * 10 + p}`, period: { from: pr[0], to: pr[1] }, gross: money(gross, m.currency), commission: money(commission, m.currency), commissionRate: S.rateFor(m.id, pr[1]), fees: money(fees, m.currency), net: money(gross - commission - fees, m.currency), status: p === 3 ? 'scheduled' : 'paid', paidAt: p === 3 ? null : ago((3 - p) * 7 * 1440) };
    }) : [];
    /* (v1.4 FLOW-12) Fig & Bloom's payouts and revenue are computed from its completed orders in the shared store */
    if (m.id === 'MER-066') {
      Object.defineProperty(m, 'payouts', { enumerable: true, get: () => S.payouts(m.id).map((po) => ({ id: po.id, period: { from: po.periodStart, to: po.periodEnd }, orders: po.orders, gross: po.gross, commission: po.commission, commissionRate: po.rate, fees: po.refunds, net: po.net, status: po.status === 'pending' ? 'scheduled' : 'paid', paidAt: po.paidAt })) });
      Object.defineProperty(m, 'revenue', { enumerable: true, get: () => S.earnings(m.id, api.demoDate(-30), api.DEMO_TODAY).gross.amount, set: () => {} });
    }
    const docSt = (t) => (m.status === 'pending' ? (t === 'bank_letter' ? 'pending_review' : 'pending_review') : m.status === 'rejected' && t === 'trade_license' ? 'rejected' : (i % 4 === 1 && t === 'food_safety_certificate') ? 'expired' : (i % 5 === 2 && t === 'food_safety_certificate') ? 'expiring_soon' : 'valid');
    m.compliance = {
      hygieneScore: m.qualityScore ? Math.min(98, m.qualityScore + 4) : null,
      status: m.status === 'pending' ? 'under_review' : i % 4 === 1 ? 'expired' : i % 5 === 2 ? 'expiring_soon' : m.status === 'rejected' ? 'non_compliant' : 'compliant',
      lastInspectionAt: m.qualityScore ? ago(1440 * (20 + i)) : null,
      certificates: ['trade_license', 'food_safety_certificate', 'vat_certificate', 'bank_letter'].map((t, k) => ({ id: `${m.id}-C${k + 1}`, type: t, number: t === 'trade_license' ? m.business.tradeLicenseNo : `${t.slice(0, 3).toUpperCase()}-${4400 + i * 10 + k}`, status: docSt(t), expiresAt: t === 'vat_certificate' || t === 'bank_letter' ? null : docSt(t) === 'expired' ? '2026-10-30' : docSt(t) === 'expiring_soon' ? '2026-12-05' : '2026-03-31' })),
    };
    m.activity = [
      { id: `${m.id}-A1`, at: ago(35 + i * 13), actor: L('System', 'النظام'), action: 'quality_score_updated', detail: m.qualityScore != null ? String(m.qualityScore) : '' },
      { id: `${m.id}-A2`, at: ago(300 + i * 40), actor: m.contact.ownerName, action: 'listing_published', detail: L('Morning Pastry Box', 'صندوق معجنات الصباح') },
      { id: `${m.id}-A3`, at: ago(1600 + i * 90), actor: ME.name, action: 'status_' + m.status, detail: '' },
      { id: `${m.id}-A4`, at: ago(9000 + i * 200), actor: m.contact.ownerName, action: 'merchant_registered', detail: '' },
    ];
  });

  /* ------------------------------------------------------------------ drops */
  const BAGS = [
    [L('Deli Surprise Box', 'صندوق ديلي المفاجأة'), 'grocery', 'ph1'], [L('Morning Pastry Box', 'صندوق معجنات الصباح'), 'bakery', 'ph2'],
    [L('Harvest Veg Box', 'صندوق خضار الحصاد'), 'grocery', 'ph3'], [L('Sweet Treats Mix', 'تشكيلة الحلويات'), 'desserts', 'ph4'],
    [L('Late Night Bakery Bag', 'كيس مخبز آخر الليل'), 'bakery', 'ph5'], [L("Chef's Choice Dinner Bag", 'كيس عشاء من اختيار الشيف'), 'meals', 'ph6'],
    [L('Fresh Fig Grocery Box', 'صندوق بقالة فريش فيغ'), 'grocery', 'ph3'], [L('Artisan Bread Bag', 'كيس الخبز الحِرَفي'), 'bakery', 'ph5'],
    [L('Pantry Clearance Bag', 'كيس تصفية المؤن'), 'grocery', 'ph1'], [L('Café Leftover Box', 'صندوق فائض المقهى'), 'cafe', 'ph2'],
    [L('Weekend Pastry Box', 'صندوق معجنات نهاية الأسبوع'), 'bakery', 'ph2'], [L('Grill Night Platter', 'طبق ليلة المشويات'), 'restaurant', 'ph6'],
  ];
  const D_ST = ['expired', 'completed', 'live', 'live', 'scheduled', 'sold_out', 'live', 'flagged', 'scheduled', 'completed', 'paused', 'live'];
  const D_M = [0, 3, 5, 4, 7, 2, 8, 7, 3, 9, 3, 2]; // (v1.4) MER-066's drops are its merchant listings (shared store), not D1 seeds
  const D_ORIG = [45, 40, 36, 48, 30, 60, 42, 35, 42, 28, 45, 55];
  const D_QTY = [20, 20, 15, 10, 12, 14, 10, 16, 10, 12, 18, 12];
  const D_RES = [14, 18, 9, 10, 3, 14, 4, 11, 2, 12, 6, 5];
  const D_WIN = [['20:00', '21:00'], ['19:30', '20:30'], ['18:00', '19:00'], ['21:00', '22:00'], ['20:00', '21:00'], ['21:30', '22:30'], ['17:00', '18:00'], ['18:30', '19:30'], ['19:00', '20:00'], ['16:00', '17:00'], ['20:30', '21:30'], ['20:00', '21:00']];
  let drops = D_ST.map((status, i) => {
    const b = BAGS[i], m = merchants[D_M[i]], orig = D_ORIG[i], price = Math.round(orig / 3), qty = D_QTY[i], cur = m.currency;
    const reserved = status === 'sold_out' ? qty : Math.min(qty, D_RES[i]);
    return {
      id: `DR-${3391 - i * 3}`, title: b[0], category: b[1], thumb: b[2], imageUrl: null,
      merchantId: m.id, market: m.country, branchId: m.branches[0].id, city: m.city, dietary: [DIETARY[i % 6], DIETARY[(i + 2) % 6]],
      price: money(price, cur), originalPrice: money(orig, cur),
      quantity: qty, reserved, remaining: qty - reserved, collected: status === 'completed' ? reserved : status === 'expired' ? reserved - 2 : Math.floor(reserved / 2),
      pickupWindow: { start: D_WIN[i][0], end: D_WIN[i][1] }, date: status === 'scheduled' ? '2026-11-20' : status === 'expired' || status === 'completed' ? '2026-11-18' : '2026-11-19',
      status, flagged: status === 'flagged', flagReason: status === 'flagged' ? 'misleading_photo' : null, flagNote: '',
      description: L("A surprise selection of today's unsold items, packed fresh at closing.", 'تشكيلة مفاجئة من منتجات اليوم غير المباعة، تُعبّأ طازجة عند الإغلاق.'),
      allergens: ['gluten', 'dairy', 'nuts', 'eggs'].slice(0, 1 + (i % 3)), createdAt: ago(60 * (i + 2)),
    };
  });
  drops.unshift({ ...JSON.parse(JSON.stringify(drops[4])), id: 'DR-482', title: L('Late Night Bakery Bag', 'كيس مخبز آخر الليل'), status: 'live', date: '2026-11-19', pickupWindow: { start: '09:45', end: '10:15' }, reserved: 9, remaining: 3, quantity: 12, collected: 6, createdAt: ago(300), flagged: false });
  const dropOut = (d, lang) => {
    const m = merchants.find((x) => x.id === d.merchantId) || merchants[0]; const br = m.branches.find((x) => x.id === d.branchId) || m.branches[0];
    return { ...clone(d), title: loc(d.title, lang), titleI18n: clone(d.title), description: loc(d.description, lang), descriptionI18n: clone(d.description), merchant: ref(m, lang), branch: ref(br, lang), discountPct: Math.round((1 - d.price.amount / d.originalPrice.amount) * 100) };
  };
  const dropSummary = () => ({
    totalDrops: drops.length,
    bagsAvailableNow: drops.filter((d) => d.status === 'live').reduce((s, d) => s + d.remaining, 0),
    reserved: drops.reduce((s, d) => s + d.reserved, 0),
    collected: drops.reduce((s, d) => s + d.collected, 0),
    flaggedForReview: drops.filter((d) => d.flagged).length,
  });
  const dropGet = { title: (r) => loc(r.title, 'en'), price: (r) => r.price.amount, remaining: (r) => r.remaining, createdAt: (r) => r.createdAt };

  /* ------------------------------------------------------------------ consumers */
  const C_ST = ['inactive', 'inactive', 'active', 'active', 'active', 'active', 'blocked', 'active', 'inactive', 'active', 'inactive', 'active'];
  const C_ORD = [1, 2, 3, 5, 8, 12, 19, 4, 0, 7, 2, 9];
  const C_SC = [62, 70, 88, 91, 95, 97, 40, 84, 12, 90, 55, 93];
  let consumers = PEOPLE.map((name, i) => ({
    id: i === 4 ? 'CON-48291' : `CON-${1201 + i}`, name, email: name.en.toLowerCase().replace(/^(\w+) (al )?(\w).*$/, '$1.$3') + '@example.com',
    phone: i >= 10 ? `+971 55 550 ${2233 + i * 11}` : `+974 5550 ${2233 + i * 11}`, city: i >= 10 ? 'dubai' : CITIES[i % 4], market: i >= 10 ? 'AE' : 'QA', status: C_ST[i], ordersCount: C_ORD[i], rescueScore: C_SC[i],
    totalSpent: money(C_ORD[i] * 14, i >= 10 ? 'AED' : 'QAR'), walletBalance: money([0, 15, 5, 0, 30, 10, 0, 0, 0, 20, 0, 5][i], i >= 10 ? 'AED' : 'QAR'), mealsSaved: C_ORD[i], co2KgAvoided: +(C_ORD[i] * 2.5).toFixed(1),
    lastOrderAt: C_ORD[i] ? ago(C_ST[i] === 'inactive' ? 1440 * 45 : 60 * (i + 1)) : null,
    joinedAt: new Date(Date.UTC(2026, 4 + i % 6, 2 + i * 2, 4 + (i % 9), (i * 13) % 60)).toISOString(),
    preferences: { categories: [CATEGORIES[i % 6], CATEGORIES[(i + 3) % 6]], dietary: [DIETARY[i % 6]] }, language: i % 3 ? 'en' : 'ar', marketingOptIn: i % 2 === 0, blockReason: C_ST[i] === 'blocked' ? 'repeated_no_shows' : null,
  }));
  const consumerOut = (c, lang) => ({ ...clone(c), name: loc(c.name, lang), nameI18n: clone(c.name) });
  const consumerSummary = () => ({
    totalUsers: consumers.length, active: consumers.filter((c) => c.status === 'active').length,
    inactive: consumers.filter((c) => c.status === 'inactive').length, blocked: consumers.filter((c) => c.status === 'blocked').length,
    avgRescueScore: Math.round(consumers.reduce((s, c) => s + c.rescueScore, 0) / Math.max(1, consumers.length)),
  });

  /* ------------------------------------------------------------------ orders & pickups */
  const O_ST = ['reserved', 'confirmed', 'completed', 'refunded', 'completed', 'cancelled', 'confirmed', 'reserved', 'completed', 'no_show', 'ready_for_pickup', 'completed'];
  const O_DROP = [0, 4, 6, 0, 1, 2, 3, 5, 8, 10, 11, 7];
  const O_MIN = [590, 1088, 1100, 1300, 160, 220, 260, 45, 400, 1500, 90, 800];
  const CARDS = [['mastercard', '6620'], ['visa', '2290'], ['mastercard', '5510'], ['visa', '7712'], ['apple_pay', '4021'], ['visa', '8834']];
  const PK_ST = ['upcoming', 'flagged', 'picked_up', 'cancelled', 'picked_up', 'cancelled', 'upcoming', 'upcoming', 'picked_up', 'missed', 'ready', 'picked_up']; // (v1.4) consistent with the order states
  const CODES = O_ST.map((_, i) => S.pickupCode(`ORD-${77410 - i * 3}`)); // (v1.4) one code format (S.pickupCode): 6 chars, no ambiguous characters
  let orders = O_ST.map((status, i) => {
    const d = drops[O_DROP[i]], qty = i % 3 === 2 ? 2 : 1, c = CARDS[i % CARDS.length], at = O_MIN[i];
    const tl = [{ status: 'reserved', at: ago(at), by: 'consumer' }];
    if (!['reserved', 'cancelled'].includes(status)) tl.push({ status: 'confirmed', at: ago(at - 4), by: 'merchant' });
    if (status === 'ready_for_pickup') tl.push({ status: 'ready_for_pickup', at: ago(30), by: 'merchant' });
    if (status === 'completed') tl.push({ status: 'picked_up', at: ago(Math.max(5, at - 240)), by: 'merchant' }, { status: 'completed', at: ago(Math.max(4, at - 241)), by: 'system' });
    if (status === 'refunded') tl.push({ status: 'refunded', at: ago(at - 60), by: 'admin' });
    if (status === 'cancelled') tl.push({ status: 'cancelled', at: ago(at - 30), by: 'consumer' });
    if (status === 'no_show') tl.push({ status: 'no_show', at: ago(at - 300), by: 'system' });
    return {
      id: `ORD-${77410 - i * 3}`, number: i < 5 ? `${3021 - i}` : `${77410 - i * 3}`, consumerId: consumers[i % consumers.length].id, merchantId: d.merchantId, market: d.market, branchId: d.branchId, dropId: d.id, city: d.city, category: d.category, dietary: d.dietary,
      items: [{ listingId: d.id, title: d.title, qty, unitPrice: clone(d.price) }],
      fees: money(1, d.price.currency), total: money(d.price.amount * qty, d.price.currency),
      paymentStatus: ['refunded', 'cancelled'].includes(status) ? 'refunded' : 'paid', paymentMethod: { brand: c[0], last4: c[1] },
      fulfillment: 'pickup', status, pickupWindow: clone(d.pickupWindow), pickupCode: CODES[i], pickupId: `PK-${58183 + i * 7}`,
      refund: status === 'refunded' ? { amount: money(d.price.amount * qty, d.price.currency), reason: 'store_closed', reasonLabel: L('Store closed', 'المتجر مغلق'), outcome: 'full_refund', toWallet: false, at: ago(at - 60) } : null,
      timeline: tl, createdAt: ago(at),
    };
  });
  let pickups = PK_ST.map((status, i) => {
    const o = orders[i], d = drops.find((x) => x.id === o.dropId);
    return {
      id: o.pickupId, orderId: o.id, consumerId: o.consumerId, merchantId: o.merchantId, market: o.market, branchId: o.branchId, dropId: o.dropId, city: o.city, category: o.category, dietary: o.dietary,
      code: CODES[i], window: { date: d.date, ...clone(o.pickupWindow) }, expiresAt: S.codeExpiry(d.date, o.pickupWindow.end, o.market), usedAt: ['verified', 'picked_up'].includes(status) ? ago(30 + i * 20) : null,
      status, verifiedAt: ['verified', 'picked_up'].includes(status) ? ago(30 + i * 20) : null, verifiedBy: ['verified', 'picked_up'].includes(status) ? L('Merchant app', 'تطبيق التاجر') : null,
      flagReason: status === 'flagged' ? L('Consumer reported missing items', 'أبلغ المستهلك عن أصناف ناقصة') : null, quantity: o.items[0].qty, createdAt: o.createdAt,
    };
  });
  const pickupOut = (p, lang) => {
    const m = merchants.find((x) => x.id === p.merchantId) || merchants[0], br = m.branches.find((b) => b.id === p.branchId) || m.branches[0], d = drops.find((x) => x.id === p.dropId), c = consumers.find((x) => x.id === p.consumerId);
    return { ...clone(p), codeMasked: p.code.slice(0, 2) + '••' + p.code.slice(-2), verifiedBy: loc(p.verifiedBy, lang), flagReason: loc(p.flagReason, lang), consumer: c ? { id: c.id, name: loc(c.name, lang) } : null, merchant: ref(m, lang), branch: ref(br, lang), bag: d ? { id: d.id, title: loc(d.title, lang), thumb: d.thumb } : null };
  };
  const pickupSummary = () => {
    const done = pickups.filter((p) => ['verified', 'picked_up'].includes(p.status)).length, closed = pickups.filter((p) => ['verified', 'picked_up', 'missed'].includes(p.status)).length;
    return { totalToday: pickups.length, completed: done, upcomingReady: pickups.filter((p) => ['upcoming', 'ready'].includes(p.status)).length, missed: pickups.filter((p) => p.status === 'missed').length, onTimeRatePct: +(100 * done / Math.max(1, closed)).toFixed(1) };
  };
  const orderOut = (o, lang) => {
    const m = merchants.find((x) => x.id === o.merchantId) || merchants[0], br = m.branches.find((b) => b.id === o.branchId) || m.branches[0], c = consumers.find((x) => x.id === o.consumerId);
    return { ...clone(o), allowedActions: S.allowedActions(o), active: S.isActive(o), customer: undefined, bag: undefined, refund: o.refund ? { ...clone(o.refund), reasonLabel: loc(o.refund.reasonLabel, lang) } : null, items: o.items.map((it) => ({ ...clone(it), title: loc(it.title, lang) })), consumer: c ? { id: c.id, name: loc(c.name, lang) } : { id: o.consumerId, name: '—' }, merchant: ref(m, lang), branch: ref(br, lang), thumb: (drops.find((d) => d.id === o.dropId) || {}).thumb || 'ph1' };
  };
  const orderSummary = () => {
    const done = orders.filter((o) => o.status === 'completed');
    return {
      /* (v1.3) totals across currencies are converted: single market → its currency, several → reporting currency */
      totalOrders: orders.length, revenue: money(done.reduce((s, o) => s + toTarget(o.total), 0), targetCur()),
      avgOrderValue: money(orders.reduce((s, o) => s + toTarget(o.total), 0) / Math.max(1, orders.length), targetCur()),
      refundedCancelled: orders.filter((o) => ['refunded', 'partially_refunded', 'cancelled'].includes(o.status)).length,
      pendingConfirmation: orders.filter((o) => o.status === 'reserved').length,
    };
  };
  /* Refund policy: read live from D3's mock (GET /admin/settings/policies/refund → config), so edits
     made on the Refund & Cancellation settings screen change eligibility/outcomes here. Fallback mirrors it. */
  const FALLBACK_POLICY = { freeCancellationHours: 2, refundDestinationDefault: 'original_method', reasons: [
    ['store_closed', L('Store closed', 'المتجر مغلق'), 'full_refund'], ['box_unavailable', L('Box unavailable', 'الصندوق غير متوفر'), 'full_refund'],
    ['food_concern', L('Serious food concern', 'مشكلة جدية في الطعام'), 'manual_review'], ['app_payment_issue', L('App or payment issue', 'مشكلة في التطبيق أو الدفع'), 'full_refund'],
    ['missed_collection', L('Missed collection', 'فوات الاستلام'), 'no_refund'], ['late_cancellation', L('Late cancellation (inside 2h window)', 'إلغاء متأخر (خلال ساعتين)'), 'no_refund'],
    ['change_of_mind', L('Change of mind', 'تغيير الرأي'), 'no_refund'], ['personal_preference', L('Personal preference (contents)', 'تفضيل شخصي (المحتويات)'), 'no_refund'],
    ['wrong_location', L('Wrong store or location selected', 'اختيار متجر أو موقع خاطئ'), 'no_refund'],
  ].map(([key, label, outcome]) => ({ key, label, outcome })) };
  function refundPolicy() {
    const pol = W.modules.platform && W.modules.platform.data && W.modules.platform.data.policies && W.modules.platform.data.policies.refund;
    const cfg = (pol && pol.config) || FALLBACK_POLICY;
    return { key: 'refund', version: (pol && pol.updatedAt) || '2026-10-01', freeCancellationHours: +cfg.freeCancellationHours, refundDestinationDefault: cfg.refundDestinationDefault || 'original_method', reasons: (cfg.reasons && cfg.reasons.length ? cfg.reasons : FALLBACK_POLICY.reasons) };
  }
  const REFUND_POLICY = { key: 'refund' };
  function windowStart(o) { const d = drops.find((x) => x.id === o.dropId); return Date.parse(`${(d && d.date) || '2026-11-19'}T${o.pickupWindow.start}:00Z`); }
  function refundEligibility(o, lang) {
    const pol = refundPolicy(), reasons = [];
    if (['refunded', 'partially_refunded'].includes(o.status)) reasons.push('already_refunded');
    if (o.status === 'cancelled') reasons.push('order_cancelled');
    if (o.status === 'reserved') reasons.push('not_confirmed_use_cancel');
    if (!reasons.length && !S.canTransition(o, 'refunded') && !S.canTransition(o, 'partially_refunded')) reasons.push('invalid_transition');
    const hoursToWindow = +((windowStart(o) - NOW) / 3600000).toFixed(1);
    return {
      eligible: reasons.length === 0, reasons, maxAmount: clone(o.total), hoursSincePlaced: +((NOW - Date.parse(o.createdAt)) / 3600000).toFixed(1),
      hoursToWindow, insideCancellationDeadline: hoursToWindow <= pol.freeCancellationHours, collected: ['completed', 'picked_up'].includes(o.status),
      policy: { key: 'refund', version: pol.version, freeCancellationHours: pol.freeCancellationHours, refundDestinationDefault: pol.refundDestinationDefault },
      outcomes: pol.reasons.map((r) => ({ key: r.key, label: loc(r.label, lang), outcome: r.outcome })),
    };
  }

  /* ------------------------------------------------------------------ cases (issues & alerts & moderation) */
  // Severity enum: critical | high | medium | low  (UI labels per Figma: Critical, Warning, Information, Low)
  const CASES = [
    ['ISS-2291', 'issue', L('Sunrise Bakery', 'مخبز صن رايز'), L('Recurring missed pickup windows', 'تكرار تفويت نوافذ الاستلام'), 'critical', 'open', 120, null],
    ['ALT-1187', 'alert', L('Harborline Deli', 'هاربرلاين ديلي'), L('Suspicious reservation pattern flagged by fraud model', 'نمط حجوزات مريب رصده نموذج كشف الاحتيال'), 'critical', 'escalated', 180, 'usr_05'],
    ['MOD-0552', 'moderation', L('Green Leaf Kitchen', 'مطبخ جرين ليف'), L('Listing photo reported as misleading', 'الإبلاغ عن صورة عرض مضللة'), 'high', 'in_progress', 960, 'usr_11'],
    ['ISS-2288', 'issue', L('Copper Kettle Café', 'مقهى كوبر كيتل'), L('Quality complaint — spoiled items in drop', 'شكوى جودة — أصناف تالفة في العرض'), 'critical', 'open', 1080, null],
    ['ALT-1184', 'alert', L("Fielder's Market", 'سوق فيلدرز'), L('Payment dispute opened by consumer', 'نزاع دفع فتحه مستهلك'), 'high', 'open', 1200, null],
    ['MOD-0549', 'moderation', L('N/A — Consumer', 'غير متاح — مستهلك'), L('Abusive review flagged by keyword filter', 'تقييم مسيء رصده فلتر الكلمات'), 'high', 'in_progress', 1260, 'usr_12'],
    ['ISS-2280', 'issue', L('Blue Fig Bistro', 'بلو فيغ بيسترو'), L('Pickup passport expired mid-window', 'انتهاء جواز الاستلام أثناء النافذة'), 'medium', 'resolved', 1380, 'usr_01'],
    ['ALT-1179', 'alert', L('Riverside Grocer', 'بقالة ريفرسايد'), L('Drop accuracy dropped below threshold', 'انخفاض دقة العروض عن الحد المطلوب'), 'high', 'open', 1440, null],
    ['MOD-0541', 'moderation', L('Nomad Noodle Bar', 'نوماد نودل بار'), L('Merchant profile pending re-verification', 'ملف التاجر بانتظار إعادة التحقق'), 'low', 'in_progress', 1440, 'usr_13'],
    ['ISS-2271', 'issue', L('The Daily Crust', 'ذا ديلي كرست'), L('Consumer no-show dispute', 'نزاع عدم حضور مستهلك'), 'low', 'open', 1440, null],
    ['ALT-1172', 'alert', L('Harvest & Co.', 'هارفست آند كو'), L('Duplicate reservation detected', 'رصد حجز مكرر'), 'low', 'resolved', 2880, 'usr_11'],
    ['MOD-0538', 'moderation', L('Willow Café', 'مقهى ويلو'), L('Listing description updated after flag', 'تحديث وصف العرض بعد الإبلاغ'), 'medium', 'resolved', 4320, 'usr_12'],
    ['ISS-2260', 'issue', L('Porter House Grill', 'بورتر هاوس جريل'), L('Merchant quality score declining three weeks running', 'تراجع درجة جودة التاجر لثلاثة أسابيع متتالية'), 'medium', 'in_progress', 4320, 'usr_05'],
    ['ALT-1165', 'alert', L('Corner Bakehouse', 'كورنر بيكهاوس'), L('Two consecutive drop cancellations', 'إلغاء عرضين متتاليين'), 'medium', 'open', 5760, null],
    ['ISS-1092', 'issue', L('Green Bowl Kitchen', 'مطبخ جرين بول'), L('Spoiled inventory reported', 'الإبلاغ عن مخزون تالف'), 'critical', 'open', 4, null],
    ['ISS-1091', 'issue', L('Sunrise Bakehouse', 'مخبز صن رايز'), L('Late pickup window', 'تأخر نافذة الاستلام'), 'high', 'open', 18, null],
    ['ISS-1090', 'issue', L('Marina Grill House', 'مارينا جريل هاوس'), L('Item mismatch', 'عدم تطابق الأصناف'), 'high', 'in_progress', 32, 'usr_05'],
    ['ISS-1089', 'issue', L('Corner Deli Co.', 'كورنر ديلي'), L('Hygiene complaint', 'شكوى نظافة'), 'critical', 'open', 60, null],
    ['ISS-1088', 'issue', L('Harvest & Co.', 'هارفست آند كو'), L('No-show merchant', 'عدم حضور التاجر'), 'medium', 'open', 120, null],
    ['ALT-1161', 'alert', L('Sugar & Sage', 'شوجر آند سيج'), L('Refund rate above 5% this week', 'معدل الاسترداد أعلى من 5% هذا الأسبوع'), 'high', 'open', 300, null],
  ];
  let cases = CASES.map((r, i) => ({
    id: r[0], kind: r[1], title: r[3], description: r[3], severity: r[4], status: r[5], createdAt: ago(r[6]), updatedAt: ago(Math.max(1, r[6] - 10)),
    slaDueAt: new Date(NOW - r[6] * 60000 + ({ critical: 4, high: 12, medium: 24, low: 72 }[r[4]]) * 3600000).toISOString(),
    entity: { type: r[1] === 'moderation' ? 'listing' : 'merchant', id: (merchants.find((m) => m.name.en === r[2].en) || {}).id || ['MER-058', 'MER-047', 'DR-3370', 'MER-030'][i % 4], name: r[2] },
    reporter: r[1] === 'alert' ? L('System monitor', 'مراقب النظام') : r[1] === 'moderation' ? L('Automated filter', 'فلتر آلي') : L('Consumer report', 'بلاغ مستهلك'),
    assigneeId: r[7],
    activity: [{ id: `${r[0]}-a1`, type: 'created', at: ago(r[6]), by: L('System', 'النظام'), note: '' }]
      .concat(r[7] ? [{ id: `${r[0]}-a2`, type: 'assigned', at: ago(Math.max(1, r[6] - 5)), by: ME.name, note: agent(r[7]).name }] : [])
      .concat(i % 3 === 0 ? [{ id: `${r[0]}-a3`, type: 'note', at: ago(Math.max(1, r[6] - 8)), by: AGENTS[3].name, note: L('Contacted merchant, awaiting response.', 'تم التواصل مع التاجر بانتظار الرد.') }] : [])
      .concat(r[5] === 'escalated' ? [{ id: `${r[0]}-a4`, type: 'escalated', at: ago(Math.max(1, r[6] - 20)), by: AGENTS[3].name, note: L('Trust & Safety', 'الثقة والسلامة') }] : [])
      .concat(r[5] === 'resolved' ? [{ id: `${r[0]}-a5`, type: 'resolved', at: ago(Math.max(1, r[6] - 90)), by: agent(r[7]).name, note: L('Merchant confirmed fix.', 'أكد التاجر المعالجة.') }] : []),
  }));
  const caseOut = (c, lang) => ({ ...clone(c), title: loc(c.title, lang), description: loc(c.description, lang), entity: { ...c.entity, name: loc(c.entity.name, lang) }, reporter: loc(c.reporter, lang), assignee: agent(c.assigneeId) ? ref(agent(c.assigneeId), lang) : null, activity: undefined, ageMinutes: Math.round((NOW - Date.parse(c.createdAt)) / 60000) });
  const caseDetail = (c, lang) => ({ ...caseOut(c, lang), activity: c.activity.map((a) => ({ ...clone(a), by: loc(a.by, lang), note: loc(a.note, lang) })) });
  const caseSummary = () => {
    const open = cases.filter((c) => !['resolved', 'closed'].includes(c.status));
    return {
      critical: open.filter((c) => c.severity === 'critical').length,
      needsReview: open.filter((c) => c.status === 'open' && c.severity !== 'critical').length,
      underMonitoring: open.filter((c) => c.status === 'in_progress').length,
      totalOpen: open.length,
      byKind: { all: open.length, issue: open.filter((c) => c.kind === 'issue').length, alert: open.filter((c) => c.kind === 'alert').length, moderation: open.filter((c) => c.kind === 'moderation').length },
    };
  };

  /* ------------------------------------------------------------------ moderation queue */
  // type: listing | review | user | merchant_profile ; status: pending | in_review | approved | rejected | escalated
  const MODS = [
    ['MOD-0552', 'listing', L('Green Leaf Kitchen — "Fresh Garden Box"', 'مطبخ جرين ليف — «صندوق الحديقة الطازج»'), L('Misleading photo', 'صورة مضللة'), 'automated_filter', 'high', 'in_review', 960],
    ['MOD-0549', 'review', L("Review on Fielder's Market", 'تقييم على سوق فيلدرز'), L('Abusive language', 'لغة مسيئة'), 'consumer_report', 'high', 'in_review', 1260],
    ['MOD-0555', 'user', L('Consumer #48291', 'المستهلك #48291'), L('Repeated no-shows, suspected abuse', 'تكرار عدم الحضور واشتباه بإساءة الاستخدام'), 'system_pattern', 'critical', 'pending', 60],
    ['MOD-0541', 'merchant_profile', L('Nomad Noodle Bar', 'نوماد نودل بار'), L('Pending re-verification after ownership change', 'بانتظار إعادة التحقق بعد تغيير الملكية'), 'onboarding_team', 'low', 'in_review', 1440],
    ['MOD-0538', 'listing', L('Willow Café — "Bakery Surplus"', 'مقهى ويلو — «فائض المخبز»'), L('Description updated after flag', 'تحديث الوصف بعد الإبلاغ'), 'automated_filter', 'medium', 'approved', 4320],
    ['MOD-0558', 'review', L('Review on Copper Kettle Café', 'تقييم على مقهى كوبر كيتل'), L('Off-topic / spam content', 'محتوى خارج الموضوع / مزعج'), 'automated_filter', 'low', 'pending', 240],
    ['MOD-0546', 'user', L('Consumer #39104', 'المستهلك #39104'), L('Reported for harassment in pickup chat', 'بلاغ تحرش في محادثة الاستلام'), 'merchant_report', 'critical', 'escalated', 360],
    ['MOD-0536', 'merchant_profile', L('Blue Fig Bistro', 'بلو فيغ بيسترو'), L('Photo set flagged as stock imagery', 'صور مرصودة كصور جاهزة'), 'automated_filter', 'medium', 'rejected', 2880],
    ['MOD-0560', 'listing', L('Harborline Deli — "Chef\'s Surplus"', 'هاربرلاين ديلي — «فائض الشيف»'), L('Allergen info missing', 'معلومات مسببات الحساسية مفقودة'), 'consumer_report', 'high', 'pending', 240],
    ['MOD-0530', 'review', L('Review on Riverside Grocer', 'تقييم على بقالة ريفرسايد'), L('Suspected fake review cluster', 'اشتباه بمجموعة تقييمات مزيفة'), 'automated_filter', 'critical', 'escalated', 2880],
    ['MOD-0562', 'user', L('Consumer #51837', 'المستهلك #51837'), L('Multiple accounts flagged, same device ID', 'رصد حسابات متعددة بنفس معرّف الجهاز'), 'system_pattern', 'high', 'pending', 120],
    ['MOD-0524', 'merchant_profile', L('Porter House Grill', 'بورتر هاوس جريل'), L('Business licence document expired', 'انتهاء صلاحية وثيقة الرخصة التجارية'), 'compliance_check', 'low', 'approved', 7200],
  ];
  const CONTENT = {
    review: L('"Worst bag ever, the staff are useless and rude!!"', '«أسوأ كيس على الإطلاق، الموظفون عديمو الفائدة وغير مهذبين!!»'),
    listing: L('Listing photo shows a full cake; consumers received bread rolls.', 'تُظهر صورة العرض كعكة كاملة بينما استلم المستهلكون لفائف خبز.'),
    user: L('7 no-shows in 14 days across 4 merchants.', '7 حالات عدم حضور خلال 14 يومًا لدى 4 تجار.'),
    merchant_profile: L('Documents on file are out of date or need re-verification.', 'الوثائق المسجلة قديمة أو تحتاج إلى إعادة تحقق.'),
  };
  let moderation = MODS.map((r, i) => ({
    id: r[0], type: r[1], item: r[2], reason: r[3], reporter: r[4], severity: r[5], status: r[6], createdAt: ago(r[7]),
    content: CONTENT[r[1]], reportsCount: 1 + (i % 4), autoScore: r[4] === 'automated_filter' ? +(0.62 + (i % 3) * 0.1).toFixed(2) : null,
    assigneeId: r[6] === 'pending' ? null : ['usr_11', 'usr_12', 'usr_05'][i % 3],
    decision: ['approved', 'rejected'].includes(r[6]) ? { outcome: r[6], by: AGENTS[0].name, at: ago(Math.max(1, r[7] - 60)), note: '' } : null,
  }));
  const modOut = (m, lang) => ({ ...clone(m), item: loc(m.item, lang), reason: loc(m.reason, lang), content: loc(m.content, lang), assignee: agent(m.assigneeId) ? ref(agent(m.assigneeId), lang) : null, decision: m.decision ? { ...clone(m.decision), by: loc(m.decision.by, lang) } : null, ageMinutes: Math.round((NOW - Date.parse(m.createdAt)) / 60000) });
  let resolvedToday = 17;
  const modSummary = () => ({
    pendingReview: moderation.filter((m) => ['pending', 'in_review'].includes(m.status)).length + 2,
    autoFlaggedToday: 23, escalated: moderation.filter((m) => m.status === 'escalated').length + 1,
    resolvedToday, resolvedDeltaVsYesterday: resolvedToday - 13,
    byType: ['listing', 'review', 'user', 'merchant_profile'].reduce((o, t) => ((o[t] = moderation.filter((m) => m.type === t && !['approved', 'rejected'].includes(m.status)).length), o), {}),
  });

  /* ------------------------------------------------------------------ support */
  // priority: urgent | high | medium | low (UI "Normal" = medium); channel: in_app | email | chat | phone | social
  const TICKETS = [
    ['SUP-8841', L('J. Alvarez', 'ج. ألفاريز'), L('Refund not received for missed drop', 'لم يصل الاسترداد لعرض فائت'), 'email', 'urgent', 'open', 'usr_11', 24, 'refunds'],
    ['SUP-8839', L('M. Chen', 'م. تشين'), L("Can't redeem pickup passport", 'تعذّر استخدام جواز الاستلام'), 'in_app', 'high', 'in_progress', 'usr_12', 72, 'pickups'],
    ['SUP-8836', L('S. Okafor', 'س. أوكافور'), L('Account locked after password reset', 'قفل الحساب بعد إعادة تعيين كلمة المرور'), 'chat', 'high', 'open', null, 48, 'account'],
    ['SUP-8830', L('R. Singh', 'ر. سينغ'), L('Question about allergen labeling', 'سؤال عن ملصقات مسببات الحساسية'), 'email', 'medium', 'resolved', 'usr_11', 330, 'listings'],
    ['SUP-8828', L('L. Fontaine', 'ل. فونتين'), L('Merchant no-show, wants credit', 'التاجر لم يحضر ويطلب رصيدًا'), 'phone', 'urgent', 'escalated', 'usr_12', 126, 'refunds'],
    ['SUP-8825', L('A. Petrov', 'أ. بيتروف'), L('App crashes on checkout', 'تعطل التطبيق عند الدفع'), 'in_app', 'high', 'in_progress', 'usr_13', 198, 'technical'],
    ['SUP-8820', L('K. Yamada', 'ك. يامادا'), L('General feedback on new UI', 'ملاحظات عامة على الواجهة الجديدة'), 'social', 'low', 'open', null, 480, 'feedback'],
    ['SUP-8817', L('D. Novak', 'د. نوفاك'), L('Duplicate charge on card', 'خصم مكرر على البطاقة'), 'email', 'urgent', 'open', 'usr_11', 96, 'payments'],
    ['SUP-8812', L('P. Osei', 'ب. أوسي'), L('How do I change delivery notifications?', 'كيف أغيّر إشعارات التوصيل؟'), 'chat', 'medium', 'resolved', 'usr_13', 660, 'account'],
    ['SUP-8805', L('F. Moretti', 'ف. موريتي'), L('Requesting account deletion', 'طلب حذف الحساب'), 'email', 'medium', 'in_progress', 'usr_12', 840, 'account'],
  ];
  let tickets = TICKETS.map((r, i) => ({
    id: r[0], subject: r[2], requester: { type: i % 4 === 3 ? 'merchant' : 'consumer', id: i % 4 === 3 ? 'MER-066' : consumers[i % consumers.length].id, name: r[1], email: r[1].en.toLowerCase().replace(/[^a-z]/g, '') + '@example.com' },
    category: r[8], channel: r[3], priority: r[4], status: r[5], assigneeId: r[6], createdAt: ago(r[7]), relatedOrderId: i % 2 ? null : `ORD-${77410 - i * 3}`,
    messages: [
      { id: `${r[0]}-m1`, at: ago(r[7]), author: { type: 'requester', name: r[1] }, internal: false, body: L(`${r[2].en}. Could you please look into this as soon as possible?`, `${r[2].ar}. هل يمكنكم مراجعة الأمر في أقرب وقت؟`), attachments: [] },
      ...(r[6] ? [{ id: `${r[0]}-m2`, at: ago(Math.max(1, r[7] - 6)), author: { type: 'agent', name: agent(r[6]).name }, internal: false, body: L("Thanks for reaching out — I'm checking this with the merchant and our payments team now.", 'شكرًا لتواصلك — أتحقق من الأمر الآن مع التاجر وفريق المدفوعات.'), attachments: [] }] : []),
      ...(i % 3 === 1 ? [{ id: `${r[0]}-m3`, at: ago(Math.max(1, r[7] - 10)), author: { type: 'agent', name: AGENTS[3].name }, internal: true, body: L('Internal: verify the transaction in the payments dashboard before replying.', 'ملاحظة داخلية: تحقق من المعاملة في لوحة المدفوعات قبل الرد.'), attachments: [] }] : []),
      ...(r[5] === 'resolved' ? [{ id: `${r[0]}-m4`, at: ago(Math.max(1, r[7] - 120)), author: { type: 'agent', name: agent(r[6]).name }, internal: false, body: L('This is now resolved. Let us know if anything else comes up!', 'تمت معالجة الطلب. أخبرنا إن احتجت إلى أي شيء آخر!'), attachments: [] }] : []),
    ],
  }));
  tickets.forEach((t) => { t.lastMessageAt = t.messages[t.messages.length - 1].at; });
  const ticketOut = (t, lang) => ({ ...clone(t), subject: loc(t.subject, lang), requester: { ...t.requester, name: loc(t.requester.name, lang) }, assignee: agent(t.assigneeId) ? ref(agent(t.assigneeId), lang) : null, messages: undefined, messageCount: t.messages.length, ageMinutes: Math.round((NOW - Date.parse(t.createdAt)) / 60000) });
  const msgOut = (m, lang) => ({ ...clone(m), body: loc(m.body, lang), author: { ...m.author, name: loc(m.author.name, lang) } });
  const supportSummary = () => ({
    kpis: { openTickets: 31, unassigned: tickets.filter((t) => !t.assigneeId && !['resolved', 'closed'].includes(t.status)).length + 4, avgFirstResponseMinutes: 6.4, firstResponseSlaMinutes: 10, avgResolutionHours: 2.1, resolutionDeltaMinutes: 18, csat: 4.6, csatScale: 5, csatPeriodDays: 7 },
    responseTrend: { key: 'first_response', label: 'Avg first response (min)', points: ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'].map((x, i) => ({ x, y: [5.2, 5.8, 6.4, 5.9, 7.1, 6.6, 7.4][i] })) },
    byChannel: [{ key: 'in_app', count: 42 }, { key: 'email', count: 28 }, { key: 'chat', count: 51 }, { key: 'phone', count: 17 }, { key: 'social', count: 9 }],
    byPriority: ['urgent', 'high', 'medium', 'low'].reduce((o, p) => ((o[p] = tickets.filter((t) => t.priority === p).length), o), { all: tickets.length }),
  });

  /* ------------------------------------------------------------------ handlers */
  const R = {};
  cases.forEach((c) => { const m = merchants.find((x) => x.id === c.entity.id); if (m) c.market = m.country; });
  tickets.forEach((tk) => { const r = tk.requester; const x = r.type === 'merchant' ? merchants.find((m) => m.id === r.id) : consumers.find((c) => c.id === r.id); if (x) tk.market = x.country || x.market; });
  /* (v1.4) one shared store for both portals: orders, pickups, merchants, moderation and tickets live in WBStore;
     drops = D1's own drops + every merchant listing (live adapters, same ids). */
  S.orders.push(...orders); orders = S.orders;
  S.pickups.push(...pickups); pickups = S.pickups;
  S.merchants.push(...merchants); merchants = S.merchants;
  S.moderation.push(...moderation); moderation = S.moderation;
  S.tickets.push(...tickets); tickets = S.tickets;
  drops = S.withListings(drops);
  /* (v1.3) from here on every list/summary sees only the rows of the requested market(s) */
  merchants = SC(merchants); drops = SC(drops); consumers = SC(consumers); orders = SC(orders); pickups = SC(pickups); cases = SC(cases); moderation = SC(moderation); tickets = SC(tickets);
  const on = (sig, fn) => { R[sig] = fn; };
  const listFilter = (row, q) =>
    (!has(q.status) || row.status === q.status) && (!has(q.category) || row.category === q.category) &&
    (!has(q.city) || row.city === q.city) && (!has(q.dietary) || (row.dietary || []).includes(q.dietary)) &&
    (!has(q.merchantId) || row.merchantId === q.merchantId);

  // ---- Drops
  on('GET /admin/drops/summary', () => dropSummary());
  on('GET /admin/drops', (req) => {
    const q = req.query || {}, lang = langOf(req);
    let rows = drops.filter((d) => listFilter(d, q) && matchQ(q.q, d.id, d.title, (merchants.find((m) => m.id === d.merchantId) || {}).name));
    rows = sortRows(rows, q.sort || '-createdAt', dropGet);
    const p = paginate(rows, q); p.data = p.data.map((d) => dropOut(d, lang)); p.meta.summary = p.summary = dropSummary(); return p;
  });
  on('GET /admin/drops/:id', (req) => dropOut(find(drops, req.params.id, 'Drop'), langOf(req)));
  on('PATCH /admin/drops/:id', (req) => {
    const d = find(drops, req.params.id, 'Drop'), b = req.body || {};
    if (b.title !== undefined) { const tt = typeof b.title === 'object' ? b.title : { en: b.title, ar: b.title }; need(tt.en && String(tt.en).trim(), 'title', 'Title is required'); d.title = { en: tt.en, ar: tt.ar || tt.en }; }
    if (b.quantity !== undefined) { need(+b.quantity >= d.reserved, 'quantity', 'Quantity cannot be lower than bags already reserved', 'min_reserved'); d.quantity = +b.quantity; d.remaining = d.quantity - d.reserved; }
    const price = b.price !== undefined ? +(b.price.amount ?? b.price) : d.price.amount, orig = b.originalPrice !== undefined ? +(b.originalPrice.amount ?? b.originalPrice) : d.originalPrice.amount;
    need(price > 0, 'price', 'Price must be greater than zero', 'min');
    need(price < orig, 'price', 'Price must be lower than the original value', 'lt_original');
    d.price = money(price, d.price.currency); d.originalPrice = money(orig, d.originalPrice.currency);
    if (b.pickupWindow) { need(b.pickupWindow.start < b.pickupWindow.end, 'pickupWindow', 'Pickup window end must be after start', 'order'); d.pickupWindow = { start: b.pickupWindow.start, end: b.pickupWindow.end }; }
    ['category', 'dietary', 'allergens', 'status', 'date'].forEach((k) => { if (b[k] !== undefined) d[k] = b[k]; });
    if (b.description !== undefined) d.description = typeof b.description === 'object' ? b.description : { en: b.description, ar: b.description };
    if (d.status !== 'flagged') d.flagged = false;
    return dropOut(d, langOf(req));
  });
  on('DELETE /admin/drops/:id', (req) => {
    const i = drops.findIndex((d) => d.id === req.params.id); if (i < 0) throw ERR(404, 'not_found', 'Drop not found');
    const d = drops[i], force = req.query && (req.query.force === true || req.query.force === 'true');
    if (d.status === 'live' && d.reserved > 0 && !force) throw ERR(409, 'conflict', 'Drop has active reservations', { reserved: d.reserved, forceable: true });
    drops.splice(i, 1); return { deleted: true, id: d.id, refundedReservations: d.status === 'live' ? d.reserved : 0 };
  });
  on('POST /admin/drops/:id/flag', (req) => {
    const d = find(drops, req.params.id, 'Drop'), b = req.body || {};
    need(b.reason, 'reason', 'Choose a reason');
    d.flagged = true; d.status = 'flagged'; d.flagReason = b.reason; d.flagNote = b.note || '';
    const m = merchants.find((x) => x.id === d.merchantId);
    cases.unshift({ id: nid('MOD'), kind: 'moderation', title: L(`Drop ${d.id} flagged for review`, `الإبلاغ عن العرض ${d.id} للمراجعة`), description: L(`${d.title.en} — flagged by admin`, `${d.title.ar} — أبلغ عنه المشرف`), severity: 'medium', status: 'open', createdAt: nowIso(), updatedAt: nowIso(), slaDueAt: new Date(NOW + 864e5).toISOString(), entity: { type: 'drop', id: d.id, name: m ? m.name : L('—') }, reporter: ME.name, assigneeId: null, activity: [{ id: nid('a'), type: 'created', at: nowIso(), by: ME.name, note: b.note || '' }] });
    return dropOut(d, langOf(req));
  });
  on('POST /admin/drops/:id/unflag', (req) => { const d = find(drops, req.params.id, 'Drop'); d.flagged = false; d.flagReason = null; d.status = 'live'; return dropOut(d, langOf(req)); });
  on('POST /admin/drops/bulk', (req) => {
    const b = req.body || {}; need((b.ids || []).length, 'ids', 'Select at least one drop');
    need(['delete', 'flag', 'pause', 'activate'].includes(b.action), 'action', 'Unknown action', 'enum');
    let updated = 0; const failed = [];
    b.ids.forEach((id) => {
      const i = drops.findIndex((d) => d.id === id); if (i < 0) { failed.push({ id, error: 'not_found' }); return; }
      const d = drops[i];
      if (b.action === 'delete') drops.splice(i, 1);
      else if (b.action === 'flag') { d.flagged = true; d.status = 'flagged'; d.flagReason = b.reason || 'bulk_review'; }
      else if (['expired', 'completed'].includes(d.status)) { failed.push({ id, error: 'not_editable' }); return; }
      else if (b.action === 'pause') d.status = 'paused';
      else { d.status = 'live'; d.flagged = false; }
      updated++;
    });
    return { updated, failed };
  });

  // ---- Pickups
  on('GET /admin/pickups/summary', () => pickupSummary());
  on('GET /admin/pickups', (req) => {
    const q = req.query || {}, lang = langOf(req);
    let rows = pickups.filter((p) => listFilter(p, q) && (!has(q.branchId) || p.branchId === q.branchId) &&
      matchQ(q.q, p.id, p.code, p.orderId, (consumers.find((c) => c.id === p.consumerId) || {}).name, (merchants.find((m) => m.id === p.merchantId) || {}).name, (drops.find((d) => d.id === p.dropId) || {}).title));
    rows = sortRows(rows, q.sort || '-createdAt', { createdAt: (r) => r.createdAt, window: (r) => r.window.start });
    const p = paginate(rows, q); p.data = p.data.map((x) => pickupOut(x, lang)); p.meta.summary = p.summary = pickupSummary(); return p;
  });
  on('GET /admin/pickups/:id', (req) => { const p = find(pickups, req.params.id, 'Pickup'); const o = pickupOut(p, langOf(req)); const ord = orders.find((x) => x.id === p.orderId); o.order = ord ? orderOut(ord, langOf(req)) : null; return o; });
  on('POST /admin/pickups/:id/verify', (req) => {
    /* (v1.4 F-003/FLOW-09) the same helper as the merchant portal: verifies, marks the code used and completes the order */
    const p = find(pickups, req.params.id, 'Pickup'); const code = String((req.body && req.body.code) || '').trim().toUpperCase();
    need(code.length === 6, 'code', 'Enter the 6-character code', 'length');
    try { S.verifyPickup({ code, pickupId: p.id, by: 'admin' }); }
    catch (e) { if (e && e.code === 'invalid_code') return { valid: false, reason: 'invalid_code', pickup: pickupOut(p, langOf(req)) }; throw e; }
    p.flagReason = null; const o = orders.find((x) => x.id === p.orderId);
    return { valid: true, pickup: pickupOut(p, langOf(req)), order: o ? orderOut(o, langOf(req)) : null };
  });
  on('PATCH /admin/pickups/:id', (req) => {
    const p = find(pickups, req.params.id, 'Pickup'), b = req.body || {};
    if (b.window) { need(b.window.start && b.window.end && b.window.start < b.window.end, 'window', 'Pickup window end must be after start', 'order'); p.window = { ...p.window, ...b.window }; if (p.status === 'missed') p.status = 'upcoming'; }
    if (b.status) { p.status = b.status; if (b.status !== 'flagged') p.flagReason = null; }
    return pickupOut(p, langOf(req));
  });
  on('POST /admin/pickups/:id/cancel', (req) => {
    const p = find(pickups, req.params.id, 'Pickup'), b = req.body || {}; need(b.reason, 'reason', 'Choose a reason');
    if (['verified', 'picked_up'].includes(p.status)) throw ERR(409, 'invalid_transition', 'Pickup already completed', { status: p.status });
    const o = orders.find((x) => x.id === p.orderId);
    if (o) { const to = b.refund === false ? 'cancelled' : 'refunded'; S.transition(o, to, { by: 'admin', note: b.reason }); if (b.refund !== false) o.paymentStatus = 'refunded'; }
    p.status = 'cancelled';
    return pickupOut(p, langOf(req));
  });

  // ---- Orders & reservations
  on('GET /admin/orders/summary', () => orderSummary());
  on('GET /admin/orders', (req) => {
    const q = req.query || {}, lang = langOf(req);
    let rows = orders.filter((o) => listFilter(o, q) && (!has(q.paymentStatus) || o.paymentStatus === q.paymentStatus) && (!has(q.type) || o.fulfillment === q.type) &&
      matchQ(q.q, o.id, o.items[0].title, (consumers.find((c) => c.id === o.consumerId) || {}).name, (merchants.find((m) => m.id === o.merchantId) || {}).name));
    rows = sortRows(rows, q.sort || '-createdAt', { createdAt: (r) => r.createdAt, total: (r) => r.total.amount });
    const p = paginate(rows, q); p.data = p.data.map((o) => orderOut(o, lang)); p.meta.summary = p.summary = orderSummary(); return p;
  });
  const findOrder = (id) => orders.find((o) => o.id === id || o.number === String(id).replace('#', '') || o.id === 'ORD-' + id) || find(orders, id, 'Order');
  on('GET /admin/orders/:id', (req) => orderOut(findOrder(req.params.id), langOf(req)));
  on('GET /admin/orders/:id/refund-eligibility', (req) => refundEligibility(findOrder(req.params.id), langOf(req)));
  on('POST /admin/orders/:id/refund', (req) => {
    const o = findOrder(req.params.id), b = req.body || {}, el = refundEligibility(o, langOf(req));
    if (!el.eligible) throw ERR(422, 'policy_violation', 'Refund not allowed by policy', { reasons: el.reasons });
    need(b.reason, 'reason', 'Choose a reason');
    const rule = refundPolicy().reasons.find((r) => r.key === b.reason);
    need(rule, 'reason', 'This reason is not in the refund policy', 'enum');
    if (rule.outcome === 'no_refund') throw ERR(422, 'policy_violation', 'The refund policy does not allow a refund for this reason', { reason: 'no_refund' });
    let amt = +(b.amount && b.amount.amount != null ? b.amount.amount : b.amount);
    if (rule.outcome === 'full_refund' || rule.outcome === 'wallet_credit') amt = amt > 0 ? Math.min(amt, o.total.amount) : o.total.amount;
    need(amt > 0 && amt <= o.total.amount, 'amount', 'Amount must be between 0 and the order total', 'range');
    if (rule.outcome === 'partial_refund') need(amt < o.total.amount, 'amount', 'A partial refund must be less than the order total', 'lt_total');
    if (rule.outcome === 'manual_review' || el.collected) need(b.approved === true, 'approved', 'Manager approval is required for this refund', 'approval');
    const toWallet = rule.outcome === 'wallet_credit' ? true : !!b.toWallet;
    const partial = amt < o.total.amount;
    S.transition(o, partial ? 'partially_refunded' : 'refunded', { by: 'admin', event: 'refund_issued', note: b.reason }); // (v1.4 F-002) 409 invalid_transition if not allowed
    o.paymentStatus = partial ? 'partially_refunded' : 'refunded';
    o.refund = { amount: money(amt, o.total.currency), reason: b.reason, reasonLabel: clone(rule.label), outcome: rule.outcome, note: b.note || '', toWallet, at: nowIso() };
    if (toWallet) { const c = consumers.find((x) => x.id === o.consumerId); if (c) c.walletBalance = money(c.walletBalance.amount + amt); }
    return orderOut(o, langOf(req));
  });
  on('POST /admin/orders/:id/cancel', (req) => {
    const o = findOrder(req.params.id), b = req.body || {};
    if (!S.canTransition(o, 'cancelled')) throw ERR(409, 'invalid_transition', `Order ${o.id} can't move from ${o.status} to cancelled.`, { from: o.status, to: 'cancelled', allowed: S.FLOW[o.status] || [] });
    need(b.reason, 'reason', 'Choose a reason');
    S.transition(o, 'cancelled', { by: 'admin', note: b.reason }); if (b.refund !== false) o.paymentStatus = 'refunded';
    o.cancellation = { reason: b.reason, refund: b.refund !== false, at: nowIso() };
    return orderOut(o, langOf(req));
  });

  // ---- Merchants
  const merchantSummary = (m, lang) => ({
    id: m.id, name: loc(m.name, lang), nameI18n: clone(m.name), logoUrl: null, thumb: ['ph1', 'ph2', 'ph3', 'ph4', 'ph5', 'ph6'][Math.max(0, merchants.indexOf(m)) % 6], category: m.category, city: m.city, country: m.country,
    status: m.status, rating: m.rating, qualityScore: m.qualityScore, dropsCount: m.dropsCount, commissionRate: m.commissionRate, commissionSource: S.contracts[m.id] ? 'contract' : 'platform_default', source: m.source || 'admin',
    branchesCount: m.branches.length, activeListings: drops.filter((d) => d.merchantId === m.id && d.status === 'live').length,
    ordersCount: m.dropsCount * 3, revenue: money(m.revenue), complianceStatus: m.compliance.status, joinedAt: m.joinedAt,
  });
  const merchantKpis = () => {
    const scored = merchants.filter((m) => m.qualityScore != null);
    return { totalMerchants: merchants.length, pendingVerification: merchants.filter((m) => m.status === 'pending').length, verifiedActive: merchants.filter((m) => ['verified', 'active'].includes(m.status)).length, suspended: merchants.filter((m) => m.status === 'suspended').length, avgQualityScore: Math.round(scored.reduce((s, m) => s + m.qualityScore, 0) / Math.max(1, scored.length)) };
  };
  on('GET /admin/merchants/summary', () => merchantKpis());
  on('GET /admin/merchants', (req) => {
    const q = req.query || {}, lang = langOf(req);
    let rows = merchants.filter((m) => (!has(q.status) || m.status === q.status) && (!has(q.category) || m.category === q.category) && (!has(q.city) || m.city === q.city) && matchQ(q.q, m.id, m.name));
    rows = sortRows(rows, q.sort || '-joinedAt', { joinedAt: (r) => r.joinedAt, revenue: (r) => r.revenue, qualityScore: (r) => r.qualityScore || 0, name: (r) => r.name.en });
    const p = paginate(rows, q); p.data = p.data.map((m) => merchantSummary(m, lang)); p.meta.summary = p.summary = merchantKpis(); return p;
  });
  on('GET /admin/merchants/:id', (req) => {
    const m = find(merchants, req.params.id, 'Merchant'), lang = langOf(req);
    return { ...merchantSummary(m, lang), business: clone(m.business), contact: { ...clone(m.contact), ownerName: loc(m.contact.ownerName, lang) }, banking: clone(m.banking) };
  });
  on('GET /admin/merchants/:id/overview', (req) => {
    const m = find(merchants, req.params.id, 'Merchant');
    return { kpis: { revenue: money(m.revenue), ordersCount: m.dropsCount * 3, rescueRatePct: m.qualityScore ? Math.min(99, m.qualityScore + 2) : 0, rating: m.rating, refundRatePct: m.qualityScore ? +(6 - m.qualityScore / 20).toFixed(1) : 0, qualityScore: m.qualityScore }, ordersTrend: { key: 'orders', label: 'Orders', points: [12, 15, 14, 18, 21, 19, 24].map((y, i) => ({ x: api.demoDate(i - 6), y: m.dropsCount ? Math.round(y * m.dropsCount / 40) : 0 })) } };
  });
  on('GET /admin/merchants/:id/branches', (req) => { const m = find(merchants, req.params.id, 'Merchant'), lang = langOf(req); return { data: m.branches.map((b) => ({ ...clone(b), name: loc(b.name, lang), address: loc(b.address, lang) })), meta: { page: 1, pageSize: 20, total: m.branches.length } }; });
  on('GET /admin/merchants/:id/listings', (req) => { const m = find(merchants, req.params.id, 'Merchant'), lang = langOf(req); return paginate(drops.filter((d) => d.merchantId === m.id).map((d) => dropOut(d, lang)), req.query || {}, 20); });
  on('GET /admin/merchants/:id/payouts', (req) => { const m = find(merchants, req.params.id, 'Merchant'); return paginate(clone(m.payouts).reverse(), req.query || {}, 20); });
  on('GET /admin/merchants/:id/compliance', (req) => clone(find(merchants, req.params.id, 'Merchant').compliance));
  on('GET /admin/merchants/:id/activity', (req) => { const m = find(merchants, req.params.id, 'Merchant'), lang = langOf(req); return paginate(m.activity.map((a) => ({ ...clone(a), actor: loc(a.actor, lang), detail: loc(a.detail, lang) })), req.query || {}, 20); });
  on('POST /admin/merchants', (req) => {
    const b = req.body || {}, bz = b.business || {}, ct = b.contact || {}, lc = b.location || {};
    const errors = {};
    const nm = typeof bz.name === 'object' && bz.name ? bz.name : { en: bz.name, ar: bz.name };
    if (!nm.en) errors['business.name'] = 'required';
    if (!bz.category) errors['business.category'] = 'required';
    if (!bz.tradeLicenseNo) errors['business.tradeLicenseNo'] = 'required';
    if (!ct.ownerName) errors['contact.ownerName'] = 'required';
    if (!/^\S+@\S+\.\S+$/.test(ct.email || '')) errors['contact.email'] = 'invalid';
    if (!ct.phone) errors['contact.phone'] = 'required';
    if (!lc.city) errors['location.city'] = 'required';
    if (!lc.address) errors['location.address'] = 'required';
    if (b.commissionRate != null && b.commissionRate !== '' && !(+b.commissionRate >= 0 && +b.commissionRate <= 50)) errors.commissionRate = 'range';
    if (Object.keys(errors).length) throw ERR(422, 'validation_error', 'Some fields need attention.', errors);
    if (merchants.some((m) => m.name.en.toLowerCase() === String(nm.en).toLowerCase())) throw ERR(409, 'conflict', 'A merchant with this name already exists', { 'business.name': 'duplicate' });
    const id = nid('MER');
    const m = {
      id, name: { en: nm.en, ar: nm.ar || nm.en }, category: bz.category, city: lc.city, qualityScore: null, dropsCount: 0, revenue: 0, status: 'pending', source: b.source || 'admin',
      country: lc.country || countryOfCity(lc.city), currency: curOf(lc.country || countryOfCity(lc.city)), rating: null, joinedAt: nowIso(),
      business: { legalName: bz.legalName || nm.en, tradeLicenseNo: bz.tradeLicenseNo, vatNo: bz.vatNo || '' },
      contact: { ownerName: { en: ct.ownerName, ar: ct.ownerName }, email: ct.email, phone: ct.phone },
      banking: b.banking || { bankName: '', iban: '', accountName: '' },
      branches: (b.branches && b.branches.length ? b.branches : [{ name: '', address: lc.address }]).map((br, k) => ({ id: `${id}-B${k + 1}`, name: { en: br.name || 'Main Branch', ar: br.name || 'الفرع الرئيسي' }, address: { en: br.address || lc.address, ar: br.address || lc.address }, city: lc.city, hours: br.hours || '08:00–21:00', pickupWindow: br.pickupWindow || { start: '18:00', end: '20:00' }, state: 'closed', activeListings: 0 })),
      payouts: [],
      compliance: { hygieneScore: null, status: 'under_review', lastInspectionAt: null, certificates: (b.documents || []).map((d, k) => ({ id: `${id}-C${k + 1}`, type: (d && d.type) || 'document', number: '', status: 'pending_review', expiresAt: (d && d.expiresAt) || null, fileName: (d && d.fileName) || null })) },
      activity: [{ id: `${id}-A1`, at: nowIso(), actor: ME.name, action: 'merchant_created', detail: '' }],
    };
    withRate(m); if (b.commissionRate != null && b.commissionRate !== '' && +b.commissionRate !== S.commercial.defaultCommissionRate) S.setContractRate(id, +b.commissionRate);
    if (b.source === 'self_signup') m.activity[0] = { id: `${id}-A1`, at: nowIso(), actor: m.contact.ownerName, action: 'merchant_registered', detail: '' };
    merchants.unshift(m);
    return merchantSummary(m, langOf(req));
  });
  on('PATCH /admin/merchants/:id', (req) => {
    const m = find(merchants, req.params.id, 'Merchant'), b = req.body || {};
    if (b.commissionRate !== undefined) { if (b.commissionRate === null || b.commissionRate === '') S.setContractRate(m.id, null); else { need(+b.commissionRate >= 0 && +b.commissionRate <= 50, 'commissionRate', 'Commission must be between 0 and 50%', 'range'); S.setContractRate(m.id, +b.commissionRate); } }
    if (b.contact) Object.assign(m.contact, b.contact);
    return merchantSummary(m, langOf(req));
  });
  on('DELETE /admin/merchants/:id', (req) => { const i = merchants.findIndex((m) => m.id === req.params.id); if (i < 0) throw ERR(404, 'not_found', 'Merchant not found'); merchants.splice(i, 1); return { deleted: true, id: req.params.id }; });
  const M_ACT = { verify: 'verified', suspend: 'suspended', reject: 'rejected', reactivate: 'verified' };
  Object.keys(M_ACT).forEach((act) => on(`POST /admin/merchants/:id/${act}`, (req) => {
    const m = find(merchants, req.params.id, 'Merchant'), b = req.body || {};
    if (act === 'suspend' || act === 'reject') need(b.reason, 'reason', 'Choose a reason');
    if (act === 'verify' && m.status !== 'pending') throw ERR(409, 'conflict', 'Only pending merchants can be verified', { status: m.status });
    if (act === 'reactivate' && !['suspended', 'rejected', 'inactive'].includes(m.status)) throw ERR(409, 'conflict', 'Merchant is already active', { status: m.status });
    if (m.status === M_ACT[act] && act !== 'reactivate') throw ERR(409, 'conflict', `Merchant already ${M_ACT[act]}`, { status: m.status });
    m.status = M_ACT[act];
    if (act === 'verify' || act === 'reactivate') { m.compliance.status = 'compliant'; m.compliance.certificates.forEach((c) => { if (c.status === 'pending_review') c.status = 'valid'; }); m.branches.forEach((br) => { br.state = 'open'; }); }
    if (act === 'suspend' || act === 'reject') m.branches.forEach((br) => { br.state = 'closed'; });
    m.activity.unshift({ id: nid('A'), at: nowIso(), actor: ME.name, action: 'status_' + m.status, detail: b.reason ? b.reason + (b.note ? ` — ${b.note}` : '') : '' });
    return merchantSummary(m, langOf(req));
  }));

  // ---- Consumers
  on('GET /admin/consumers/summary', () => consumerSummary());
  on('GET /admin/consumers', (req) => {
    const q = req.query || {}, lang = langOf(req);
    let rows = consumers.filter((c) => (!has(q.status) || c.status === q.status) && (!has(q.city) || c.city === q.city) && (!has(q.category) || c.preferences.categories.includes(q.category)) && (!has(q.dietary) || c.preferences.dietary.includes(q.dietary)) && matchQ(q.q, c.id, c.name, c.email, c.phone));
    rows = sortRows(rows, q.sort || '-joinedAt', { joinedAt: (r) => r.joinedAt, ordersCount: (r) => r.ordersCount, rescueScore: (r) => r.rescueScore, name: (r) => r.name.en });
    const p = paginate(rows, q); p.data = p.data.map((c) => consumerOut(c, lang)); p.meta.summary = p.summary = consumerSummary(); return p;
  });
  on('GET /admin/consumers/:id', (req) => consumerOut(find(consumers, req.params.id, 'Consumer'), langOf(req)));
  on('GET /admin/consumers/:id/orders', (req) => { const c = find(consumers, req.params.id, 'Consumer'), lang = langOf(req); return paginate(orders.filter((o) => o.consumerId === c.id).map((o) => orderOut(o, lang)), req.query || {}, 20); });
  on('PATCH /admin/consumers/:id', (req) => {
    const c = find(consumers, req.params.id, 'Consumer'), b = req.body || {};
    if (b.name !== undefined) { const nn = typeof b.name === 'object' ? b.name : { en: b.name, ar: b.name }; need(String(nn.en || '').trim(), 'name', 'Name is required'); c.name = { en: nn.en, ar: nn.ar || nn.en }; }
    if (b.email !== undefined) { need(/^\S+@\S+\.\S+$/.test(b.email), 'email', 'Enter a valid email', 'invalid'); if (consumers.some((x) => x !== c && x.email === b.email)) throw ERR(409, 'conflict', 'Email already in use', { email: 'duplicate' }); c.email = b.email; }
    if (b.phone !== undefined) { need(/^\+?[\d\s]{8,}$/.test(b.phone), 'phone', 'Enter a valid phone number', 'invalid'); c.phone = b.phone; }
    ['city', 'language', 'marketingOptIn'].forEach((k) => { if (b[k] !== undefined) c[k] = b[k]; });
    return consumerOut(c, langOf(req));
  });
  on('POST /admin/consumers/:id/block', (req) => { const c = find(consumers, req.params.id, 'Consumer'), b = req.body || {}; need(b.reason, 'reason', 'Choose a reason'); if (c.status === 'blocked') throw ERR(409, 'conflict', 'Consumer already blocked'); c.status = 'blocked'; c.blockReason = b.reason; c.blockNote = b.note || ''; return consumerOut(c, langOf(req)); });
  on('POST /admin/consumers/:id/unblock', (req) => { const c = find(consumers, req.params.id, 'Consumer'); if (c.status !== 'blocked') throw ERR(409, 'conflict', 'Consumer is not blocked'); c.status = 'active'; c.blockReason = null; return consumerOut(c, langOf(req)); });
  on('DELETE /admin/consumers/:id', (req) => { const i = consumers.findIndex((c) => c.id === req.params.id); if (i < 0) throw ERR(404, 'not_found', 'Consumer not found'); const [c] = consumers.splice(i, 1); return { deleted: true, id: c.id }; });

  // ---- Cases (Issues & Alerts)
  on('GET /admin/cases/summary', () => caseSummary());
  on('GET /admin/cases', (req) => {
    const q = req.query || {}, lang = langOf(req), sev = has(q.severity) ? String(q.severity).split(',') : null;
    let rows = cases.filter((c) => (!has(q.kind) || c.kind === q.kind) && (!sev || sev.includes(c.severity)) && (!has(q.status) || c.status === q.status) && (!has(q.assigneeId) || c.assigneeId === q.assigneeId) && matchQ(q.q, c.id, c.title, c.entity.name));
    rows = sortRows(rows, q.sort || '-createdAt', { createdAt: (r) => r.createdAt, severity: (r) => ({ critical: 4, high: 3, medium: 2, low: 1 }[r.severity]) });
    const p = paginate(rows, q, 20); p.data = p.data.map((c) => caseOut(c, lang)); p.meta.summary = p.summary = caseSummary(); return p;
  });
  on('GET /admin/cases/:id', (req) => caseDetail(find(cases, req.params.id, 'Case'), langOf(req)));
  const caseAct = (c, type, note) => { c.updatedAt = nowIso(); c.activity.push({ id: nid('a'), type, at: nowIso(), by: ME.name, note: note || '' }); };
  on('POST /admin/cases/:id/assign', (req) => { const c = find(cases, req.params.id, 'Case'), b = req.body || {}; need(agent(b.assigneeId), 'assigneeId', 'Choose an assignee'); c.assigneeId = b.assigneeId; if (c.status === 'open') c.status = 'in_progress'; caseAct(c, 'assigned', agent(b.assigneeId).name); return caseDetail(c, langOf(req)); });
  on('POST /admin/cases/:id/resolve', (req) => { const c = find(cases, req.params.id, 'Case'), b = req.body || {}; if (['resolved', 'closed'].includes(c.status)) throw ERR(409, 'conflict', 'Case already resolved'); need(b.resolution, 'resolution', 'Choose a resolution'); c.status = 'resolved'; c.resolution = b.resolution; caseAct(c, 'resolved', b.note || ''); return caseDetail(c, langOf(req)); });
  on('POST /admin/cases/:id/escalate', (req) => { const c = find(cases, req.params.id, 'Case'), b = req.body || {}; if (c.status === 'escalated') throw ERR(409, 'conflict', 'Case already escalated'); need(b.to, 'to', 'Choose a team'); c.status = 'escalated'; if (b.raiseSeverity) c.severity = 'critical'; caseAct(c, 'escalated', b.note || ''); return caseDetail(c, langOf(req)); });
  on('POST /admin/cases/:id/reopen', (req) => { const c = find(cases, req.params.id, 'Case'); c.status = 'open'; caseAct(c, 'reopened', ''); return caseDetail(c, langOf(req)); });
  on('POST /admin/cases/:id/notes', (req) => { const c = find(cases, req.params.id, 'Case'), b = req.body || {}; need(String(b.body || '').trim(), 'body', 'Note cannot be empty'); caseAct(c, 'note', String(b.body).trim()); return caseDetail(c, langOf(req)); });

  // ---- Moderation
  on('GET /admin/moderation/summary', () => modSummary());
  on('GET /admin/moderation', (req) => {
    const q = req.query || {}, lang = langOf(req);
    let rows = moderation.filter((m) => (!has(q.type) || m.type === q.type) && (!has(q.status) || (q.status === 'open' ? ['pending', 'in_review', 'escalated'].includes(m.status) : m.status === q.status)) && (!has(q.severity) || m.severity === q.severity) && matchQ(q.q, m.id, m.item, m.reason));
    rows = sortRows(rows, q.sort || '-createdAt', { createdAt: (r) => r.createdAt });
    const p = paginate(rows, q, 20); p.data = p.data.map((m) => modOut(m, lang)); p.meta.summary = p.summary = modSummary(); return p;
  });
  on('GET /admin/moderation/:id', (req) => modOut(find(moderation, req.params.id, 'Case'), langOf(req)));
  ['approve', 'reject', 'escalate'].forEach((act) => on(`POST /admin/moderation/:id/${act}`, (req) => {
    const m = find(moderation, req.params.id, 'Case'), b = req.body || {};
    if (['approved', 'rejected'].includes(m.status)) throw ERR(409, 'conflict', 'Case already decided', { status: m.status });
    if (act === 'reject') need(b.reason, 'reason', 'Choose a reason');
    if (act === 'escalate') { if (m.status === 'escalated') throw ERR(409, 'conflict', 'Case already escalated'); m.status = 'escalated'; m.assigneeId = m.assigneeId || 'usr_05'; return modOut(m, langOf(req)); }
    m.status = act === 'approve' ? 'approved' : 'rejected'; resolvedToday++;
    m.decision = { outcome: m.status, by: ME.name, at: nowIso(), note: b.note || '', reason: b.reason || null, action: b.action || null };
    return modOut(m, langOf(req));
  }));

  // ---- Support
  on('GET /admin/support/summary', () => supportSummary());
  on('GET /admin/support/agents', (req) => ({ data: AGENTS.map((a) => ({ ...ref(a, langOf(req)), role: a.role })) }));
  on('GET /admin/support/tickets', (req) => {
    const q = req.query || {}, lang = langOf(req);
    let rows = tickets.filter((t) => (!has(q.priority) || t.priority === q.priority) && (!has(q.status) || t.status === q.status) && (!has(q.channel) || t.channel === q.channel) && (!has(q.assigneeId) || (q.assigneeId === 'unassigned' ? !t.assigneeId : t.assigneeId === q.assigneeId)) && matchQ(q.q, t.id, t.subject, t.requester.name));
    rows = sortRows(rows, q.sort || '-createdAt', { createdAt: (r) => r.createdAt, priority: (r) => ({ urgent: 4, high: 3, medium: 2, low: 1 }[r.priority]) });
    const p = paginate(rows, q, 20); p.data = p.data.map((t) => ticketOut(t, lang)); p.meta.summary = p.summary = supportSummary().byPriority; return p;
  });
  on('GET /admin/support/tickets/:id', (req) => { const t = find(tickets, req.params.id, 'Ticket'), lang = langOf(req); return { ...ticketOut(t, lang), messages: t.messages.map((m) => msgOut(m, lang)) }; });
  on('PATCH /admin/support/tickets/:id', (req) => {
    const t = find(tickets, req.params.id, 'Ticket'), b = req.body || {}, lang = langOf(req);
    if (b.assigneeId !== undefined) { if (b.assigneeId) need(agent(b.assigneeId), 'assigneeId', 'Unknown agent', 'invalid'); t.assigneeId = b.assigneeId || null; }
    if (b.status) { need(['open', 'pending', 'in_progress', 'escalated', 'resolved', 'closed'].includes(b.status), 'status', 'Unknown status', 'enum'); t.status = b.status; }
    if (b.priority) { need(['urgent', 'high', 'medium', 'low'].includes(b.priority), 'priority', 'Unknown priority', 'enum'); t.priority = b.priority; }
    return { ...ticketOut(t, lang), messages: t.messages.map((m) => msgOut(m, lang)) };
  });
  on('GET /admin/support/tickets/:id/messages', (req) => { const t = find(tickets, req.params.id, 'Ticket'); return { data: t.messages.map((m) => msgOut(m, langOf(req))) }; });
  on('POST /admin/support/tickets/:id/messages', (req) => {
    const t = find(tickets, req.params.id, 'Ticket'), b = req.body || {}; need(String(b.body || '').trim(), 'body', 'Message cannot be empty');
    const txt = String(b.body).trim();
    const m = { id: `${t.id}-m${t.messages.length + 1}`, at: nowIso(), author: { type: 'agent', name: ME.name }, internal: !!b.internal, body: { en: txt, ar: txt }, attachments: (b.attachments || []).map((a) => (typeof a === 'string' ? { name: a } : a)) };
    t.messages.push(m); t.lastMessageAt = m.at; if (!m.internal && t.status === 'open') t.status = 'in_progress';
    if (!t.assigneeId) t.assigneeId = ME.id;
    return msgOut(m, langOf(req));
  });

  // ---- Meta used by D1 filters/forms
  on('GET /admin/ops/meta', (req) => ({ cities: MKT() ? MKT().all().filter((m) => (req.markets || MKT().enabledCodes()).includes(m.code)).flatMap((m) => m.cities.filter((c) => c.enabled !== false).map((c) => c.id)) : CITIES, markets: MKT() ? MKT().enabledCodes() : ['QA'], categories: CATEGORIES, dietary: DIETARY, agents: AGENTS.map((a) => ({ ...ref(a, langOf(req)), role: a.role })), refundPolicy: refundPolicy() }));

  /* ------------------------------------------------------------------ registration */
  /* (v1.4 FLOW-01) merchant self sign-up creates the same Pending verification record as Admin → Add Merchant */
  S.adminCreateMerchant = (body) => { const out = R['POST /admin/merchants']({ body, query: {}, params: {}, headers: {} }); return merchants.find((m) => m.id === out.id); };
  W.modules['admin-ops'] = { routes: R, data: { drops, pickups, orders, merchants, consumers, cases, moderation, tickets, AGENTS } };
  if (typeof W.register === 'function') W.register('admin-ops', R);
  if (window.api && typeof window.api.mock === 'function') {
    // client.mock() inserts at the front (later wins): register param routes first so static paths
    // like /admin/drops/summary take precedence over /admin/drops/:id.
    const sigs = Object.keys(R).sort((x, y) => (y.split(':').length - x.split(':').length) || (x.length - y.length));
    sigs.forEach((sig) => { const i = sig.indexOf(' '); window.api.mock(sig.slice(0, i), sig.slice(i + 1), R[sig]); });
  }
})();
