/* (v1.4 dates) seeded dates rebased onto api.DEMO_TODAY = 2026-11-19 by qa/rebase_dates.py */
/* =====================================================================
   Mock handlers — shapes follow docs/API_CONTRACT.md   [LEAD]
   Auth · /shared (notifications, search, exports, impact, help, tickets)
   /merchant/me/branches · /admin/dashboard · /merchant/overview
   ===================================================================== */
(function () {
  'use strict';
  const A = window.App;
  /* (v1.4, F-014) THE demo "today" — every mock (admin, merchant, financial) derives its dates from this one constant.
     demoNow() starts at 10:00 UTC (13:00 Doha) on DEMO_TODAY and advances with real time while the page is open. */
  const DEMO_TODAY = '2026-11-19';
  const DEMO_T0 = Date.parse(DEMO_TODAY + 'T10:00:00Z'), LOAD_T = Date.now();
  api.DEMO_TODAY = DEMO_TODAY;
  api.demoNow = () => DEMO_T0 + (Date.now() - LOAD_T);
  api.demoIso = () => new Date(api.demoNow()).toISOString();
  api.demoDate = (offsetDays = 0) => { const d = new Date(DEMO_TODAY + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + offsetDays); return d.toISOString().slice(0, 10); };
  const err = api.error;
  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || ''));
  const ago = (min) => new Date(api.demoNow() - min * 60000).toISOString();
  const L = (en, ar) => ({ en, ar });
  const M = (amount, currency = 'QAR') => ({ amount, currency });
  const P = (q) => (q && q.portal === 'merchant' ? 'merchant' : 'admin');

  /* ------------------------------ MARKETS (v1.3) ------------------------------
     Registry of countries the platform can operate in. Qatar is the launch market; UAE and KSA ship disabled and
     can be enabled from Admin → Settings → Markets without code changes. Persisted in the mock store (localStorage). */
  const C = (id, en, ar) => ({ id, name: L(en, ar), enabled: true });
  const MARKETS_SEED = [
    { code: 'QA', name: L('Qatar', 'قطر'), currency: 'QAR', currencyName: L('Qatari Riyal', 'ريال قطري'), currencyLabel: L('QAR', 'ر.ق'), phoneCode: '+974', phoneLength: 8, phonePlaceholder: '5512 3456', supportPhone: '+97455500800', supportPhoneLabel: '5550 0800', supportWhatsApp: '+97455500801', supportEmail: 'support@wonderbites.qa', merchantSupportEmail: 'partners@wonderbites.qa', supportHours: L('Daily 8:00–22:00', 'يوميًا 8:00–22:00'),
      timeZone: 'Asia/Qatar', utcOffset: '+03:00', locale: 'en-QA', flag: 'qa', vatRate: 0, enabled: true, launchedAt: '2026-05-17',
      cities: [C('doha', 'Doha', 'الدوحة'), C('al_rayyan', 'Al Rayyan', 'الريان'), C('al_wakrah', 'Al Wakrah', 'الوكرة'), C('lusail', 'Lusail', 'لوسيل'), C('al_khor', 'Al Khor', 'الخور')] },
    { code: 'AE', name: L('United Arab Emirates', 'الإمارات العربية المتحدة'), currency: 'AED', currencyName: L('UAE Dirham', 'درهم إماراتي'), currencyLabel: L('AED', 'د.إ'), phoneCode: '+971', phoneLength: 9, phonePlaceholder: '5550 4567', supportPhone: '+971555500800', supportPhoneLabel: '55 550 0800', supportWhatsApp: '+971555500801', supportEmail: 'support@wonderbites.ae', merchantSupportEmail: 'partners@wonderbites.ae', supportHours: L('Daily 9:00–22:00', 'يوميًا 9:00–22:00'),
      timeZone: 'Asia/Dubai', utcOffset: '+04:00', locale: 'en-AE', flag: 'ae', vatRate: 5, enabled: false, launchedAt: null,
      cities: [C('dubai', 'Dubai', 'دبي'), C('abu_dhabi', 'Abu Dhabi', 'أبوظبي'), C('sharjah', 'Sharjah', 'الشارقة')] },
    { code: 'SA', name: L('Saudi Arabia', 'المملكة العربية السعودية'), currency: 'SAR', currencyName: L('Saudi Riyal', 'ريال سعودي'), currencyLabel: L('SAR', 'ر.س'), phoneCode: '+966', phoneLength: 9, phonePlaceholder: '5550 4567', supportPhone: '+966555500800', supportPhoneLabel: '55 550 0800', supportWhatsApp: '+966555500801', supportEmail: 'support@wonderbites.sa', merchantSupportEmail: 'partners@wonderbites.sa', supportHours: L('Daily 9:00–23:00', 'يوميًا 9:00–23:00'),
      timeZone: 'Asia/Riyadh', utcOffset: '+03:00', locale: 'en-SA', flag: 'sa', vatRate: 15, enabled: false, launchedAt: null,
      cities: [C('riyadh', 'Riyadh', 'الرياض'), C('jeddah', 'Jeddah', 'جدة'), C('dammam', 'Dammam', 'الدمام')] },
  ];
  /* FX: manual rates, 1 unit of `currency` = `rate` units of the reporting currency */
  const FX_SEED = { reportingCurrency: 'QAR', updatedAt: '2026-11-19T06:00:00Z', updatedBy: 'Sarah Al Manasoori', base: 'QAR',
    rates: [{ currency: 'QAR', rate: 1 }, { currency: 'AED', rate: 0.9913 }, { currency: 'SAR', rate: 0.9707 }] };
  const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } } };
  const MK = 'wb.mock.markets.v1', FXK = 'wb.mock.fx.v1';
  let markets = store.get(MK, null) || JSON.parse(JSON.stringify(MARKETS_SEED));
  /* (v1.4 F-005) stored registries from older sessions get the new support-contact fields from the seed */
  const SUPPORT_KEYS = ['supportPhone', 'supportPhoneLabel', 'supportWhatsApp', 'supportEmail', 'merchantSupportEmail', 'supportHours'];
  markets.forEach((m) => { const sd = MARKETS_SEED.find((x) => x.code === m.code); if (sd) SUPPORT_KEYS.forEach((k) => { if (m[k] === undefined || (k === 'supportPhone' && /44000800|800966337/.test(m[k]))) m[k] = JSON.parse(JSON.stringify(sd[k])); }); });
  let fx = store.get(FXK, null) || JSON.parse(JSON.stringify(FX_SEED));
  const saveMk = () => store.set(MK, markets), saveFx = () => store.set(FXK, fx);
  const mget = (code) => markets.find((m) => m.code === String(code || '').toUpperCase()) || null;
  const enabledCodes = () => markets.filter((m) => m.enabled).map((m) => m.code);
  /* rate of 1 unit of `cur` in QAR (the seed base) */
  const toBase = (cur) => { const r = fx.rates.find((x) => x.currency === cur); const rep = fx.rates.find((x) => x.currency === 'QAR'); return r ? r.rate / (rep ? rep.rate : 1) : 1; };
  api.markets = {
    all: () => markets, get: mget, enabledCodes, fx: () => fx,
    currencyOf: (code) => (mget(code) || markets[0]).currency, timeZoneOf: (code) => (mget(code) || markets[0]).timeZone,
    /** convert an amount between currencies with the manual rates (via the reporting currency) */
    convert: (amount, from, to) => { if (from === to) return amount; const r = (c) => (fx.rates.find((x) => x.currency === c) || { rate: 1 }).rate; return amount * r(from) / r(to); },
    toBase,
    /** convert every Money {amount,currency} and money Kpi inside `obj` (in place) into currency `to` */
    convertDeep(obj, to, depth = 0) {
      if (!obj || typeof obj !== 'object' || depth > 8) return obj;
      if (Array.isArray(obj)) { obj.forEach((x) => api.markets.convertDeep(x, to, depth + 1)); return obj; }
      const r2 = (v) => Math.round(v * 100) / 100;
      if (typeof obj.amount === 'number' && typeof obj.currency === 'string' && obj.currency !== to) { obj.amount = r2(api.markets.convert(obj.amount, obj.currency, to)); obj.currency = to; return obj; }
      if (obj.format === 'money' && typeof obj.value === 'number' && (obj.currency || 'QAR') !== to) { obj.value = r2(api.markets.convert(obj.value, obj.currency || 'QAR', to)); obj.currency = to; }
      for (const k in obj) if (obj[k] && typeof obj[k] === 'object') api.markets.convertDeep(obj[k], to, depth + 1);
      return obj;
    },
  };
  /* a request's market scope: 'all' / missing → every enabled market; a code → that market */
  api.scopeFor = (m) => { if (m == null) return null; const all = enabledCodes(); if (m === 'all' || m === '') return all; const c = String(m).toUpperCase(); return all.includes(c) ? [c] : []; };
  const pubMarket = (m) => JSON.parse(JSON.stringify(m));
  api.mock('GET', '/shared/markets', ({ query }) => { const list = markets.filter((m) => !(query.enabled === 'true' || query.enabled === true) || m.enabled).map(pubMarket); return { data: list, meta: { reportingCurrency: fx.reportingCurrency, fx: { rates: fx.rates, updatedAt: fx.updatedAt } } }; });
  api.mock('GET', '/shared/markets/:code', ({ params }) => pubMarket(mget(params.code) || api.notFound('Market')));
  api.mock('GET', '/admin/settings/markets', () => ({ data: markets.map(pubMarket), meta: { reportingCurrency: fx.reportingCurrency } }));
  api.mock('PATCH', '/admin/settings/markets/:code', ({ params, body }) => {
    const m = mget(params.code) || api.notFound('Market'); const b = body || {};
    if (b.enabled === false && m.enabled && enabledCodes().length <= 1) throw err(409, 'conflict', 'At least one market must stay enabled.');
    if (b.enabled === false && fx.reportingCurrency === m.currency && markets.filter((x) => x.enabled && x.currency === m.currency).length <= 1) throw err(409, 'conflict', 'Change the reporting currency before disabling this market.');
    if (b.vatRate != null && !(+b.vatRate >= 0 && +b.vatRate <= 30)) throw err(422, 'validation_error', 'VAT must be between 0 and 30%.', { vatRate: 'range' });
    if (b.phoneCode != null && !/^\+\d{1,4}$/.test(b.phoneCode)) throw err(422, 'validation_error', 'Use a phone code like +974.', { phoneCode: 'format' });
    if (b.supportEmail != null && b.supportEmail !== '' && !isEmail(b.supportEmail)) throw err(422, 'validation_error', 'Enter a valid support email.', { supportEmail: 'invalid' });
    ['supportPhone', 'supportWhatsApp'].forEach((k) => { if (b[k] != null && b[k] !== '' && !/^\+\d[\d\s]{6,}$/.test(b[k])) throw err(422, 'validation_error', 'Use an international number like +974 5550 0800.', { [k]: 'format' }); });
    ['enabled', 'timeZone', 'phoneCode', 'locale', 'supportEmail', 'merchantSupportEmail', 'supportWhatsApp'].forEach((k) => { if (b[k] !== undefined) m[k] = b[k]; });
    if (b.supportPhone !== undefined) { m.supportPhone = String(b.supportPhone).replace(/\s/g, ''); m.supportPhoneLabel = String(b.supportPhone).replace(/^\+\d{3}\s?/, ''); }
    if (b.supportHours !== undefined) m.supportHours = typeof b.supportHours === 'object' ? b.supportHours : L(b.supportHours, b.supportHours);
    if (b.vatRate != null) m.vatRate = +b.vatRate;
    if (b.enabled && !m.launchedAt) m.launchedAt = '2026-11-19'; // dataset 'today'
    saveMk(); return pubMarket(m);
  });
  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  api.mock('POST', '/admin/settings/markets/:code/cities', ({ params, body }) => {
    const m = mget(params.code) || api.notFound('Market'); const b = body || {};
    if (!b.name || !b.name.en) throw err(422, 'validation_error', 'Enter the city name in English.', { 'name.en': 'required' });
    const id = slug(b.name.en); if (m.cities.some((c) => c.id === id)) throw err(409, 'conflict', 'This city already exists.', { name: 'duplicate' });
    const c = { id, name: { en: b.name.en, ar: b.name.ar || b.name.en }, enabled: b.enabled !== false }; m.cities.push(c); saveMk(); return c;
  });
  api.mock('PATCH', '/admin/settings/markets/:code/cities/:id', ({ params, body }) => {
    const m = mget(params.code) || api.notFound('Market'); const c = m.cities.find((x) => x.id === params.id) || api.notFound('City'); const b = body || {};
    if (b.name) c.name = { en: b.name.en || c.name.en, ar: b.name.ar || b.name.en || c.name.ar }; if (b.enabled !== undefined) c.enabled = !!b.enabled; saveMk(); return c;
  });
  api.mock('GET', '/admin/settings/fx', () => fx);
  api.mock('PUT', '/admin/settings/fx', ({ body }) => {
    const b = body || {}; const cur = b.reportingCurrency || fx.reportingCurrency;
    if (!markets.some((m) => m.currency === cur)) throw err(422, 'validation_error', 'Unknown reporting currency.', { reportingCurrency: 'enum' });
    const rates = (b.rates || fx.rates).map((r) => ({ currency: r.currency, rate: +r.rate }));
    if (rates.some((r) => !(r.rate > 0))) throw err(422, 'validation_error', 'Rates must be greater than 0.', { rates: 'range' });
    /* rates are entered against the reporting currency: re-base so the reporting currency is exactly 1 */
    const rr = (rates.find((r) => r.currency === cur) || { rate: 1 }).rate;
    fx = { ...fx, reportingCurrency: cur, base: cur, rates: rates.map((r) => ({ currency: r.currency, rate: +(r.rate / rr).toFixed(6) })), updatedAt: new Date().toISOString(), updatedBy: (A.state.user && A.state.user.name) || 'Admin' };
    saveFx(); return fx;
  });
  api.mock('POST', '/admin/settings/markets/reset', () => { markets = JSON.parse(JSON.stringify(MARKETS_SEED)); fx = JSON.parse(JSON.stringify(FX_SEED)); saveMk(); saveFx(); return { ok: true }; });

  /* aggregate lens: the seeded admin dashboards are the Qatar figures; other markets contribute by these weights.
     A single market shows its own currency; "All markets" converts every contribution into the reporting currency. */
  const WEIGHT = { QA: 1, AE: 0.46, SA: 0.38 };
  const lensMoney = (amount, codes, out) => { let base = 0; codes.forEach((c) => { base += amount * (WEIGHT[c] || 0.3); }); const target = codes.length === 1 ? api.markets.currencyOf(codes[0]) : fx.reportingCurrency; out.cur = target; return api.markets.convert(base, 'QAR', target); };
  const lensCount = (n, codes) => codes.reduce((a, c) => a + n * (WEIGHT[c] || 0.3), 0);
  function lensWalk(o, codes, depth = 0) {
    if (!o || typeof o !== 'object' || depth > 8) return o;
    if (Array.isArray(o)) { o.forEach((x) => lensWalk(x, codes, depth + 1)); return o; }
    const round = (v, ref) => (Number.isInteger(ref) ? Math.round(v) : +v.toFixed(2));
    if ('amount' in o && typeof o.amount === 'number' && typeof o.currency === 'string') { const r = {}; o.amount = round(lensMoney(o.amount, codes, r), o.amount); o.currency = r.cur; return o; }
    if ('format' in o && typeof o.value === 'number') {
      if (o.format === 'money') { const r = {}; o.value = round(lensMoney(o.value, codes, r), o.value); o.currency = r.cur; if (Array.isArray(o.sparkline)) o.sparkline = o.sparkline.map((v) => round(lensCount(v, codes), v)); }
      else if (['number', 'weight_kg', 'tonnes', 'litres', 'gallons'].includes(o.format)) { o.value = round(lensCount(o.value, codes), o.value); if (Array.isArray(o.sparkline)) o.sparkline = o.sparkline.map((v) => round(lensCount(v, codes), v)); }
      return o;
    }
    if (Array.isArray(o.points)) { o.points.forEach((pt) => { if (typeof pt.y === 'number') pt.y = round(lensCount(pt.y, codes), pt.y); }); }
    for (const k in o) if (k !== 'points' && o[k] && typeof o[k] === 'object') lensWalk(o[k], codes, depth + 1);
    return o;
  }
  api.marketLens = (out, req) => {
    const codes = req && req.markets; if (!codes) return out;
    if (codes.length === 1 && codes[0] === 'QA' && fx.reportingCurrency === 'QAR') return out; // seed = Qatar figures
    const res = out && typeof out === 'object' && 'data' in out ? out : { data: out };
    lensWalk(res.data, codes); res.meta = { ...(res.meta || {}), market: { scope: codes, converted: codes.length > 1 && new Set(codes.map(api.markets.currencyOf)).size > 1, reportingCurrency: fx.reportingCurrency } };
    return res;
  };
  /* Command Center aggregates (financials/analytics have their own market-aware mock in admin-business.js) */
  [/^\/admin\/dashboard/].forEach((re) => api.lens(re, api.marketLens));

  /* ------------------------------ AUTH ------------------------------ */
  const challenges = {};
  const tokens = (user) => ({ accessToken: 'mock.jwt.' + user.portal + '.' + Date.now().toString(36), refreshToken: 'mock.refresh.' + Date.now().toString(36), expiresIn: 900, user });
  const userFor = (portal, email) => ({ ...A.DEMO[portal], email: email || A.DEMO[portal].email });
  api.mock('POST', '/auth/login', ({ body }) => {
    const { portal = 'admin', email, password } = body || {};
    if (!isEmail(email) || !password) throw err(422, 'validation_error', 'Enter a valid email and password.', { email: !isEmail(email), password: !password });
    if (/^wrong|locked/i.test(email) || password === 'wrong') throw err(401, 'unauthorized', 'Incorrect email or password.');
    let user = userFor(portal, email);
    /* (v1.4 FLOW-01) merchant accounts: only verified/active merchants may sign in; sign-ups wait for admin approval.
       Unknown emails keep the demo behaviour (signed in as the demo merchant, Fig & Bloom). */
    if (portal === 'merchant' && window.WBStore) {
      const S = window.WBStore; const acc = S.accountFor(email) || (() => { const m = S.merchants.find((x) => x.contact && String(x.contact.email).toLowerCase() === String(email).toLowerCase()); return m ? { merchantId: m.id, user: null } : null; })();
      if (acc) {
        const st = S.merchantStatus(acc.merchantId);
        if (st === 'pending') throw err(403, 'pending_verification', 'Your merchant account is pending verification by WonderBites. You can sign in once it’s approved.', { merchantId: acc.merchantId, status: st });
        if (st === 'rejected') throw err(403, 'account_rejected', 'This merchant application was not approved. Contact WonderBites support for details.', { merchantId: acc.merchantId, status: st });
        if (st === 'suspended') throw err(403, 'account_suspended', 'This merchant account is suspended. Contact WonderBites support.', { merchantId: acc.merchantId, status: st });
        if (acc.user) user = JSON.parse(JSON.stringify(acc.user)); else { const m = S.merchants.find((x) => x.id === acc.merchantId); if (m && m.id !== 'MER-066') user = { ...user, merchant: { ...user.merchant, merchantId: m.id, name: m.name.en, verified: true } }; }
        if (user.merchant) user.merchant.verified = true;
      }
    }
    if (user.twoFactorEnabled) {
      const id = 'ch_' + Date.now().toString(36); challenges[id] = { portal, user };
      return { requires2fa: true, challengeId: id, sentTo: email.replace(/^(.).*(@.*)$/, '$1•••$2') };
    }
    return { requires2fa: false, ...tokens(user) };
  });
  api.mock('POST', '/auth/otp/verify', ({ body }) => {
    const c = challenges[body && body.challengeId];
    if (!c) throw err(410, 'not_found', 'This code has expired. Request a new one.');
    if (!/^\d{6}$/.test(String(body.code || ''))) throw err(422, 'validation_error', 'Enter the 6-digit code.');
    if (body.code === '000000') throw err(401, 'unauthorized', 'That code is incorrect. Try again.');
    delete challenges[body.challengeId];
    /* (v1.4 FLOW-01) a sign-up's code verifies the email only — the account then waits for admin approval */
    if (c.signup) return { verified: true, status: 'pending_verification', merchantId: c.merchantId, email: c.user.email };
    return tokens(c.user);
  });
  api.mock('POST', '/auth/otp/resend', ({ body }) => { const c = challenges[body && body.challengeId]; return { sentTo: c ? c.user.email.replace(/^(.).*(@.*)$/, '$1•••$2') : '', retryAfter: 30 }; });
  api.mock('POST', '/auth/merchant/signup', ({ body }) => {
    const b = body || {};
    if (!b.businessName || !b.businessName.en || !b.ownerFirstName || !b.ownerLastName || !isEmail(b.email) || !b.password || !b.acceptTerms) throw err(422, 'validation_error', 'Please complete all required fields.');
    if (/taken/i.test(b.email)) throw err(409, 'conflict', 'An account with this email already exists.');
    const id = 'ch_' + Date.now().toString(36);
    const mk = mget(b.country); if (!mk || !mk.enabled) throw err(422, 'validation_error', 'WonderBites isn’t available in this country yet.', { country: 'not_enabled' });
    if (b.city && !mk.cities.some((c) => c.id === b.city)) throw err(422, 'validation_error', 'Choose a city in the selected country.', { city: 'enum' });
    const br = { id: 'BR-01', name: { en: 'Main Branch', ar: 'الفرع الرئيسي' }, country: mk.code, city: b.city || mk.cities[0].id, currency: mk.currency, timeZone: mk.timeZone };
    const user = { ...A.DEMO.merchant, id: 'MU-NEW', firstName: b.ownerFirstName, lastName: b.ownerLastName, name: b.ownerFirstName, email: b.email, country: mk.code, timeZone: mk.timeZone,
      merchant: { ...A.DEMO.merchant.merchant, merchantId: 'MER-NEW', name: b.businessName.en, verified: false, country: mk.code, currency: mk.currency, timeZone: mk.timeZone, branches: [br], defaultBranchId: 'BR-01' } };
    /* (v1.4 FLOW-01) the sign-up creates a Pending verification merchant in the shared store (Admin → Merchants) */
    const S = window.WBStore; let merchantId = 'MER-NEW';
    if (S && S.adminCreateMerchant) {
      if (S.accountFor(b.email)) throw err(409, 'conflict', 'An account with this email already exists.');
      const m = S.adminCreateMerchant({ business: { name: b.businessName, category: b.category || 'bakery', tradeLicenseNo: b.tradeLicenseNo || 'TL-PENDING', legalName: b.businessName.en }, contact: { ownerName: `${b.ownerFirstName} ${b.ownerLastName}`, email: b.email, phone: b.phone || `${mk.phoneCode} 5550 0000` }, location: { city: br.city, country: mk.code, address: b.address || 'Address pending' }, source: 'self_signup' });
      merchantId = m.id; user.merchant.merchantId = m.id; S.accounts.push({ email: b.email, merchantId: m.id, user, createdAt: api.demoIso() });
    }
    challenges[id] = { portal: 'merchant', user, signup: true, merchantId };
    return { merchantId, status: 'pending', challengeId: id };
  });
  api.mock('POST', '/auth/password/forgot', ({ body }) => { if (!isEmail(body && body.email)) throw err(422, 'validation_error', 'Enter a valid email address.'); return null; });
  api.mock('POST', '/auth/password/reset', ({ body }) => { if (!body || !body.password || body.password.length < 8) throw err(422, 'validation_error', 'Use at least 8 characters.'); if (body.password !== body.confirmPassword) throw err(422, 'validation_error', 'Passwords do not match.'); return null; });
  api.mock('POST', '/auth/logout', () => null);
  api.mock('POST', '/auth/refresh', () => tokens(A.state.user || A.DEMO.admin));
  api.mock('GET', '/me', () => A.state.user || A.DEMO[A.state.portal || 'admin']);

  /* ------------------------------ NOTIFICATIONS ------------------------------ */
  const N = {
    admin: [
      { id: 'ntf_901', type: 'issue', severity: 'critical', title: 'Green Bowl Kitchen — spoiled inventory reported', body: 'Critical · Merchant report', link: { route: 'admin-issues', id: 'CASE-1092', params: { tab: 'issues', id: 'CASE-1092' } }, read: false, createdAt: ago(12) },
      { id: 'ntf_902', type: 'pickup', severity: 'high', title: 'Drop #482 pickup window closes soon', body: 'Warning · 15 min left', link: { route: 'admin-drops', id: 'DR-482', params: { id: 'DR-482' } }, read: false, createdAt: ago(12) },
      { id: 'ntf_903', type: 'system', severity: 'medium', title: 'New merchant onboarding awaiting review', body: 'Information · Fresh Fig Co.', link: { route: 'admin-merchants', params: { status: 'pending' } }, read: false, createdAt: ago(24) },
      { id: 'ntf_904', type: 'alert', severity: 'low', title: 'Weekly quality report is ready', body: 'Monitor · Auto-generated', link: { route: 'admin-quality', params: {} }, read: false, createdAt: ago(60) },
      { id: 'ntf_905', type: 'payout', severity: 'low', title: 'Payout batch settled', body: 'QAR 135,120 paid to 42 merchants', link: { route: 'admin-financials', params: {} }, read: true, createdAt: ago(300) },
      { id: 'ntf_906', type: 'pickup', severity: 'medium', title: '78 pickup passports need attention', body: 'Pickup Passport Monitoring', link: { route: 'admin-pickups', params: { filter: 'attention' } }, read: true, createdAt: ago(1440) },
    ],
    merchant: [
      { id: 'ntf_801', type: 'inventory', severity: 'critical', title: '3 bags sold out', body: 'Artisan Bread Bag reached zero stock', link: { route: 'm-inventory', params: { status: 'sold_out' } }, read: false, createdAt: ago(5) },
      { id: 'ntf_802', type: 'pickup', severity: 'high', title: 'Pickup window closing soon', body: '4 orders awaiting collection by 20:00', link: { route: 'm-orders', params: { status: 'ready_for_pickup' } }, read: false, createdAt: ago(18) },
      { id: 'ntf_803', type: 'payout', severity: 'low', title: 'Payout processed', body: 'QAR 18,240 settled to your account', link: { route: 'm-analytics', params: {} }, read: false, createdAt: ago(60) },
      { id: 'ntf_804', type: 'review', severity: 'low', title: 'New 5-star review', body: 'Amina K. reviewed Morning Pastry Box', link: { route: 'm-reviews', params: {} }, read: false, createdAt: ago(120) },
      { id: 'ntf_805', type: 'order', severity: 'low', title: 'Driver assigned', body: 'Faisal Noor is delivering MO-5208', link: { route: 'm-orders', id: 'MO-5208', params: { id: 'MO-5208' } }, read: true, createdAt: ago(240) },
    ],
  };
  const downloads = { admin: [], merchant: [] };
  const unread = (p) => N[p].filter((n) => !n.read).length + downloads[p].filter((n) => !n.read).length;
  api.mock('GET', '/shared/notifications', ({ query }) => {
    const p = P(query);
    let list = query.tab === 'downloads' ? downloads[p] : [...downloads[p].filter((d) => !d.read), ...N[p]];
    if (query.tab === 'unread') list = list.filter((n) => !n.read);
    if (query.type) list = list.filter((n) => n.type === query.type);
    const ps = +query.pageSize || 20, pg = +query.page || 1;
    return { data: list.slice((pg - 1) * ps, pg * ps), page: pg, pageSize: ps, total: list.length, summary: { unreadCount: unread(p) } };
  });
  api.mock('POST', '/shared/notifications/read-all', ({ body }) => { const p = P(body); let n = 0; [...N[p], ...downloads[p]].forEach((x) => { if (!x.read) { x.read = true; n++; } }); return { updated: n }; });
  api.mock('PATCH', '/shared/notifications/:id', ({ params, body }) => { const all = [...N.admin, ...N.merchant, ...downloads.admin, ...downloads.merchant]; const x = all.find((n) => n.id === params.id); if (!x) api.notFound('Notification'); x.read = body && body.read !== undefined ? !!body.read : true; return x; });

  /* ------------------------------ EXPORTS ------------------------------ */
  const jobs = {};
  api.mock('POST', '/shared/exports', ({ body }) => {
    const b = body || {};
    if (!b.resource || !b.format) throw err(422, 'validation_error', 'Choose what to export and a format.');
    if (!(b.columns || []).length) throw err(422, 'validation_error', 'Select at least one column.');
    const id = 'exp_' + (4200 + Object.keys(jobs).length + 1);
    const day = (s) => String(s || '').slice(0, 10);
    const portal = b.resource.startsWith('merchant.') ? 'merchant' : 'admin';
    const job = { id, resource: b.resource, format: b.format, scope: b.scope, status: 'processing', progress: 10, rows: null, fileName: `wonderbites-${b.resource.replace(/\./g, '-')}-${day(b.from)}_${day(b.to)}.${b.format}`, downloadUrl: null, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 864e5).toISOString(), columns: b.columns, portal };
    jobs[id] = job; return job;
  });
  api.mock('POST', '/shared/exports/:id/complete', ({ params }) => {
    const j = jobs[params.id]; if (!j) api.notFound('Export');
    Object.assign(j, { status: 'ready', progress: 100, rows: 5, downloadUrl: '#mock-download/' + j.id });
    downloads[j.portal].unshift({ id: 'ntf_' + j.id, type: 'export', severity: 'low', title: 'Your export is ready', body: j.fileName, link: { route: '', id: j.id, params: {} }, read: false, createdAt: new Date().toISOString(), export: { id: j.id, fileName: j.fileName, columns: j.columns } });
    return j;
  });
  api.mock('GET', '/shared/exports', ({ query }) => { const list = Object.values(jobs).filter((j) => !query.status || j.status === query.status); return { data: list, page: 1, pageSize: list.length || 10, total: list.length }; });
  api.mock('GET', '/shared/exports/:id', ({ params }) => jobs[params.id] || api.notFound('Export'));

  /* ------------------------------ SEARCH ------------------------------ */
  const IDX = {
    admin: [
      { type: 'drops', id: 'DR-3391', title: 'Deli Surprise Box', subtitle: 'DR-3391 · Sunrise Bakehouse', link: { route: 'admin-drops', id: 'DR-3391', params: { id: 'DR-3391' } }, k: 'dr-3391 deli surprise sunrise' },
      { type: 'drops', id: 'DR-3388', title: 'Morning Pastry Box', subtitle: 'DR-3388 · Fig & Bloom Bakery', link: { route: 'admin-drops', id: 'DR-3388', params: { id: 'DR-3388' } }, k: 'dr-3388 morning pastry fig bloom' },
      { type: 'merchants', id: 'MER-058', title: 'Green Bowl Kitchen', subtitle: 'MER-058 · Doha', link: { route: 'admin-merchant-detail', id: 'MER-058', params: { id: 'MER-058' } }, k: 'mer-058 green bowl kitchen' },
      { type: 'merchants', id: 'MER-094', title: 'Sunrise Bakehouse', subtitle: 'MER-094 · Doha', link: { route: 'admin-merchant-detail', id: 'MER-094', params: { id: 'MER-094' } }, k: 'mer-094 sunrise bakehouse' },
      { type: 'merchants', id: 'MER-066', title: 'Fig & Bloom Bakery', subtitle: 'MER-066 · Doha', link: { route: 'admin-merchant-detail', id: 'MER-066', params: { id: 'MER-066' } }, k: 'mer-066 fig bloom bakery' },
      { type: 'cases', id: 'CASE-1092', title: 'Spoiled inventory', subtitle: '#1092 · Green Bowl Kitchen', link: { route: 'admin-issues', id: 'CASE-1092', params: { tab: 'issues', id: 'CASE-1092' } }, k: '#1092 1092 spoiled green bowl' },
      { type: 'cases', id: 'CASE-1091', title: 'Late pickup window', subtitle: '#1091 · Sunrise Bakehouse', link: { route: 'admin-issues', id: 'CASE-1091', params: { tab: 'issues', id: 'CASE-1091' } }, k: '#1091 1091 late pickup sunrise' },
      { type: 'orders', id: '3021', title: 'Order #3021', subtitle: 'Fig & Bloom Bakery · Live', link: { route: 'admin-orders', id: '3021', params: { id: '3021' } }, k: '#3021 3021 order fig' },
      { type: 'consumers', id: 'CON-48291', title: 'Aisha Al Mansoori', subtitle: 'CON-48291', link: { route: 'admin-consumer-detail', id: 'CON-48291', params: { id: 'CON-48291' } }, k: 'aisha mansoori con-48291' },
    ],
    merchant: [
      { type: 'orders', id: 'MO-5210', title: 'MO-5210', subtitle: 'Aisha Al Mansoori · Ready', link: { route: 'm-orders', id: 'MO-5210', params: { id: 'MO-5210' } }, k: 'mo-5210 aisha' },
      { type: 'listings', id: 'LIS-101', title: 'Morning Pastry Box', subtitle: '86 sold', link: { route: 'm-listings', params: { q: 'Morning Pastry Box' } }, k: 'morning pastry box' },
      { type: 'customers', id: 'CUS-301', title: 'Amina K.', subtitle: '12 orders', link: { route: 'm-customer-detail', id: 'CUS-301', params: { id: 'CUS-301' } }, k: 'amina' },
    ],
  };
  const GROUP = { drops: 'Drops', merchants: 'Merchants', cases: 'Issues', orders: 'Orders', consumers: 'Consumers', listings: 'Listings', customers: 'Customers', pickups: 'Pickups', tickets: 'Tickets' };
  api.mock('GET', '/shared/search', ({ query }) => {
    const q = String(query.q || '').toLowerCase().trim(); const p = P(query);
    if (!q) throw err(422, 'validation_error', 'Type something to search.');
    const hits = IDX[p].filter((x) => (x.k.includes(q) || x.title.toLowerCase().includes(q)) && (!query.scope || query.scope === 'all' || x.type === query.scope));
    const groups = [];
    hits.forEach(({ k, ...h }) => { let g = groups.find((x) => x.type === h.type); if (!g) groups.push((g = { type: h.type, label: GROUP[h.type] || h.type, total: 0, items: [] })); g.items.push(h); g.total++; });
    return { groups };
  });

  /* ------------------------------ IMPACT / HELP / TICKETS / MY BRANCHES ------------------------------ */
  api.mock('GET', '/shared/impact', ({ query }) => (P(query) === 'merchant' ? { period: '2026-11', mealsSaved: 412, co2Tonnes: 1.03, waterLitres: 9800, foodKg: 515 } : { period: '2026-11', mealsSaved: 52400, co2Tonnes: 24.1, waterLitres: 11800, foodKg: 65500 }));
  const FAQ = {
    merchant: [
      ['How do I create a new surprise bag?', 'كيف أنشئ كيس مفاجآت جديداً؟', 'Go to Inventory → Add New Listing, or use Create from Template on the Overview banner. Set price, quantity and pickup window, then publish.', 'انتقل إلى المخزون ← إضافة قائمة جديدة، أو استخدم «أنشئ من قالب» في شريط النظرة العامة. حدّد السعر والكمية ونافذة الاستلام ثم انشر.'],
      ['When do I receive my payouts?', 'متى أستلم مدفوعاتي؟', 'Payouts are settled every Monday for the previous week, usually within 2–3 business days.', 'تُسوّى المدفوعات كل يوم اثنين عن الأسبوع السابق، وعادةً خلال 2–3 أيام عمل.'],
      ['How do I change today’s pickup window?', 'كيف أغيّر نافذة الاستلام لليوم؟', 'Open Overview → Operational Status, or Settings → Operating Hours, and adjust the window for your branch.', 'افتح النظرة العامة ← الحالة التشغيلية، أو الإعدادات ← ساعات العمل، وعدّل النافذة لفرعك.'],
      ['What happens if a customer doesn’t show up?', 'ماذا يحدث إذا لم يحضر العميل؟', 'Orders not collected by the end of the pickup window are marked as no-show. You can report repeated no-shows from Reports / Dispute.', 'تُسجَّل الطلبات غير المستلمة بنهاية نافذة الاستلام كعدم حضور. يمكنك الإبلاغ عن التكرار من البلاغات / النزاعات.'],
    ],
    admin: [
      ['How do I verify a new merchant?', 'كيف أوثّق تاجراً جديداً؟', 'Open Merchants, filter by Pending Verification and review the compliance documents before approving.', 'افتح التجار، وصفِّ حسب «بانتظار التوثيق»، وراجع مستندات الامتثال قبل الموافقة.'],
      ['How are refunds approved?', 'كيف تتم الموافقة على الاسترداد؟', 'Refunds follow the Refund & Cancellation policy in Settings → Policies. Orders outside the policy need a supervisor override.', 'يتبع الاسترداد سياسة الاسترداد والإلغاء في الإعدادات ← السياسات. الطلبات خارج السياسة تحتاج موافقة المشرف.'],
      ['How do I issue wallet credit?', 'كيف أصدر رصيداً للمحفظة؟', 'Go to Wallet & Vouchers → Wallet Credit and use Issue Credit. Every adjustment is recorded in the audit log.', 'انتقل إلى المحفظة والقسائم ← رصيد المحفظة واستخدم «إصدار رصيد». يُسجَّل كل تعديل في سجل التدقيق.'],
    ],
  };
  api.mock('GET', '/shared/help/faqs', ({ query }) => FAQ[P(query)].map((f, i) => ({ id: 'faq_' + P(query)[0] + i, question: L(f[0], f[1]), answer: L(f[2], f[3]), category: 'general', audience: P(query) === 'merchant' ? 'merchants' : 'all', order: i + 1, status: 'published', updatedAt: '2026-10-31T09:00:00Z' })));
  let tk = 7310;
  /* (v1.4 FLOW-15) Need Help tickets land in the shared store → Admin → Support (merchant tickets also show under Help → My requests) */
  api.mock('POST', '/shared/support/tickets', ({ body }) => {
    if (!body || !body.subject || !body.message) throw err(422, 'validation_error', 'Subject and message are required.');
    const S = window.WBStore; const id = 'TCK-' + ++tk; const at = api.demoIso(); const merchant = body.portal === 'merchant';
    const t = { id, number: String(tk), source: merchant ? 'help' : 'portal', merchantId: merchant ? S.me() : null, market: (A.market && A.market()) || 'QA', subject: L(body.subject, body.subject), category: body.category || 'other', channel: 'in_app', priority: 'medium', status: 'open', assigneeId: null, createdAt: at, updatedAt: at, lastMessageAt: at, relatedOrderId: null,
      requester: merchant ? { type: 'merchant', id: S.me(), name: L('Fig & Bloom Bakery', 'مخبز فيغ آند بلوم'), email: 'partners@figandbloom.example.com' } : { type: 'admin', id: 'usr_01', name: L('Sarah Al Manasoori', 'سارة المنصوري'), email: 'sarah@wonderbites.example.com' },
      messages: [{ id: id + '-m1', at, author: { type: merchant ? 'merchant' : 'requester', name: merchant ? L('Fig & Bloom Bakery', 'مخبز فيغ آند بلوم') : L('Sarah Al Manasoori', 'سارة المنصوري') }, internal: false, body: L(body.message, body.message), attachments: [] }] };
    if (S) S.tickets.unshift(t);
    return { id, number: String(tk), subject: body.subject, status: 'open', priority: 'medium', channel: 'portal', category: body.category, createdAt: at };
  });
  /* branches (and their market fields) come from the merchant branch store (D4 mock); fallback = demo merchant */
  const branchMk = (b) => { const mk = mget(b.country || 'QA') || markets[0]; return { id: b.id, name: b.name, country: mk.code, city: b.city, currency: mk.currency, timeZone: mk.timeZone, state: b.state || 'open', isPrimary: b.id === 'BR-01' }; };
  const myBranches = async () => { try { const r = await api('GET', '/merchant/branches', { pageSize: 100 }); return r.data.map(branchMk); } catch (e) { return A.DEMO.merchant.merchant.branches.map(branchMk); } };
  api.mock('GET', '/merchant/me/branches', () => myBranches());
  api.mock('GET', '/merchant/context', async () => { const d = A.DEMO.merchant.merchant; const mk = mget(d.country) || markets[0]; return { merchantId: d.merchantId, name: d.name, logoUrl: null, verified: true, defaultBranchId: d.defaultBranchId, country: mk.code, currency: mk.currency, timeZone: mk.timeZone, branches: await myBranches() }; });

  /* ------------------------------ ADMIN · COMMAND CENTER ------------------------------ */
  const kpi = (key, label, value, format, delta, deltaUnit, comparison, sparkline, extra) => ({ key, label, value, format, delta, deltaUnit, trend: delta == null ? 'flat' : delta >= 0 ? 'up' : 'down', comparison, sparkline, ...(extra || {}) });
  const series = (key, label, kind, xs, ys) => ({ key, label, kind, points: xs.map((x, i) => ({ x, y: ys[i] })) });
  const pad = (x) => String(x).padStart(2, '0');
  const days = (from, n, step = 1) => Array.from({ length: n }, (_, i) => { const d = new Date(from + 'T00:00:00'); d.setDate(d.getDate() + i * step); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; });
  let alerts = [
    { id: 'alr_201', type: 'merchant', severity: 'critical', title: 'Green Bowl Kitchen — spoiled inventory reported', source: 'Merchant', subtitle: 'Critical', link: { route: 'admin-issues', id: 'CASE-1092', params: { tab: 'issues', id: 'CASE-1092' } }, createdAt: ago(12) },
    { id: 'alr_202', type: 'warning', severity: 'high', title: 'Drop #482 pickup window closes soon', source: 'Warning', subtitle: '15 min left', link: { route: 'admin-drops', id: 'DR-482', params: { id: 'DR-482' } }, createdAt: ago(12) },
    { id: 'alr_203', type: 'information', severity: 'medium', title: 'New merchant onboarding awaiting review', source: 'Information', subtitle: 'Fresh Fig Co.', link: { route: 'admin-merchants', params: { status: 'pending' } }, createdAt: ago(24) },
    { id: 'alr_204', type: 'monitor', severity: 'low', title: 'Weekly quality report is ready', source: 'Monitor', subtitle: 'Auto-generated', link: { route: 'admin-quality', params: {} }, createdAt: ago(60) },
    { id: 'alr_205', type: 'information', severity: 'medium', title: 'New merchant onboarding awaiting review', source: 'Information', subtitle: 'Olive & Thyme', link: { route: 'admin-merchants', params: { status: 'pending' } }, createdAt: ago(120) },
  ];
  const ACC = {
    this_week: { value: 96.4, delta: 1.2, ys: [91.2, 93.8, 93.1, 93.0, 94.6, 94.7, 95.6, 96.4], xs: days('2026-11-12', 8) },
    '7d': { value: 95.2, delta: 0.6, ys: [93.4, 94.1, 93.9, 94.8, 95.0, 94.6, 95.4, 95.2], xs: days('2026-11-05', 8) },
    this_month: { value: 95.8, delta: 2.1, ys: [92.1, 92.9, 93.6, 94.2, 94.9, 95.3, 96.4], xs: days('2026-10-20', 7, 5) },
  };
  const accuracy = (period) => { const a = ACC[period] || ACC.this_week; return { value: a.value, delta: a.delta, deltaUnit: 'pct', period: ACC[period] ? period : 'this_week', series: series('drop_accuracy', 'Drop Accuracy', 'area', a.xs, a.ys) }; };
  api.mock('GET', '/admin/dashboard', () => ({
    kpis: [
      kpi('liveDrops', 'Live Drops', 18, 'number', 3, 'abs', 'vs. yesterday', [10, 12, 11, 14, 13, 16, 18]),
      kpi('reservedToday', 'Reserved Today', 356, 'number', 16.4, 'pct', 'vs. avg', [200, 240, 230, 280, 300, 320, 356]),
      kpi('pickupsCompleted', 'Pickups Completed', 32, 'number', 92.6, 'pct', 'fulfilment', [20, 22, 25, 24, 28, 30, 32]),
      kpi('openIssues', 'Open Issues', 10, 'number', null, null, null, [6, 7, 9, 8, 11, 9, 10], { badge: '01 Critical', caption: '1 critical open', trend: 'down' }),
      kpi('dropAccuracy', 'Drop Accuracy', 96.4, 'percent', 1.2, 'pct', 'this week', [91, 93, 93, 94, 95, 95.6, 96.4]),
    ],
    priorityAlerts: alerts,
    recentOrders: [
      { dropId: '3021', title: 'Morning Pastry Box', imageUrl: null, merchant: { id: 'MER-066', name: 'Fig & Bloom Bakery' }, location: 'Al Corniche St', pickupWindow: { start: '17:30', end: '18:00' }, status: 'live', reserved: 24, pickedUp: 18 },
      { dropId: '3020', title: 'Artisan Bread Bag', imageUrl: null, merchant: { id: 'MER-094', name: 'Sunrise Bakehouse' }, location: 'West Bay', pickupWindow: { start: '18:00', end: '18:30' }, status: 'live', reserved: 20, pickedUp: 15 },
      { dropId: '3019', title: 'Harvest Veg Box', imageUrl: null, merchant: { id: 'MER-058', name: 'Green Bowl Kitchen' }, location: 'Msheireb', pickupWindow: { start: '19:00', end: '19:30' }, status: 'sold_out', reserved: 16, pickedUp: 9 },
      { dropId: '3018', title: "Chef's Choice Dinner Bag", imageUrl: null, merchant: { id: 'MER-071', name: 'Marina Grill House' }, location: 'Lusail Marina', pickupWindow: { start: '20:00', end: '20:30' }, status: 'live', reserved: 30, pickedUp: 22 },
      { dropId: '3017', title: 'Sweet Treats Mix', imageUrl: null, merchant: { id: 'MER-079', name: 'Olive Grove Café' }, location: 'Al Waab', pickupWindow: { start: '20:30', end: '21:00' }, status: 'scheduled', reserved: 12, pickedUp: 0 },
    ],
    passportMonitoring: { total: 1842, attentionCount: 78, segments: [{ key: 'active_verified', label: 'Active & Verified', value: 1142, share: 62 }, { key: 'expiring_soon', label: 'Expiring Soon', value: 368, share: 20 }, { key: 'needs_attention', label: 'Needs Attention', value: 184, share: 10 }, { key: 'inactive', label: 'Inactive', value: 148, share: 8 }] },
    issueAlerts: [
      { id: 'CASE-1092', type: 'Spoiled inventory', merchant: { id: 'MER-058', name: 'Green Bowl Kitchen' }, status: 'blocked', createdAt: ago(4) },
      { id: 'CASE-1091', type: 'Late pickup window', merchant: { id: 'MER-094', name: 'Sunrise Bakehouse' }, status: 'blocked', createdAt: ago(18) },
      { id: 'CASE-1090', type: 'Item mismatch', merchant: { id: 'MER-071', name: 'Marina Grill House' }, status: 'blocked', createdAt: ago(32) },
      { id: 'CASE-1089', type: 'Hygiene complaint', merchant: { id: 'MER-047', name: 'Corner Deli Co.' }, status: 'blocked', createdAt: ago(60) },
      { id: 'CASE-1088', type: 'No-show merchant', merchant: { id: 'MER-051', name: 'Harvest & Co.' }, status: 'blocked', createdAt: ago(120) },
    ],
    dropAccuracy: accuracy('this_week'),
    merchantQualityWatch: [
      { merchant: { id: 'MER-066', name: 'Fig & Bloom Bakery' }, score: 94, sparkline: [60, 64, 63, 70, 72, 78, 82, 94], badge: 'excellent' },
      { merchant: { id: 'MER-071', name: 'Marina Grill House' }, score: 88, sparkline: [70, 72, 75, 74, 80, 82, 86, 88], badge: 'excellent' },
      { merchant: { id: 'MER-051', name: 'Harvest & Co.' }, score: 45, sparkline: [62, 58, 60, 55, 52, 50, 47, 45], badge: 'watch' },
      { merchant: { id: 'MER-047', name: 'Corner Deli Co.' }, score: 32, sparkline: [50, 48, 44, 46, 40, 38, 35, 32], badge: 'watch' },
    ],
    sustainability: {
      mealsSaved: kpi('mealsSaved', 'Meals saved', 12400, 'number', 8, 'pct', 'month'), co2Offset: kpi('co2Offset', 'CO₂ offset', 6.1, 'tonnes', 5, 'pct'),
      waterSaved: kpi('waterSaved', 'Gallons water saved', 3800, 'gallons', 6, 'pct'), wasteDiverted: kpi('wasteDiverted', 'Waste diverted', 92, 'percent', 1.4, 'pct'),
      equivalentCarMiles: 9300, equivalentText: 'Equivalent to 9,300 car miles avoided',
    },
  }));
  api.mock('GET', '/admin/dashboard/drop-accuracy', ({ query }) => accuracy(query.period));
  api.mock('POST', '/admin/alerts/:id/dismiss', ({ params }) => { alerts = alerts.filter((a) => a.id !== params.id); return null; });
  api.mock('GET', '/admin/alerts', ({ query }) => { const list = alerts.filter((a) => (!query.severity || a.severity === query.severity) && (!query.type || a.type === query.type)); return { data: list, page: 1, pageSize: 10, total: list.length }; });

  /* ------------------------------ MERCHANT · OVERVIEW ------------------------------ */
  const SALES = {
    this_week: { total: 24560, delta: 18.6, xs: days('2026-10-20', 7), ys: [2000, 18000, 13000, 14000, 21480, 21500, 40000] },
    '7d': { total: 20710, delta: 6.2, xs: days('2026-10-13', 7), ys: [8000, 12000, 15000, 11000, 18000, 22000, 27000] },
    this_month: { total: 96240, delta: 12.8, xs: days('2026-10-20', 8, 4), ys: [12000, 22000, 19000, 27000, 25000, 31200, 34000, 40000] },
  };
  /* (v1.4 F-004) the merchant overview is derived from the shared order/listing store (api/mock/store.js):
     the same orders as Orders & Pickups, the same listings as Inventory, the same IDs as Admin. */
  const WS = () => window.WBStore;
  const mine = (b) => WS().orders.filter((o) => o.merchantId === WS().me() && (!b || b === 'all' || o.branchId === b));
  const dOf = (o, k) => String((k === 'done' ? o.completedAt : null) || o.createdAt).slice(0, 10);
  const grossOn = (list, date) => list.filter((o) => o.status === 'completed' && dOf(o, 'done') === date).reduce((s, o) => s + o.total.amount, 0);
  const window_ = (list, n, step, back) => { const xs = [], ys = []; for (let i = n - 1; i >= 0; i--) { let y = 0; for (let k = 0; k < step; k++) y += grossOn(list, api.demoDate(-back - i * step - k)); xs.push(api.demoDate(-back - i * step)); ys.push(Math.round(y * 100) / 100); } return { xs, ys }; };
  const SALES_CFG = { this_week: [7, 1, 0], '7d': [7, 1, 1], this_month: [8, 4, 0] };
  const sales = (period, b) => {
    const p = SALES_CFG[period] ? period : 'this_week'; const [n, step, back] = SALES_CFG[p]; const list = mine(b);
    const cur = window_(list, n, step, back), prev = window_(list, n, step, back + n * step);
    const total = cur.ys.reduce((a, x) => a + x, 0), ptot = prev.ys.reduce((a, x) => a + x, 0);
    return { total: M(Math.round(total * 100) / 100), delta: ptot ? Math.round(1000 * (total - ptot) / ptot) / 10 : null, comparison: p === 'this_month' ? 'previous 4 weeks' : 'previous 7 days', period: p, series: series('sales', 'Sales', 'area', cur.xs, cur.ys) };
  };
  api.mock('GET', '/merchant/overview/sales', ({ query }) => sales(query.period, query.branchId || 'BR-01'));
  const localState = { 'BR-01': 'open', 'BR-02': 'open', 'BR-03': 'closed', all: 'open' };
  api.mock('GET', '/merchant/overview', async ({ query }) => {
    const b = query.branchId || 'BR-01';
    let state = localState[b] || 'open', branchName = { 'BR-01': 'West Bay Branch', 'BR-02': 'The Pearl Branch', 'BR-03': 'Al Sadd Branch', all: 'All branches' }[b] || 'West Bay Branch';
    if (b !== 'all') { try { const res = await api('GET', '/merchant/branches/' + b, null, { latency: 0 }); if (res.data && res.data.state) { state = res.data.state; branchName = res.data.name && res.data.name.en ? res.data.name.en : branchName; } } catch (e) { /* branches module not loaded: keep local state */ } }
    let revSum = null; try { revSum = (await api('GET', '/merchant/reviews', { pageSize: 1 }, { latency: 0 })).meta.summary; } catch (e) { /* reviews module not loaded */ }
    const S = WS(); const all = mine(b); const from = String(query.from || api.demoDate(-30)).slice(0, 10), to = String(query.to || api.DEMO_TODAY).slice(0, 10);
    const inR = (o, k) => { const d = dOf(o, k); return d >= from && d <= to; };
    const placed = all.filter((o) => inR(o)), done = all.filter((o) => o.status === 'completed' && inR(o, 'done')), cancelled = placed.filter((o) => o.status === 'cancelled');
    const pending = all.filter((o) => o.fulfillment === 'pickup' && S.isActive(o)); // Active = paid and not yet collected, regardless of pickup date
    const spark = (pred, k) => Array.from({ length: 8 }, (_, i) => all.filter((o) => pred(o) && dOf(o, k) === api.demoDate(i - 7)).length);
    const gross = done.reduce((s2, o) => s2 + o.total.amount, 0);
    const top = {}; done.forEach((o) => { const it = o.items[0]; const t = top[it.listingId] || (top[it.listingId] = { id: it.listingId, name: it.title.en, sold: 0, revenue: 0 }); t.sold += it.qty; t.revenue += o.total.amount; });
    const lst = S.listings.filter((l) => l.merchantId === S.me() && (!b || b === 'all' || (l.branch && l.branch.id === b)));
    const seg = (k, label, v) => ({ key: k, label, value: v });
    const sum = (arr, f) => arr.reduce((s2, x) => s2 + f(x), 0);
    const segs = [
      seg('in_stock', 'In Stock', sum(lst.filter((l) => l.status === 'active' && l.remaining > 2), (l) => l.remaining)),
      seg('low_stock', 'Low Stock', sum(lst.filter((l) => l.status === 'active' && l.remaining <= 2), (l) => l.remaining)),
      seg('sold_out', 'Sold Out', sum(lst, (l) => (l.reserved || 0) + (l.collected || 0))),
      seg('paused', 'Paused', sum(lst.filter((l) => l.status === 'paused'), (l) => l.remaining)),
      seg('expired', 'Expired', sum(lst.filter((l) => ['disabled', 'expired', 'draft'].includes(l.status)), (l) => l.remaining)),
    ];
    const totalBags = sum(segs, (x) => x.value);
    return {
      greetingName: (A.state.user && A.state.user.firstName) || 'Sara', range: { from, to },
      kpis: [
        kpi('totalSales', 'Total Sales', Math.round(gross * 100) / 100, 'money', 18.6, 'pct', 'vs previous period', spark((o) => o.status === 'completed', 'done'), { currency: 'QAR' }),
        kpi('totalOrders', 'Total Orders', placed.length, 'number', 16.4, 'pct', 'vs previous period', spark(() => true)),
        kpi('pendingPickups', 'Pending Pickups', pending.length, 'number', null, null, 'paid, not yet collected', spark((o) => o.fulfillment === 'pickup' && S.isActive(o))),
        kpi('completedOrders', 'Completed Orders', done.length, 'number', 19.3, 'pct', 'vs previous period', spark((o) => o.status === 'completed', 'done')),
        kpi('cancelledOrders', 'Cancelled Orders', cancelled.length, 'number', -4, 'pct', 'vs previous period', spark((o) => o.status === 'cancelled')),
      ],
      salesOverview: sales('this_week', b),
      topSellingBags: Object.values(top).sort((x, y) => y.sold - x.sold || y.revenue - x.revenue).slice(0, 5).map((t, i) => ({ rank: i + 1, listing: { id: t.id, name: t.name }, imageUrl: null, sold: t.sold, revenue: M(Math.round(t.revenue * 100) / 100) })),
      recentOrders: all.slice().sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1)).slice(0, 6).map((o) => ({ id: o.id, number: '#' + o.number, customerName: o.customer.name.en, itemsSold: (o.items[0] || {}).qty || 1, status: o.status, amount: M(o.total.amount, o.total.currency), placedAt: o.createdAt })),
      inventoryStatus: { totalBags, segments: segs.map((x) => ({ ...x, share: totalBags ? Math.round((x.value / totalBags) * 100) : 0 })) },
      operationalStatus: { branch: { id: b, name: branchName }, state, caption: state === 'open' ? 'Accepting pickups' : 'Not accepting pickups', todayHours: { start: '08:00', end: '21:00' }, pickupWindow: { start: '18:00', end: '20:00' } },
      reviews: revSum ? { average: revSum.average, count: revSum.total, distribution: revSum.distribution } : { average: 4.8, count: 578, distribution: [] }, // same summary as Reviews
      alerts: N.merchant.slice(0, 3),
    };
  });
  /* POST /shared/uploads/presign — shared upload contract (core-owned; D2's fallback in admin-business.js now steps aside). Root /uploads/presign = deprecated alias. */
  const presign = ({ body }) => {
    const b = body || {}; if (!b.fileName || !b.contentType) throw err(422, 'validation_error', 'Choose a file to upload.');
    if (!/pdf|image\//.test(b.contentType)) throw err(422, 'validation_error', 'Use a PDF, JPG or PNG file.', { file: 'type' });
    if (b.size > 20 * 1024 * 1024) throw err(422, 'validation_error', 'File is larger than 20 MB.', { file: 'size' });
    const id = 'file_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    return { fileId: id, uploadUrl: 'https://uploads.mock/' + id, method: 'PUT', headers: { 'Content-Type': b.contentType }, fileUrl: 'https://cdn.mock/' + id + '/' + encodeURIComponent(b.fileName), expiresAt: new Date(Date.now() + 9e5).toISOString() };
  };
  api.mock('POST', '/shared/uploads/presign', presign);
  if (!api.routes().includes('POST /uploads/presign')) api.mock('POST', '/uploads/presign', presign);
  // Fallback when the Branches module isn't loaded (D4 registers the same contract route later and wins).
  api.mock('PATCH', '/merchant/branches/:id/state', ({ params, body }) => { if (!['open', 'closed', 'temporarily_closed'].includes(body && body.state)) throw err(422, 'validation_error', 'Invalid state'); localState[params.id] = body.state; return { id: params.id, state: body.state }; });
})();
