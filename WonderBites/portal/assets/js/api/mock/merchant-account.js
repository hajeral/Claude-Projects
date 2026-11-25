/* =====================================================================
   WonderBites mock module: MERCHANT ACCOUNT  (owner: D3)
   Screens: Settings (Profile, Store info, Security, Operating Hours, Language),
            Help (request form, FAQ, contact options, my requests),
            Reviews (summary, list, reply, report, write a review),
            Reports / Dispute (tabs, list, detail thread, reply, close)
   Paths follow docs/API_CONTRACT.md. All merchant routes accept ?branchId.
   ===================================================================== */
(function () {
  const W = (window.WBMock = window.WBMock || { modules: {} });
  const MockError = (status, code, message, details) =>
    (window.api && typeof window.api.error === 'function') ? window.api.error(status, code, message, details)
      : Object.assign(new Error(message), { status, code, error: { code, message, details } });
  const L = (en, ar) => ({ en, ar });
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const now = () => api.demoIso(); // (v1.4) demo clock
  let seq = 5000;
  const nid = (p) => `${p}_${++seq}`;
  const paginate = (rows, q) => {
    const page = Math.max(1, +q.page || 1), pageSize = Math.min(100, +q.pageSize || 20);
    return { data: rows.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: rows.length };
  };
  const need = (body, keys) => {
    const missing = keys.filter((k) => !body || body[k] == null || String(body[k]).trim() === '');
    if (missing.length) throw MockError(422, 'validation_error', 'Some fields need attention.', Object.fromEntries(missing.map((k) => [k, 'required'])));
  };
  const find = (arr, id, what) => { const x = arr.find((r) => r.id === id); if (!x) throw MockError(404, 'not_found', `${what} not found`); return x; };

  /* ---------------- branches (reference list for hours selector) ---------------- */
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const week = (open = '08:00', close = '22:00', closedDays = []) => DAYS.map((day) => ({ day, open, close, closed: closedDays.includes(day) }));
  const branches = [
    { id: 'br_wasl', name: L('West Bay Branch', 'فرع الخليج الغربي'), city: L('Doha', 'الدوحة'), hours: week('08:00', '21:00') },
    { id: 'br_downtown', name: L('Al Hilal Branch', 'فرع الهلال'), city: L('Doha', 'الدوحة'), hours: week('08:00', '22:00') },
    { id: 'br_jlt', name: L('Al Waab Branch', 'فرع الوعب'), city: L('Doha', 'الدوحة'), hours: week('07:00', '20:00', ['fri']) },
    { id: 'br_marina', name: L('Al Sadd Branch', 'فرع السد'), city: L('Doha', 'الدوحة'), hours: week('09:00', '23:00') },
  ];

  /* ---------------- settings ---------------- */
  const settings = {
    profile: { firstName: 'Sara', lastName: 'Al Hashimi', email: 'sara@figandbloom.example.com', phoneCountry: '+974', phone: '5550 8890', avatarUrl: null },
    store: { name: L('Fig & Bloom Bakery', 'مخبز فيغ آند بلوم'), address: L('Al Corniche St 42, West Bay, Doha', 'شارع الكورنيش 42، الخليج الغربي، الدوحة'), category: 'bakery', description: L("Small-batch sourdough, pastries and cakes, baked fresh every morning. Tonight's surplus goes into WonderBites bags.", 'خبز العجين المخمر والمعجنات والكعك بكميات صغيرة، تُخبز طازجة كل صباح. فائض الليلة يذهب إلى أكياس WonderBites.'), logoUrl: null },
    security: { businessEmail: 'accounts@figandbloom.example.com', twoFactor: false, lastPasswordChangeAt: '2026-08-02T10:00:00Z' },
    language: { language: 'en' },
  };

  /* ---------------- reviews: customer reviews of bags ---------------- */
  const reviews = [
    ['rev_1', 'Amina Khalid', 5, '2026-11-18T19:40:00Z', 'Morning Pastry Box', L('Picked up at 6pm and it was still warm. Two croissants, a pain au chocolat and a cardamom bun for QAR 15. Incredible value and zero waste. Will reserve again!', 'استلمته الساعة 6 مساءً وكان لا يزال دافئًا. كرواسونان وبان أو شوكولا وكعكة بالهيل مقابل 15 ريالًا. قيمة رائعة ودون أي هدر. سأحجز مرة أخرى!'), null, 'published'],
    ['rev_2', 'Yusuf Rahman', 4, '2026-11-17T20:10:00Z', 'Artisan Bread Bag', L('A full sourdough loaf and two baguettes. Lovely bread, though the pickup queue was a little long at 7pm.', 'رغيف كامل من العجين المخمر ورغيفا باغيت. خبز رائع، لكن طابور الاستلام كان طويلًا قليلًا الساعة 7 مساءً.'), { body: L('Thank you Yusuf! We have added a second pickup counter in the evenings.', 'شكرًا يوسف! أضفنا نقطة استلام ثانية في المساء.'), at: '2026-11-18T09:00:00Z' }, 'replied'],
    ['rev_3', 'Lina Haddad', 5, '2026-11-16T18:55:00Z', 'Sweet Treats Mix', L('Pistachio éclair, two macarons and a slice of date cake. My kids loved it. The staff were so friendly at collection.', 'إكلير بالفستق وقطعتا ماكرون وشريحة كعكة التمر. أحبها أطفالي. كان الموظفون لطفاء جدًا عند الاستلام.'), null, 'published'],
    ['rev_4', 'Omar Saeed', 3, '2026-11-14T21:05:00Z', 'Deli Surprise Box', L('Good sandwiches but one was missing the allergen label. Please list sesame clearly.', 'سندويشات جيدة لكن إحداها بلا ملصق مسببات الحساسية. يرجى ذكر السمسم بوضوح.'), null, 'published'],
    ['rev_5', 'Fatima Ali', 5, '2026-11-12T19:20:00Z', 'Bakery Leftover Bag', L('Enough bread and buns for the whole weekend. Love that this bakery cares about food waste.', 'خبز وكعك يكفي لعطلة نهاية الأسبوع كاملة. أحب أن هذا المخبز يهتم بالحد من هدر الطعام.'), null, 'published'],
    ['rev_6', 'Shaikh Ahmed', 4, '2026-11-10T20:30:00Z', 'Morning Pastry Box', L('Tasty, fresh and well packed. A little fewer items than last time, but still great for the price.', 'لذيذ وطازج ومغلّف جيدًا. عدد القطع أقل قليلًا من المرة السابقة، لكنه ما زال رائعًا مقابل السعر.'), null, 'published'],
    ['rev_7', 'Noah Williams', 5, '2026-11-08T18:15:00Z', 'Artisan Bread Bag', L('Best focaccia in The Pearl, rescued at a third of the price. Highly recommend.', 'أفضل فوكاتشيا في اللؤلؤة، تم إنقاذها بثلث السعر. أنصح به بشدة.'), null, 'published'],
  ].map(([id, customer, rating, createdAt, listing, body, reply, status]) => ({ id, customer: { id: `cus_${id}`, name: customer }, rating, createdAt, listing: { id: `lst_${id}`, title: listing }, body, reply, status, helpful: Math.floor(rating * 3.4) }));
  const REVIEW_DIST = { 5: 488, 4: 74, 3: 14, 2: 2, 1: 0 };
  const REPORT_REASON = { offensive: L('Offensive or abusive language', 'لغة مسيئة'), not_customer: L('Not a real customer', 'ليس عميلًا حقيقيًا'), wrong_store: L('Review is about another store', 'التقييم عن متجر آخر'), personal_info: L('Contains personal information', 'يحتوي على معلومات شخصية'), other: L('Something else', 'سبب آخر') };
  /** a reported review's state follows its moderation case: pending → reported; approved (content kept) → published/replied; rejected → removed */
  const reviewOut = (r) => {
    const o = clone(r); const m = r.moderationId && window.WBStore && window.WBStore.moderation.find((x) => x.id === r.moderationId);
    if (m) {
      o.moderation = { id: m.id, status: m.status, outcome: m.decision ? (m.status === 'rejected' ? 'removed' : 'kept') : null, decidedAt: m.decision ? m.decision.at : null, note: m.decision ? m.decision.note : '' };
      o.status = !m.decision ? 'reported' : m.status === 'rejected' ? 'removed' : r.reply ? 'replied' : 'published';
    }
    return o;
  };
  function reviewSummary() {
    const total = Object.values(REVIEW_DIST).reduce((a, b) => a + b, 0);
    const avg = Object.entries(REVIEW_DIST).reduce((s, [k, v]) => s + k * v, 0) / total;
    return { average: Math.round(avg * 10) / 10, total, distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: REVIEW_DIST[stars] })), replied: reviews.filter((r) => r.reply).length, reported: reviews.filter((r) => reviewOut(r).status === 'reported').length, removed: reviews.filter((r) => reviewOut(r).status === 'removed').length };
  }

  /* ---------------- disputes / reports ---------------- */
  const STAFF = { sarah: { id: 'st_1', name: 'Sarah K.' }, omar: { id: 'st_2', name: 'Omar R.' }, wb: { id: 'wb_support', name: 'WonderBites Support' } };
  const msg = (from, role, body, at) => ({ id: nid('msg'), from, role, body, at });
  const disputes = [
    { id: 'dsp_1042', number: 'TK-1042', customer: { id: 'cus_1', name: 'Amira Hassan' }, subject: L('Order never arrived – refund request', 'لم يصل الطلب – طلب استرداد'), type: 'delivery', orderId: 'MO-5204', assignee: STAFF.sarah, createdAt: '2026-07-09T17:20:00Z', status: 'open', priority: 'high',
      messages: [msg({ name: 'Amira Hassan' }, 'customer', L('I paid for a driver delivery but the bag never arrived. Can I get a refund please?', 'دفعت مقابل التوصيل لكن الكيس لم يصل. هل يمكنني الحصول على استرداد من فضلك؟'), '2026-07-09T17:20:00Z')] },
    { id: 'dsp_1041', number: 'TK-1041', customer: { id: 'cus_2', name: 'Noah Williams' }, subject: L('App login issue after update', 'مشكلة تسجيل الدخول بعد التحديث'), type: 'app', orderId: null, assignee: STAFF.omar, createdAt: '2026-07-08T11:05:00Z', status: 'closed', priority: 'low',
      messages: [msg({ name: 'Noah Williams' }, 'customer', L("After the latest update I can't see my pickup passport.", 'بعد آخر تحديث لا أستطيع رؤية جواز الاستلام.'), '2026-07-08T11:05:00Z'), msg(STAFF.wb, 'support', L('This was fixed in version 3.4.1. Please update the app.', 'تم إصلاح ذلك في الإصدار 3.4.1. يرجى تحديث التطبيق.'), '2026-07-08T15:30:00Z')] },
    { id: 'dsp_1039', number: 'TK-1039', customer: { id: 'cus_3', name: 'Khalid Rahman' }, subject: L('Allergen missing on deli box', 'ملصق الحساسية غير موجود في صندوق الديلي'), type: 'quality', orderId: 'MO-5199', assignee: STAFF.sarah, createdAt: '2026-07-07T19:45:00Z', status: 'in_review', priority: 'urgent',
      messages: [msg({ name: 'Khalid Rahman' }, 'customer', L('My sandwich had sesame but it was not labelled. I have a sesame allergy.', 'كانت السندويشة تحتوي على السمسم دون ملصق. لدي حساسية من السمسم.'), '2026-07-07T19:45:00Z'), msg(STAFF.sarah, 'merchant', L("We're very sorry. We're reviewing our labelling with the kitchen team today.", 'نعتذر بشدة. نراجع ملصقاتنا مع فريق المطبخ اليوم.'), '2026-07-08T09:10:00Z')] },
    { id: 'dsp_1038', number: 'TK-1038', customer: { id: 'cus_4', name: 'Layla Hassan' }, subject: L('Pickup window changed without notice', 'تغيّرت نافذة الاستلام دون إشعار'), type: 'pickup', orderId: 'MO-5192', assignee: STAFF.omar, createdAt: '2026-07-06T16:00:00Z', status: 'awaiting_merchant', priority: 'medium',
      messages: [msg({ name: 'Layla Hassan' }, 'customer', L('The pickup window moved from 6pm to 5pm and I missed it.', 'انتقلت نافذة الاستلام من 6 إلى 5 مساءً وفاتني الاستلام.'), '2026-07-06T16:00:00Z'), msg(STAFF.wb, 'support', L('Merchant, please confirm whether the window was edited after the reservation.', 'أيها التاجر، يرجى تأكيد ما إذا تم تعديل النافذة بعد الحجز.'), '2026-07-06T18:00:00Z')] },
    { id: 'dsp_1036', number: 'TK-1036', customer: { id: 'cus_5', name: 'Yusuf Al Amiri' }, subject: L('Charged twice for one bag', 'تم الخصم مرتين لكيس واحد'), type: 'payment', orderId: 'MO-5187', assignee: STAFF.sarah, createdAt: '2026-07-05T20:30:00Z', status: 'in_review', priority: 'high',
      messages: [msg({ name: 'Yusuf Al Amiri' }, 'customer', L('My card shows two charges of QAR 14.', 'تظهر بطاقتي خصمين بقيمة 14 ريالًا.'), '2026-07-05T20:30:00Z')] },
    { id: 'dsp_1033', number: 'TK-1033', customer: { id: 'cus_6', name: 'Mariam Al Nuaimi' }, subject: L('Bag contents smaller than shown', 'محتوى الكيس أصغر مما هو معروض'), type: 'quality', orderId: 'MO-5181', assignee: STAFF.omar, createdAt: '2026-07-04T21:00:00Z', status: 'in_review', priority: 'low',
      messages: [msg({ name: 'Mariam Al Nuaimi' }, 'customer', L('The photo showed four pastries but I received two.', 'أظهرت الصورة أربع معجنات لكنني استلمت اثنتين.'), '2026-07-04T21:00:00Z')] },
    { id: 'dsp_1031', number: 'TK-1031', customer: { id: 'cus_7', name: 'Hamdan Al Falasi' }, subject: L('Driver could not find the building', 'لم يجد السائق المبنى'), type: 'delivery', orderId: 'MO-5176', assignee: STAFF.sarah, createdAt: '2026-07-03T22:10:00Z', status: 'resolved', priority: 'medium',
      messages: [msg({ name: 'Hamdan Al Falasi' }, 'customer', L('The driver called three times and left.', 'اتصل السائق ثلاث مرات ثم غادر.'), '2026-07-03T22:10:00Z'), msg(STAFF.sarah, 'merchant', L('We have refunded the delivery fee and added landmark notes to your address.', 'استرددنا رسوم التوصيل وأضفنا ملاحظات المعالم إلى عنوانك.'), '2026-07-04T10:00:00Z')] },
    { id: 'dsp_1029', number: 'TK-1029', customer: { id: 'cus_8', name: 'Aisha Al Mansoori' }, subject: L('Store closed at pickup time', 'كان المتجر مغلقًا وقت الاستلام'), type: 'pickup', orderId: 'MO-5170', assignee: STAFF.omar, createdAt: '2026-07-02T18:40:00Z', status: 'resolved', priority: 'high',
      messages: [msg({ name: 'Aisha Al Mansoori' }, 'customer', L('The shutters were down at 6:30pm.', 'كانت الأبواب مغلقة الساعة 6:30 مساءً.'), '2026-07-02T18:40:00Z'), msg(STAFF.wb, 'support', L('Full refund issued under the Store closed rule.', 'تم إصدار استرداد كامل وفق قاعدة المتجر مغلق.'), '2026-07-02T20:00:00Z')] },
    { id: 'dsp_1026', number: 'TK-1026', customer: { id: 'cus_9', name: 'Omar Al Suwaidi' }, subject: L('Wrong bag handed over', 'تم تسليم كيس خاطئ'), type: 'pickup', orderId: 'MO-5161', assignee: STAFF.sarah, createdAt: '2026-07-01T19:00:00Z', status: 'open', priority: 'medium',
      messages: [msg({ name: 'Omar Al Suwaidi' }, 'customer', L('I reserved the grocery box but received a pastry bag.', 'حجزت صندوق البقالة لكنني استلمت كيس معجنات.'), '2026-07-01T19:00:00Z')] },
  ];
  const PROGRESS = ['in_review', 'awaiting_merchant'];
  const dispTab = (s) => (s === 'open' ? 'open' : PROGRESS.includes(s) ? 'in_progress' : s);
  function disputeSummary() {
    const all = myTickets('dispute').map(asDispute); const c = (tab) => all.filter((d) => dispTab(d.status) === tab).length;
    return { open: c('open'), inProgress: c('in_progress'), resolved: c('resolved'), closed: c('closed'), total: all.length };
  }

  /* ---------------- help ---------------- */
  const faqs = [
    [L('How do I change my pickup window?', 'كيف أغيّر نافذة الاستلام؟'), L('Open Inventory, choose the bag, and edit the pickup window. Existing reservations keep their original window and customers are notified.', 'افتح المخزون واختر الكيس ثم عدّل نافذة الاستلام. تحتفظ الحجوزات الحالية بنافذتها الأصلية ويتم إشعار العملاء.'), 'listings'],
    [L('When will I receive my payout?', 'متى أستلم مستحقاتي؟'), L('Payouts are settled weekly every Tuesday to your registered bank account, minus commission and refunds.', 'تتم التسوية أسبوعيًا كل يوم ثلاثاء إلى حسابك البنكي المسجّل بعد خصم العمولة والمبالغ المستردة.'), 'payments'],
    [L('A customer did not collect their bag. What happens?', 'لم يستلم العميل كيسه. ماذا يحدث؟'), L('Missed collections are not refunded. You keep the payment; you may donate or reuse the food.', 'لا تُسترد حالات فوات الاستلام. تحتفظ بالمبلغ، ويمكنك التبرع بالطعام أو إعادة استخدامه.'), 'pickups'],
    [L('How do I verify a Pickup Passport?', 'كيف أتحقق من جواز الاستلام؟'), L('Go to Orders & Pickups, open the order and enter or scan the customer\'s 6-digit code.', 'انتقل إلى الطلبات والاستلام وافتح الطلب ثم أدخل أو امسح رمز العميل المكوّن من 6 أرقام.'), 'pickups'],
    [L('Can I pause all listings for a holiday?', 'هل يمكنني إيقاف جميع القوائم خلال العطلة؟'), L('Yes. In Branches, set the branch state to Temporarily closed. Listings are hidden until you reopen.', 'نعم. من الفروع اضبط حالة الفرع على مغلق مؤقتًا. تُخفى القوائم حتى تعيد الفتح.'), 'branches'],
  ].map(([question, answer, category], i) => ({ id: `mfaq_${i + 1}`, question, answer, category }));
  /* (v1.4 F-005) support contacts come from the markets registry (Admin → Settings → Markets) for the merchant's market */
  const fmtIntl = (n) => String(n || '').replace(/^(\+\d{3})(\d{4})(\d+)$/, '$1 $2 $3');
  const CONTACT_FOR = (country) => {
    const mk = (api.markets && api.markets.get(country || 'QA')) || {};
    return [
      { key: 'phone', label: L('Call merchant support', 'اتصل بدعم التجار'), value: fmtIntl(mk.supportPhone), href: 'tel:' + (mk.supportPhone || ''), hours: clone(mk.supportHours || L('Daily 8:00–22:00', 'يوميًا 8:00–22:00')) },
      { key: 'email', label: L('Email us', 'راسلنا عبر البريد'), value: mk.supportEmail || '', href: 'mailto:' + (mk.supportEmail || ''), hours: L('Reply within 24h', 'نرد خلال 24 ساعة') },
      { key: 'whatsapp', label: L('WhatsApp', 'واتساب'), value: fmtIntl(mk.supportWhatsApp), href: 'https://wa.me/' + String(mk.supportWhatsApp || '').replace(/\D/g, ''), hours: L('Fastest for urgent pickups', 'الأسرع لحالات الاستلام العاجلة') },
    ];
  };
  const CONTACT = CONTACT_FOR('QA');
  const helpRequests = [
    { id: 'hr_311', number: 'HR-311', subject: L('Update bank account for payouts', 'تحديث الحساب البنكي للمدفوعات'), status: 'resolved', createdAt: '2026-11-02T10:00:00Z', updatedAt: '2026-11-03T12:00:00Z' },
    { id: 'hr_318', number: 'HR-318', subject: L('Add a new branch in Msheireb', 'إضافة فرع جديد في مشيرب'), status: 'in_progress', createdAt: '2026-11-15T09:30:00Z', updatedAt: '2026-11-17T14:00:00Z' },
  ];
  /* (v1.4 FLOW-15) disputes and help requests are support tickets in the shared store: Admin → Support sees them
     (same ids) and admin replies / status changes show here. The merchant views below are adapters over S.tickets. */
  const S = window.WBStore;
  const ME_NAME = L('Fig & Bloom Bakery', 'مخبز فيغ آند بلوم');
  const M2A = { open: 'open', in_review: 'in_progress', awaiting_merchant: 'pending', resolved: 'resolved', closed: 'closed' };
  const A2M = { open: 'open', in_progress: 'in_review', pending: 'awaiting_merchant', escalated: 'in_review', resolved: 'resolved', closed: 'closed' };
  const PRI = { urgent: 'urgent', high: 'high', medium: 'medium', low: 'low' };
  const ROLE_OF = (a) => (a.type === 'agent' ? 'support' : a.type === 'merchant' ? 'merchant' : 'customer');
  /* the dispute seed was captured in July: shift it so the newest report is from yesterday (relative to api.DEMO_TODAY) */
  const SHIFT = Date.parse(api.demoDate(-1) + 'T17:20:00Z') - Date.parse('2026-07-09T17:20:00Z');
  const shiftD = (iso) => (iso && iso < '2026-10' ? new Date(Date.parse(iso) + SHIFT).toISOString().replace('.000Z', 'Z') : iso);
  const toTicketMsg = (m) => ({ id: m.id, at: shiftD(m.at), author: { type: m.role === 'support' ? 'agent' : m.role === 'merchant' ? 'merchant' : 'customer', name: L(m.from.name, m.from.name), id: m.from.id || null }, internal: false, body: m.body, attachments: [] });
  disputes.forEach((d) => S.tickets.push({ id: d.id, number: d.number, source: 'dispute', merchantId: 'MER-066', market: 'QA', subject: d.subject, category: d.type, channel: 'in_app', priority: PRI[d.priority] || 'medium', status: M2A[d.status],
    assigneeId: d.status === 'open' ? null : 'usr_12', merchantAssignee: d.assignee, createdAt: shiftD(d.createdAt), lastMessageAt: shiftD(d.messages[d.messages.length - 1].at), relatedOrderId: d.orderId, customer: d.customer, requester: { type: 'merchant', id: 'MER-066', name: ME_NAME, email: 'partners@figandbloom.example.com' }, messages: d.messages.map(toTicketMsg) }));
  helpRequests.forEach((h) => S.tickets.push({ id: h.id, number: h.number, source: 'help', merchantId: 'MER-066', market: 'QA', subject: h.subject, category: 'merchant_help', channel: 'in_app', priority: 'medium', status: h.status === 'in_progress' ? 'in_progress' : h.status,
    assigneeId: h.status === 'open' ? null : 'usr_11', createdAt: h.createdAt, updatedAt: h.updatedAt, lastMessageAt: h.updatedAt, relatedOrderId: null, requester: { type: 'merchant', id: 'MER-066', name: ME_NAME, email: 'partners@figandbloom.example.com' },
    messages: [{ id: h.id + '-m1', at: h.createdAt, author: { type: 'merchant', name: ME_NAME }, internal: false, body: h.subject, attachments: [] }] }));
  disputes.length = 0; helpRequests.length = 0;
  const myTickets = (src) => S.tickets.filter((t) => t.source === src && t.merchantId === S.me());
  const asDispute = (t) => ({ id: t.id, number: t.number, customer: t.customer || { id: null, name: (t.requester.name && t.requester.name.en) || '' }, subject: t.subject, type: t.category, orderId: t.relatedOrderId, assignee: t.merchantAssignee || STAFF.wb, createdAt: t.createdAt, status: A2M[t.status] || 'open', priority: t.priority,
    closedAt: t.closedAt, resolutionNote: t.resolutionNote, messages: t.messages.filter((m) => !m.internal).map((m) => ({ id: m.id, from: { name: (m.author.name && (m.author.name.en || m.author.name)) || '' }, role: ROLE_OF(m.author), body: m.body, at: m.at })) });
  const asHelp = (t) => { const replies = t.messages.filter((m) => !m.internal && m.author.type === 'agent'); const last = replies[replies.length - 1];
    return { id: t.id, number: t.number, subject: t.subject, status: t.status === 'pending' || t.status === 'escalated' ? 'in_progress' : t.status, createdAt: t.createdAt, updatedAt: [t.updatedAt, last && last.at, t.createdAt].filter(Boolean).sort().pop(), repliesCount: replies.length, lastReply: last ? { body: last.body, at: last.at, by: last.author.name } : null }; };

  /* ---------------- handlers ---------------- */
  const routes = {
    /* Settings */
    'GET /merchant/settings/profile': () => clone(settings.profile),
    'PATCH /merchant/settings/profile': ({ body }) => {
      need(body, ['firstName', 'email']);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) throw MockError(422, 'validation_error', 'Enter a valid email address.', { email: 'invalid' });
      Object.assign(settings.profile, body); return clone(settings.profile);
    },
    'GET /merchant/settings/store': () => clone(settings.store),
    'PATCH /merchant/settings/store': ({ body }) => { if (body.name && !body.name.en && !body.name.ar) throw MockError(422, 'validation_error', 'Store name is required.', { name: 'required' }); Object.assign(settings.store, body); return clone(settings.store); },
    'GET /merchant/settings/security': () => clone(settings.security),
    'PATCH /merchant/settings/security': ({ body }) => {
      if (body.newPassword != null) {
        need(body, ['currentPassword', 'newPassword', 'confirmPassword']);
        if (body.newPassword.length < 8) throw MockError(422, 'validation_error', 'Use at least 8 characters.', { newPassword: 'min_length' });
        if (body.newPassword !== body.confirmPassword) throw MockError(422, 'validation_error', 'Passwords do not match.', { confirmPassword: 'mismatch' });
        if (body.currentPassword === 'wrong') throw MockError(422, 'validation_error', 'Current password is incorrect.', { currentPassword: 'incorrect' });
      }
      if (body.businessEmail) settings.security.businessEmail = body.businessEmail;
      return { ...clone(settings.security), verificationSent: body.newPassword != null, sentTo: settings.security.businessEmail };
    },
    'GET /merchant/settings/language': () => clone(settings.language),
    'PATCH /merchant/settings/language': ({ body }) => { if (!['en', 'ar'].includes(body && body.language)) throw MockError(422, 'validation_error', 'Unsupported language.', { language: 'enum' }); settings.language.language = body.language; return clone(settings.language); },
    /* (v1.3) operating hours live on the merchant branch store (same branch ids, country and time zone as the branch switcher) */
    'GET /merchant/settings/operating-hours': async ({ query }) => {
      const list = (await api('GET', '/merchant/branches', { pageSize: 100 })).data;
      const b = list.find((x) => x.id === query.branchId) || list[0];
      return { branchId: b.id, timeZone: b.timeZone, hours: clone(b.hours), branches: list.map((x) => ({ id: x.id, name: x.name, country: x.country, timeZone: x.timeZone })) };
    },
    'PUT /merchant/settings/operating-hours': async ({ query, body }) => {
      const id = (body && body.branchId) || query.branchId || 'BR-01';
      const bad = (body.hours || []).filter((h) => !h.closed && h.open >= h.close);
      if (bad.length) throw MockError(422, 'validation_error', 'Closing time must be after opening time.', Object.fromEntries(bad.map((h) => [h.day, 'range'])));
      const b = (await api('PUT', `/merchant/branches/${id}/hours`, { hours: clone(body.hours) })).data; return { branchId: b.id, timeZone: b.timeZone, hours: clone(b.hours) };
    },

    /* Help */
    'GET /merchant/help/faqs': ({ query }) => ({ data: clone(faqs.filter((f) => !query.q || `${f.question.en} ${f.question.ar} ${f.answer.en}`.toLowerCase().includes(query.q.toLowerCase()))), contact: CONTACT_FOR(query.country || (window.App && App.market && App.market()) || 'QA') }),
    'GET /merchant/help/requests': ({ query }) => paginate(clone(myTickets('help').map(asHelp)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), query),
    'POST /merchant/help/requests': ({ body }) => {
      need(body, ['name', 'phoneCountry', 'phone', 'description']);
      if (!/^[\d\s]{6,}$/.test(body.phone)) throw MockError(422, 'validation_error', 'Enter a valid mobile number.', { phone: 'invalid' });
      const n = myTickets('help').length; const id = nid('hr'); const txt = String(body.description);
      const tk = { id, number: `HR-${320 + n}`, source: 'help', merchantId: S.me(), market: (window.App && App.market && App.market()) || 'QA', subject: L(txt.slice(0, 60), txt.slice(0, 60)), category: body.topic || 'merchant_help', channel: 'in_app', priority: body.urgent ? 'high' : 'medium', status: 'open',
        assigneeId: null, createdAt: now(), updatedAt: now(), lastMessageAt: now(), relatedOrderId: body.orderId || null, requester: { type: 'merchant', id: S.me(), name: ME_NAME, email: 'partners@figandbloom.example.com', contactName: body.name, phone: `${body.phoneCountry} ${body.phone}` },
        messages: [{ id: id + '-m1', at: now(), author: { type: 'merchant', name: L(body.name, body.name) }, internal: false, body: L(txt, txt), attachments: [] }] };
      S.tickets.unshift(tk); return { ...asHelp(tk), name: body.name, phoneCountry: body.phoneCountry, phone: body.phone, description: txt };
    },

    /* Reviews */
    'GET /merchant/reviews': ({ query: q }) => {
      let rows = reviews.filter((r) => !q.rating || r.rating === +q.rating);
      const s = q.sort || '-createdAt';
      rows = rows.slice().sort((a, b) => s === '-createdAt' ? b.createdAt.localeCompare(a.createdAt) : s === 'createdAt' ? a.createdAt.localeCompare(b.createdAt) : s === '-rating' ? b.rating - a.rating || b.createdAt.localeCompare(a.createdAt) : a.rating - b.rating || b.createdAt.localeCompare(a.createdAt));
      return { ...paginate(rows.map(reviewOut), q), summary: reviewSummary() };
    },
    'POST /merchant/reviews/:id/reply': ({ params, body }) => { need(body, ['body']); const r = find(reviews, params.id, 'Review'); r.reply = { body: { en: body.body, ar: body.body }, at: now() }; r.status = 'replied'; return reviewOut(r); },
    /* (v1.4 FLOW-17) a report opens a case in Admin → Moderation; the admin decision is reflected here */
    'POST /merchant/reviews/:id/report': ({ params, body }) => {
      need(body, ['reason']); const r = find(reviews, params.id, 'Review');
      if (r.moderationId && ['pending', 'in_review', 'escalated'].includes((S.moderation.find((m) => m.id === r.moderationId) || {}).status)) throw MockError(409, 'conflict', 'This review is already under review.');
      const id = `MOD-${700 + S.moderation.length}`; const reason = String(body.reason);
      S.moderation.unshift({ id, type: 'review', item: L(`Review by ${r.customer.name} on Fig & Bloom Bakery`, `تقييم ${r.customer.name} على مخبز فيغ آند بلوم`), reason: L(REPORT_REASON[reason] ? REPORT_REASON[reason].en : reason, REPORT_REASON[reason] ? REPORT_REASON[reason].ar : reason),
        reporter: 'merchant_report', severity: 'medium', status: 'pending', createdAt: now(), content: clone(r.body), reportsCount: 1, autoScore: null, assigneeId: null, decision: null, reviewId: r.id, merchantId: S.me(), market: 'QA', note: body.note || '' });
      r.moderationId = id; r.report = { reason, note: body.note || '', at: now() }; return reviewOut(r);
    },
    'POST /merchant/reviews/feedback': ({ body }) => { need(body, ['rating', 'body']); return { id: nid('fb'), ...body, createdAt: now() }; },

    /* Disputes */
    'GET /merchant/disputes': ({ query: q }) => {
      const rows = myTickets('dispute').map(asDispute).filter((d) => !q.status || q.status === 'all' || dispTab(d.status) === q.status || d.status === q.status)
        .filter((d) => !q.q || `${d.number} ${d.customer.name} ${d.subject.en} ${d.subject.ar}`.toLowerCase().includes(q.q.toLowerCase()))
        .map((d) => { const { messages, ...rest } = d; return { ...rest, tab: dispTab(d.status), messagesCount: messages.length }; });
      return { ...paginate(clone(rows), q), summary: disputeSummary() };
    },
    'GET /merchant/disputes/:id': ({ params }) => { const d = asDispute(find(myTickets('dispute'), params.id, 'Report')); return { ...clone(d), tab: dispTab(d.status) }; },
    'POST /merchant/disputes/:id/replies': ({ params, body }) => {
      need(body, ['body']); const t = find(myTickets('dispute'), params.id, 'Report');
      if (t.status === 'closed') throw MockError(409, 'conflict', 'This report is closed.');
      const m = msg({ id: 'me', name: 'Fig & Bloom Bakery' }, 'merchant', { en: body.body, ar: body.body }, now());
      t.messages.push(toTicketMsg(m)); t.lastMessageAt = m.at; if (t.status === 'open' || t.status === 'pending') t.status = 'in_progress';
      const st = A2M[t.status]; return { message: clone(m), dispute: { id: t.id, status: st, tab: dispTab(st) } };
    },
    'POST /merchant/disputes/:id/close': ({ params, body }) => {
      const t = find(myTickets('dispute'), params.id, 'Report'); if (t.status === 'closed') throw MockError(409, 'conflict', 'Already closed.');
      t.status = 'closed'; t.closedAt = now(); t.resolutionNote = (body && body.note) || '';
      if (body && body.note) t.messages.push(toTicketMsg(msg({ id: 'me', name: 'Fig & Bloom Bakery' }, 'merchant', { en: body.note, ar: body.note }, now())));
      return { id: t.id, status: 'closed', tab: 'closed' };
    },
  };

  W.modules['merchant-account'] = { routes, data: { branches, settings, reviews, faqs, CONTACT_FOR, tickets: () => S.tickets.filter((t) => t.merchantId === S.me()) } };

  /* ---- registration via core api.mock (CONVENTIONS §6). Lists → { data, meta:{page,pageSize,total,summary} } ---- */
  function wrap(fn) {
    const shape = (r) => {
      if (r && Array.isArray(r.data) && 'total' in r) { const { data, page, pageSize, total, ...extra } = r; return { data, meta: { page, pageSize, total, ...extra } }; }
      if (r && Array.isArray(r.data)) { const { data, ...extra } = r; return { data, meta: extra }; }
      return { data: r === undefined ? null : r };
    };
    /* (v1.3) handlers may be async (operating hours read the merchant branch store) */
    return (req) => { const r = fn({ ...req, query: req.query || {}, params: req.params || {}, body: req.body || {} }); return r && typeof r.then === 'function' ? r.then(shape) : shape(r); };
  }
  function registerAll() {
    if (!(window.api && typeof window.api.mock === 'function')) return false;
    Object.entries(routes).forEach(([k, fn]) => { const [m, p] = k.split(' '); window.api.mock(m, p, wrap(fn)); });
    return true;
  }
  if (!registerAll()) document.addEventListener('wb:api-ready', registerAll, { once: true });
})();
