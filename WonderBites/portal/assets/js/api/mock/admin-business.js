/* (v1.4 dates) seeded dates rebased onto api.DEMO_TODAY = 2026-11-19 by qa/rebase_dates.py */
/* =====================================================================
   Mock API — Admin business & analytics (owner: D2)
   Mirrors docs/API_CONTRACT.md: Financials, Operations Analytics, Wallet Credit & Vouchers,
   Quality & Safety, Performance, Sustainability & Impact.
   Data is anchored to the demo "today" api.DEMO_TODAY (default range = the 30 days before it).
   Every dashboard number reacts to filters (country/city/category/merchant/branch/fulfillment)
   and to the global date range through a deterministic scale factor.
   ===================================================================== */
(function () {
  'use strict';
  const L = (en, ar) => ({ en, ar });
  const TODAY = api.DEMO_TODAY; // (v1.4) single demo anchor (api/mock/core.js)
  const err = (s, c, m, d) => api.error(s, c, m, d);
  const round = (v, d = 0) => { const p = Math.pow(10, d); return Math.round(v * p) / p; };
  const money = (amount, currency = 'QAR') => ({ amount: round(amount, 2), currency });
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
  const stamp = (iso, hm = '10:00') => `${iso}T${hm}:00Z`;
  /* deterministic pseudo-random from a string seed */
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
  const rnd = (seed) => { let x = Math.floor(hash(seed) * 2147483646) + 1; return () => (x = (x * 48271) % 2147483647) / 2147483647; };
  /** Kpi { key, label, value, format, currency?, delta?, deltaUnit, trend, comparison, caption? } */
  const K = (key, label, value, format, delta, deltaUnit = 'pct', o = {}) => ({
    key, label, value, format, ...(o.currency ? { currency: o.currency } : {}), delta, deltaUnit,
    trend: delta == null ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    comparison: o.comparison === undefined ? (delta === 0 ? 'No change' : 'vs. previous period') : o.comparison,
    ...(o.caption ? { caption: o.caption } : {}), ...(o.sparkline ? { sparkline: o.sparkline } : {}), ...(o.badge ? { badge: o.badge } : {}),
  });

  /* ------------------------------------------------------------------ directory (IDs match D1's merchants/consumers) */
  const MERCHANTS = [
    { id: 'MER-066', code: 'MR-3066', name: L('Fig & Bloom Bakery', 'مخبز فيغ آند بلوم'), category: 'bakery', city: 'doha', country: 'QA', quality: 92, onTime: 95, rating: 4.8, orders: 612 },
    { id: 'MER-071', code: 'MR-3071', name: L('Marina Grill House', 'مارينا جريل هاوس'), category: 'restaurant', city: 'lusail', country: 'QA', quality: 94, onTime: 97, rating: 4.8, orders: 548 },
    { id: 'MER-047', code: 'MR-3047', name: L('Corner Deli Co.', 'كورنر ديلي'), category: 'grocery', city: 'al_wakrah', country: 'QA', quality: 86, onTime: 90, rating: 4.6, orders: 402 },
    { id: 'MER-030', code: 'MR-3030', name: L('Copper Kettle Café', 'مقهى كوبر كيتل'), category: 'cafe', city: 'abu_dhabi', country: 'AE', quality: 74, onTime: 81, rating: 4.3, orders: 238 },
    { id: 'MER-041', code: 'MR-3041', name: L('Sugar & Sage', 'شوجر آند سيج'), category: 'desserts', city: 'dubai', country: 'AE', quality: 68, onTime: 78, rating: 4.2, orders: 356 },
    { id: 'MER-058', code: 'MR-3058', name: L('Green Bowl Kitchen', 'مطبخ جرين بول'), category: 'restaurant', city: 'al_rayyan', country: 'QA', quality: 61, onTime: 71, rating: 4.0, orders: 297 },
    { id: 'MER-094', code: 'MR-3094', name: L('Sunrise Bakehouse', 'مخبز صن رايز'), category: 'bakery', city: 'doha', country: 'QA', quality: 52, onTime: 66, rating: 3.9, orders: 188 },
    { id: 'MER-051', code: 'MR-3051', name: L('Harvest & Co.', 'هارفست آند كو'), category: 'grocery', city: 'al_wakrah', country: 'QA', quality: 45, onTime: 58, rating: 3.7, orders: 121 },
    { id: 'MER-036', code: 'MR-3036', name: L('Fresh Fig Co.', 'فريش فيغ'), category: 'grocery', city: 'doha', country: 'QA', quality: 88, onTime: 92, rating: 4.6, orders: 164 },
    { id: 'MER-079', code: 'MR-3079', name: L('Olive Grove Café', 'مقهى أوليف جروف'), category: 'cafe', city: 'doha', country: 'QA', quality: 81, onTime: 86, rating: 4.4, orders: 142 },
  ];
  const BRANCH_NAMES = [L('West Bay Branch', 'فرع الخليج الغربي'), L('The Pearl Branch', 'فرع اللؤلؤة'), L('Msheireb Branch', 'فرع مشيرب'), L('Al Sadd Branch', 'فرع السد'), L('West Bay Branch', 'فرع الخليج الغربي')];
  MERCHANTS.forEach((m, i) => { m.branches = Array.from({ length: 1 + (i % 3) }, (_, b) => ({ id: `${m.id}-B${b + 1}`, name: m.city === 'doha' ? BRANCH_NAMES[4] : BRANCH_NAMES[(i + b) % 4] })); });
  const merchant = (id) => MERCHANTS.find((m) => m.id === id);
  const ref = (m) => ({ id: m.id, name: m.name });
  /* (v1.3) markets: currencies/cities from the registry (core mock); dashboards are computed in the base currency (QAR)
     over the merchants of the requested market(s) and converted by the lens below (single market → its currency,
     several currencies → the reporting currency). Ledger tables keep each row in its own currency. */
  const MKT = () => api.markets;
  const curOf = (m) => (m && MKT() ? MKT().currencyOf(m.country) : 'QAR');
  const inScope = (m) => { const sc = api.scope && api.scope(); return !sc || sc.includes(m.country); };
  const scopeCities = () => MKT().all().filter((m) => ((api.scope && api.scope()) || MKT().enabledCodes()).includes(m.code)).flatMap((m) => m.cities.filter((c) => c.enabled !== false));
  const CITY = new Proxy({}, {
    get: (_, k) => { if (typeof k !== 'string') return undefined; for (const m of MKT().all()) { const c = m.cities.find((x) => x.id === k); if (c) return c.name; } return L(k, k); },
    ownKeys: () => scopeCities().map((c) => c.id),
    getOwnPropertyDescriptor: (_, k) => ({ enumerable: true, configurable: true }),
  });
  const target = () => { const sc = (api.scope && api.scope()) || ['QA']; const curs = [...new Set(sc.map((c) => MKT().currencyOf(c)))]; return curs.length === 1 ? curs[0] : MKT().fx().reportingCurrency; };
  const CATEGORIES = ['bakery', 'restaurant', 'grocery', 'cafe', 'desserts', 'meals'];
  const PEOPLE = [
    ['CON-1201', L('Saeed Al Mazrouei', 'سعيد المزروعي')], ['CON-1202', L('Noora Al Kaabi', 'نورة الكعبي')], ['CON-1203', L('Hamdan Al Falasi', 'حمدان الفلاسي')],
    ['CON-1204', L('Mariam Al Nuaimi', 'مريم النعيمي')], ['CON-48291', L('Aisha Al Mansoori', 'عائشة المنصوري')], ['CON-1206', L('Yusuf Al Amiri', 'يوسف العامري')],
    ['CON-1207', L('Khalid Rahman', 'خالد رحمن')], ['CON-1208', L('Layla Hassan', 'ليلى حسن')], ['CON-1209', L('Omar Al Suwaidi', 'عمر السويدي')],
    ['CON-1210', L('Fatima Al Zaabi', 'فاطمة الزعابي')], ['CON-1211', L('Rashid Al Ketbi', 'راشد الكتبي')], ['CON-1212', L('Hessa Al Shamsi', 'حصة الشامسي')],
  ].map(([id, name]) => ({ id, name }));
  const person = (id) => PEOPLE.find((p) => p.id === id);
  const ME = { id: 'usr_01', name: 'Sarah Al Manasoori' };
  const ADMINS = [ME, { id: 'usr_05', name: 'Omar Haddad' }, { id: 'usr_07', name: 'Lina Saeed' }];

  /* ------------------------------------------------------------------ filter scaling */
  /** 0.2–1 share of the platform for the current filters, × date-range length (30 days = 1). */
  function scope(q = {}) {
    let list = MERCHANTS.filter(inScope);
    if (q.country && q.country !== 'all') list = list.filter((m) => m.country === q.country);
    if (q.city && q.city !== 'all') list = list.filter((m) => m.city === q.city);
    if (q.category && q.category !== 'all') list = list.filter((m) => m.category === q.category);
    if (q.merchantId && q.merchantId !== 'all') list = list.filter((m) => m.id === q.merchantId);
    const total = MERCHANTS.reduce((s, m) => s + m.orders, 0);
    let share = list.reduce((s, m) => s + m.orders, 0) / total;
    if (q.branchId && q.branchId !== 'all') { const m = MERCHANTS.find((x) => x.branches.some((b) => b.id === q.branchId)); share *= m ? 1 / m.branches.length : 0; }
    if (q.fulfillment === 'pickup') share *= 0.78; else if (q.fulfillment === 'delivery') share *= 0.22;
    let days = 30; if (q.from && q.to) days = Math.max(1, daysBetween(String(q.from).slice(0, 10), String(q.to).slice(0, 10)));
    const cur = 'QAR'; // base currency of the seed figures (converted to the market / reporting currency by the lens)
    /* a small, stable wobble so different filter combinations don't look like plain multiples */
    const wob = 0.94 + hash(JSON.stringify([q.country, q.city, q.category, q.merchantId, q.branchId, q.fulfillment])) * 0.12;
    return { list, share, f: share * (days / 30), days, cur, wob, empty: share === 0 };
  }
  const PERIOD_F = { this_period: 1, last_period: 0.84, this_month: 0.66, this_week: 0.24, '7d': 0.24, '30d': 1, '3m': 2.7, '6m': 5.1 };
  const pf = (p) => PERIOD_F[p] || 1;

  /* ================================================================== FINANCIALS */
  /* (v1.4) commission = GMV × the effective platform rate (Admin → Settings → General → Commercial, default 19 %) */
  const WS = window.WBStore; const RATE = () => (WS ? WS.commercial.defaultCommissionRate : 19) / 100;
  function finKpis(s) {
    const f = s.f, c = s.cur, w = s.wob;
    const gmv = 211540 * f * w, commission = gmv * RATE(), subs = 1842 * f, wbRev = commission + subs;
    return [
      K('gmv', 'GMV', round(gmv), 'money', 18.6, 'pct', { currency: c }),
      K('wbRevenue', 'WonderBites Revenue', round(wbRev), 'money', 19.3, 'pct', { currency: c }),
      K('commissionRevenue', 'Commission Revenue', round(commission), 'money', 18.7, 'pct', { currency: c, rate: Math.round(RATE() * 1000) / 10 }),
      K('pendingPayouts', 'Pending Merchant Payouts', round(38210 * f * w), 'money', 0, 'pct', { currency: c }),
      K('refundValue', 'Refund Value', round(420 * f), 'money', -7.8, 'pct', { currency: c }),
      K('contributionMargin', 'Contribution Margin', round(58.9 * (0.98 + w * 0.02), 1), 'percent', 4.1, 'pp'),
      K('netRevenue', 'Net Revenue', round(wbRev - 2280 * f * w - 420 * f), 'money', 19.1, 'pct', { currency: c }),
      K('processingFees', 'Payment Processing Fees', round(2280 * f * w), 'money', 11.4, 'pct', { currency: c }),
      K('creditsLiability', 'Voucher / Credits Liability', round(6412 * f), 'money', 12.2, 'pct', { currency: c }),
      K('subscriptionRevenue', 'Subscription Revenue', round(1842 * f), 'money', 15.6, 'pct', { currency: c }),
      K('revenuePerOrder', 'Revenue per Order', round(3.09 * w, 2), 'money', 6.7, 'pct', { currency: c }),
      K('revenuePerBox', 'Revenue per Box', round(2.23 * w, 2), 'money', 6.2, 'pct', { currency: c }),
    ];
  }
  function revenueSnapshot(s, period = 'this_period') {
    const k = pf(period), f = s.f * k, c = s.cur, w = s.wob, d = period === 'last_period' ? 0.8 : 1;
    const comm = 211540 * f * w * RATE(), subsV = 1842 * f, other = 60 * f, net = round(comm + subsV + other);
    return {
      period,
      metrics: [
        K('grossRevenue', 'Gross Revenue', round(211540 * f * w), 'money', round(18.6 * d, 1), 'pct', { currency: c }),
        K('netRevenue', 'Net Revenue', net, 'money', round(19.1 * d, 1), 'pct', { currency: c }),
        K('contributionMargin', 'Contribution Margin', round(58.9 - (1 - d) * 6, 1), 'percent', round(4.1 * d, 1), 'pp'),
        K('netMargin', 'Net Margin', round(9.0 - (1 - d) * 3, 1), 'percent', round(1.3 * d, 1), 'pp'),
      ],
      composition: [
        { key: 'commission', label: 'Commission', value: round(comm), share: round(100 * comm / net, 1) },
        { key: 'subscriptions', label: 'Subscriptions', value: round(subsV), share: round(100 * subsV / net, 1) },
        { key: 'other', label: 'Other', value: round(other), share: round(100 - round(100 * comm / net, 1) - round(100 * subsV / net, 1), 1) },
      ],
      centerValue: money(net, c),
    };
  }
  function dailyLabels(q, n) { const to = (q.to && String(q.to).slice(0, 10)) || TODAY; return Array.from({ length: n }, (_, i) => addDays(to, i - n + 1)); }
  function gmvTrend(s, q) {
    const n = Math.min(Math.max(s.days, 7), 31); const r = rnd('gmv' + s.wob); const labels = dailyLabels(q, n);
    const weekly = q.granularity === 'weekly';
    let a = 0, b = 0; const cur = [], prev = [];
    const total = 211540 * s.f * s.wob, ptotal = 178450 * s.f * s.wob;
    const ws = labels.map((_, i) => 0.7 + r() * 0.6 + i * 0.01); const sw = ws.reduce((x, y) => x + y, 0);
    const ps = labels.map((_, i) => 0.75 + r() * 0.5); const sp = ps.reduce((x, y) => x + y, 0);
    labels.forEach((x, i) => { a += (total * ws[i]) / sw; b += (ptotal * ps[i]) / sp; cur.push({ x, y: round(a) }); prev.push({ x, y: round(b) }); });
    const pick = (pts) => (weekly ? pts.filter((_, i) => (n - 1 - i) % 7 === 0) : pts);
    return {
      granularity: weekly ? 'weekly' : 'daily',
      series: [{ key: 'current', label: 'This Period ({c})', kind: 'area', unit: 'money', points: pick(cur) }, { key: 'previous', label: 'Previous Period ({c})', kind: 'line', unit: 'money', points: pick(prev) }],
      totals: [K('current', 'This Period', round(total), 'money', 18.6, 'pct', { currency: s.cur }), K('previous', 'Previous Period', round(ptotal), 'money', null, 'pct', { currency: s.cur, comparison: '' })],
      currency: s.cur,
    };
  }
  function revenueTrend(s, q) {
    const n = Math.min(Math.max(s.days, 7), 31); const r = rnd('rev' + s.wob); const labels = dailyLabels(q, n);
    const weekly = q.granularity === 'weekly';
    const base = (21400 / 30) * s.f * 30 / Math.max(1, s.days) * s.wob; // daily run-rate × 30 → monthly run-rate
    const rev = labels.map((x, i) => ({ x, y: round(base * (1.05 - i * 0.004 + (r() - 0.5) * 0.22)) }));
    const net = labels.map((x, i) => ({ x, y: round(base * (0.86 + i * 0.006 + (r() - 0.5) * 0.18)) }));
    const pick = (pts) => (weekly ? pts.filter((_, i) => (n - 1 - i) % 7 === 0) : pts);
    return {
      granularity: weekly ? 'weekly' : 'daily',
      series: [{ key: 'revenue', label: 'Revenue ({c})', kind: 'line', unit: 'money', points: pick(rev) }, { key: 'netRevenue', label: 'Net Revenue ({c})', kind: 'line', unit: 'money', points: pick(net) }],
      totals: [K('revenue', 'Revenue', round(21400 * s.f * s.wob), 'money', 18.4, 'pct', { currency: s.cur }), K('netRevenue', 'Net Revenue', round(19120 * s.f * s.wob), 'money', 19.1, 'pct', { currency: s.cur })],
      currency: s.cur,
    };
  }
  function payoutsKpis(s, period) {
    const f = s.f * pf(period) * s.wob, c = s.cur;
    return [
      K('merchantGrossEarnings', 'Merchant Gross Earnings', round(173330 * f), 'money', 17.6, 'pct', { currency: c }),
      K('amountPaid', 'Amount Paid', round(135120 * f), 'money', 16.8, 'pct', { currency: c }),
      K('pendingPayout', 'Pending Payout', round(38210 * f), 'money', 0, 'pct', { currency: c }),
      K('failedHeld', 'Failed / Held Payouts', round(1120 * f), 'money', -12.3, 'pct', { currency: c }),
      K('avgSettlementDays', 'Average Settlement Time', 2.4, 'days', -0.6, 'days'),
    ];
  }
  function refundsKpis(s, period) {
    const f = s.f * pf(period), c = s.cur;
    return [
      K('refundAmount', 'Refund Amount', round(420 * f), 'money', -7.8, 'pct', { currency: c }),
      K('refundRate', 'Refund Rate', 0.2, 'percent', -0.07, 'pp'),
      K('cancellationValue', 'Cancellation Value', round(320 * f), 'money', -8.4, 'pct', { currency: c }),
      K('creditsIssued', 'Credits Issued', round(1842 * f), 'money', 11.6, 'pct', { currency: c }),
      K('chargebacks', 'Chargebacks', round(160 * f), 'money', -5.9, 'pct', { currency: c }),
    ];
  }
  const MONTHS_ALL = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
  function monthlyTrends(s, months = 6) {
    const m = MONTHS_ALL.slice(-Math.min(12, Math.max(3, +months || 6)));
    const g = (i) => (98000 + i * 10200) * s.share * s.wob;
    const off = MONTHS_ALL.length - m.length;
    return [
      { key: 'gmv', label: 'GMV ({c})', kind: 'bar', unit: 'money', points: m.map((x, i) => ({ x, y: round(g(i + off)) })) },
      { key: 'netRevenue', label: 'Net Revenue ({c})', kind: 'bar', unit: 'money', points: m.map((x, i) => ({ x, y: round(g(i + off) * (RATE() + 0.009)) })) },
      { key: 'commissionRevenue', label: 'Commission Revenue ({c})', kind: 'bar', unit: 'money', points: m.map((x, i) => ({ x, y: round(g(i + off) * RATE()) })) },
    ];
  }
  function unitEconomics(s) {
    const c = s.cur, w = s.wob;
    return { metrics: [
      K('revenuePerOrder', 'Revenue / Order', round((14.6 * RATE() + 0.31) * w, 2), 'money', 6.7, 'pct', { currency: c }),
      K('revenuePerBox', 'Revenue / Box', round(2.23 * w, 2), 'money', 6.2, 'pct', { currency: c }),
      K('commissionPerOrder', 'Commission / Order', round(14.6 * RATE() * w, 2), 'money', 6.9, 'pct', { currency: c }),
      K('paymentFeePerOrder', 'Payment Fee / Order', round(0.37 * w, 2), 'money', 4.9, 'pct', { currency: c }),
      K('contributionPerOrder', 'Contribution / Order', round(1.82 * w, 2), 'money', 7.1, 'pct', { currency: c }),
      K('contributionMargin', 'Contribution Margin', 58.9, 'percent', 4.1, 'pp'),
      K('refundRate', 'Refund Rate', 0.2, 'percent', -0.07, 'pp'),
      K('chargebackRate', 'Chargeback Rate', 0.08, 'percent', -0.03, 'pp'),
    ] };
  }
  const finScope = (q) => { const s = scope(q); if (s.empty) throw err(404, 'not_found', 'No data for the selected filters'); return s; };
  const withCur = (obj) => JSON.parse(JSON.stringify(obj).replace(/\(\{c\}\)/g, `(${target()})`));

  api.mock('GET', '/admin/financials/filter-options', ({ markets: sc }) => ({
    countries: MKT().all().filter((m) => (sc || MKT().enabledCodes()).includes(m.code)).map((m) => ({ value: m.code, label: m.name })),
    cities: MKT().all().filter((m) => (sc || MKT().enabledCodes()).includes(m.code)).flatMap((m) => m.cities.filter((c) => c.enabled !== false).map((c) => ({ value: c.id, label: c.name, country: m.code }))),
    categories: CATEGORIES.map((k) => ({ value: k })),
    merchants: MERCHANTS.filter(inScope).map((m) => ({ value: m.id, label: m.name, country: m.country, city: m.city, category: m.category, branches: m.branches.map((b) => ({ value: b.id, label: b.name })) })),
    orderTypes: [{ value: 'pickup' }, { value: 'delivery' }],
  }));
  api.mock('GET', '/admin/financials/summary', ({ query }) => {
    const s = scope(query);
    if (s.empty) return { kpis: [], empty: true };
    return withCur({
      kpis: finKpis(s), revenueSnapshot: revenueSnapshot(s, 'this_period'), gmvTrend: gmvTrend(s, query), revenueTrend: revenueTrend(s, query),
      payoutsSettlements: payoutsKpis(s, 'this_period'), refundsAdjustments: refundsKpis(s, 'this_period'), monthlyTrends: monthlyTrends(s, 6), unitEconomics: unitEconomics(s), currency: s.cur,
    }, s.cur);
  });
  api.mock('GET', '/admin/financials/revenue-snapshot', ({ query }) => { const s = finScope(query); return revenueSnapshot(s, query.period); });
  api.mock('GET', '/admin/financials/gmv-trend', ({ query }) => { const s = finScope(query); return withCur(gmvTrend(s, query), s.cur); });
  api.mock('GET', '/admin/financials/revenue-trend', ({ query }) => { const s = finScope(query); return withCur(revenueTrend(s, query), s.cur); });
  api.mock('GET', '/admin/financials/monthly-trends', ({ query }) => { const s = finScope(query); return withCur(monthlyTrends(s, query.months), s.cur); });
  api.mock('GET', '/admin/financials/unit-economics', ({ query }) => unitEconomics(finScope(query)));
  /* section KPI lists with their own period selector (contract: dashboard property payoutsSettlements / refundsAdjustments) */
  api.mock('GET', '/admin/financials/payouts-settlements', ({ query }) => payoutsKpis(finScope(query), query.period));
  api.mock('GET', '/admin/financials/refunds-adjustments', ({ query }) => refundsKpis(finScope(query), query.period));

  /* ---------------- payouts ledger ---------------- */
  const PO_STATUS = ['paid', 'paid', 'scheduled', 'processing', 'paid', 'failed', 'pending', 'on_hold', 'paid', 'scheduled', 'paid', 'paid', 'processing', 'paid'];
  const PO_PERIODS = [['2026-10-23', '2026-10-29'], ['2026-10-30', '2026-11-05'], ['2026-11-06', '2026-11-12'], ['2026-11-13', '2026-11-19']];
  const payoutSeed = [];
  MERCHANTS.forEach((m, i) => {
    /* (v1.4 FLOW-12) Fig & Bloom's statements come from its completed orders in the shared store (same as Merchant Analytics) */
    if (WS && m.id === 'MER-066') {
      WS.payouts(m.id).forEach((po) => payoutSeed.push({ id: po.id, merchant: ref(m), merchantId: m.id, periodFrom: po.periodStart, periodTo: po.periodEnd, orders: po.orders, commissionRate: po.rate,
        gross: po.gross, commission: po.commission, fees: money(0, po.gross.currency), refunds: po.refunds, adjustments: money(0, po.gross.currency), net: po.net, status: po.status === 'pending' ? 'scheduled' : 'paid',
        scheduledAt: po.status === 'pending' ? stamp(po.scheduledFor, '06:00') : null, paidAt: po.paidAt, reference: po.status === 'paid' ? `STL-${po.id.slice(-6)}` : null, failureReason: null, sortNet: po.net.amount, source: 'orders' }));
      return;
    }
    const per = i % 2 ? [2, 3] : [1, 3];
    per.forEach((p, j) => {
      const k = payoutSeed.length; const st = PO_STATUS[k % PO_STATUS.length]; const r = rnd('po' + k);
      const cur = curOf(m); const [from, to] = PO_PERIODS[p]; const rate = WS ? WS.rateFor(m.id, to) : 19;
      const gross = round(m.orders * 3.4 * (0.8 + r() * 0.5)), commission = round(gross * rate / 100, 2), fees = round(gross * 0.021), refunds = round(r() * 40), adj = j ? 0 : round(r() * 12);
      payoutSeed.push({
        id: `PO-${5600 + k}`, merchant: ref(m), merchantId: m.id, periodFrom: from, periodTo: to, commissionRate: rate,
        gross: money(gross, cur), commission: money(commission, cur), fees: money(fees, cur), refunds: money(refunds, cur), adjustments: money(adj, cur),
        net: money(gross - commission - fees - refunds - adj, cur), status: st,
        scheduledAt: ['scheduled', 'pending', 'processing'].includes(st) ? stamp(addDays(to, 3), '06:00') : null,
        paidAt: st === 'paid' ? stamp(addDays(to, 2), '07:30') : null,
        reference: st === 'paid' ? `STL-${88120 + k * 7}` : null,
        failureReason: st === 'failed' ? 'IBAN rejected by receiving bank' : st === 'on_hold' ? 'Compliance review in progress' : null,
        sortNet: gross - commission - fees - refunds - adj,
      });
    });
  });
  payoutSeed.forEach((r) => { const m = merchant(r.merchantId || r.id || (r.merchant && r.merchant.id)); if (m) r.market = m.country; });
  const payouts = api.db.table('d2_payouts', payoutSeed, { searchable: ['id', 'merchantId', 'reference', '_mname'] });
  payouts.all().forEach((p) => (p._mname = p.merchant.name.en + ' ' + p.merchant.name.ar));
  const payoutActivity = {};
  function payoutDetail(p) {
    const days = daysBetween(p.periodFrom, p.periodTo) + 1; const r = rnd(p.id); const c = p.gross.currency;
    const w = Array.from({ length: days }, () => 0.6 + r() * 0.8); const sw = w.reduce((a, b) => a + b, 0);
    if (p.source === 'orders' && WS) { const lines = Array.from({ length: days }, (_, i) => { const d = addDays(p.periodFrom, i); const e = WS.earnings(p.merchantId, d, d); return { date: d, orders: e.orders, gross: e.gross, commission: e.commission, net: e.net }; });
      const act = payoutActivity[p.id] || (payoutActivity[p.id] = [{ id: p.id + '-a1', action: 'created', label: 'Payout created for settlement period', actor: { id: 'system', name: 'System' }, at: stamp(addDays(p.periodTo, 1), '00:05') }, ...(p.status === 'paid' ? [{ id: p.id + '-a2', action: 'paid', label: 'Transferred to merchant bank account', actor: { id: 'system', name: 'System' }, at: p.paidAt }] : [])]);
      return { payout: p, lines, activity: act.slice().sort((a, b) => (a.at < b.at ? 1 : -1)) }; }
    const rate = (p.commissionRate || 19) / 100;
    const lines = w.map((x, i) => { const g = round((p.gross.amount * x) / sw, 2); const cm = round(g * rate, 2); return { date: addDays(p.periodFrom, i), orders: Math.max(1, Math.round((g / 3.4))), gross: money(g, c), commission: money(cm, c), net: money(g - cm, c) }; });
    const act = payoutActivity[p.id] || (payoutActivity[p.id] = [
      { id: p.id + '-a1', action: 'created', label: 'Payout created for settlement period', actor: { id: 'system', name: 'System' }, at: stamp(addDays(p.periodTo, 1), '00:05') },
      ...(p.status === 'paid' ? [{ id: p.id + '-a2', action: 'paid', label: 'Transferred to merchant bank account', actor: { id: 'system', name: 'System' }, at: p.paidAt }] : []),
      ...(p.status === 'failed' ? [{ id: p.id + '-a2', action: 'failed', label: 'Transfer failed: IBAN rejected by receiving bank', actor: { id: 'system', name: 'System' }, at: stamp(addDays(p.periodTo, 3), '06:12') }] : []),
      ...(p.status === 'on_hold' ? [{ id: p.id + '-a2', action: 'hold', label: 'Placed on hold: compliance review in progress', actor: ADMINS[1], at: stamp(addDays(p.periodTo, 1), '09:40') }] : []),
    ]);
    return { payout: p, lines, activity: act.slice().sort((a, b) => (a.at < b.at ? 1 : -1)) };
  }
  const PO_SUM = (rows) => {
    const by = (st) => rows.filter((r) => st.includes(r.status)).reduce((s, r) => s + r.net.amount, 0);
    return { merchantGrossEarnings: money(rows.reduce((s, r) => s + r.gross.amount, 0)), amountPaid: money(by(['paid'])), pendingPayout: money(by(['scheduled', 'pending', 'processing'])), failedHeld: money(by(['failed', 'on_hold'])), avgSettlementDays: 2.4 };
  };
  /* statements computed from the shared store stay in sync with later orders / refunds / commission changes */
  const syncStorePayouts = () => { if (WS) WS.payouts('MER-066').forEach((po) => { const r = payouts.get(po.id); if (r) Object.assign(r, { gross: po.gross, commission: po.commission, refunds: po.refunds, net: po.net, orders: po.orders, commissionRate: po.rate, sortNet: po.net.amount }); }); };
  api.mock('GET', '/admin/financials/payouts', ({ query }) => {
    syncStorePayouts();
    const { from, to, ...q } = query; if (q.sort === 'net' || q.sort === '-net') q.sort = q.sort.replace('net', 'sortNet');
    return payouts.list(q, { summary: (all, rows) => PO_SUM(rows) });
  });
  api.mock('GET', '/admin/financials/payouts/:id', ({ params }) => { syncStorePayouts(); const p = payouts.get(params.id); if (!p) api.notFound('Payout'); return payoutDetail(p); });
  const poAct = (action, allowed, next, label) => ({ params, body }) => {
    const p = payouts.get(params.id); if (!p) api.notFound('Payout');
    if (!allowed.includes(p.status)) throw err(409, 'conflict', 'This payout can’t be changed in its current status.');
    const patch = { status: next }; if (next === 'processing') patch.scheduledAt = new Date(api.demoNow()).toISOString(); if (next === 'on_hold') patch.failureReason = (body && body.reason) || 'Held by admin'; if (next !== 'on_hold' && next !== 'failed') patch.failureReason = null;
    payouts.update(p.id, patch); payoutDetail(p);
    payoutActivity[p.id].push({ id: p.id + '-' + Date.now(), action, label: label + ((body && body.reason) ? ': ' + body.reason : ''), actor: ME, at: new Date(api.demoNow()).toISOString(), meta: { note: body && body.reason } });
    return p;
  };
  api.mock('POST', '/admin/financials/payouts/:id/process', poAct('process', ['scheduled', 'pending', 'on_hold'], 'processing', 'Processed manually'));
  api.mock('POST', '/admin/financials/payouts/:id/hold', poAct('hold', ['scheduled', 'pending', 'processing'], 'on_hold', 'Placed on hold'));
  api.mock('POST', '/admin/financials/payouts/:id/retry', poAct('retry', ['failed'], 'processing', 'Retry requested'));

  /* ---------------- refunds ledger ---------------- */
  const REASONS = ['store_closed', 'box_unavailable', 'serious_food_concern', 'app_payment_issue', 'missed_collection', 'late_cancellation', 'change_of_mind', 'wrong_location'];
  const RF_ST = ['requested', 'processed', 'approved', 'requested', 'rejected', 'processed', 'failed', 'processed', 'requested', 'approved', 'processed', 'rejected'];
  const refundSeed = RF_ST.map((st, i) => {
    const m = MERCHANTS[(i * 3) % MERCHANTS.length]; const c = PEOPLE[(i * 5) % PEOPLE.length]; const reason = REASONS[i % REASONS.length];
    const amt = [18, 24, 12, 30, 15, 22, 9, 26, 14, 19, 35, 11][i];
    return {
      id: `RF-${7720 + i}`, order: { id: `MO-${5210 - i * 13}`, name: `MO-${5210 - i * 13}` }, consumer: c, merchant: ref(m), merchantId: m.id,
      amount: money(amt, curOf(m)), sortAmount: amt, reason, outcome: ['serious_food_concern', 'store_closed', 'box_unavailable'].includes(reason) ? 'full_refund' : reason === 'late_cancellation' ? 'partial_refund' : reason === 'change_of_mind' ? 'wallet_credit' : 'manual_review',
      destination: reason === 'change_of_mind' ? 'wallet_credit' : 'original_payment', status: st,
      requestedAt: stamp(addDays(TODAY, -i - 1), `${10 + (i % 8)}:${String((i * 7) % 60).padStart(2, '0')}`),
      processedAt: ['processed', 'approved', 'rejected'].includes(st) ? stamp(addDays(TODAY, -i), '09:00') : null,
      processedBy: ['processed', 'approved', 'rejected'].includes(st) ? ADMINS[i % 3] : null, _s: m.name.en + ' ' + m.name.ar + ' ' + c.name.en + ' ' + c.name.ar,
    };
  });
  refundSeed.forEach((r) => { const m = merchant(r.merchantId || r.id || (r.merchant && r.merchant.id)); if (m) r.market = m.country; });
  const refunds = api.db.table('d2_refunds', refundSeed, { searchable: ['id', '_s', '_oid'] });
  refunds.all().forEach((r) => (r._oid = r.order.id));
  api.mock('GET', '/admin/financials/refunds', ({ query }) => {
    const { from, to, ...q } = query; if (q.sort === 'amount' || q.sort === '-amount') q.sort = q.sort.replace('amount', 'sortAmount');
    return refunds.list(q, { summary: (all, rows) => ({ refundAmount: money(rows.filter((r) => ['processed', 'approved'].includes(r.status)).reduce((s, r) => s + r.amount.amount, 0)), refundRate: 0.2, cancellationValue: money(320), creditsIssued: money(1842), chargebacks: money(160) }) });
  });
  const rfAct = (next) => ({ params, body }) => {
    const r = refunds.get(params.id); if (!r) api.notFound('Refund');
    if (r.status !== 'requested') throw err(409, 'conflict', 'Only requested refunds can be reviewed.');
    if (next === 'rejected' && !(body && body.reason)) throw err(422, 'validation_error', 'Add a reason for rejecting this refund.', { reason: 'required' });
    return refunds.update(r.id, { status: next, processedAt: new Date(api.demoNow()).toISOString(), processedBy: ME, note: body && body.reason });
  };
  api.mock('POST', '/admin/financials/refunds/:id/approve', rfAct('approved'));
  api.mock('POST', '/admin/financials/refunds/:id/reject', rfAct('rejected'));

  /* ================================================================== OPERATIONS ANALYTICS */
  function opsData(q = {}) {
    const s = scope(q); const f = s.f, w = s.wob; const n = (v) => Math.max(0, Math.round(v * f * w));
    const days = Math.min(Math.max(s.days, 7), 31); const labels = dailyLabels(q, days); const r = rnd('ops' + w);
    const orders = labels.map(() => Math.round((11842 / 30) * s.share * w * (0.55 + r() * 0.9)));
    const picked = orders.map((o) => Math.round(o * (0.93 + r() * 0.06)));
    const rate = orders.map((o, i) => round((picked[i] / o) * 100 + 1.2, 1));
    const weekly = q.granularity === 'weekly';
    const group = (arr, sum = true) => { if (!weekly) return arr; const out = []; for (let i = 0; i < arr.length; i += 7) { const ch = arr.slice(i, i + 7); out.push(sum ? ch.reduce((a, b) => a + b, 0) : round(ch.reduce((a, b) => a + b, 0) / ch.length, 1)); } return out; };
    const lab = weekly ? labels.filter((_, i) => i % 7 === 0) : labels;
    const pts = (arr) => group(arr, arr !== rate).map((y, i) => ({ x: lab[i], y }));
    const accLabels = dailyLabels(q, 31); const ra = rnd('acc' + w);
    const acc = accLabels.map((x, i) => ({ x, y: round(Math.min(99.4, 93.4 + i * 0.1 + (ra() - 0.5) * 0.9), 1) }));
    const p = pf(q.period);
    return {
      kpis: [
        K('fulfilmentRate', 'Fulfilment Rate', 98.0, 'percent', 2.1, 'pp'), K('pickupCompletionRate', 'Pickup Completion Rate', 96.2, 'percent', 1.8, 'pp'),
        K('dropAccuracy', 'Drop Accuracy', 96.4, 'percent', 1.2, 'pp'), K('merchantCancellationRate', 'Merchant Cancellation Rate', 0.9, 'percent', -0.4, 'pp'),
        K('noShowRate', 'No-Show Rate', 1.8, 'percent', -0.3, 'pp'), K('openCriticalIssues', 'Open Critical Issues', Math.max(0, Math.round(10 * s.share * 1.6)), 'number', -2, 'abs'),
        K('ordersAtRisk', 'Orders at Risk', n(24), 'number', 8, 'abs'), K('customerCancellationRate', 'Customer Cancellation Rate', 2.1, 'percent', -0.6, 'pp'),
        K('refundRate', 'Refund Rate', 0.7, 'percent', -0.2, 'pp'), K('verificationSuccess', 'Average Pickup Verification Success', 92.4, 'percent', 2.5, 'pp'),
        K('merchantActivationRate', 'Merchant Activation Rate', 68.5, 'percent', 3.7, 'pp'), K('platformUptime', 'Platform Uptime', 99.8, 'percent', 0.2, 'pp'),
      ],
      operationalTrends: {
        granularity: weekly ? 'weekly' : 'daily',
        series: [{ key: 'orders', label: 'Orders', kind: 'bar', unit: 'number', points: pts(orders) }, { key: 'pickupsCompleted', label: 'Pickups Completed', kind: 'bar', unit: 'number', points: pts(picked) }, { key: 'fulfilmentRate', label: 'Fulfilment Rate (%)', kind: 'line', unit: 'percent', points: pts(rate) }],
        totals: [K('orders', 'Orders', orders.reduce((a, b) => a + b, 0), 'number', 12.6), K('pickupsCompleted', 'Pickups Completed', picked.reduce((a, b) => a + b, 0), 'number', 12.4), K('fulfilmentRate', 'Fulfilment Rate', 98.0, 'percent', 2.1, 'pp')],
      },
      fulfilmentFunnel: { period: q.period || 'this_period', steps: [{ key: 'reserved', label: 'Reserved', value: n(12480 * p), rate: 100 }, { key: 'pickedUp', label: 'Picked Up', value: n(11359 * p), rate: 91.0 }, { key: 'rated', label: 'Rated', value: n(8214 * p), rate: 65.8 }], conversionLabel: 'Conversion (Reserved → Rated)', conversion: 65.8, delta: 2.3 },
      marketplaceHealth: [
        K('activeMerchants', 'Active Merchants', Math.round(184 * s.share * 1.4 * w), 'number', 4, 'abs'), K('merchantsListingToday', 'Merchants Listing Today', Math.round(126 * s.share * 1.4 * w), 'number', 12, 'abs'),
        K('activeConsumers', 'Active Consumers', n(742 * p), 'number', 14, 'abs'), K('liveDrops', 'Live Drops', n(428 * p), 'number', 18, 'abs'),
        K('sellThroughRate', 'Sell-through Rate', 87.6, 'percent', 2.4, 'pp'), K('averageRating', 'Average Rating', 4.7, 'rating', 0.2, 'abs'),
      ],
      pickupCancellationHealth: [
        K('pickupCompletion', 'Pickup Completion', 96.2, 'percent', 1.8, 'pp'), K('merchantCancellations', 'Merchant Cancellations', 0.9, 'percent', -0.4, 'pp'),
        K('customerCancellations', 'Customer Cancellations', 2.1, 'percent', -0.6, 'pp'), K('noShows', 'No-Shows', 1.8, 'percent', -0.3, 'pp'),
        K('refundRate', 'Refund Rate', 0.7, 'percent', -0.2, 'pp'), K('ordersAtRisk', 'Orders at Risk', n(24 * p), 'number', 8, 'abs'),
      ],
      qualitySignals: [
        K('temperatureAlerts', 'Temperature Alerts', Math.round(3 * p), 'number', -2, 'abs'), K('pickupDelays', 'Pickup Delays', Math.round(8 * p), 'number', 3, 'abs'),
        K('listingMismatches', 'Listing Mismatches', Math.round(5 * p), 'number', 1, 'abs'), K('verificationFailures', 'Verification Failures', Math.round(12 * p), 'number', 4, 'abs'),
        K('openComplaints', 'Open Complaints', Math.round(9 * p), 'number', -1, 'abs'), K('criticalEscalations', 'Critical Escalations', Math.max(1, Math.round(1 * p)), 'number', -1, 'abs'),
      ],
      dropAccuracyTrend: {
        granularity: weekly ? 'weekly' : 'daily',
        series: [{ key: 'dropAccuracy', label: 'Drop Accuracy', kind: 'area', unit: 'percent', points: weekly ? acc.filter((_, i) => i % 7 === 2) : acc }],
        totals: [K('currentWeek', 'Current Week', 96.4, 'percent', null, 'pp', { comparison: '' }), K('improvement', 'Improvement vs Previous Week', 1.2, 'percent', 1.2, 'pp', { comparison: '95.2% → 96.4%' })],
        week: { from: addDays(TODAY, -6), to: TODAY },
      },
      operationsSummary: [
        K('avgFulfilmentTime', 'Avg Fulfilment Time', 18, 'duration_minutes', -2, 'minutes'), K('avgPickupDelay', 'Avg Pickup Delay', 4, 'duration_minutes', -1, 'minutes'),
        K('pickupsCompleted', 'Pickups Completed', n(322 * p), 'number', 34, 'abs'), K('ordersProcessed', 'Orders Processed', n(356 * p), 'number', 39, 'abs'),
        K('ratedOrders', 'Rated Orders', n(3610 * p), 'number', 432, 'abs'), K('verificationAttention', 'Verification Attention Cases', Math.round(78 * s.share * p), 'number', 12, 'abs'),
        K('wasteDiverted', 'Waste Diverted', 92, 'percent', 3, 'pp'), K('mealsSaved', 'Meals Saved', n(12400 * p), 'number', 1100, 'abs'),
      ],
    };
  }
  const SECTION = { 'operational-trends': 'operationalTrends', 'fulfilment-funnel': 'fulfilmentFunnel', 'marketplace-health': 'marketplaceHealth', 'pickup-cancellation-health': 'pickupCancellationHealth', 'quality-signals': 'qualitySignals', 'drop-accuracy-trend': 'dropAccuracyTrend', 'operations-summary': 'operationsSummary' };
  api.mock('GET', '/admin/analytics/operations', ({ query }) => opsData(query));
  api.mock('GET', '/admin/analytics/operations/:section', ({ params, query }) => { const k = SECTION[params.section]; if (!k) api.notFound('Section'); return opsData(query)[k]; });

  /* ================================================================== PERFORMANCE */
  const badge = (q) => (q >= 90 ? 'excellent' : q >= 80 ? 'good' : q >= 60 ? 'watch' : 'needs_review');
  const perfRows = MERCHANTS.map((m) => {
    const r = rnd('perf' + m.id); const up = m.quality >= 80;
    const trend = Array.from({ length: 8 }, (_, i) => round(m.quality + (up ? i - 7 : 7 - i) * 0.8 + (r() - 0.5) * 2, 1));
    return { id: m.id, merchant: ref(m), city: m.city, category: m.category, qualityScore: m.quality, trend, onTimePct: m.onTime, status: badge(m.quality), fulfilmentRate: round(Math.min(99.6, 88 + m.quality / 10), 1), rating: m.rating, orders: m.orders, _n: m.name.en + ' ' + m.name.ar + ' ' + m.code, name: m.name.en };
  });
  perfRows.forEach((r) => { const m = merchant(r.merchantId || r.id || (r.merchant && r.merchant.id)); if (m) r.market = m.country; });
  const perfTable = api.db.table('d2_perf', perfRows, { searchable: ['_n', 'id'] });
  const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  api.mock('GET', '/admin/analytics/performance', ({ query }) => {
    const s = scope(query); const n = (v) => Math.round(v * s.f * s.wob);
    const ranking = perfTable.all().filter((r) => s.list.some((m) => m.id === r.id)).sort((a, b) => b.qualityScore - a.qualityScore).slice(0, 6);
    return {
      kpis: [
        K('dropAccuracy', 'Drop Accuracy', 96.2, 'percent', 0.8, 'pp', { comparison: 'this week' }), K('onTimePickupRate', 'On-Time Pickup Rate', 91.4, 'percent', 1.1, 'pp', { comparison: 'this week' }),
        K('fulfilmentRate', 'Fulfilment Rate', 98.0, 'percent', 0, 'pp', { comparison: 'Flat vs. last week' }), K('avgFulfilmentTime', 'Avg Fulfilment Time', 18, 'duration_minutes', 2, 'minutes', { comparison: 'vs. last week' }),
        K('platformUptime', 'Platform Uptime', 99.98, 'percent', null, 'pp', { comparison: '30-day rolling' }),
      ],
      dropAccuracy: { key: 'dropAccuracy', label: 'Drop Accuracy', kind: 'area', unit: 'percent', points: WEEK.slice(0, 6).map((x, i) => ({ x, y: [94.6, 95.3, 95.0, 95.8, 96.1, 96.6][i] })) },
      fulfilmentFunnel: { steps: [{ key: 'reserved', label: 'Reserved', value: n(4120), rate: 100 }, { key: 'pickedUp', label: 'Picked Up', value: n(3930), rate: 95.4 }, { key: 'rated', label: 'Rated 4★+', value: n(3610), rate: 87.6 }], conversionLabel: 'Conversion (Reserved → Rated 4★+)', conversion: 87.6, delta: 1.4 },
      ranking,
    };
  });
  api.mock('GET', '/admin/analytics/performance/merchants', ({ query }) => {
    const q = { ...query }; delete q.from; delete q.to; if (!q.sort) q.sort = '-qualityScore';
    return perfTable.list(q);
  });
  api.mock('GET', '/admin/analytics/performance/merchants/:id', ({ params }) => {
    const row = perfTable.get(params.id); if (!row) api.notFound('Merchant'); const m = merchant(row.id); const r = rnd('pd' + row.id);
    const days = dailyLabels({}, 14);
    return {
      row,
      kpis: [K('qualityScore', 'Quality Score', row.qualityScore, 'number', round((row.trend[7] - row.trend[0]) * 10) / 10, 'abs'), K('onTimePct', 'On-Time %', row.onTimePct, 'percent', round((r() - 0.3) * 4, 1), 'pp'), K('fulfilmentRate', 'Fulfilment Rate', row.fulfilmentRate, 'percent', round((r() - 0.4) * 2, 1), 'pp'), K('rating', 'Average Rating', row.rating, 'rating', round((r() - 0.4) * 0.4, 1), 'abs'), K('orders', 'Orders', row.orders, 'number', round((r() - 0.2) * 20, 1))],
      onTimeTrend: { key: 'onTime', label: 'On-Time %', kind: 'line', unit: 'percent', points: days.map((x, i) => ({ x, y: round(Math.min(100, row.onTimePct + (r() - 0.5) * 8 + (i - 7) * 0.2), 1) })) },
      issues: [{ key: 'late_pickups', label: 'Late pickup windows', count: Math.round((100 - row.onTimePct) / 4) }, { key: 'mismatches', label: 'Listing mismatches', count: Math.round((100 - row.qualityScore) / 9) }, { key: 'complaints', label: 'Customer complaints', count: Math.round((5 - row.rating) * 3) }],
      city: m.city, category: m.category,
    };
  });
  api.mock('GET', '/admin/analytics/performance/report', ({ query }) => {
    const labels = dailyLabels(query, 30); const r = rnd('prep');
    return {
      title: 'Drop Accuracy Report', period: `${labels[0]}/${labels[29]}`, generatedAt: new Date(api.demoNow()).toISOString(),
      sections: [
        { key: 'summary', title: 'Summary', kpis: [K('dropAccuracy', 'Drop Accuracy', 96.2, 'percent', 0.8, 'pp'), K('dropsAudited', 'Drops Audited', 1284, 'number', 9.4), K('mismatches', 'Listing Mismatches', 49, 'number', -12, 'abs'), K('onTimePickupRate', 'On-Time Pickup Rate', 91.4, 'percent', 1.1, 'pp')] },
        { key: 'trend', title: 'Daily drop accuracy', series: [{ key: 'acc', label: 'Drop Accuracy', kind: 'area', unit: 'percent', points: labels.map((x, i) => ({ x, y: round(93.6 + i * 0.09 + (r() - 0.5) * 0.8, 1) })) }] },
        { key: 'byCity', title: 'By city', rows: Object.keys(CITY).map((c, i) => ({ city: CITY[c], drops: [612, 344, 188, 140][i], accuracy: [96.9, 95.8, 94.2, 97.1][i], mismatches: [18, 15, 11, 5][i] })) },
        { key: 'reasons', title: 'Top mismatch reasons', rows: [{ reason: L('Fewer items than listed', 'عناصر أقل من المعروض'), count: 21, share: 42.9 }, { reason: L('Different item category', 'فئة أصناف مختلفة'), count: 14, share: 28.6 }, { reason: L('Allergen info missing', 'معلومات مسببات الحساسية مفقودة'), count: 9, share: 18.4 }, { reason: L('Photo not representative', 'الصورة لا تمثل المحتوى'), count: 5, share: 10.2 }] },
      ],
    };
  });

  /* ================================================================== SUSTAINABILITY */
  function sustain(q) {
    const s = scope(q); const f = s.f * s.wob;
    const regions = [['doha', 14720], ['al_rayyan', 10640], ['al_wakrah', 6980], ['lusail', 4840], ['dubai', 5120], ['abu_dhabi', 3310]].filter(([c]) => s.list.some((m) => m.city === c));
    const meals = Math.round(42180 * f);
    return { s, f, meals, regions: regions.map(([c, v]) => { const val = Math.round(v * (s.list.length === MERCHANTS.length ? 1 : f * 1.6)); return { region: CITY[c], key: c, mealsSaved: val, co2Tonnes: round(val * 0.00044, 1), foodKg: Math.round(val * 0.74) }; }) };
  }
  api.mock('GET', '/admin/analytics/sustainability', ({ query }) => {
    const { f, meals, regions } = sustain(query); const tot = regions.reduce((a, r) => a + r.mealsSaved, 0) || 1;
    return {
      hero: [K('mealsSaved', 'Meals Saved (MTD)', meals, 'number', 11, 'pct', { comparison: 'vs. last month' }), K('co2Offset', 'CO₂ Offset', round(18.6 * f, 1), 'tonnes', 8, 'pct', { comparison: 'vs. last month' }), K('waterSaved', 'Water Saved', Math.round(6400000 * f), 'litres', 9, 'pct', { comparison: 'vs. last month' }), K('wasteDiverted', 'Food Waste Diverted', round(31.2 * f, 1), 'tonnes', 10, 'pct', { comparison: 'vs. last month' })],
      equivalentText: `Equivalent to taking ${Math.max(1, Math.round(14 * f))} cars off the road for a year.`, equivalentCars: Math.max(1, Math.round(14 * f)),
      mealsSavedTrend: { key: 'meals', label: 'Meals Saved', kind: 'area', unit: 'number', points: WEEK.slice(0, 6).map((x, i) => ({ x, y: Math.round([1180, 1320, 1365, 1480, 1530, 1720][i] * f) })) },
      impactByCategory: [{ key: 'bakery', label: 'Bakery', value: Math.round(meals * 0.5), share: 50 }, { key: 'grocery', label: 'Grocery', value: Math.round(meals * 0.3), share: 30 }, { key: 'prepared_foods', label: 'Prepared', value: Math.round(meals * 0.2), share: 20 }],
      impactByRegion: regions.map((r) => ({ ...r, share: round((r.mealsSaved / tot) * 100, 1) })),
    };
  });
  api.mock('GET', '/admin/analytics/sustainability/breakdown', ({ query }) => {
    const { s, f, regions } = sustain(query); const tot = regions.reduce((a, r) => a + r.mealsSaved, 0) || 1;
    const byMerchant = s.list.map((m) => { const v = Math.round(m.orders * 6.1 * s.wob); return { merchant: ref(m), city: CITY[m.city], mealsSaved: v, foodKg: Math.round(v * 0.74), co2Tonnes: round(v * 0.00044, 2), waterLitres: Math.round(v * 152) }; }).sort((a, b) => b.mealsSaved - a.mealsSaved);
    const cats = {}; byMerchant.forEach((r) => { const c = merchant(r.merchant.id).category; cats[c] = (cats[c] || 0) + r.mealsSaved; });
    const ctot = Object.values(cats).reduce((a, b) => a + b, 0) || 1;
    return {
      groupBy: query.groupBy || 'city',
      byCity: regions.map((r) => ({ ...r, share: round((r.mealsSaved / tot) * 100, 1) })),
      byMerchant,
      byCategory: Object.keys(cats).map((k) => ({ key: k, label: k, value: cats[k], share: round((cats[k] / ctot) * 100, 1) })).sort((a, b) => b.value - a.value),
      monthly: [
        { key: 'meals', label: 'Meals Saved', kind: 'bar', unit: 'number', points: MONTHS_ALL.slice(-6).map((x, i) => ({ x, y: Math.round([26400, 29100, 31800, 35200, 38900, 42180][i] * f) })) },
        { key: 'co2', label: 'CO₂ Offset (t)', kind: 'line', unit: 'tonnes', points: MONTHS_ALL.slice(-6).map((x, i) => ({ x, y: round([11.6, 12.8, 14.0, 15.5, 17.1, 18.6][i] * f, 1) })) },
      ],
    };
  });
  api.mock('GET', '/admin/analytics/sustainability/report', ({ query }) => {
    const { f } = sustain(query);
    return {
      title: 'Sustainability Impact Report', period: '2026-11', generatedAt: new Date(api.demoNow()).toISOString(),
      sections: [
        { key: 'summary', title: 'Summary', kpis: [K('mealsSaved', 'Meals Saved (MTD)', Math.round(42180 * f), 'number', 11), K('co2Offset', 'CO₂ Offset', round(18.6 * f, 1), 'tonnes', 8), K('waterSaved', 'Water Saved', Math.round(6400000 * f), 'litres', 9), K('wasteDiverted', 'Food Waste Diverted', round(31.2 * f, 1), 'tonnes', 10)] },
        { key: 'monthly', title: 'Meals saved by month', series: [{ key: 'meals', label: 'Meals Saved', kind: 'bar', unit: 'number', points: MONTHS_ALL.slice(-6).map((x, i) => ({ x, y: Math.round([26400, 29100, 31800, 35200, 38900, 42180][i] * f) })) }] },
        { key: 'equivalents', title: 'What this equals', rows: [{ metric: L('Cars off the road for a year', 'سيارات خارج الطريق لمدة عام'), value: Math.max(1, Math.round(14 * f)) }, { metric: L('Car miles avoided', 'أميال سيارة تم تجنبها'), value: Math.round(46200 * f) }, { metric: L('Days of drinking water for one person', 'أيام من مياه الشرب لشخص واحد'), value: Math.round(3200000 * f) }, { metric: L('Trees grown for 10 years', 'أشجار نمت لمدة 10 سنوات'), value: Math.round(308 * f) }] },
        { key: 'method', title: 'Methodology', rows: [{ metric: L('Food weight per meal', 'وزن الطعام لكل وجبة'), value: L('0.74 kg (WRAP average)', '0.74 كجم (متوسط WRAP)') }, { metric: L('CO₂e per kg of food waste avoided', 'مكافئ CO₂ لكل كجم من هدر الطعام المتجنب'), value: L('2.5 kg', '2.5 كجم') }, { metric: L('Water footprint per meal', 'البصمة المائية لكل وجبة'), value: L('152 L', '152 لتر') }] },
      ],
    };
  });

  /* ================================================================== WALLET CREDIT & VOUCHERS */
  const W_SEED = [
    ['CON-1201', 40, 'promotional', 'active'], ['CON-1202', 30, 'refund', 'frozen'], ['CON-1203', 25, 'compensation', 'active'], ['CON-1204', 27, 'refund', 'blocked'],
    ['CON-48291', 15, 'referral', 'frozen'], ['CON-1206', 0, 'promotional', 'active'], ['CON-1208', 0, 'adjustment', 'active'],
  ];
  const txns = {};
  const walletSeed = W_SEED.map(([cid, bal, source, status], i) => {
    const p = person(cid); const id = `WAL-${30410 + i}`; const r = rnd(id);
    const spent = bal === 0 ? 20 : Math.round(r() * 18);
    const REASON = { promotional: 'Welcome promotion', refund: 'Refund for cancelled order', compensation: 'Compensation for late pickup', referral: 'Referral reward', adjustment: 'Balance correction' };
    const steps = [[bal + spent, source === 'refund' ? 'refund' : 'credit', REASON[source]]];
    if (spent) steps.push([-spent, 'debit', 'Applied to order']);
    if (i % 2) steps.push([5, 'credit', 'Goodwill credit'], [-5, 'debit', 'Applied to order']);
    const list = []; let b = 0;
    steps.forEach(([amt, type, reason], k) => {
      b = round(b + amt, 2);
      list.push({ id: `${id}-T${k + 1}`, type, source: amt > 0 ? source : null, amount: money(amt), balanceAfter: money(b), reason, orderId: amt < 0 ? `MO-${5100 + i * 9 + k}` : null, expiresAt: amt > 0 ? stamp('2027-05-02', '23:59') : null, actor: amt < 0 ? null : ADMINS[k % 3], createdAt: stamp(addDays(TODAY, -(steps.length - k) * 4 - i), `1${k}:2${i}`) });
    });
    txns[id] = list.reverse();
    const lifetime = list.filter((x) => x.amount.amount > 0).reduce((s, x) => s + x.amount.amount, 0);
    return { id, consumer: p, consumerId: cid, balance: money(bal), sortBalance: bal, source, lastTransactionAt: list[0].createdAt, lifetimeCredit: money(lifetime), status, frozenReason: status === 'frozen' ? 'Suspicious redemption pattern' : status === 'blocked' ? 'Account blocked for repeated no-shows' : null, _n: p.name.en + ' ' + p.name.ar };
  });
  /* (v1.3) wallets of UAE consumers (same ids as Admin operations) are AED and only show once UAE is enabled */
  const AE_CONSUMERS = ['CON-1211', 'CON-1212'];
  walletSeed.forEach((w) => { w.market = AE_CONSUMERS.includes(w.consumerId) ? 'AE' : 'QA'; if (w.market === 'AE') { [w.balance, w.lifetimeCredit].forEach((m) => { m.currency = 'AED'; }); (txns[w.id] || []).forEach((x) => { x.amount.currency = 'AED'; x.balanceAfter.currency = 'AED'; }); } });
  const wallets = api.db.table('d2_wallets', walletSeed, { searchable: ['id', 'consumerId', '_n'] });
  const V_SEED = [
    { id: 'VCH-101', code: 'WELCOME20', name: L('Welcome offer', 'عرض الترحيب'), type: 'percentage', value: 20, minOrder: money(15), maxDiscount: money(20), usageLimit: 1000, perUserLimit: 1, used: 642, audience: 'new_users', startsAt: stamp('2026-05-03', '00:00'), expiresAt: stamp('2027-05-02', '23:59'), status: 'active', createdAt: stamp('2026-04-21') },
    { id: 'VCH-102', code: 'RAMADAN10', name: L('Ramadan Kareem', 'رمضان كريم'), type: 'fixed', value: 10, valueMoney: money(10), minOrder: money(25), usageLimit: 500, perUserLimit: 2, used: 500, audience: 'all_users', startsAt: stamp('2026-07-01', '00:00'), expiresAt: stamp('2026-04-10', '23:59'), status: 'frozen', createdAt: stamp('2026-06-22') },
    { id: 'VCH-103', code: 'BACKTOSCHOOL', name: L('Back to school', 'العودة إلى المدرسة'), type: 'fixed', value: 5, valueMoney: money(5), minOrder: money(10), usageLimit: 2000, perUserLimit: 3, used: 311, audience: 'all_users', startsAt: stamp('2026-10-31', '00:00'), expiresAt: stamp('2027-05-02', '23:59'), status: 'active', createdAt: stamp('2026-10-25') },
    { id: 'VCH-104', code: 'SUMMER15', name: L('Summer rescue week', 'أسبوع الإنقاذ الصيفي'), type: 'percentage', value: 15, maxDiscount: money(15), usageLimit: 800, perUserLimit: 1, used: 0, audience: 'star_users', startsAt: stamp('2026-12-01', '00:00'), expiresAt: stamp('2026-12-31', '23:59'), status: 'scheduled', createdAt: stamp('2026-11-14') },
    { id: 'VCH-105', code: 'EIDFEAST', name: L('Eid feast', 'وليمة العيد'), type: 'percentage', value: 25, maxDiscount: money(30), usageLimit: 300, perUserLimit: 1, used: 0, audience: 'premium_users', startsAt: stamp('2026-10-05', '00:00'), expiresAt: stamp('2026-10-10', '23:59'), status: 'expired', createdAt: stamp('2026-09-27') },
  ];
  V_SEED.forEach((v) => (v.sortUsage = v.used / v.usageLimit));
  const vouchers = api.db.table('d2_vouchers', V_SEED, { searchable: ['code', 'id', '_n'] });
  vouchers.all().forEach((v) => (v._n = (v.name && v.name.en) || ''));
  const redemptions = (v) => { const r = rnd(v.id); return Array.from({ length: Math.min(v.used, 8) }, (_, i) => { const p = PEOPLE[Math.floor(r() * PEOPLE.length)]; const d = v.type === 'fixed' ? v.value : round(Math.min((v.maxDiscount && v.maxDiscount.amount) || 99, (18 + r() * 30) * v.value / 100), 2); return { orderId: `MO-${5300 - i * 17}`, consumer: p, discount: money(d), at: stamp(addDays(TODAY, -i), `${11 + (i % 9)}:${String((i * 13) % 60).padStart(2, '0')}`) }; }); };
  const walletSummary = () => {
    const ws = wallets.all().filter(api.inScope); const credited = ws.filter((w) => w.balance.amount > 0); const tc = target(); const tot = round(credited.reduce((s, w) => s + MKT().convert(w.balance.amount, w.balance.currency, tc), 0), 2); // (v1.3) in-scope wallets, converted
    return { totalWalletBalance: money(tot, tc), activeVouchers: vouchers.all().filter((v) => v.status === 'active').length, voucherRedemptions: vouchers.all().reduce((s, v) => s + v.used, 0), avgBalancePerUser: money(credited.length ? round(tot / credited.length, 1) : 0, tc), walletUsers: credited.length };
  };
  api.mock('GET', '/admin/wallets', ({ query }) => { const { from, to, ...q } = query; if (q.sort && /balance/.test(q.sort)) q.sort = q.sort.replace('balance', 'sortBalance'); return wallets.list(q, { summary: walletSummary }); });
  api.mock('GET', '/admin/wallets/:id', ({ params }) => { const w = wallets.get(params.id); if (!w) api.notFound('Wallet'); return { wallet: w, transactions: txns[w.id] || [] }; });
  function addTxn(w, amt, type, source, reason, expiresAt) {
    const nb = round(w.balance.amount + amt, 2);
    const tx = { id: `${w.id}-T${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`, type, source: amt > 0 ? source : null, amount: money(amt), balanceAfter: money(nb), reason, orderId: null, expiresAt: expiresAt ? stamp(expiresAt, '23:59') : null, actor: ME, createdAt: new Date(api.demoNow()).toISOString() };
    (txns[w.id] = txns[w.id] || []).unshift(tx);
    wallets.update(w.id, { balance: money(nb), sortBalance: nb, lastTransactionAt: tx.createdAt, lifetimeCredit: money(w.lifetimeCredit.amount + Math.max(0, amt)), ...(amt > 0 ? { source } : {}) });
    return tx;
  }
  api.mock('POST', '/admin/wallets/credits', ({ body }) => {
    const b = body || {}; const d = {};
    if (!Array.isArray(b.consumerIds) || !b.consumerIds.length) d.consumerIds = 'required';
    const amt = b.amount && +b.amount.amount; if (!(amt > 0)) d.amount = 'min'; else if (amt > 1000) d.amount = 'max';
    if (!['promotional', 'refund', 'compensation', 'referral', 'adjustment'].includes(b.source)) d.source = 'required';
    if (!b.reason || String(b.reason).trim().length < 5) d.reason = 'required';
    if (b.expiresAt && b.expiresAt <= TODAY) d.expiresAt = 'future';
    if (Object.keys(d).length) throw err(422, 'validation_error', d.expiresAt ? 'Expiry date must be in the future.' : d.amount === 'max' ? 'A single credit can’t exceed QAR 1,000.' : 'Check the highlighted fields.', d);
    const issued = [];
    b.consumerIds.forEach((cid) => {
      let w = wallets.all().find((x) => x.consumerId === cid);
      if (w && w.status !== 'active') return; // frozen / blocked wallets can't receive credit
      if (!w) { const p = person(cid) || { id: cid, name: L(cid, cid) }; w = wallets.insert({ id: `WAL-${30500 + wallets.all().length}`, consumer: p, consumerId: cid, balance: money(0), sortBalance: 0, source: b.source, lastTransactionAt: new Date(api.demoNow()).toISOString(), lifetimeCredit: money(0), status: 'active', frozenReason: null, _n: p.name.en + ' ' + p.name.ar }); txns[w.id] = []; }
      issued.push(addTxn(w, amt, 'credit', b.source, b.reason, b.expiresAt));
    });
    if (!issued.length) throw err(409, 'conflict', 'The selected wallets are frozen or blocked and can’t receive credit.');
    return { issued: issued.length, skipped: b.consumerIds.length - issued.length, transactions: issued };
  });
  api.mock('POST', '/admin/wallets/:id/adjust', ({ params, body }) => {
    const w = wallets.get(params.id); if (!w) api.notFound('Wallet'); const b = body || {};
    const amt = b.amount && +b.amount.amount;
    if (!(amt > 0)) throw err(422, 'validation_error', 'Enter an amount greater than zero.', { amount: 'min' });
    if (!b.reason || String(b.reason).trim().length < 5) throw err(422, 'validation_error', 'Add a reason (at least 5 characters).', { reason: 'required' });
    if (b.direction === 'debit' && amt > w.balance.amount) throw err(422, 'validation_error', 'Debit can’t exceed the current balance.', { amount: 'max' });
    if (w.status === 'blocked') throw err(409, 'conflict', 'Blocked wallets can’t be adjusted.');
    addTxn(w, b.direction === 'debit' ? -amt : amt, 'adjustment', 'adjustment', b.reason);
    return { wallet: w, transactions: txns[w.id] };
  });
  api.mock('POST', '/admin/wallets/:id/freeze', ({ params, body }) => { const w = wallets.get(params.id); if (!w) api.notFound('Wallet'); if (w.status !== 'active') throw err(409, 'conflict', 'Only active wallets can be frozen.'); return wallets.update(w.id, { status: 'frozen', frozenReason: (body && body.reason) || 'Frozen by admin' }); });
  api.mock('POST', '/admin/wallets/:id/unfreeze', ({ params }) => { const w = wallets.get(params.id); if (!w) api.notFound('Wallet'); if (w.status !== 'frozen') throw err(409, 'conflict', 'Only frozen wallets can be unfrozen.'); return wallets.update(w.id, { status: 'active', frozenReason: null }); });

  const AUD = ['all_users', 'star_users', 'premium_users', 'new_users', 'merchants'];
  function voucherInput(b, id) {
    const d = {}; b = b || {};
    const code = String(b.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) d.code = 'pattern';
    if (!['percentage', 'fixed', 'free_bag'].includes(b.type)) d.type = 'required';
    const val = +b.value; if (b.type !== 'free_bag' && !(val > 0)) d.value = 'min'; if (b.type === 'percentage' && val > 100) d.value = 'max';
    if (!(+b.usageLimit >= 1)) d.usageLimit = 'min';
    if (!AUD.includes(b.audience)) d.audience = 'required';
    if (!b.expiresAt) d.expiresAt = 'required'; else if (String(b.expiresAt).slice(0, 10) <= TODAY) d.expiresAt = 'future';
    if (b.startsAt && b.expiresAt && String(b.startsAt).slice(0, 10) >= String(b.expiresAt).slice(0, 10)) d.expiresAt = 'after_start';
    if (Object.keys(d).length) throw err(422, 'validation_error', d.expiresAt === 'future' ? 'Expiry date must be in the future.' : d.expiresAt === 'after_start' ? 'Expiry must be after the start date.' : 'Check the highlighted fields.', d);
    const dup = vouchers.all().find((v) => v.code === code && v.id !== id); if (dup) throw err(409, 'conflict', 'A voucher with this code already exists.', { code: 'taken' });
    const start = b.startsAt ? String(b.startsAt).slice(0, 10) : TODAY;
    let status = b.status || 'active'; if (status === 'active' && start > TODAY) status = 'scheduled';
    return { code, name: b.name || null, type: b.type, value: b.type === 'free_bag' ? 0 : val, valueMoney: b.type === 'fixed' ? money(val) : null, minOrder: b.minOrder && +b.minOrder.amount ? money(+b.minOrder.amount) : null, maxDiscount: b.type === 'percentage' && b.maxDiscount && +b.maxDiscount.amount ? money(+b.maxDiscount.amount) : null, usageLimit: +b.usageLimit, perUserLimit: +b.perUserLimit || 1, audience: b.audience, merchantIds: b.merchantIds || [], cities: b.cities || [], startsAt: stamp(start, '00:00'), expiresAt: stamp(String(b.expiresAt).slice(0, 10), '23:59'), status };
  }
  api.mock('GET', '/admin/vouchers', ({ query }) => { const { from, to, ...q } = query; if (q.sort && /usage/.test(q.sort)) q.sort = q.sort.replace('usage', 'sortUsage'); return vouchers.list(q, { summary: walletSummary }); });
  api.mock('POST', '/admin/vouchers', ({ body }) => { const v = voucherInput(body); const row = vouchers.insert({ id: `VCH-${100 + vouchers.all().length + 1}`, ...v, used: 0, sortUsage: 0, createdAt: new Date(api.demoNow()).toISOString(), _n: (v.name && v.name.en) || '' }); return row; });
  api.mock('GET', '/admin/vouchers/:id', ({ params }) => { const v = vouchers.get(params.id); if (!v) api.notFound('Voucher'); return { voucher: v, redemptions: redemptions(v) }; });
  api.mock('PATCH', '/admin/vouchers/:id', ({ params, body }) => { const v = vouchers.get(params.id); if (!v) api.notFound('Voucher'); const next = voucherInput({ ...body, startsAt: body.startsAt || v.startsAt }, v.id); if (next.usageLimit < v.used) throw err(422, 'validation_error', 'Usage limit can’t be lower than redemptions so far.', { usageLimit: 'min' }); if (v.status === 'frozen') next.status = 'frozen'; return vouchers.update(v.id, { ...next, sortUsage: v.used / next.usageLimit, _n: (next.name && next.name.en) || '' }); });
  api.mock('DELETE', '/admin/vouchers/:id', ({ params }) => { const v = vouchers.get(params.id); if (!v) api.notFound('Voucher'); vouchers.remove(v.id); return null; });
  api.mock('POST', '/admin/vouchers/:id/freeze', ({ params, body }) => { const v = vouchers.get(params.id); if (!v) api.notFound('Voucher'); if (!['active', 'scheduled'].includes(v.status)) throw err(409, 'conflict', 'Only active or scheduled vouchers can be frozen.'); return vouchers.update(v.id, { status: 'frozen', frozenFrom: v.status, frozenReason: body && body.reason }); });
  api.mock('POST', '/admin/vouchers/:id/unfreeze', ({ params }) => { const v = vouchers.get(params.id); if (!v) api.notFound('Voucher'); if (v.status !== 'frozen') throw err(409, 'conflict', 'Only frozen vouchers can be unfrozen.'); const st = v.used >= v.usageLimit ? 'exhausted' : String(v.expiresAt).slice(0, 10) < TODAY ? 'expired' : v.frozenFrom === 'scheduled' ? 'scheduled' : 'active'; return vouchers.update(v.id, { status: st, frozenReason: null }); });

  /* ================================================================== QUALITY & SAFETY */
  const C_SEED = [
    ['MER-058', 'expiring_soon', 14, 1, 'non_compliant', '2026-12-04', '2026-09-11'], ['MER-094', 'missing', 11, 2, 'non_compliant', null, '2026-08-18'],
    ['MER-066', 'valid', 18, 0, 'compliant', '2026-02-14', '2026-10-30'], ['MER-047', 'valid', 16, 1, 'compliant', '2027-03-22', '2026-10-02'],
    ['MER-071', 'valid', 19, 0, 'compliant', '2026-03-01', '2026-11-07'], ['MER-030', 'expiring_soon', 15, 2, 'expiring_soon', '2026-11-28', '2026-09-24'],
    ['MER-041', 'pending_review', 13, 3, 'under_review', '2027-01-12', '2026-07-30'], ['MER-051', 'expired', 9, 5, 'expired', '2026-11-01', '2026-06-13'],
    ['MER-036', 'valid', 17, 0, 'compliant', '2026-01-15', '2026-10-21'], ['MER-079', 'rejected', 12, 2, 'non_compliant', null, '2026-08-03'],
  ];
  const certs = {}; const indicators = {}; const cActs = {}; const hygHist = {};
  const CERT_TYPES = ['food_safety', 'trade_license', 'health_permit', 'halal', 'hygiene_training'];
  const complianceSeed = C_SEED.map(([mid, fs, hyg, open, comp, next, insp], i) => {
    const m = merchant(mid); const r = rnd('c' + mid);
    certs[mid] = CERT_TYPES.slice(0, 3 + (i % 3)).map((type, k) => {
      const st = k === 0 ? fs : ['valid', 'valid', 'expiring_soon', 'valid', 'pending_review'][(i + k) % 5];
      const exp = k === 0 ? next || addDays(TODAY, -40) : addDays(TODAY, st === 'expiring_soon' ? 12 + k * 3 : 120 + k * 60 + i * 9);
      return { id: `CRT-${mid.slice(4)}${k + 1}`, type, number: st === 'missing' ? '' : `${type.slice(0, 2).toUpperCase()}-${48200 + i * 31 + k}`, issuedAt: addDays(exp, -365), expiresAt: exp, status: st, file: st === 'missing' ? null : { fileId: `file_${mid}_${k}`, name: `${type}_${m.code}.pdf`, url: '#mock-file', contentType: 'application/pdf', size: 182000 + k * 9100 }, reviewedBy: st === 'valid' ? ADMINS[k % 3] : null, reviewNote: st === 'rejected' ? 'Document is not legible' : null };
    }).filter((c) => c.status !== 'missing' || c.type === 'food_safety');
    const IND = [['temperature_breach', 'Temperature breach reported', 'critical'], ['hygiene_complaint', 'Hygiene complaint', 'high'], ['allergen_label', 'Allergen labelling missing', 'medium'], ['late_documents', 'Late document renewal', 'low'], ['pest_report', 'Pest sighting reported', 'critical']];
    indicators[mid] = IND.map(([key, label, severity], k) => ({ key, label, count: k < open ? 1 + (k % 2) : 0, severity, open: k < open })).filter((x) => x.count || x.key === 'late_documents');
    hygHist[mid] = { key: 'hygiene', label: 'Hygiene score', kind: 'line', unit: 'number', points: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].map((x, k) => ({ x, y: Math.max(4, Math.min(20, Math.round(hyg - 2 + k * 0.5 + (r() - 0.5) * 3))) })) };
    hygHist[mid].points[5].y = hyg;
    cActs[mid] = [{ id: mid + '-c1', action: 'inspection', label: `Inspection recorded: ${hyg}/20`, actor: ADMINS[i % 3], at: stamp(insp, '11:30'), meta: { score: hyg, max: 20 } }, { id: mid + '-c0', action: 'onboarded', label: 'Added to compliance monitoring', actor: { id: 'system', name: 'System' }, at: stamp('2026-06-03', '08:00') }];
    return { id: mid, merchant: ref(m), merchantCode: m.code, logoUrl: null, category: m.category, city: m.city, foodSafety: fs, hygieneScore: hyg, hygieneMax: 20, openIndicators: open, compliance: comp, nextExpiry: next, lastInspectionAt: stamp(insp, '11:30'), createdAt: stamp(addDays('2026-06-03', i * 9)), _n: m.name.en + ' ' + m.name.ar + ' ' + m.code };
  });
  complianceSeed.forEach((r) => { const m = merchant(r.merchantId || r.id || (r.merchant && r.merchant.id)); if (m) r.market = m.country; });
  const compliance = api.db.table('d2_compliance', complianceSeed, { searchable: ['_n', 'id', 'merchantCode'] });
  const recompute = (row) => {
    const cs = certs[row.id] || []; const fs = cs.find((c) => c.type === 'food_safety');
    const exps = cs.filter((c) => c.status !== 'missing' && c.expiresAt).map((c) => c.expiresAt).sort();
    const open = (indicators[row.id] || []).filter((x) => x.open).length;
    compliance.update(row.id, { foodSafety: fs ? fs.status : 'missing', nextExpiry: exps.find((d) => d >= TODAY) || exps[exps.length - 1] || null, openIndicators: open });
  };
  const compSummary = () => { const all = compliance.all(); return { monitored: all.length, compliant: all.filter((r) => r.compliance === 'compliant').length, nonCompliant: all.filter((r) => ['non_compliant', 'expired'].includes(r.compliance)).length, expiringCertificates: Object.keys(certs).reduce((s, k) => s + certs[k].filter((c) => c.status === 'expiring_soon').length, 0), avgHygieneScore: round(all.reduce((s, r) => s + r.hygieneScore, 0) / Math.max(1, all.length), 1), hygieneMax: 20 }; };
  const detail = (id) => { const row = compliance.get(id); if (!row) api.notFound('Compliance record'); return { row, certificates: certs[id] || [], indicators: indicators[id] || [], hygieneHistory: hygHist[id], actions: (cActs[id] || []).slice().sort((a, b) => (a.at < b.at ? 1 : -1)) }; };
  const log = (id, action, label, meta) => (cActs[id] = cActs[id] || []).push({ id: id + '-' + Date.now().toString(36) + Math.floor(Math.random() * 99), action, label, actor: ME, at: new Date(api.demoNow()).toISOString(), meta: meta || {} });
  api.mock('GET', '/admin/compliance', ({ query }) => {
    const { from, to, complianceStatus, certificateStatus, ...q } = query;
    if (complianceStatus) q.compliance = complianceStatus; if (certificateStatus) q.foodSafety = certificateStatus;
    if (q.sort === 'name' || q.sort === '-name') q.sort = q.sort.replace('name', '_n');
    return compliance.list(q, { summary: compSummary });
  });
  api.mock('GET', '/admin/compliance/:id', ({ params }) => detail(params.id));
  api.mock('PATCH', '/admin/compliance/:id', ({ params, body }) => {
    const row = compliance.get(params.id); if (!row) api.notFound('Compliance record');
    if (!['compliant', 'expiring_soon', 'expired', 'non_compliant', 'under_review'].includes(body && body.compliance)) throw err(422, 'validation_error', 'Choose a compliance status.', { compliance: 'required' });
    if (!body.note || body.note.trim().length < 5) throw err(422, 'validation_error', 'Add a note (at least 5 characters).', { note: 'required' });
    compliance.update(row.id, { compliance: body.compliance }); log(row.id, 'status_override', `Status set to ${body.compliance.replace(/_/g, ' ')}: ${body.note}`, { status: body.compliance, note: body.note }); return row;
  });
  api.mock('DELETE', '/admin/compliance/:id', ({ params }) => { if (!compliance.get(params.id)) api.notFound('Compliance record'); compliance.remove(params.id); return null; });
  api.mock('POST', '/admin/compliance/:id/certificates', ({ params, body }) => {
    const row = compliance.get(params.id); if (!row) api.notFound('Compliance record'); const b = body || {}; const d = {};
    if (!CERT_TYPES.concat('other').includes(b.type)) d.type = 'required'; if (!b.expiresAt) d.expiresAt = 'required'; if (!b.fileId) d.file = 'required';
    if (b.issuedAt && b.expiresAt && b.issuedAt >= b.expiresAt) d.expiresAt = 'after_issue';
    if (Object.keys(d).length) throw err(422, 'validation_error', d.expiresAt === 'after_issue' ? 'Expiry must be after the issue date.' : 'Check the highlighted fields.', d);
    const st = b.expiresAt < TODAY ? 'expired' : 'pending_review';
    const list = certs[row.id] = (certs[row.id] || []).filter((c) => !(c.type === b.type && c.status === 'missing'));
    const c = { id: `CRT-${row.id.slice(4)}${Date.now().toString(36).slice(-3)}`, type: b.type, number: b.number || '', issuedAt: b.issuedAt || null, expiresAt: b.expiresAt, status: st, file: { fileId: b.fileId, name: b.fileName || 'certificate.pdf', url: '#mock-file', contentType: 'application/pdf', size: b.size || 0 }, reviewedBy: null, reviewNote: null };
    list.unshift(c); recompute(row); log(row.id, 'certificate_uploaded', `Certificate uploaded: ${b.type.replace(/_/g, ' ')}`, { doc: b.type }); return c;
  });
  const findCert = (cid) => { for (const k in certs) { const c = certs[k].find((x) => x.id === cid); if (c) return [k, c]; } api.notFound('Certificate'); };
  api.mock('PATCH', '/admin/compliance/certificates/:cid', ({ params, body }) => {
    const [mid, c] = findCert(params.cid); const b = body || {};
    if (!b.expiresAt) throw err(422, 'validation_error', 'Expiry date is required.', { expiresAt: 'required' });
    if (b.issuedAt && b.issuedAt >= b.expiresAt) throw err(422, 'validation_error', 'Expiry must be after the issue date.', { expiresAt: 'after_issue' });
    Object.assign(c, { number: b.number != null ? b.number : c.number, issuedAt: b.issuedAt || c.issuedAt, expiresAt: b.expiresAt });
    if (c.status !== 'pending_review' && c.status !== 'rejected') c.status = c.expiresAt < TODAY ? 'expired' : daysBetween(TODAY, c.expiresAt) <= 30 ? 'expiring_soon' : 'valid';
    recompute(compliance.get(mid)); log(mid, 'certificate_updated', `Certificate updated: ${c.type.replace(/_/g, ' ')}`, { doc: c.type }); return c;
  });
  api.mock('DELETE', '/admin/compliance/certificates/:cid', ({ params }) => { const [mid, c] = findCert(params.cid); certs[mid] = certs[mid].filter((x) => x.id !== c.id); recompute(compliance.get(mid)); log(mid, 'certificate_deleted', `Certificate deleted: ${c.type.replace(/_/g, ' ')}`, { doc: c.type }); return null; });
  api.mock('POST', '/admin/compliance/certificates/:cid/approve', ({ params }) => { const [mid, c] = findCert(params.cid); if (c.status !== 'pending_review') throw err(409, 'conflict', 'Only certificates pending review can be approved.'); c.status = c.expiresAt < TODAY ? 'expired' : daysBetween(TODAY, c.expiresAt) <= 30 ? 'expiring_soon' : 'valid'; c.reviewedBy = ME; recompute(compliance.get(mid)); log(mid, 'certificate_approved', `Certificate approved: ${c.type.replace(/_/g, ' ')}`, { doc: c.type }); return c; });
  api.mock('POST', '/admin/compliance/certificates/:cid/reject', ({ params, body }) => { const [mid, c] = findCert(params.cid); if (!body || !body.reason) throw err(422, 'validation_error', 'Add a reason for rejecting this certificate.', { reason: 'required' }); c.status = 'rejected'; c.reviewNote = body.reason; c.reviewedBy = ME; recompute(compliance.get(mid)); log(mid, 'certificate_rejected', `Certificate rejected: ${body.reason}`, { doc: c.type, note: body.reason }); return c; });
  api.mock('POST', '/admin/compliance/:id/hygiene-score', ({ params, body }) => {
    const row = compliance.get(params.id); if (!row) api.notFound('Compliance record'); const b = body || {}; const max = +b.max || 20;
    if (!(b.score >= 0 && b.score <= max)) throw err(422, 'validation_error', 'Score must be between 0 and the maximum.', { score: 'range' });
    if (!b.inspectedAt) throw err(422, 'validation_error', 'Inspection date is required.', { inspectedAt: 'required' });
    compliance.update(row.id, { hygieneScore: +b.score, hygieneMax: max, lastInspectionAt: String(b.inspectedAt).length <= 10 ? stamp(b.inspectedAt, '12:00') : b.inspectedAt });
    const h = hygHist[row.id]; if (h) h.points[h.points.length - 1].y = +b.score;
    log(row.id, 'inspection', `Inspection recorded: ${b.score}/${max}${b.note ? ' — ' + b.note : ''}`, { score: +b.score, max, note: b.note }); return row;
  });
  api.mock('POST', '/admin/compliance/:id/actions', ({ params, body }) => {
    const row = compliance.get(params.id); if (!row) api.notFound('Compliance record'); const b = body || {};
    const LABEL = { warn: 'Warning sent to merchant', request_documents: 'Documents requested', schedule_inspection: 'Inspection scheduled', suspend: 'Merchant suspended from listing', clear: 'Marked compliant' };
    if (!LABEL[b.action]) throw err(422, 'validation_error', 'Unknown compliance action.', { action: 'invalid' });
    if (['request_documents', 'schedule_inspection'].includes(b.action) && !b.dueAt) throw err(422, 'validation_error', 'Choose a due date.', { dueAt: 'required' });
    if (b.dueAt && b.dueAt <= TODAY) throw err(422, 'validation_error', 'Due date must be in the future.', { dueAt: 'future' });
    if (b.action === 'suspend' && (!b.note || b.note.trim().length < 5)) throw err(422, 'validation_error', 'Add a reason (at least 5 characters).', { note: 'required' });
    if (b.action === 'clear') { compliance.update(row.id, { compliance: 'compliant' }); (indicators[row.id] || []).forEach((x) => (x.open = false)); recompute(row); }
    if (b.action === 'suspend') compliance.update(row.id, { compliance: 'non_compliant', suspended: true });
    if (b.action === 'request_documents' && row.compliance === 'compliant') compliance.update(row.id, { compliance: 'under_review' });
    log(row.id, b.action, LABEL[b.action] + (b.dueAt ? ` (due ${b.dueAt})` : '') + (b.note ? ': ' + b.note : ''), { dueAt: b.dueAt, note: b.note });
    return detail(row.id);
  });

  /* ------------------------------------------------------------------ uploads (fallback: only if no other module serves presign) */
  if (!api.routes().includes('POST /shared/uploads/presign')) {
    api.mock('POST', '/shared/uploads/presign', ({ body }) => {
      const b = body || {}; if (!b.fileName || !b.contentType) throw err(422, 'validation_error', 'Choose a file to upload.');
      const docs = /pdf|image\//.test(b.contentType); if (!docs) throw err(422, 'validation_error', 'Use a PDF, JPG or PNG file.', { file: 'type' });
      if (b.size > 20 * 1024 * 1024) throw err(422, 'validation_error', 'File is larger than 20 MB.', { file: 'size' });
      const id = 'file_' + Date.now().toString(36);
      return { fileId: id, uploadUrl: 'https://uploads.mock/' + id, method: 'PUT', headers: { 'Content-Type': b.contentType }, fileUrl: 'https://cdn.mock/' + id + '/' + encodeURIComponent(b.fileName), expiresAt: new Date(Date.now() + 9e5).toISOString() };
    });
  }
  /* (v1.3) dashboards → currency of the selected market, or the reporting currency for several currencies */
  const LEDGER = /^\/admin\/financials\/(payouts|refunds)(\/|$)/;
  api.lens(/^\/admin\/(financials|analytics)\//, (out, req) => (LEDGER.test(req.path) || !req.markets ? out : MKT().convertDeep(out, target())));
})();
