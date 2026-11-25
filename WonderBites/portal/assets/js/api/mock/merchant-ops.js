/* =====================================================================
   WonderBites — Merchant operations mock API (owner: D4)
   Paths follow docs/API_CONTRACT.md (base /api/v1 omitted).
   Handlers receive { method, path, params, query, body } and return the
   response body (or throw {status, error:{code,message,details}}).
   All money = { amount, currency:'QAR' }. Text that is merchant-entered
   is LocalizedText { en, ar }.
   ===================================================================== */
(function () {
  'use strict';
  const QAR = (amount) => ({ amount: Math.round(amount * 100) / 100, currency: 'QAR' });
  const L = (en, ar) => ({ en, ar });
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const nowIso = () => api.demoIso(); // (v1.4) demo clock
  let seq = 6000;
  const nextId = (p) => `${p}-${++seq}`;
  const err = (status, code, message, details) => { if (window.api && typeof window.api.error === 'function') throw window.api.error(status, code, message, details); const e = new Error(message); e.status = status; e.code = code; e.details = details; e.error = { code, message, details }; throw e; };

  /* ------------------------------------------------------------------ data */
  const branches = [
    { id: 'BR-01', name: L('West Bay Branch', 'فرع الخليج الغربي'), address: L('Al Corniche St 214, West Bay', 'شارع الكورنيش 214، الخليج الغربي'), city: 'doha', lat: 25.3215, lng: 51.5304, phone: '+974 5550 4455', manager: L('Sara Al Mansoori', 'سارة المنصوري'), state: 'open', photo: 1,
      hours: ['mon','tue','wed','thu','fri','sat','sun'].map((d) => ({ day: d, open: '08:00', close: '22:00', closed: false })), pickupToday: { start: '08:00', end: '22:00' } },
    { id: 'BR-02', name: L('The Pearl Branch', 'فرع اللؤلؤة'), address: L('Porto Arabia 88, The Pearl', 'بورتو أرابيا 88، اللؤلؤة'), city: 'doha', lat: 25.3712, lng: 51.5509, phone: '+974 5550 1020', manager: L('Omar Haddad', 'عمر حداد'), state: 'open', photo: 2,
      hours: ['mon','tue','wed','thu','fri','sat','sun'].map((d) => ({ day: d, open: '08:00', close: '22:00', closed: d === 'fri' ? false : false })), pickupToday: { start: '08:00', end: '22:00' } },
    { id: 'BR-03', name: L('Al Sadd Branch', 'فرع السد'), address: L('Al Sadd St, Al Sadd', 'شارع السد، السد'), city: 'doha', lat: 25.2836, lng: 51.4927, phone: '+974 5550 7788', manager: L('Lina Haddad', 'لينا حداد'), state: 'closed', photo: 3,
      hours: ['mon','tue','wed','thu','fri','sat','sun'].map((d) => ({ day: d, open: '09:00', close: '21:00', closed: d === 'sun' })), pickupToday: { start: '09:00', end: '21:00' } },
  ];
  /* (v1.3) every branch carries its market; currency / time zone come from the markets registry */
  const MK = () => (window.api && api.markets) || null;
  branches.forEach((b) => { b.country = b.country || 'QA'; });
  const withMarket = (b) => { const m = MK() && MK().get(b.country); return m ? Object.assign(b, { currency: m.currency, timeZone: m.timeZone }) : b; };
  const branchCurrency = (id) => { const b = branches.find((x) => x.id === id); return (b && withMarket(b).currency) || (MK() ? MK().currencyOf('QA') : 'QAR'); };
  const bref = (id) => { const b = branches.find((x) => x.id === id); return b ? { id: b.id, name: b.name } : null; };

  const drivers = [
    { id: 'DRV-01', name: L('Zubair Khan', 'زبير خان'), phone: '+974 5550 7890', vehicle: 'bicycle', plate: '—', branchId: 'BR-01', status: 'available', deliveries: 25, onTime: 98, rating: 4.9, compliance: 'compliant', certificate: 'valid', licenseNo: 'DXB-55120', certificateExpiry: '2027-03-31', joinedAt: '2025-02-10' },
    { id: 'DRV-02', name: L('Rashid Al Ketbi', 'راشد الكتبي'), phone: '+974 5550 4581', vehicle: 'motorbike', plate: '123456', branchId: 'BR-01', status: 'on_delivery', deliveries: 30, onTime: 95, rating: 4.8, compliance: 'compliant', certificate: 'valid', licenseNo: 'DXB-48210', certificateExpiry: '2026-12-20', joinedAt: '2025-01-03' },
    { id: 'DRV-03', name: L('Imran Sheikh', 'عمران شيخ'), phone: '+974 5550 1203', vehicle: 'car', plate: 'Doha T 61203', branchId: 'BR-02', status: 'available', deliveries: 12, onTime: 91, rating: 4.7, compliance: 'expiring_soon', certificate: 'expiring_soon', licenseNo: 'DXB-77341', certificateExpiry: '2026-12-02', joinedAt: '2025-06-18' },
    { id: 'DRV-04', name: L('Faisal Noor', 'فيصل نور'), phone: '+974 5550 7715', vehicle: 'motorbike', plate: 'Doha M 10457', branchId: 'BR-03', status: 'offline', deliveries: 54, onTime: 89, rating: 4.6, compliance: 'under_review', certificate: 'pending_review', licenseNo: 'DXB-30987', certificateExpiry: '2027-08-15', joinedAt: '2024-11-22' },
  ];
  const dref = (id) => { const d = drivers.find((x) => x.id === id); return d ? { id: d.id, name: d.name, vehicle: d.vehicle } : null; };

  const C = (id, en, ar, phone, email, created, orders, score, status, cat) => ({ id, name: L(en, ar), code: '+974', mobile: phone, email, createdAt: created, ordersCount: orders, rescueScore: score, status, favoriteCategory: cat, city: 'doha', mealsSaved: orders * 2, totalSpent: QAR(orders * 16.5), lastOrderAt: '2026-11-17T18:40:00Z' });
  const customers = [
    C('CUS-1001', 'Aisha Al Mansoori', 'عائشة المنصوري', '5550 2233', 'aisha.mansoori@example.com', '2025-04-30T08:18:00Z', 12, 95, 'active', 'bakery'),
    C('CUS-1002', 'Sofia Rahman', 'صوفيا رحمن', '5550 8890', 'sofia.rahman@example.com', '2025-02-18T13:30:00Z', 2, 41, 'inactive', 'desserts'),
    C('CUS-1003', 'Zafar Ali', 'ظفر علي', '5550 1122', 'zafar.ali@example.com', '2025-01-20T16:05:00Z', 3, 58, 'active', 'grocery'),
    C('CUS-1004', 'Waqar Hussain', 'وقار حسين', '5550 0091', 'waqar.hussain@example.com', '2025-03-05T18:15:00Z', 5, 72, 'active', 'bakery'),
    C('CUS-1005', 'Mariam Al Nuaimi', 'مريم النعيمي', '5550 4410', 'mariam.nuaimi@example.com', '2025-05-27T14:09:00Z', 8, 88, 'active', 'meals'),
    C('CUS-1006', 'Omar Al Suwaidi', 'عمر السويدي', '5550 7788', 'omar.suwaidi@example.com', '2025-06-11T10:44:00Z', 15, 97, 'active', 'bakery'),
    C('CUS-1007', 'Fatima Al Zaabi', 'فاطمة الزعابي', '5550 3345', 'fatima.zaabi@example.com', '2025-07-02T09:12:00Z', 6, 80, 'active', 'grocery'),
    C('CUS-1008', 'Khalid Rahman', 'خالد رحمن', '5550 6620', 'khalid.rahman@example.com', '2025-08-19T20:31:00Z', 1, 22, 'inactive', 'meals'),
    C('CUS-1009', 'Layla Hassan', 'ليلى حسن', '5550 9031', 'layla.hassan@example.com', '2025-09-03T07:58:00Z', 0, 0, 'blocked', 'desserts'),
    C('CUS-1010', 'Hamdan Al Falasi', 'حمدان الفلاسي', '5550 1209', 'hamdan.falasi@example.com', '2025-10-14T12:20:00Z', 4, 63, 'inactive', 'bakery'),
  ];

  /* (v1.4) orders + listings live in the shared demo store (api/mock/store.js); the merchant portal sees a
     tenant-filtered projection of the same objects Admin uses (same IDs, same state). */
  const S = window.WBStore;
  const orders = S.view(S.orders, (o) => o.merchantId === S.me());
  const oOut = (o) => Object.assign(clone(o), { allowedActions: S.allowedActions(o), active: S.isActive(o) });

  const act = (created) => [
    { type: 'created', label: L('Listing created', 'تم إنشاء القائمة'), at: created },
    { type: 'updated', label: L('Listing updated', 'تم تحديث القائمة'), at: '2026-07-11T09:15:00Z' },
    { type: 'price', label: L('Price updated', 'تم تحديث السعر'), at: '2026-07-12T16:45:00Z' },
  ];
  const listings = S.view(S.listings, (l) => l.merchantId === S.me());

  const products = [];

  const V = (id, en, ar, cat, email, phone, br, joined, status) => ({ id, name: L(en, ar), initials: en.split(' ').map((w) => w[0]).slice(0, 2).join(''), category: cat, email, phone, branchesCount: br, joinedAt: joined, status, parentId: 'MER-047', tradeLicenseNo: 'DED-' + (700000 + Number(id.slice(-2)) * 137), get commissionRate() { return S.rateFor(id); }, set commissionRate(x) { S.setContractRate(id, x); }, city: 'doha', listingsCount: br * 3, ordersCount: br * 41 });
  const vendors = [
    V('VEN-01', 'Fig & Bloom Bakery', 'مخبز فيغ آند بلوم', 'bakery', 'hello@figandbloom.example.com', '+974 5550 2233', 2, '2025-01-12', 'active'),
    V('VEN-02', 'Olive Grove Deli', 'أوليف جروف ديلي', 'grocery', 'contact@olivegrove.example.com', '+974 5550 3344', 1, '2025-03-04', 'active'),
    V('VEN-03', 'Sunset Sushi Bar', 'صن ست سوشي بار', 'restaurant', 'orders@sunsetsushi.example.com', '+974 5550 4455', 3, '2025-04-20', 'active'),
    V('VEN-04', 'Green Leaf Cafe', 'جرين ليف كافيه', 'cafe', 'info@greenleaf.example.com', '+974 5550 5566', 1, '2025-06-02', 'pending'),
    V('VEN-05', 'Golden Crust Bakery', 'مخبز جولدن كرست', 'bakery', 'hi@goldencrust.example.com', '+974 5550 6677', 1, '2025-07-15', 'pending'),
    V('VEN-06', 'Spice Route Kitchen', 'مطبخ طريق التوابل', 'restaurant', 'team@spiceroute.example.com', '+974 5550 7788', 2, '2025-02-08', 'suspended'),
  ];

  const T = (id, source, en, ar, cat, dEn, dAr, used, price, icon, defaults) => ({ id, source, name: L(en, ar), category: cat, description: L(dEn, dAr), usageCount: used, suggestedPrice: QAR(price), icon, defaults, status: 'published', updatedAt: '2026-10-02T10:00:00Z' });
  const pastryDef = { name: L('Morning Pastry Box', 'صندوق معجنات الصباح'), category: 'bakery', description: L('Assorted morning pastries: croissants, danishes and muffins baked today.', 'معجنات صباحية مشكّلة: كرواسون ودانش ومافن مخبوزة اليوم.'), price: 15, originalPrice: 45, quantity: 10, pickupWindow: { start: '08:00', end: '10:00' } };
  const templates = [
    T('TPL-01', 'wonderbites', 'Morning Pastry Box', 'صندوق معجنات الصباح', 'bakery', 'Pastry category, standard quantity, morning pickup window and a suggested price.', 'فئة المعجنات، كمية قياسية، نافذة استلام صباحية وسعر مقترح.', 24, 15, 'box', pastryDef),
    T('TPL-02', 'wonderbites', 'Bakery Leftover Bag', 'كيس بقايا المخبز', 'bakery', 'Mixed bakery items, end-of-day timing, an allergen note and collection instructions.', 'أصناف مخبوزات مشكّلة، توقيت نهاية اليوم، ملاحظة حساسية وتعليمات الاستلام.', 31, 15, 'bag', { name: L('Bakery Leftover Bag', 'كيس بقايا المخبز'), category: 'bakery', description: L('Mixed bakery items from today. Contains gluten, dairy and eggs. Collect from the counter.', 'أصناف مخبوزات مشكّلة من اليوم. تحتوي على الغلوتين والألبان والبيض. الاستلام من الكاونتر.'), price: 15, originalPrice: 45, quantity: 12, pickupWindow: { start: '20:00', end: '21:00' } }),
    T('TPL-03', 'wonderbites', 'Lunch Surprise Bag', 'كيس مفاجأة الغداء', 'meals', 'Lunch category, serving quantity, pickup time and a suggested discount.', 'فئة الغداء، كمية الحصّة، وقت الاستلام وخصم مقترح.', 18, 15, 'bag', { name: L('Lunch Surprise Bag', 'كيس مفاجأة الغداء'), category: 'meals', description: L('A chef-selected lunch serving from today\'s menu.', 'حصّة غداء يختارها الشيف من قائمة اليوم.'), price: 15, originalPrice: 40, quantity: 8, pickupWindow: { start: '14:00', end: '15:00' } }),
    T('TPL-04', 'wonderbites', 'Sweet Treats Box', 'صندوق الحلويات', 'desserts', 'Pastry category, standard quantity, morning pickup window and a suggested price.', 'فئة الحلويات، كمية قياسية، نافذة استلام صباحية وسعر مقترح.', 12, 15, 'box', { name: L('Sweet Treats Box', 'صندوق الحلويات'), category: 'desserts', description: L('Cakes, cookies and sweet bites from today\'s display.', 'كعك وبسكويت وقطع حلوة من عرض اليوم.'), price: 15, originalPrice: 42, quantity: 6, pickupWindow: { start: '19:00', end: '20:30' } }),
    T('TPL-05', 'wonderbites', 'End-of-Day Rescue Bag', 'كيس إنقاذ نهاية اليوم', 'bakery', 'Mixed bakery items, end-of-day timing, an allergen note and collection instructions.', 'أصناف مشكّلة، توقيت نهاية اليوم، ملاحظة حساسية وتعليمات الاستلام.', 27, 15, 'bag', { name: L('End-of-Day Rescue Bag', 'كيس إنقاذ نهاية اليوم'), category: 'bakery', description: L('Everything left at closing, packed together. Allergens: gluten, dairy.', 'كل ما تبقّى عند الإغلاق في كيس واحد. مسبّبات الحساسية: الغلوتين، الألبان.'), price: 15, originalPrice: 45, quantity: 10, pickupWindow: { start: '21:00', end: '22:00' } }),
    T('TPL-06', 'wonderbites', 'Weekend Special Box', 'صندوق عطلة نهاية الأسبوع', 'meals', 'Lunch category, serving quantity, pickup time and a suggested discount.', 'فئة الغداء، كمية الحصّة، وقت الاستلام وخصم مقترح.', 9, 15, 'box', { name: L('Weekend Special Box', 'صندوق عطلة نهاية الأسبوع'), category: 'meals', description: L('Weekend brunch favourites, packed to share.', 'أطايب فطور عطلة نهاية الأسبوع، معبّأة للمشاركة.'), price: 15, originalPrice: 50, quantity: 6, pickupWindow: { start: '12:00', end: '14:00' } }),
    T('TPL-11', 'mine', 'Friday Pastry Box', 'صندوق معجنات الجمعة', 'bakery', 'Only available Fridays — pre-order encouraged.', 'متوفر أيام الجمعة فقط — يُفضّل الطلب المسبق.', 24, 15, 'box', { name: L('Friday Pastry Box', 'صندوق معجنات الجمعة'), category: 'bakery', description: L('Only available Fridays — pre-order encouraged.', 'متوفر أيام الجمعة فقط — يُفضّل الطلب المسبق.'), price: 15, originalPrice: 45, quantity: 10, pickupWindow: { start: '09:00', end: '11:00' } }),
    T('TPL-12', 'mine', 'Closing-Time Bread Bag', 'كيس خبز وقت الإغلاق', 'bakery', 'Bag remaining bread right before closing.', 'عبّئ الخبز المتبقي قبل الإغلاق مباشرة.', 24, 15, 'bag', { name: L('Closing-Time Bread Bag', 'كيس خبز وقت الإغلاق'), category: 'bakery', description: L('Bag remaining bread right before closing.', 'عبّئ الخبز المتبقي قبل الإغلاق مباشرة.'), price: 12, originalPrice: 36, quantity: 8, pickupWindow: { start: '21:30', end: '22:00' } }),
  ];

  /* ---- sales & analytics (sections A–H) ---- */
  /* (v1.4) sales & analytics are derived from the shared store: completed orders × the effective commission
     (S.earnings), the weekly payout statements (S.payouts) and per-day rows from the same orders. */
  const dayRows = (me, from, to) => {
    const payouts = S.payouts(me); const rows = [];
    for (let d = Date.parse(to + 'T00:00:00Z'); d >= Date.parse(from + 'T00:00:00Z'); d -= 864e5) {
      const date = new Date(d).toISOString().slice(0, 10); const e = S.earnings(me, date, date);
      const boxes = S.orders.filter((o) => o.merchantId === me && o.status === 'completed' && String(o.completedAt || o.createdAt).slice(0, 10) === date).reduce((s, o) => s + ((o.items[0] || {}).qty || 1), 0);
      const po = payouts.find((p) => p.periodStart <= date && date <= p.periodEnd);
      rows.push({ date, orders: e.orders, boxes, grossSales: e.gross, commission: e.commission, commissionRate: S.rateFor(me, date), adjustments: e.refunds, netEarnings: e.net,
        payout: po ? po.status : 'pending', payoutId: po ? po.id : null, mealsSaved: boxes * 2, foodKg: Math.round(boxes * 1.3 * 10) / 10, co2T: Math.round(boxes * 0.0025 * 1000) / 1000 });
    }
    return rows;
  };
  const rangeOf = (q, period) => {
    const n = { today: 1, day: 1, week: 7, '7d': 7, month: 30, '30d': 30, '3m': 90, custom: 30 }[period] || 30;
    const to = (q.to && String(q.to).slice(0, 10)) || api.DEMO_TODAY; const from = (q.from && String(q.from).slice(0, 10)) || (n === 1 ? to : api.demoDate(-n));
    return { from, to };
  };
  const salesSeries = (rows, cur) => {
    const r = rows.slice().reverse();
    return [{ key: 'revenue', label: `Revenue (${cur})`, points: r.map((x, i) => ({ x: i, date: x.date, y: x.grossSales.amount })) }, { key: 'orders', label: 'Orders', points: r.map((x, i) => ({ x: i, date: x.date, y: x.orders })) }];
  };
  const analytics = (period, q = {}) => {
    const me = S.me(); const { from, to } = rangeOf(q, period);
    const e = S.earnings(me, from, to); const rows = dayRows(me, from, to); const cur = e.gross.currency;
    const M = (a) => ({ amount: Math.round(a * 100) / 100, currency: cur });
    const done = S.orders.filter((o) => o.merchantId === me && String(o.createdAt).slice(0, 10) >= from && String(o.createdAt).slice(0, 10) <= to);
    const boxes = rows.reduce((s, x) => s + x.boxes, 0), cancels = done.filter((o) => o.status === 'cancelled').length, refunds = done.filter((o) => /refunded/.test(o.status)).length, noShows = done.filter((o) => o.status === 'no_show').length;
    const payouts = S.payouts(me); const pending = payouts.filter((p) => p.status === 'pending'); const paid = payouts.filter((p) => p.status === 'paid');
    const pendingNet = pending.reduce((s, p) => s + p.net.amount, 0), paidNet = paid.reduce((s, p) => s + p.net.amount, 0);
    const next = pending[0]; const daysLeft = next ? Math.max(0, Math.round((Date.parse(next.scheduledFor) - Date.parse(api.DEMO_TODAY)) / 864e5)) : 0;
    const listed = Math.max(boxes, Math.round(boxes / 0.84));
    const custs = new Set(done.map((o) => o.customer && o.customer.name && o.customer.name.en)); const perCust = {}; done.forEach((o) => { const k = o.customer.name.en; perCust[k] = (perCust[k] || 0) + 1; });
    const repeat = Object.values(perCust).filter((n) => n > 1).length; const repeatRate = Math.round(100 * repeat / Math.max(1, custs.size));
    const top = {}; done.filter((o) => o.status === 'completed').forEach((o) => { const it = o.items[0]; const t = top[it.listingId] || (top[it.listingId] = { id: it.listingId, title: clone(it.title), sold: 0, revenue: 0 }); t.sold += it.qty; t.revenue += o.total.amount; });
    const topOffers = Object.values(top).sort((a, b) => b.sold - a.sold).slice(0, 4).map((t, i) => { const l = S.listings.find((x) => x.id === t.id); return { id: t.id, title: t.title, sold: t.sold, revenue: M(t.revenue), sellThrough: Math.min(99, 72 + (t.sold % 24)), tone: (l && l.images[0] && l.images[0].tone) || (i % 4) + 1 }; });
    const pct = (a) => Math.round(100 * a / Math.max(1, e.gross.amount));
    return {
      period, from, to, commissionRate: e.rate,
      kpis: [
        { key: 'salesRevenue', label: 'Sales Revenue', value: e.gross, delta: 18, deltaUnit: '%', deltaDirection: 'up', hint: 'vs previous 30 days' },
        { key: 'ordersSold', label: 'Orders Sold', value: e.orders, delta: 16, deltaUnit: '%', deltaDirection: 'up' },
        { key: 'boxesSold', label: 'Boxes Sold', value: boxes, delta: 20, deltaUnit: '%', deltaDirection: 'up' },
        { key: 'avgOrderValue', label: 'Average Order Value', value: M(e.gross.amount / Math.max(1, e.orders)), delta: 5, deltaUnit: '%', deltaDirection: 'up' },
        { key: 'sellThrough', label: 'Sell-Through Rate', value: Math.round(100 * boxes / Math.max(1, listed)), unit: '%', delta: 6, deltaUnit: 'pp', deltaDirection: 'up' },
        { key: 'netEarnings', label: 'Net Earnings', value: e.net, delta: 17, deltaUnit: '%', deltaDirection: 'up', hint: 'after commission', commissionRate: e.rate },
        { key: 'pendingPayout', label: 'Pending Payout', value: M(pendingNet), deltaDirection: 'flat' },
        { key: 'nextPayout', label: 'Next Payout', value: M(next ? next.net.amount : 0), date: next ? next.scheduledFor : null, hint: `${daysLeft} days left`, deltaDirection: 'flat' },
        { key: 'uniqueCustomers', label: 'Unique Customers', value: custs.size, delta: 14, deltaUnit: '%', deltaDirection: 'up' },
        { key: 'repeatRate', label: 'Repeat Purchase Rate', value: repeatRate, unit: '%', delta: 5, deltaUnit: 'pp', deltaDirection: 'up' },
        { key: 'avgRating', label: 'Average Rating', value: 4.8, delta: 0.2, deltaDirection: 'up' },
        { key: 'recoveryRate', label: 'Recovery Rate', value: Math.round(100 * boxes / Math.max(1, listed)), unit: '%', delta: 7, deltaUnit: 'pp', deltaDirection: 'up' },
      ],
      salesPerformance: salesSeries(rows, cur),                                                   // A
      surplusRecovery: { listed, sold: boxes, unsold: listed - boxes, recoveredRevenue: e.gross, retailValueSaved: M(e.gross.amount * 3), recoveryRate: Math.round(100 * boxes / Math.max(1, listed)) }, // B
      topOffers,                                                                                  // C
      ordersPickups: { reserved: done.length, collected: e.orders, completionRate: Math.round(1000 * e.orders / Math.max(1, done.length)) / 10, customerCancellations: cancels, merchantCancellations: 0, noShows, refunds }, // D
      earnings: { grossSales: e.gross, commission: e.commission, commissionRate: e.rate, refundAdjustments: e.refunds, netEarnings: e.net, paidToDate: M(paidNet), pendingPayout: M(pendingNet),
        split: [{ key: 'net', label: 'Net Earnings', pct: pct(e.net.amount) }, { key: 'commission', label: 'Commission', pct: pct(e.commission.amount) }, { key: 'adjustments', label: 'Adjustments', pct: Math.max(0, 100 - pct(e.net.amount) - pct(e.commission.amount)) }] }, // E
      customerInsights: { newCustomers: Math.max(0, custs.size - repeat), returningCustomers: repeat, repeatRate, avgRating: 4.8, reviews: 186 },   // F
      impact: { mealsSaved: boxes * 2, foodKgSaved: Math.round(boxes * 1.3), co2TAvoided: Math.round(boxes * 0.0025 * 100) / 100, foodWasteValueSaved: M(e.gross.amount * 3) }, // G
      days: rows.slice(0, 5), daysTotal: rows.length,                                             // H
    };
  };

  /* ------------------------------------------------------------- helpers */
  const txt = (v) => (v && typeof v === 'object' ? `${v.en} ${v.ar}` : String(v ?? '')).toLowerCase();
  const matchQ = (q, ...fields) => !q || fields.some((f) => txt(f).includes(String(q).toLowerCase()));
  const knownBranch = (id) => branches.some((b) => b.id === id);
  const byBranch = (q, item) => !q.branchId || q.branchId === 'all' || !knownBranch(q.branchId) || !item.branch || item.branch.id === q.branchId;
  const sortBy = (list, sort, map = {}) => {
    if (!sort) return list;
    const desc = sort.startsWith('-'); const key = desc ? sort.slice(1) : sort;
    const get = map[key] || ((x) => x[key]);
    return list.slice().sort((a, b) => { const A = get(a), B = get(b); const r = A > B ? 1 : A < B ? -1 : 0; return desc ? -r : r; });
  };
  const page = (list, q, summary) => {
    const p = Math.max(1, Number(q.page) || 1), ps = Math.min(100, Number(q.pageSize) || 10);
    const meta = { page: p, pageSize: ps, total: list.length }; if (summary) meta.summary = summary;
    return { data: clone(list.slice((p - 1) * ps, p * ps)), meta, __list: true };
  };
  const find = (list, id, what) => list.find((x) => x.id === id) || err(404, 'not_found', `${what} ${id} not found`);
  const need = (body, fields) => { const missing = fields.filter((f) => { const v = f.split('.').reduce((o, k) => (o ? o[k] : undefined), body); return v === undefined || v === null || v === '' || (typeof v === 'object' && !Array.isArray(v) && 'en' in v && !v.en && !v.ar); }); if (missing.length) err(422, 'validation_error', 'Missing required fields', missing.map((f) => ({ field: f, code: 'required' }))); };
  const asText = (v) => (v && typeof v === 'object' ? v : L(String(v || ''), String(v || '')));

  /* order display state: the reference shows "Unassigned" for delivery orders without a driver */
  const orderSummary = (list) => ({
    total: list.length,
    active: list.filter((o) => S.isActive(o)).length,
    readyForPickup: list.filter((o) => o.status === 'ready_for_pickup' && o.fulfillment === 'pickup').length,
    outForDelivery: list.filter((o) => o.status === 'out_for_delivery').length,
    awaitingDriver: list.filter((o) => o.fulfillment === 'delivery' && !o.driver && S.isActive(o)).length,
    activeDrivers: drivers.filter((d) => d.status !== 'offline' && d.status !== 'inactive').length,
  });
  const listingSummary = (list) => ({
    active: list.filter((l) => l.status === 'active').length,
    disabled: list.filter((l) => l.status === 'disabled').length,
    soldOut: list.filter((l) => l.status === 'sold_out').length,
    paused: list.filter((l) => l.status === 'paused').length,
    total: list.length,
  });

  /* ------------------------------------------------------------- routes */
  const R = [];
  const on = (method, path, fn) => R.push({ method, path, re: new RegExp('^' + path.replace(/\{(\w+)\}/g, '(?<$1>[^/]+)') + '$'), fn });

  // ---- Orders & Pickups
  on('GET', '/merchant/orders', ({ query: q }) => {
    let list = orders.filter((o) => byBranch(q, o) && (!q.status || q.status === 'all' || o.status === q.status || (q.status === 'active' && S.isActive(o)) || (q.status === 'unassigned' && o.fulfillment === 'delivery' && !o.driver && S.isActive(o))) && (!q.type || o.fulfillment === q.type) && matchQ(q.q, o.id, o.customer.name, o.bag));
    list = sortBy(list, q.sort || '-createdAt');
    const r = page(list, q, orderSummary(orders.filter((o) => byBranch(q, o)))); r.data = r.data.map((o) => Object.assign(o, { allowedActions: S.allowedActions(o), active: S.isActive(o) })); return r;
  });
  on('GET', '/merchant/orders/{id}', ({ params }) => oOut(find(orders, params.id, 'Order')));
  /* (v1.4 F-002) every action goes through the shared order state machine (409 invalid_transition otherwise) */
  on('POST', '/merchant/orders/{id}/assign-driver', ({ params, body }) => {
    const o = find(orders, params.id, 'Order'); need(body, ['driverId']);
    if (!S.allowedActions(o).includes('assign_driver')) err(409, 'invalid_transition', `A driver can't be assigned to an order that is ${o.status}.`, { from: o.status, to: 'driver_assigned', allowed: S.FLOW[o.status] || [] });
    const d = find(drivers, body.driverId, 'Driver');
    o.driver = dref(d.id);
    if (o.status === 'driver_assigned') o.timeline.push({ status: 'driver_assigned', at: nowIso(), by: 'merchant', event: 'driver_reassigned' });
    else S.transition(o, 'driver_assigned', { by: 'merchant' });
    return oOut(o);
  });
  /* delivery orders progress via the driver flow: out_for_delivery / picked_up → delivered → completed.
     Self-pickup orders are completed only by verifying the pickup code (POST /merchant/pickups/verify). */
  on('POST', '/merchant/orders/{id}/complete', ({ params }) => {
    const o = find(orders, params.id, 'Order');
    if (o.fulfillment === 'pickup') err(409, 'invalid_transition', 'Self-pickup orders are completed by verifying the customer’s pickup code.', { from: o.status, to: 'completed', requires: 'pickup_verification' });
    S.transition(o, ['out_for_delivery', 'picked_up'].includes(o.status) ? 'delivered' : 'completed', { by: 'merchant' });
    return oOut(o);
  });
  on('POST', '/merchant/orders/{id}/cancel', ({ params, body }) => {
    const o = find(orders, params.id, 'Order'); need(body || {}, ['reason']);
    S.transition(o, 'cancelled', { by: 'merchant', note: body.reason }); o.cancelReason = body.reason; o.paymentStatus = 'refunded';
    return oOut(o);
  });
  /* (v1.4 F-003) one helper verifies the code, marks it used and completes the order (single timeline event) */
  on('POST', '/merchant/pickups/verify', ({ body }) => {
    const b = body || {}; const r = S.verifyPickup({ code: b.code, orderId: b.orderId, by: 'merchant', merchantId: S.me() });
    return { valid: true, order: oOut(r.order), pickup: { id: r.pickup.id, orderId: r.pickup.orderId, status: r.pickup.status, usedAt: r.pickup.usedAt, expiresAt: r.pickup.expiresAt } };
  });

  // ---- Listings / Inventory (one resource; Listings (Bags) and Inventory are two views of it)
  on('GET', '/merchant/listings', ({ query: q }) => {
    let list = listings.filter((l) => byBranch(q, l) && (!q.status || q.status === 'all' || l.status === q.status) && (!q.category || q.category === 'all' || l.category === q.category) &&
      (!q.city || q.city === 'all' || l.city === q.city) && (!q.dietary || q.dietary === 'all' || l.dietary.includes(q.dietary)) && matchQ(q.q, l.id, l.title));
    list = sortBy(list, q.sort || '-createdAt', { price: (x) => x.price.amount, title: (x) => x.title.en, sold: (x) => x.stats.sold });
    return page(list, q, listingSummary(listings.filter((l) => byBranch(q, l))));
  });
  on('GET', '/merchant/listings/{id}', ({ params }) => clone(find(listings, params.id, 'Listing')));
  on('GET', '/merchant/listings/{id}/activity', ({ params }) => ({ data: clone(find(listings, params.id, 'Listing').activity) }));
  /* (v1.4 F-001) remaining is never touched unless quantity changes; then remaining = quantity − (reserved + collected).
     A quantity below what is already committed is rejected with a field error (S.setQuantity). */
  const listingFromBody = (b, base = {}) => {
    const isNew = base.quantity === undefined; const qty = Number(b.quantity ?? base.quantity ?? 10);
    if (!isNew && qty !== base.quantity) S.setQuantity(base, qty); // throws 422 {quantity:'below_committed'} before anything changes
    if (isNew) Object.assign(base, { quantity: qty, remaining: qty, reserved: 0, collected: 0, merchantId: S.me(), market: (branches.find((x) => x.id === (b.branchId || 'BR-01')) || branches[0]).country || 'QA', date: api.DEMO_TODAY, flagged: false, moderation: null, allergens: b.allergens || [] });
    const price = Number(b.price?.amount ?? b.price), orig = Number(b.originalPrice?.amount ?? b.originalPrice ?? price * 3);
    return Object.assign(base, {
      title: asText(b.title), category: b.category, shortDescription: asText(b.shortDescription), description: asText(b.description),
      address: asText(b.address), city: b.city, state: asText(b.state), zip: b.zip, listingType: b.listingType, availability: b.availability,
      price: { amount: Math.round(price * 100) / 100, currency: branchCurrency(b.branchId || (base.branch && base.branch.id) || 'BR-01') }, originalPrice: { amount: Math.round(orig * 100) / 100, currency: branchCurrency(b.branchId || (base.branch && base.branch.id) || 'BR-01') },
      pickupWindow: b.pickupWindow || base.pickupWindow || { start: '18:00', end: '20:00' }, dietary: b.dietary || base.dietary || [],
      images: b.images || base.images || [], settings: Object.assign({ publish: true, featured: false, allowNegotiation: false, expiresOn: null }, base.settings, b.settings),
      branch: b.branchId ? bref(b.branchId) : base.branch || bref('BR-01'),
    });
  };
  on('POST', '/merchant/listings', ({ body }) => {
    need(body, ['title', 'category', 'shortDescription', 'address', 'city', 'state', 'zip', 'price', 'listingType', 'availability', 'description']);
    const l = listingFromBody(body, { id: nextId('LIS'), stats: { sold: 0, revenue: QAR(0), views: 0 }, createdAt: nowIso() });
    l.status = l.settings.publish ? 'active' : 'draft'; l.activity = [{ type: 'created', label: L('Listing created', 'تم إنشاء القائمة'), at: l.createdAt }];
    listings.unshift(l); return clone(l);
  });
  on('PATCH', '/merchant/listings/{id}', ({ params, body }) => {
    const l = find(listings, params.id, 'Listing'); const before = l.price.amount;
    listingFromBody(Object.assign({ title: l.title, category: l.category, shortDescription: l.shortDescription, description: l.description, address: l.address, city: l.city, state: l.state, zip: l.zip, listingType: l.listingType, availability: l.availability, price: l.price, originalPrice: l.originalPrice, quantity: l.quantity }, body), l);
    if (body.status) { if (l.flagged && ['active', 'draft'].includes(body.status) && body.status !== l.status) err(409, 'moderation_hold', 'WonderBites disabled this listing for review.', {}); if (body.status !== 'draft' || !l.flagged) l.status = body.status; }
    l.activity.push({ type: before !== l.price.amount ? 'price' : 'updated', label: before !== l.price.amount ? L('Price updated', 'تم تحديث السعر') : L('Listing updated', 'تم تحديث القائمة'), at: nowIso() });
    return clone(l);
  });
  on('DELETE', '/merchant/listings/{id}', ({ params }) => { find(listings, params.id, 'Listing'); listings.splice(listings.findIndex((x) => x.id === params.id), 1); return null; });
  const lAction = (name, fn, label) => on('POST', `/merchant/listings/{id}/${name}`, ({ params }) => { const l = find(listings, params.id, 'Listing'); const r = fn(l); l.activity.push({ type: name, label, at: nowIso() }); return clone(r || l); });
  lAction('pause', (l) => { l.status = 'paused'; }, L('Listing paused', 'تم إيقاف القائمة مؤقتًا'));
  lAction('resume', (l) => { if (l.flagged) err(409, 'moderation_hold', 'WonderBites disabled this listing for review. Contact support to re-enable it.', { reason: l.moderation && l.moderation.reason }); l.status = l.remaining > 0 ? 'active' : 'sold_out'; l.settings.publish = true; }, L('Listing resumed', 'تم استئناف القائمة'));
  lAction('disable', (l) => { l.status = 'disabled'; l.settings.publish = false; }, L('Listing disabled', 'تم تعطيل القائمة'));
  lAction('duplicate', (l) => { const c = clone(l); c.id = nextId('LIS'); c.title = L(l.title.en + ' (copy)', l.title.ar + ' (نسخة)'); c.status = 'draft'; c.settings.publish = false; c.reserved = 0; c.collected = 0; c.remaining = c.quantity; c.flagged = false; c.moderation = null; c.stats = { sold: 0, revenue: QAR(0), views: 0 }; c.createdAt = nowIso(); c.activity = [{ type: 'created', label: L('Duplicated from ' + l.id, 'نُسخت من ' + l.id), at: c.createdAt }]; listings.unshift(c); return c; }, L('Listing duplicated', 'تم نسخ القائمة'));
  on('POST', '/merchant/listings/{id}/images', ({ params, body }) => { const l = find(listings, params.id, 'Listing'); if (l.images.length >= 10) err(422, 'validation_error', 'Maximum 10 images'); const img = { id: nextId('IMG'), tone: (l.images.length % 4) + 1, fileId: body?.fileId || null }; l.images.push(img); return clone(img); });
  on('DELETE', '/merchant/listings/{id}/images/{imageId}', ({ params }) => { const l = find(listings, params.id, 'Listing'); l.images = l.images.filter((i) => i.id !== params.imageId); return null; });

  // ---- Products (Create Product screen)
  on('POST', '/merchant/products', ({ body }) => {
    need(body, ['name', 'category', 'description', 'price', 'quantity']);
    const p = { id: nextId('PRD'), name: asText(body.name), category: body.category, description: asText(body.description), price: { amount: Number(body.price?.amount ?? body.price), currency: branchCurrency(body.branchId || 'BR-01') }, quantity: Number(body.quantity), branchId: body.branchId || 'BR-01', images: body.images || [], templateId: body.templateId || null, createdAt: nowIso() };
    products.unshift(p);
    // a product becomes an inventory listing (draft) so it is visible in Inventory
    const l = listingFromBody({ title: p.name, category: p.category, shortDescription: p.description, description: p.description, address: (branches.find((x) => x.id === (body.branchId || 'BR-01')) || branches[0]).address, city: (branches.find((x) => x.id === (body.branchId || 'BR-01')) || branches[0]).city, state: L('', ''), zip: '00000', branchId: body.branchId || 'BR-01', price: p.price, quantity: p.quantity, listingType: 'surprise_bag', availability: 'daily', settings: { publish: true } }, { id: nextId('LIS'), stats: { sold: 0, revenue: QAR(0), views: 0 }, createdAt: p.createdAt });
    l.status = 'active'; l.activity = [{ type: 'created', label: L('Listing created', 'تم إنشاء القائمة'), at: p.createdAt }]; listings.unshift(l); p.listingId = l.id;
    if (body.saveAsTemplate) templates.push(T(nextId('TPL'), 'mine', p.name.en, p.name.ar, p.category, p.description.en, p.description.ar, 0, p.price.amount, 'box', { name: p.name, category: p.category, description: p.description, price: p.price.amount, originalPrice: p.price.amount * 3, quantity: p.quantity }));
    if (body.templateId) { const t = templates.find((x) => x.id === body.templateId); if (t) t.usageCount++; }
    return clone(p);
  });
  on('GET', '/merchant/products', ({ query: q }) => page(products, q));

  // ---- Drivers
  const driverSummary = () => ({ total: drivers.length, available: drivers.filter((d) => d.status === 'available').length, onDelivery: drivers.filter((d) => d.status === 'on_delivery').length, offline: drivers.filter((d) => d.status === 'offline').length,
    avgOnTime: Math.round((drivers.reduce((s, d) => s + d.onTime, 0) / Math.max(1, drivers.length)) * 10) / 10 });
  on('GET', '/merchant/drivers', ({ query: q }) => {
    let list = drivers.filter((d) => (!q.branchId || q.branchId === 'all' || !knownBranch(q.branchId) || d.branchId === q.branchId) && (!q.status || q.status === 'all' || d.status === q.status) && (!q.compliance || q.compliance === 'all' || d.compliance === q.compliance) &&
      (!q.certificate || q.certificate === 'all' || d.certificate === q.certificate) && (!q.vehicle || q.vehicle === 'all' || d.vehicle === q.vehicle) && matchQ(q.q, d.id, d.name, d.phone));
    list = sortBy(list, q.sort || '-joinedAt', { name: (x) => x.name.en });
    return page(list.map((d) => Object.assign(clone(d), { branch: bref(d.branchId), activeOrders: orders.filter((o) => o.driver && o.driver.id === d.id && !['delivered', 'completed', 'cancelled', 'failed'].includes(o.status)).length })), q, driverSummary());
  });
  on('GET', '/merchant/drivers/{id}', ({ params }) => { const d = clone(find(drivers, params.id, 'Driver')); d.branch = bref(d.branchId); d.orders = orders.filter((o) => o.driver && o.driver.id === d.id).map(oOut); return d; });
  on('POST', '/merchant/drivers', ({ body }) => {
    need(body, ['name', 'phone', 'vehicle', 'branchId', 'licenseNo']);
    if (drivers.some((d) => d.phone.replace(/\s/g, '') === String(body.phone).replace(/\s/g, ''))) err(409, 'conflict', 'A driver with this phone already exists', [{ field: 'phone', code: 'duplicate' }]);
    const d = { id: 'DRV-' + String(drivers.length + 1).padStart(2, '0'), name: asText(body.name), phone: body.phone, vehicle: body.vehicle, plate: body.plate || '—', branchId: body.branchId, status: 'available', deliveries: 0, onTime: 100, rating: 0, compliance: 'under_review', certificate: body.certificateExpiry ? 'pending_review' : 'pending_review', licenseNo: body.licenseNo, certificateExpiry: body.certificateExpiry || null, joinedAt: nowIso().slice(0, 10) };
    drivers.push(d); return clone(d);
  });
  on('PATCH', '/merchant/drivers/{id}', ({ params, body }) => { const d = find(drivers, params.id, 'Driver'); ['phone', 'vehicle', 'plate', 'branchId', 'status', 'licenseNo', 'certificateExpiry'].forEach((k) => { if (body[k] !== undefined) d[k] = body[k]; }); if (body.name) d.name = asText(body.name); return clone(d); });
  on('DELETE', '/merchant/drivers/{id}', ({ params }) => { find(drivers, params.id, 'Driver'); drivers.splice(drivers.findIndex((x) => x.id === params.id), 1); return null; });

  // ---- Sales & Analytics
  on('GET', '/merchant/analytics/sales', ({ query: q }) => analytics(q.period || '30d', q));
  on('GET', '/merchant/analytics/sales/days', ({ query: q }) => { const { from, to } = rangeOf(q, q.period || '30d'); return page(dayRows(S.me(), from, to), Object.assign({ pageSize: 10 }, q)); });

  // ---- Customers
  const custSummary = () => ({ total: customers.length, active: customers.filter((c) => c.status === 'active').length, inactive: customers.filter((c) => c.status === 'inactive').length, blocked: customers.filter((c) => c.status === 'blocked').length,
    avgRescueScore: Math.round(customers.reduce((s, c) => s + c.rescueScore, 0) / Math.max(1, customers.length)) });
  on('GET', '/merchant/customers', ({ query: q }) => {
    let list = customers.filter((c) => (!q.status || q.status === 'all' || c.status === q.status) && (!q.category || q.category === 'all' || c.favoriteCategory === q.category) && matchQ(q.q, c.id, c.name, c.email, c.mobile));
    list = sortBy(list, q.sort || '-createdAt', { name: (x) => x.name.en });
    return page(list, q, custSummary());
  });
  on('GET', '/merchant/customers/{id}', ({ params }) => { const c = clone(find(customers, params.id, 'Customer')); c.orders = orders.filter((o) => o.customer.id === c.id).map(oOut); return c; });
  const custFromBody = (b, c) => { if (b.name) c.name = asText(b.name); ['code', 'mobile', 'email', 'status', 'favoriteCategory'].forEach((k) => { if (b[k] !== undefined) c[k] = b[k]; }); if (b.avatarFileId) c.avatarFileId = b.avatarFileId; return c; };
  on('POST', '/merchant/customers', ({ body }) => {
    need(body, ['name', 'code', 'mobile', 'email', 'password']);
    if (!/^\S+@\S+\.\S+$/.test(body.email)) err(422, 'validation_error', 'Invalid email', [{ field: 'email', code: 'format' }]);
    if (customers.some((c) => c.email.toLowerCase() === body.email.toLowerCase())) err(409, 'conflict', 'Email already registered', [{ field: 'email', code: 'duplicate' }]);
    const c = custFromBody(body, { id: nextId('CUS'), createdAt: nowIso(), ordersCount: 0, rescueScore: 0, status: 'active', favoriteCategory: 'bakery', city: 'doha', mealsSaved: 0, totalSpent: QAR(0), lastOrderAt: null });
    customers.unshift(c); return clone(c);
  });
  on('PATCH', '/merchant/customers/{id}', ({ params, body }) => clone(custFromBody(body, find(customers, params.id, 'Customer'))));
  on('DELETE', '/merchant/customers/{id}', ({ params }) => { find(customers, params.id, 'Customer'); customers.splice(customers.findIndex((x) => x.id === params.id), 1); return null; });

  // ---- Branches
  on('GET', '/merchant/branches', ({ query: q }) => page(branches.map(withMarket).filter((b) => matchQ(q.q, b.name, b.address)), Object.assign({ pageSize: 50 }, q), { total: branches.length, open: branches.filter((b) => b.state === 'open').length }));
  on('GET', '/merchant/branches/{id}', ({ params }) => clone(withMarket(find(branches, params.id, 'Branch'))));
  const branchFromBody = (b, br) => { ['name', 'address', 'manager'].forEach((k) => { if (b[k] !== undefined) br[k] = asText(b[k]); }); ['city', 'phone', 'lat', 'lng', 'state'].forEach((k) => { if (b[k] !== undefined) br[k] = b[k]; }); if (b.hours) { br.hours = b.hours; const today = b.hours[0]; br.pickupToday = { start: today.open, end: today.close }; } return br; };
  /* (v1.3) a branch is created in an ENABLED market; city must belong to it; currency/time zone follow the market */
  const checkMarket = (b, br) => {
    const country = b.country || (br && br.country) || 'QA'; const m = MK() && MK().get(country);
    if (MK() && (!m || !m.enabled)) err(422, 'validation_error', 'This country isn’t enabled yet.', { country: 'not_enabled' });
    if (m && b.city && !m.cities.some((c) => c.id === b.city)) err(422, 'validation_error', 'Choose a city in the selected country.', { city: 'enum' });
    return country;
  };
  on('POST', '/merchant/branches', ({ body }) => {
    need(body, ['name', 'address', 'city', 'phone']); body.country = checkMarket(body);
    const br = branchFromBody(body, { id: nextId('br'), state: 'open', photo: (branches.length % 3) + 1, lat: 25.2, lng: 55.27, manager: L('', ''), hours: branches[0].hours.map((h) => Object.assign({}, h)), pickupToday: { start: '08:00', end: '22:00' } });
    br.country = body.country; branches.push(br); return clone(withMarket(br));
  });
  on('PATCH', '/merchant/branches/{id}', ({ params, body }) => { const br = find(branches, params.id, 'Branch'); const c = checkMarket(body, br); const out = branchFromBody(body, br); out.country = c; return clone(withMarket(out)); });
  on('PATCH', '/merchant/branches/{id}/state', ({ params, body }) => { const b = find(branches, params.id, 'Branch'); if (!['open', 'closed', 'temporarily_closed'].includes(body.state)) err(422, 'validation_error', 'Invalid state'); b.state = body.state; return clone(b); });
  on('PUT', '/merchant/branches/{id}/hours', ({ params, body }) => { const b = find(branches, params.id, 'Branch'); b.hours = body.hours; return clone(withMarket(b)); });
  on('DELETE', '/merchant/branches/{id}', ({ params }) => {
    if (branches.length <= 1) err(409, 'conflict', 'You need at least one branch');
    find(branches, params.id, 'Branch'); branches.splice(branches.findIndex((x) => x.id === params.id), 1); return null;
  });

  // ---- Vendors (sub-vendors)
  const vendorSummary = () => ({ total: vendors.length, active: vendors.filter((v) => v.status === 'active').length, pending: vendors.filter((v) => v.status === 'pending').length, suspended: vendors.filter((v) => v.status === 'suspended').length, inactive: vendors.filter((v) => v.status === 'inactive').length });
  on('GET', '/merchant/vendors', ({ query: q }) => {
    let list = vendors.filter((v) => (!q.status || q.status === 'all' || v.status === q.status) && matchQ(q.q, v.name, v.email, v.category));
    return page(sortBy(list, q.sort || '-joinedAt'), q, vendorSummary());
  });
  on('GET', '/merchant/vendors/{id}', ({ params }) => clone(find(vendors, params.id, 'Vendor')));
  on('POST', '/merchant/vendors', ({ body }) => {
    need(body, ['name', 'category', 'email', 'phone', 'tradeLicenseNo']);
    const name = asText(body.name);
    const v = { id: 'VEN-' + String(vendors.length + 1).padStart(2, '0'), name, initials: name.en.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(), category: body.category, email: body.email, phone: body.phone, branchesCount: Number(body.branchesCount || 1), joinedAt: nowIso().slice(0, 10), status: 'pending', parentId: 'MER-047', tradeLicenseNo: body.tradeLicenseNo, commissionRate: Number(body.commissionRate || S.commercial.defaultCommissionRate), city: body.city || 'doha', listingsCount: 0, ordersCount: 0 };
    vendors.unshift(v); return clone(v);
  });
  on('PATCH', '/merchant/vendors/{id}', ({ params, body }) => { const v = find(vendors, params.id, 'Vendor'); Object.assign(v, body, body.name ? { name: asText(body.name) } : {}); return clone(v); });
  on('PATCH', '/merchant/vendors/{id}/status', ({ params, body }) => { const v = find(vendors, params.id, 'Vendor'); if (!['active', 'pending', 'inactive', 'suspended'].includes(body.status)) err(422, 'validation_error', 'Invalid status'); v.status = body.status; return clone(v); });

  // ---- Templates
  on('GET', '/merchant/templates', ({ query: q }) => page(templates.filter((t) => (!q.source || t.source === q.source) && matchQ(q.q, t.name)), Object.assign({ pageSize: 50 }, q)));
  on('GET', '/merchant/templates/{id}', ({ params }) => clone(find(templates, params.id, 'Template')));
  on('POST', '/merchant/templates', ({ body }) => {
    need(body, ['name', 'category']);
    const name = asText(body.name), desc = asText(body.description || '');
    const t = T(nextId('TPL'), 'mine', name.en, name.ar, body.category, desc.en, desc.ar, 0, Number(body.suggestedPrice?.amount ?? body.suggestedPrice ?? 15), 'box', Object.assign({ name, category: body.category, description: desc, price: Number(body.suggestedPrice?.amount ?? body.suggestedPrice ?? 15), quantity: Number(body.quantity || 10) }, body.defaults || {}));
    templates.push(t); return clone(t);
  });
  on('PATCH', '/merchant/templates/{id}', ({ params, body }) => {
    const t = find(templates, params.id, 'Template'); if (t.source !== 'mine') err(403, 'forbidden', 'WonderBites templates are read-only');
    if (body.name) { t.name = asText(body.name); t.defaults.name = t.name; } if (body.description !== undefined) { t.description = asText(body.description); t.defaults.description = t.description; }
    if (body.category) { t.category = body.category; t.defaults.category = body.category; } if (body.suggestedPrice !== undefined) { t.suggestedPrice = QAR(Number(body.suggestedPrice?.amount ?? body.suggestedPrice)); t.defaults.price = t.suggestedPrice.amount; }
    if (body.quantity !== undefined) t.defaults.quantity = Number(body.quantity); t.updatedAt = nowIso(); return clone(t);
  });
  on('DELETE', '/merchant/templates/{id}', ({ params }) => { const t = find(templates, params.id, 'Template'); if (t.source !== 'mine') err(403, 'forbidden', 'WonderBites templates are read-only'); templates.splice(templates.indexOf(t), 1); return null; });
  on('POST', '/merchant/templates/{id}/create-product', ({ params, body }) => { const t = find(templates, params.id, 'Template'); const d = clone(t.defaults); const cur = branchCurrency((body && body.branchId) || 'BR-01'); const from = (t.suggestedPrice && t.suggestedPrice.currency) || 'QAR'; if (MK() && cur !== from && d.price != null) d.price = Math.round(MK().convert(d.price, from, cur)); return { templateId: t.id, currency: cur, draft: d }; });

  // ---- Imports (orders / customers / listings) — resource-scoped mock of shared /imports
  on('POST', '/merchant/imports/preview', ({ body }) => {
    const rows = Number(body?.rows || 12);
    return { resource: body?.resource, rows, valid: rows - 1, errors: [{ row: 7, field: 'mobile', code: 'format' }] };
  });

  /* --------------------------------------------------------- dispatcher */
  const wrap = (fn) => (req) => { const r = fn(Object.assign({ query: {}, params: {} }, req)); if (r && r.__list) { delete r.__list; return r; } return r === null || r === undefined ? { ok: true } : r; };
  function handle(method, path, { query = {}, body = null } = {}) {         // used by node tests / other adapters
    const clean = path.split('?')[0].replace(/^\/api\/v1/, '');
    if (path.includes('?')) new URLSearchParams(path.split('?')[1]).forEach((v, k) => { if (query[k] === undefined) query[k] = v; });
    for (const r of R) { if (r.method !== method.toUpperCase()) continue; const m = clean.match(r.re); if (m) return wrap(r.fn)({ method, path: clean, params: m.groups || {}, query, body: body ? clone(body) : body }); }
    return undefined;
  }
  window.WB_MOCK = window.WB_MOCK || {};
  window.WB_MOCK.merchantOps = { routes: R.map((r) => `${r.method} ${r.path}`), handle, db: { branches, drivers, customers, orders, listings, products, vendors, templates } };
  if (window.api && typeof window.api.mock === 'function') R.forEach((r) => window.api.mock(r.method, r.path.replace(/\{(\w+)\}/g, ':$1'), wrap(r.fn)));
  /* (v1.3) merchant aggregates (overview, analytics) are returned in the requested branch's currency */
  if (window.api && api.lens) api.lens(/^\/merchant\/(overview|analytics)/, (out, req) => { const id = req.query && req.query.branchId; const cur = id && id !== 'all' ? branchCurrency(id) : branchCurrency('BR-01'); return MK() ? MK().convertDeep(out, cur) : out; });
})();
