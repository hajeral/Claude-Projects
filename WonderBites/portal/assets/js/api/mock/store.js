/* =====================================================================
   Shared in-browser demo store (v1.4, core-owned)
   ONE set of orders, listings (= admin drops), pickups, support tickets, moderation items, merchant
   accounts and commercial settings used by BOTH portals within a session. Admin and merchant mocks
   read and write these same objects (merchant = a tenant-filtered projection), so an order, listing
   or ticket has the same ID and state in both portals. API paths are unchanged.
   Also the shared business rules: order state machine, pickup codes / verification, stock
   accounting, and the platform commission (19 % default, effective-dated, per-merchant contract).
   Dates derive from api.DEMO_TODAY (api/mock/core.js).
   ===================================================================== */
(function () {
  'use strict';
  const api = window.api;
  const L = (en, ar) => ({ en, ar: ar || en });
  const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const err = (s, c, m, d) => api.error(s, c, m, d);
  const T = api.DEMO_TODAY;
  const iso = (day, hhmm) => `${api.demoDate(day)}T${hhmm}:00Z`;
  const r2 = (v) => Math.round(v * 100) / 100;
  const QAR = (a) => ({ amount: r2(a), currency: 'QAR' });

  const S = (window.WBStore = {
    orders: [], listings: [], pickups: [], tickets: [], moderation: [], merchants: [], accounts: [],
    nowIso: () => api.demoIso(), today: () => api.DEMO_TODAY,
    /** the merchant the merchant portal is signed in as (tenant of every merchant read) */
    me: () => { const u = window.App && App.state.sessions && App.state.sessions.merchant && App.state.sessions.merchant.user; return (u && u.merchant && u.merchant.merchantId) || 'MER-066'; },
  });

  /* ------------------------------------------------------------------ live filtered views
     reads/iteration see only matching rows; push/unshift add to the shared array; splice/indexing map to it. */
  S.view = (arr, pred) => new Proxy(arr, {
    get(t, k) {
      if (k === 'push' || k === 'unshift') return (...xs) => t[k](...xs);
      const v = t.filter(pred);
      if (k === 'splice') return (i, n = 1) => { const rm = v.slice(i, i + n); rm.forEach((x) => { const j = t.indexOf(x); if (j >= 0) t.splice(j, 1); }); return rm; };
      const x = v[k]; return typeof x === 'function' ? x.bind(v) : x;
    },
    set(t, k, val) { t[k] = val; return true; },
  });

  /* ------------------------------------------------------------------ order state machine (F-002)
     The only allowed transitions. completed / cancelled / refunded are terminal for fulfilment: a completed order
     accepts only the payment events refunded / partially_refunded (manager-approved refund), everything else is 409. */
  S.FLOW = {
    reserved: ['confirmed', 'cancelled', 'refunded'],
    confirmed: ['ready_for_pickup', 'driver_assigned', 'out_for_delivery', 'completed', 'cancelled', 'refunded', 'partially_refunded'],
    ready_for_pickup: ['completed', 'driver_assigned', 'out_for_delivery', 'no_show', 'cancelled', 'refunded', 'partially_refunded'],
    driver_assigned: ['out_for_delivery', 'picked_up', 'cancelled', 'refunded'],
    out_for_delivery: ['delivered', 'failed'],
    picked_up: ['out_for_delivery', 'delivered', 'failed'],
    delivered: ['completed', 'refunded', 'partially_refunded'],
    failed: ['cancelled', 'refunded'],
    no_show: ['refunded'],
    completed: ['refunded', 'partially_refunded'],
    partially_refunded: ['refunded'],
    cancelled: [], refunded: [],
  };
  S.TERMINAL = ['completed', 'cancelled', 'refunded'];
  /** Active = paid and not yet collected, regardless of the pickup date */
  S.ACTIVE = ['reserved', 'confirmed', 'ready_for_pickup', 'driver_assigned', 'out_for_delivery', 'picked_up'];
  S.isActive = (o) => S.ACTIVE.includes(o.status) && ['paid', 'authorized'].includes(o.paymentStatus || 'paid');
  S.canTransition = (o, to) => (S.FLOW[o.status] || []).includes(to);
  /** move an order to `to` (one timeline event), with stock effects; throws 409 invalid_transition */
  S.transition = (o, to, ctx = {}) => {
    if (!S.canTransition(o, to)) throw err(409, 'invalid_transition', `Order ${o.id} can't move from ${o.status} to ${to}.`, { from: o.status, to, allowed: S.FLOW[o.status] || [] });
    if (to === 'completed' && o.fulfillment === 'pickup' && ctx.event !== 'pickup_verified') throw err(409, 'invalid_transition', 'Self-pickup orders are completed by verifying the pickup code.', { from: o.status, to, requires: 'pickup_verification' });
    if (to === 'completed' && o.fulfillment === 'delivery' && o.status !== 'delivered') throw err(409, 'invalid_transition', 'Delivery orders are completed after the driver delivers them.', { from: o.status, to, requires: 'delivered' });
    const from = o.status; const at = ctx.at || S.nowIso();
    if (to === 'completed') o.completedAt = at;
    o.status = to; o.updatedAt = at;
    (o.timeline = o.timeline || []).push({ status: to, at, by: ctx.by || 'system', ...(ctx.event ? { event: ctx.event } : {}), ...(ctx.note ? { note: ctx.note } : {}) });
    stockOnTransition(o, from, to);
    if (['cancelled', 'refunded'].includes(to)) S.pickups.filter((p) => p.orderId === o.id && !['picked_up', 'verified'].includes(p.status)).forEach((p) => { p.status = 'cancelled'; });
    return o;
  };
  /** UI actions allowed in the order's current state */
  S.allowedActions = (o) => {
    const a = []; const can = (s) => S.canTransition(o, s);
    if (o.fulfillment === 'pickup' && can('completed')) a.push('verify_pickup');
    if (o.fulfillment === 'delivery' && (can('driver_assigned') || o.status === 'driver_assigned')) a.push('assign_driver');
    if (o.fulfillment === 'delivery' && ['out_for_delivery', 'picked_up'].includes(o.status)) a.push('mark_delivered');
    if (o.fulfillment === 'delivery' && o.status === 'delivered') a.push('complete');
    if (can('cancelled')) a.push('cancel');
    if (can('refunded') || can('partially_refunded')) a.push('refund');
    return a;
  };

  /* ------------------------------------------------------------------ stock (F-001 / FLOW-07)
     remaining = quantity − reserved − collected. reserved = paid, not yet collected; collected = handed over today. */
  const listingOf = (o) => S.listings.find((l) => l.id === (o.listingId || o.dropId));
  const qtyOf = (o) => (o.items && o.items[0] && o.items[0].qty) || o.qty || 1;
  /** stock is held for an order while it is paid and not yet collected */
  const HELD = (s) => S.ACTIVE.includes(s);
  function settle(l) { l.remaining = Math.max(0, l.quantity - (l.reserved || 0) - (l.collected || 0)); if (l.status === 'active' && l.remaining === 0) l.status = 'sold_out'; else if (l.status === 'sold_out' && l.remaining > 0) l.status = 'active'; }
  S.settle = settle;
  function stockOnTransition(o, from, to) {
    const l = listingOf(o); if (!l || o.historical) return; const q = qtyOf(o);
    if (HELD(from) && !HELD(to)) {
      l.reserved = Math.max(0, (l.reserved || 0) - q);
      if (['delivered', 'completed', 'no_show'].includes(to)) l.collected = (l.collected || 0) + q; // handed over (or set aside and missed)
      settle(l);                                                                                     // cancelled / refunded / failed → back on sale
    }
    if (to === 'completed') { l.stats.sold += q; l.stats.revenue = { amount: r2((l.stats.revenue.amount || 0) + o.total.amount), currency: o.total.currency }; }
  }
  /** quantity edit: never touches remaining unless the quantity changes; rejects below what is already committed */
  S.setQuantity = (l, qty) => {
    qty = Number(qty); if (!(qty >= 0)) throw err(422, 'validation_error', 'Enter a quantity of 0 or more.', { quantity: 'min' });
    const committed = (l.reserved || 0) + (l.collected || 0);
    if (qty < committed) throw err(422, 'validation_error', `Quantity can’t be lower than the ${committed} bags already reserved or collected today.`, { quantity: 'below_committed', committed });
    l.quantity = qty; settle(l); if (l.status === 'sold_out' && l.remaining > 0) l.status = 'active';
    return l;
  };

  /* ------------------------------------------------------------------ pickup codes (F-003 / F-020)
     6 characters, uppercase, no ambiguous characters (0 O 1 I L), single-use, expire at window end + grace. */
  S.CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  S.GRACE_MIN = 30;
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const ISSUED = new Set();
  S.pickupCode = (seed) => { const A = S.CODE_ALPHABET; let out = ''; for (let i = 0; i < 6; i++) out += A[hash(seed + ':' + i) % A.length]; let n = 0; while (ISSUED.has(out) || S.pickups.some((p) => p.code === out)) out = out.slice(1) + A[hash(out + ++n) % A.length]; ISSUED.add(out); return out; };
  S.isValidCodeFormat = (c) => new RegExp(`^[${S.CODE_ALPHABET}]{6}$`).test(String(c || ''));
  const tzOffsetMin = (country) => { const m = api.markets && api.markets.get(country || 'QA'); const off = (m && m.utcOffset) || '+03:00'; const [h, mm] = off.slice(1).split(':').map(Number); return (off[0] === '-' ? -1 : 1) * (h * 60 + mm); };
  /** window end (branch-local HH:mm) on `date` + grace → UTC ISO */
  S.codeExpiry = (date, end, country) => new Date(Date.parse(`${date}T${end}:00Z`) - tzOffsetMin(country) * 60000 + S.GRACE_MIN * 60000).toISOString();
  S.createPickup = (o, extra = {}) => {
    const date = o.pickupDate || String(o.createdAt).slice(0, 10);
    const p = Object.assign({ id: 'PK-' + (60000 + S.pickups.length + 1), orderId: o.id, consumerId: o.consumerId, merchantId: o.merchantId, market: o.market, branchId: o.branchId, dropId: o.listingId || o.dropId,
      city: o.city, category: o.category, dietary: o.dietary || [], code: S.pickupCode(o.id + ':' + date), window: { date, start: o.pickupWindow.start, end: o.pickupWindow.end },
      expiresAt: S.codeExpiry(date, o.pickupWindow.end, o.market), status: Date.parse(S.codeExpiry(date, o.pickupWindow.end, o.market)) < api.demoNow() ? 'missed' : o.status === 'ready_for_pickup' ? 'ready' : 'upcoming', usedAt: null, verifiedAt: null, verifiedBy: null, flagReason: null, quantity: qtyOf(o), createdAt: o.createdAt }, extra);
    o.pickupCode = p.code; o.pickupId = p.id; S.pickups.push(p); return p;
  };
  /** the one verification helper (merchant Orders modal, POST /merchant/pickups/verify, Admin Pickups):
      atomically marks the pickup used and completes the order with ONE `pickup_verified` timeline event. */
  S.verifyPickup = ({ code, orderId, pickupId, by = 'merchant', merchantId }) => {
    code = String(code || '').trim().toUpperCase();
    if (!S.isValidCodeFormat(code)) throw err(422, 'invalid_code', 'Enter the 6-character pickup code.', { code: 'format' });
    let p = pickupId ? S.pickups.find((x) => x.id === pickupId) : orderId ? S.pickups.find((x) => x.orderId === orderId && x.status !== 'cancelled') : S.pickups.find((x) => x.code === code);
    if (!p || (merchantId && p.merchantId !== merchantId)) throw err(422, 'invalid_code', 'That pickup code doesn’t match this order.', { code: 'mismatch' });
    if (p.usedAt || ['picked_up', 'verified'].includes(p.status)) throw err(409, 'code_used', 'This pickup code was already used.', { usedAt: p.usedAt });
    if (p.code !== code) throw err(422, 'invalid_code', 'That pickup code doesn’t match this order.', { code: 'mismatch' });
    if (p.status === 'cancelled') throw err(409, 'invalid_transition', 'This pickup was cancelled.', { status: p.status });
    if (Date.parse(p.expiresAt) < api.demoNow()) throw err(422, 'code_expired', 'This pickup code has expired (window end + grace).', { expiresAt: p.expiresAt });
    const o = S.orders.find((x) => x.id === p.orderId); if (!o) throw err(404, 'not_found', 'Order not found');
    S.transition(o, 'completed', { by, event: 'pickup_verified' }); // throws 409 if the order isn't collectible
    p.status = 'picked_up'; p.usedAt = p.verifiedAt = S.nowIso(); p.verifiedBy = by === 'admin' ? L('Admin override', 'تجاوز من المشرف') : L('Merchant portal', 'بوابة التاجر');
    return { pickup: p, order: o };
  };

  /* ------------------------------------------------------------------ commission (19 % default, effective-dated; per-merchant contract) */
  S.commercial = { defaultCommissionRate: 19, effectiveFrom: '2026-01-01', currencyNote: 'Applied to gross order value (incl. VAT where applicable)',
    history: [{ rate: 20, from: '2025-01-01', to: '2025-12-31', note: 'Launch pilot rate' }, { rate: 19, from: '2026-01-01', to: null, note: 'Platform default' }],
    updatedAt: iso(-30, '08:00'), updatedBy: 'Sarah Al Manasoori' };
  S.contracts = {}; // merchantId → [{ rate, from, to }]
  S.rateFor = (merchantId, date) => {
    const d = String(date || T).slice(0, 10);
    const c = (S.contracts[merchantId] || []).find((x) => x.from <= d && (!x.to || d <= x.to)); if (c) return c.rate;
    const h = S.commercial.history.find((x) => x.from <= d && (!x.to || d <= x.to)); return h ? h.rate : S.commercial.defaultCommissionRate;
  };
  S.setDefaultRate = (rate, from) => {
    rate = +rate; if (!(rate >= 0 && rate <= 50)) throw err(422, 'validation_error', 'Commission must be between 0 and 50%.', { defaultCommissionRate: 'range' });
    from = from || T; const prev = S.commercial.history.find((x) => !x.to);
    if (prev && from <= prev.from) throw err(422, 'validation_error', 'The new rate must start after the current one.', { effectiveFrom: 'order' });
    if (prev) { const d = new Date(from + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); prev.to = d.toISOString().slice(0, 10); }
    S.commercial.history.push({ rate, from, to: null, note: 'Platform default' });
    if (from <= T) { S.commercial.defaultCommissionRate = rate; S.commercial.effectiveFrom = from; }
    S.commercial.updatedAt = S.nowIso(); return S.commercial;
  };
  S.setContractRate = (merchantId, rate, from = T) => { if (rate == null || rate === '') { delete S.contracts[merchantId]; return null; } S.contracts[merchantId] = [{ rate: +rate, from, to: null }]; return S.contracts[merchantId][0]; };
  /** a merchant's earnings for [from, to] from its completed orders × the commission effective on each order date */
  S.earnings = (merchantId, from, to) => {
    const inRange = (o) => { const d = String(o.completedAt || o.createdAt).slice(0, 10); return (!from || d >= from) && (!to || d <= to); };
    const done = S.orders.filter((o) => o.merchantId === merchantId && ['completed', 'refunded', 'partially_refunded'].includes(o.status) && o.timeline && inRange(o));
    const cur = (done[0] && done[0].total.currency) || 'QAR';
    let gross = 0, commission = 0, refunds = 0;
    done.forEach((o) => { const g = o.total.amount; gross += g; commission += g * S.rateFor(merchantId, o.createdAt) / 100; if (o.refund) refunds += o.refund.amount.amount; });
    const net = gross - commission - refunds;
    return { merchantId, from, to, orders: done.length, gross: { amount: r2(gross), currency: cur }, commission: { amount: r2(commission), currency: cur }, refunds: { amount: r2(refunds), currency: cur }, net: { amount: r2(net), currency: cur }, rate: S.rateFor(merchantId, to || T) };
  };

  /** weekly payout statements (the 4 settled weeks before demo today); the latest week is pending, earlier weeks paid */
  S.payouts = (merchantId) => {
    const out = [];
    for (let w = 3; w >= 0; w--) {
      const from = api.demoDate(-7 * w - 7), to = api.demoDate(-7 * w - 1); const e = S.earnings(merchantId, from, to);
      out.push({ id: `PO-${merchantId.replace(/\D/g, '')}-${api.demoDate(-7 * w).replace(/-/g, '').slice(2)}`, merchantId, periodStart: from, periodEnd: to, orders: e.orders, gross: e.gross, commission: e.commission, refunds: e.refunds, net: e.net, rate: e.rate,
        status: w === 0 ? 'pending' : 'paid', scheduledFor: api.demoDate(-7 * w + 3), paidAt: w === 0 ? null : api.demoDate(-7 * w + 2) + 'T09:00:00Z' });
    }
    return out;
  };

  /* ------------------------------------------------------------------ Fig & Bloom seed (merchant MER-066, Qatar)
     Listings, today's orders (+ 4 weeks of completed history for payouts / earnings) and their pickups. */
  const BR = { 'BR-01': { id: 'BR-01', name: L('West Bay Branch', 'فرع الخليج الغربي') }, 'BR-02': { id: 'BR-02', name: L('The Pearl Branch', 'فرع اللؤلؤة') }, 'BR-03': { id: 'BR-03', name: L('Al Sadd Branch', 'فرع السد') } };
  S.BRANCHES = BR;
  const act = (created) => [{ type: 'created', label: L('Listing created', 'تم إنشاء القائمة'), at: created }, { type: 'updated', label: L('Listing updated', 'تم تحديث القائمة'), at: iso(-12, '09:15') }];
  const LI = (id, en, ar, cat, price, orig, qty, rem, w, status, sold, tone, extra = {}) => Object.assign({
    id, merchantId: 'MER-066', market: 'QA', title: L(en, ar), category: cat, dietary: ['vegetarian'], allergens: ['gluten'],
    shortDescription: L('A surprise selection of today\'s unsold favourites.', 'تشكيلة مفاجئة من أطايب اليوم غير المباعة.'),
    description: L('Freshly baked this morning and carefully packed at closing time to keep the best quality and taste.', 'مخبوزة صباح اليوم ومعبّأة بعناية عند الإغلاق للحفاظ على أفضل جودة ومذاق.'),
    images: [{ id: id + '-1', tone }, { id: id + '-2', tone: (tone % 4) + 1 }, { id: id + '-3', tone: ((tone + 1) % 4) + 1 }],
    price: QAR(price), originalPrice: QAR(orig), quantity: qty, remaining: rem, reserved: 0, collected: 0, unit: 'bag', _seedRemaining: rem,
    pickupWindow: { start: w[0], end: w[1] }, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], branch: BR['BR-01'], date: T,
    address: L('Al Corniche St 214, West Bay', 'شارع الكورنيش 214، الخليج الغربي'), city: 'doha', state: L('Doha', 'الدوحة'), zip: '00000',
    listingType: 'surprise_bag', availability: 'daily', status, flagged: false, moderation: null,
    settings: { publish: status !== 'draft' && status !== 'disabled', featured: false, allowNegotiation: true, expiresOn: api.demoDate(11) },
    stats: { sold, revenue: QAR(sold * price), views: sold * 9 }, createdAt: iso(-132, '14:32'), activity: act(iso(-132, '14:32')),
  }, extra);
  S.listings.push(
    LI('LIS-2412', 'Morning Pastry Box', 'صندوق معجنات الصباح', 'bakery', 15, 45, 8, 6, ['18:00', '20:00'], 'active', 86, 1, { settings: { publish: true, featured: true, allowNegotiation: true, expiresOn: api.demoDate(11) } }),
    LI('LIS-2413', 'Artisan Bread Bag', 'كيس الخبز الحرفي', 'bakery', 12, 36, 6, 0, ['18:00', '20:00'], 'sold_out', 71, 4),
    LI('LIS-2414', 'Sweet Treats Mix', 'تشكيلة الحلويات', 'desserts', 14, 42, 0, 0, ['19:00', '20:30'], 'disabled', 65, 3),
    LI('LIS-2415', 'Fresh Fig Grocery Box', 'صندوق بقالة التين الطازج', 'grocery', 20, 60, 10, 8, ['17:30', '19:00'], 'active', 48, 2, { dietary: ['vegan', 'halal'], allergens: [] }),
    LI('LIS-2416', 'Bakery Leftover Bag', 'كيس بقايا المخبز', 'bakery', 10, 30, 12, 10, ['20:00', '21:00'], 'active', 201, 4),
    LI('LIS-2417', 'Deli Sandwich Surprise Bag', 'كيس مفاجأة سندويشات الديلي', 'meals', 10, 28, 5, 3, ['18:00', '18:30'], 'paused', 33, 1, { dietary: ['halal'] }),
  );
  /* customers shared by both portals: admin consumer id + merchant customer id */
  const PEOPLE = {
    'Aisha Al Mansoori': ['عائشة المنصوري', 'CON-48291', 'CUS-1001'], 'Omar Al Suwaidi': ['عمر السويدي', 'CON-1209', 'CUS-1006'], 'Fatima Al Zaabi': ['فاطمة الزعابي', 'CON-1210', 'CUS-1007'],
    'Khalid Rahman': ['خالد رحمن', 'CON-1207', 'CUS-1008'], 'Layla Hassan': ['ليلى حسن', 'CON-1208', 'CUS-1009'], 'Yusuf Al Amiri': ['يوسف العامري', 'CON-1206', null],
    'Mariam Al Nuaimi': ['مريم النعيمي', 'CON-1204', 'CUS-1005'], 'Hamdan Al Falasi': ['حمدان الفلاسي', 'CON-1203', 'CUS-1010'],
  };
  const DRIVERS = { 'DRV-02': L('Rashid Al Ketbi', 'راشد الكتبي'), 'DRV-03': L('Imran Sheikh', 'عمران شيخ'), 'DRV-04': L('Faisal Noor', 'فيصل نور') };
  let num = 3000;
  S.newOrder = ({ id, customer, listingId, fulfillment = 'pickup', driverId = null, status = 'confirmed', placed, branchId = 'BR-01', qty = 1, historical = false, paymentStatus = 'paid' }) => {
    const l = S.listings.find((x) => x.id === listingId); const [ar, conId, cusId] = PEOPLE[customer] || [customer, null, null];
    const o = {
      id, number: String(++num), merchantId: l.merchantId, market: l.market, branchId, branch: BR[branchId] || l.branch, listingId: l.id, dropId: l.id,
      customer: { id: cusId, name: L(customer, ar) }, consumerId: conId, bag: clone(l.title), items: [{ listingId: l.id, title: clone(l.title), qty, unitPrice: clone(l.price) }],
      total: { amount: r2(l.price.amount * qty), currency: l.price.currency }, fees: { amount: 1, currency: l.price.currency }, paymentStatus, paymentMethod: { brand: 'visa', last4: '4242' },
      fulfillment, driver: driverId ? { id: driverId, name: DRIVERS[driverId], vehicle: 'motorbike' } : null, pickupWindow: clone(l.pickupWindow), pickupDate: String(placed).slice(0, 10),
      deliveryAddress: fulfillment === 'delivery' ? L('Address on file with customer profile', 'العنوان المسجّل في ملف العميل') : null,
      city: l.city, category: l.category, dietary: clone(l.dietary), status, createdAt: placed, updatedAt: placed, historical,
      timeline: [{ status: 'reserved', at: placed, by: 'customer' }].concat(status === 'reserved' ? [] : [{ status: 'confirmed', at: placed, by: 'system', event: 'payment_captured' }]),
      refund: null, cancelReason: null,
    };
    if (!['reserved', 'confirmed'].includes(status)) o.timeline.push({ status, at: placed, by: 'merchant' });
    if (status === 'completed') o.completedAt = placed;
    return o;
  };
  /* today's orders (stock committed on today's listings) */
  [
    ['MO-5210', 'Aisha Al Mansoori', 'LIS-2412', 'pickup', null, 'ready_for_pickup', iso(0, '06:20')],
    ['MO-5208', 'Omar Al Suwaidi', 'LIS-2416', 'delivery', 'DRV-04', 'out_for_delivery', iso(0, '05:55')],
    ['MO-5204', 'Fatima Al Zaabi', 'LIS-2415', 'delivery', null, 'confirmed', iso(0, '05:10')],
    ['MO-5199', 'Khalid Rahman', 'LIS-2417', 'pickup', null, 'completed', iso(0, '04:02')],
    ['MO-5192', 'Layla Hassan', 'LIS-2413', 'delivery', 'DRV-02', 'delivered', iso(0, '03:40')],
    ['MO-5187', 'Yusuf Al Amiri', 'LIS-2415', 'pickup', null, 'confirmed', iso(0, '02:05')],
    ['MO-5181', 'Mariam Al Nuaimi', 'LIS-2416', 'delivery', null, 'failed', iso(-1, '13:22')],
    ['MO-5176', 'Hamdan Al Falasi', 'LIS-2412', 'delivery', 'DRV-03', 'picked_up', iso(-1, '12:47')],
    ['MO-5172', 'Mariam Al Nuaimi', 'LIS-2417', 'pickup', null, 'confirmed', iso(-1, '09:12')], // paid, not collected, window passed → still Active; its code has expired
  ].forEach(([id, c, lid, f, drv, st, at]) => S.orders.push(S.newOrder({ id, customer: c, listingId: lid, fulfillment: f, driverId: drv, status: st, placed: at })));
  /* 4 weeks of collected history (payouts / net earnings / overview totals) */
  const HC = Object.keys(PEOPLE); const HL = ['LIS-2412', 'LIS-2413', 'LIS-2415', 'LIS-2416', 'LIS-2417'];
  for (let d = 28, k = 0; d >= 1; d--) for (let i = 0, n = 7 + ((d * 5) % 6); i < n; i++, k++) {
    const hh = String(4 + Math.floor(i * 1.6)).padStart(2, '0') + ':' + String((k * 13) % 60).padStart(2, '0');
    S.orders.push(S.newOrder({ id: `MO-${5100 - k}`, customer: HC[(k * 3) % HC.length], listingId: HL[(k + d) % HL.length], fulfillment: k % 4 === 0 ? 'delivery' : 'pickup', driverId: k % 4 === 0 ? ['DRV-02', 'DRV-03', 'DRV-04'][k % 3] : null, status: 'completed', placed: iso(-d, hh), qty: k % 5 === 0 ? 2 : 1, historical: true }));
  }
  S.orders.filter((o) => o.historical && o.number).forEach((o) => { o.number = 'H' + o.id.slice(3); });
  /* today's stock: reserved = active orders, collected = collected today (incl. walk-ins), remaining from the seed */
  S.listings.forEach((l) => {
    const todays = S.orders.filter((o) => o.listingId === l.id && !o.historical);
    l.reserved = todays.filter((o) => HELD(o.status)).reduce((s, o) => s + qtyOf(o), 0);
    l.collected = Math.max(todays.filter((o) => ['completed', 'delivered'].includes(o.status)).reduce((s, o) => s + qtyOf(o), 0), l.quantity - l._seedRemaining - l.reserved);
    delete l._seedRemaining; settle(l);
  });
  /* pickups for today's self-pickup orders */
  S.orders.filter((o) => o.fulfillment === 'pickup' && !o.historical).forEach((o) => {
    const p = S.createPickup(o);
    if (o.status === 'completed') { p.status = 'picked_up'; p.usedAt = p.verifiedAt = o.createdAt; p.verifiedBy = L('Merchant portal', 'بوابة التاجر'); o.timeline[o.timeline.length - 1].event = 'pickup_verified'; }
  });

  /* ------------------------------------------------------------------ listings as Admin → Drops rows (FLOW-02)
     A merchant listing IS an admin drop: the admin drops list reads these live adapters (same id), and admin
     edits / flags write through to the listing, so the merchant sees the change. */
  S.dropStatus = (l) => ({ active: 'live', sold_out: 'sold_out', paused: 'paused', draft: 'draft', expired: 'expired' })[l.status] || (l.status === 'disabled' ? (l.flagged ? 'flagged' : 'disabled') : l.status);
  S.setDropStatus = (l, st) => {
    if (st === 'flagged') { l.flagged = true; l.status = 'disabled'; l.settings.publish = false; l.moderation = Object.assign({ by: 'admin', at: S.nowIso() }, l.moderation || {}); }
    else if (st === 'live') { l.flagged = false; l.moderation = null; l.status = l.remaining > 0 ? 'active' : 'sold_out'; l.settings.publish = true; }
    else if (st === 'disabled' || st === 'removed') { l.status = 'disabled'; l.settings.publish = false; }
    else l.status = st;
  };
  const DV = new Map();
  S.dropView = (l) => {
    if (DV.has(l)) return DV.get(l);
    const v = {}; const def = (k, get, set) => Object.defineProperty(v, k, { enumerable: true, get, set: set || ((x) => { l[k] = x; }) });
    const ro = () => {};
    def('id', () => l.id, ro); def('title', () => l.title); def('category', () => l.category); def('thumb', () => 'ph' + (((l.images && l.images[0]) || {}).tone || 1), ro); def('imageUrl', () => null, ro);
    def('merchantId', () => l.merchantId); def('market', () => l.market); def('branchId', () => l.branch && l.branch.id, ro); def('city', () => l.city);
    def('dietary', () => l.dietary); def('price', () => l.price); def('originalPrice', () => l.originalPrice);
    def('quantity', () => l.quantity, (x) => S.setQuantity(l, x)); def('reserved', () => l.reserved || 0, ro); def('remaining', () => l.remaining, ro); def('collected', () => l.collected || 0, ro);
    def('pickupWindow', () => l.pickupWindow); def('date', () => l.date || T); def('status', () => S.dropStatus(l), (x) => S.setDropStatus(l, x));
    def('flagged', () => !!l.flagged, (x) => { l.flagged = !!x; if (!x) l.moderation = null; });
    def('flagReason', () => (l.moderation && l.moderation.reason) || null, (x) => { if (x) l.moderation = Object.assign(l.moderation || { by: 'admin', at: S.nowIso() }, { reason: x }); else if (l.moderation) l.moderation.reason = null; });
    def('flagNote', () => (l.moderation && l.moderation.note) || '', (x) => { if (l.moderation || x) l.moderation = Object.assign(l.moderation || { by: 'admin', at: S.nowIso() }, { note: x || '' }); });
    def('description', () => l.description); def('allergens', () => l.allergens || []); def('createdAt', () => l.createdAt, ro); def('source', () => 'merchant_portal', ro);
    DV.set(l, v); return v;
  };
  /** an array that reads as own rows + every listing's drop adapter; push/unshift add own rows; splice removes from whichever holds the row */
  S.withListings = (own) => new Proxy(own, {
    get(t, k) {
      if (k === 'push' || k === 'unshift') return (...xs) => t[k](...xs);
      const all = t.concat(S.listings.map(S.dropView));
      if (k === 'splice') return (i, n = 1) => { const rm = all.slice(i, i + n); rm.forEach((x) => { const j = t.indexOf(x); if (j >= 0) t.splice(j, 1); else { const li = S.listings.findIndex((l) => l.id === x.id); if (li >= 0) S.listings.splice(li, 1); } }); return rm; };
      const v = all[k]; return typeof v === 'function' ? v.bind(all) : v;
    },
    set(t, k, v) { t[k] = v; return true; },
  });

  /* ------------------------------------------------------------------ merchant accounts (FLOW-01)
     sign-up creates a pending merchant in Admin → Merchants; only verified/active merchants may sign in. */
  S.accountFor = (email) => S.accounts.find((a) => a.email.toLowerCase() === String(email || '').toLowerCase()) || null;
  S.merchantStatus = (merchantId) => (S.merchants.find((m) => m.id === merchantId) || {}).status || null;

  /* ------------------------------------------------------------------ demo-only stand-in for the consumer app's checkout (FLOW-05/07)
     POST /shared/demo/reservations { listingId, qty?, fulfillment?, customer? } → a paid order in the shared store */
  let rsv = 0;
  api.mock('POST', '/shared/demo/reservations', ({ body }) => {
    const b = body || {}; const l = S.listings.find((x) => x.id === b.listingId) || api.notFound('Listing'); const qty = Math.max(1, +b.qty || 1);
    if (!['active'].includes(l.status)) throw err(409, 'invalid_transition', `This bag isn’t available (${l.status}).`, { status: l.status });
    if (l.remaining < qty) throw err(409, 'sold_out', 'Not enough bags left.', { remaining: l.remaining });
    const o = S.newOrder({ id: `MO-${6100 + ++rsv}`, customer: b.customer || 'Aisha Al Mansoori', listingId: l.id, fulfillment: b.fulfillment || 'pickup', status: 'confirmed', placed: S.nowIso(), qty });
    S.orders.unshift(o); l.reserved += qty; settle(l);
    if (o.fulfillment === 'pickup') S.createPickup(o);
    return { order: clone(o), listing: { id: l.id, remaining: l.remaining, reserved: l.reserved, status: l.status } };
  });
  /* commercial settings (Admin → Settings → General → Commercial) */
  api.mock('GET', '/admin/settings/commercial', () => ({ ...clone(S.commercial), contracts: clone(S.contracts) }));
  api.mock('PUT', '/admin/settings/commercial', ({ body }) => { const b = body || {}; S.setDefaultRate(b.defaultCommissionRate, b.effectiveFrom); return { ...clone(S.commercial), contracts: clone(S.contracts) }; });
  api.mock('GET', '/admin/merchants/:id/contract', ({ params }) => ({ merchantId: params.id, commissionRate: S.rateFor(params.id), contract: clone((S.contracts[params.id] || [])[0] || null), platformDefault: S.commercial.defaultCommissionRate }));
  api.mock('PUT', '/admin/merchants/:id/contract', ({ params, body }) => { const b = body || {}; if (b.commissionRate != null && b.commissionRate !== '' && !(+b.commissionRate >= 0 && +b.commissionRate <= 50)) throw err(422, 'validation_error', 'Commission must be between 0 and 50%.', { commissionRate: 'range' }); S.setContractRate(params.id, b.commissionRate === '' ? null : b.commissionRate, b.effectiveFrom || T); return { merchantId: params.id, commissionRate: S.rateFor(params.id), contract: clone((S.contracts[params.id] || [])[0] || null), platformDefault: S.commercial.defaultCommissionRate }; });
})();
