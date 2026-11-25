/* (v1.4 dates) seeded dates rebased onto api.DEMO_TODAY = 2026-11-19 by qa/rebase_dates.py */
/* =====================================================================
   Admin · Merchants  (owner: D1)
   Routes: admin-merchants {status?}, admin-merchant-new, admin-merchant-detail {id, tab?}
   API: GET /admin/merchants, /admin/merchants/summary, POST /admin/merchants,
        GET|PATCH /admin/merchants/:id, GET /admin/merchants/:id/overview|branches|listings|payouts|compliance|activity,
        POST /admin/merchants/:id/verify|suspend|reject|reactivate
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc;
  const STATUS_OPTS = ['pending', 'verified', 'suspended', 'rejected'].map((k) => ({ value: k, label: D1.ST.merchant[k][0] }));
  const SORTS = [{ value: '-joinedAt', label: 'Newest First' }, { value: 'joinedAt', label: 'Oldest First' }, { value: '-revenue', label: 'Revenue: High to Low' }, { value: '-qualityScore', label: 'Quality: High to Low' }, { value: 'name', label: 'Name: A to Z' }];
  const SUSPEND_REASONS = [['food_safety', 'Food safety violation'], ['repeated_no_shows', 'Repeated missed pickups'], ['documents_expired', 'Documents expired'], ['fraud_suspected', 'Suspected fraud'], ['other', 'Other']];
  const REJECT_REASONS = [['documents_invalid', 'Invalid or missing documents'], ['outside_service_area', 'Outside service area'], ['not_food_business', 'Not an eligible food business'], ['duplicate_account', 'Duplicate account'], ['other', 'Other']];
  const ACTIVITY = { quality_score_updated: 'Quality score updated', listing_published: 'Listing published', merchant_registered: 'Merchant registered', merchant_created: 'Merchant added by admin', status_verified: 'Merchant verified', status_pending: 'Submitted for verification', status_suspended: 'Merchant suspended', status_rejected: 'Merchant rejected', status_active: 'Merchant activated', status_inactive: 'Merchant deactivated' };
  const REASON_LABEL = Object.fromEntries(SUSPEND_REASONS.concat(REJECT_REASONS));
  const detailLabel = (d) => { const [k, ...rest] = String(d).split(' — '); const lbl = REASON_LABEL[k] ? t(REASON_LABEL[k]) : /^\d+$/.test(k) ? t('Quality score {n}', { n: k }) : k; return [lbl].concat(rest).join(' — '); };
  const qs = (v) => (v == null ? `<span class="qs na">—</span>` : `<span class="qs ${v >= 80 ? 'hi' : v >= 60 ? 'md' : 'lo'}"><span class="num">${v}</span></span>`);

  UI.css('d1-merchants', `
    .qs{display:inline-grid;place-items:center;min-width:38px;height:26px;padding:0 6px;border-radius:8px;font-weight:700;font-size:12.5px}
    .qs.hi{background:var(--tint-green);color:var(--pos)} .qs.md{background:var(--tint-orange);color:var(--warn)} .qs.lo{background:var(--tint-rose);color:var(--neg)} .qs.na{background:var(--card-2);color:var(--faint)}
    .d1-mhead{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
    .d1-mhead .meta{display:flex;flex-wrap:wrap;gap:6px 18px;color:var(--muted);font-size:12.5px;margin-block-start:6px}
    .d1-mhead .meta span{display:inline-flex;gap:6px;align-items:center}
    .d1-mhead .acts{display:flex;gap:10px;flex-wrap:wrap;margin-inline-start:auto}
    .d1-branch{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px;padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--card-2);position:relative}
    .d1-branch .rm{position:absolute;top:10px;inset-inline-end:10px}
    .d1-branch h4{grid-column:1/-1;margin:0;font-size:13px}
    .d1-rev{display:grid;gap:18px;grid-template-columns:repeat(2,minmax(0,1fr))}
    .d1-rev section{border:1px solid var(--line);border-radius:14px;padding:16px}
    .d1-rev h4{margin:0 0 12px;font-size:13px;display:flex;justify-content:space-between;align-items:center}
  `);

  /* =================== list =================== */
  App.route('admin-merchants', {
    nav: 'Merchants', title: 'Merchants', subtitle: 'Manage merchant accounts, onboarding, and performance.',
    render(el, ctx) {
      el.innerHTML = `<div data-kpis></div><div data-filters></div>${UI.card({ title: 'All Merchants', sub: 'Summary of all merchants', icon: 'store', flush: true, body: '<div data-table></div>' })}`;
      UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/merchants/summary', api.ctx()), ({ data: k }) => UI.kpis([
        { label: 'Total Merchants', icon: 'store', tone: 'rose', value: fmt.number(k.totalMerchants), foot: t('On the platform') },
        { label: 'Pending Verification', icon: 'checkc', tone: 'lime', value: fmt.number(k.pendingVerification), foot: t('Awaiting review'), go: 'admin-merchants', params: { status: 'pending' } },
        { label: 'Verified & Active', icon: 'shield', tone: 'orange', value: fmt.number(k.verifiedActive), foot: t('Selling on platform'), go: 'admin-merchants', params: { status: 'verified' } },
        { label: 'Suspended', icon: 'pause', tone: 'mauve', value: fmt.number(k.suspended), foot: t('Not currently active'), go: 'admin-merchants', params: { status: 'suspended' } },
        { label: 'Avg Quality Score', icon: 'award', tone: 'berry', value: fmt.number(k.avgQualityScore), foot: t('Across scored merchants'), go: 'admin-quality' },
      ]), { skeleton: 'kpis', n: 5 });

      const filters = UI.mountFilters(el.querySelector('[data-filters]'), {
        search: { name: 'q', placeholder: 'Search by merchant name or ID' },
        selects: [
          { name: 'status', label: 'All Status', options: STATUS_OPTS },
          { name: 'category', label: 'All Categories', options: D1.opts(D1.CATEGORY).filter((o) => !['produce', 'other', 'meals'].includes(o.value)) },
          { name: 'city', label: 'All Cities', options: D1.opts(D1.CITY) },
        ],
        sort: { name: 'sort', label: 'Sort', options: SORTS, value: '-joinedAt' },
        values: { status: D1.take(ctx, 'status') || '' },
        actions: UI.btn('Export', { variant: 'secondary', icon: 'upload', attrs: 'data-act="export"' }) + UI.btn('Add Merchant', { variant: 'primary', icon: 'plus', go: 'admin-merchant-new' }),
      }, () => table.setQuery({ page: 1 }));

      const table = UI.dataTable(el.querySelector('[data-table]'), {
        select: true, pageSize: 10, caption: 'All Merchants',
        columns: [
          { key: 'name', label: 'Merchant', sortable: true, render: (r) => D1.prod(r.thumb, r.name, fmt.id(r.id)) },
          { key: 'category', label: 'Category', render: (r) => esc(D1.lab(D1.CATEGORY, r.category)) },
          { key: 'city', label: 'City', render: (r) => esc(D1.lab(D1.CITY, r.city)) },
          { key: 'qualityScore', label: 'Quality', sortable: true, render: (r) => qs(r.qualityScore) },
          { key: 'dropsCount', label: 'Drops', align: 'end', render: (r) => `<b>${fmt.number(r.dropsCount)}</b>` },
          { key: 'revenue', label: 'Revenue', sortable: true, align: 'end', render: (r) => `<span class="d1-amt">${D1.money(r.revenue)}</span>` },
          { key: 'commissionRate', label: 'Commission', align: 'end', render: (r) => fmt.pct(r.commissionRate, { dec: 0 }) + (r.commissionSource === 'contract' ? ` <small class="faint">${esc(t('contract'))}</small>` : '') },
          { key: 'status', label: 'Status', render: (r) => D1.pill('merchant', r.status) },
        ],
        fetch: (q) => { const f = filters.values(); return api('GET', '/admin/merchants', { ...api.ctx(), ...f, ...q, sort: q.sort || f.sort }); },
        rowClick: (r) => App.go('admin-merchant-detail', { id: r.id }),
        rowActions: (r) => [{ icon: 'eye', label: 'View', run: () => App.go('admin-merchant-detail', { id: r.id }) }],
        bulkActions: [{ label: 'Export selected', icon: 'upload', run: (ids) => { Overlays.export({ scope: 'Merchants', endpoint: '/admin/merchants', filters: { ids } }); return false; } }],
        empty: { icon: 'store', title: 'No merchants found', text: 'Try changing the filters or search.', action: UI.btn('Add Merchant', { variant: 'primary', icon: 'plus', go: 'admin-merchant-new' }) },
      });
      UI.on(el, 'click', '[data-act="export"]', () => Overlays.export({ scope: 'Merchants', endpoint: '/admin/merchants', columns: ['Merchant', 'Category', 'City', 'Quality', 'Drops', 'Revenue', 'Commission', 'Status'], filters: filters.values() }));
    },
  });

  /* =================== status actions (shared by detail page) =================== */
  async function statusAction(m, act, done) {
    let ok = false;
    if (act === 'verify') {
      ok = await UI.confirm({ title: t('Verify {name}?', { name: m.name }), text: t('The merchant can start publishing drops and their branches open to consumers.'), confirm: 'Verify merchant', icon: 'checkc' });
      if (ok) ok = await D1.run(() => api('POST', `/admin/merchants/${m.id}/verify`, {}), 'Merchant verified');
    } else if (act === 'reactivate') {
      ok = await UI.confirm({ title: t('Reactivate {name}?', { name: m.name }), text: t('Branches re-open and the merchant can publish drops again.'), confirm: 'Reactivate', icon: 'play' });
      if (ok) ok = await D1.run(() => api('POST', `/admin/merchants/${m.id}/reactivate`, {}), 'Merchant reactivated');
    } else {
      const suspend = act === 'suspend';
      const v = await D1.reasonModal({
        title: suspend ? 'Suspend merchant?' : 'Reject merchant?', icon: 'alert', danger: true, confirm: suspend ? 'Suspend' : 'Reject',
        text: esc(t(suspend ? 'All branches close immediately and live drops are hidden. Existing reservations stay valid.' : 'The application is declined and the owner is notified by email.')),
        reasons: suspend ? SUSPEND_REASONS : REJECT_REASONS, noteLabel: 'Message to merchant (optional)',
        onSubmit: (vals) => api('POST', `/admin/merchants/${m.id}/${act}`, { reason: vals.reason, note: vals.note }),
      });
      if (v) { UI.toast(t(suspend ? 'Merchant suspended' : 'Merchant rejected'), { tone: 'success' }); ok = true; }
    }
    if (ok && done) done();
  }
  function commissionModal(m, done) {
    UI.modal({
      title: 'Edit commission', icon: 'percent', size: 'sm',
      /* (v1.4) a merchant contract can override the platform default (Settings → General → Commercial) */
      body: `<form class="d1-form" novalidate>
        <p class="muted" data-commission-source style="margin:0 0 10px">${m.commissionSource === 'contract' ? esc(t('This merchant has a contract rate.')) : esc(t('This merchant uses the platform default rate.'))}</p>
        ${UI.field({ type: 'number', name: 'commissionRate', label: 'Contract commission rate', value: m.commissionSource === 'contract' ? m.commissionRate : '', suffix: '%', min: 0, max: 50, step: '0.5', hint: 'Leave empty to use the platform default rate. Applied to orders from today.' })}</form>`,
      actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Save', variant: 'primary', run: async (mm) => {
        const f = mm.el.querySelector('form'); const v = UI.validate(f); if (!v.ok) return false;
        try { await api('PATCH', '/admin/merchants/' + m.id, { commissionRate: v.values.commissionRate === '' || v.values.commissionRate == null ? null : +v.values.commissionRate }); mm.close(true); UI.toast(t('Commission updated'), { tone: 'success' }); if (done) done(); } catch (e) { D1.showFieldErrors(f, e); D1.toastErr(e); return false; }
      } }],
    });
  }

  /* =================== detail =================== */
  const TABS = [{ id: 'overview', label: 'Overview', icon: 'grid' }, { id: 'branches', label: 'Branches', icon: 'branch' }, { id: 'listings', label: 'Listings', icon: 'bag' }, { id: 'payouts', label: 'Payouts', icon: 'wallet' }, { id: 'compliance', label: 'Compliance', icon: 'shield' }, { id: 'activity', label: 'Activity', icon: 'activity' }];
  App.route('admin-merchant-detail', {
    nav: 'Merchants', title: 'Merchant details', subtitle: 'Profile, branches, listings, payouts and compliance.',
    render(el, ctx) {
      const id = ctx.params.id;
      if (!id) { el.innerHTML = UI.card({ body: UI.empty({ icon: 'store', title: 'No merchant selected', text: 'Choose a merchant from the list.', action: UI.btn('Back to Merchants', { variant: 'primary', go: 'admin-merchants' }) }) }); return; }
      let tab = ctx.params.tab || 'overview';
      el.innerHTML = `<div data-head>${UI.skeleton('card')}</div><div class="d1-tabbar">${UI.tabs({ name: 'mtab', label: 'Merchant sections', tabs: TABS, active: tab })}</div><div data-tab></div>`;
      const head = el.querySelector('[data-head]'), body = el.querySelector('[data-tab]');
      let m = null;
      const loadHead = async () => {
        try {
          m = (await api('GET', '/admin/merchants/' + id)).data;
          D1.setTitle(m.name);
          const acts = {
            pending: UI.btn('Reject', { variant: 'secondary', icon: 'x', attrs: 'data-mact="reject"' }) + UI.btn('Verify merchant', { variant: 'primary', icon: 'checkc', attrs: 'data-mact="verify"' }),
            verified: UI.btn('Suspend', { variant: 'danger', icon: 'pause', attrs: 'data-mact="suspend"' }),
            active: UI.btn('Suspend', { variant: 'danger', icon: 'pause', attrs: 'data-mact="suspend"' }),
            suspended: UI.btn('Reactivate', { variant: 'primary', icon: 'play', attrs: 'data-mact="reactivate"' }),
            rejected: UI.btn('Reactivate', { variant: 'primary', icon: 'play', attrs: 'data-mact="reactivate"' }),
            inactive: UI.btn('Reactivate', { variant: 'primary', icon: 'play', attrs: 'data-mact="reactivate"' }),
          }[m.status] || '';
          head.innerHTML = UI.card({ body: `<div class="d1-mhead">${UI.btn('Back to Merchants', { variant: 'icon', icon: 'chev-l', iconCls: 'flip', go: 'admin-merchants' })}${UI.thumb(m.thumb, 'lg')}
            <div style="min-width:0"><div class="row wrap" style="gap:10px"><h2 class="h-serif" style="margin:0;font-size:24px">${esc(m.name)}</h2>${D1.pill('merchant', m.status)}</div>
            <div class="meta"><span>${fmt.id(m.id)}</span><span>${UI.icon('store')}${esc(D1.lab(D1.CATEGORY, m.category))}</span><span>${UI.icon('pin')}${esc(D1.lab(D1.CITY, m.city))}</span><span>${UI.icon('cal')}${t('Joined {d}', { d: fmt.date(m.joinedAt.slice(0, 10)) })}</span><span>${UI.icon('star')}${m.rating != null ? fmt.number(m.rating, 1) : '—'}</span><span>${UI.icon('award')}${t('Quality')} ${qs(m.qualityScore)}</span></div></div>
            <div class="acts">${UI.btn('Edit commission', { variant: 'secondary', icon: 'percent', attrs: 'data-mact="commission"' })}${acts}</div></div>` });
        } catch (e) { head.innerHTML = UI.card({ body: UI.errorState({ text: D1.err(e) }) }); head.addEventListener('ui:retry', loadHead, { once: true }); }
      };
      UI.on(el, 'click', '[data-mact]', (e, b) => {
        if (!m) return; const a = b.dataset.mact;
        const again = () => { loadHead(); paintTab(); };
        if (a === 'commission') commissionModal(m, again); else statusAction(m, a, again);
      });
      el.addEventListener('ui:tab', (e) => { if (e.detail.name !== 'mtab') return; tab = e.detail.value; ctx.params.tab = tab; paintTab(); });

      function paintTab() {
        const T = {
          overview: () => UI.async(body, () => Promise.all([api('GET', `/admin/merchants/${id}/overview`), api('GET', `/admin/merchants/${id}`)]), ([ov, md]) => {
            const k = ov.data.kpis, d = md.data; const pts = ov.data.ordersTrend.points;
            return `${UI.kpis([
              { label: 'Revenue', icon: 'coins', tone: 'rose', value: D1.money(k.revenue), foot: t('Lifetime') },
              { label: 'Orders', icon: 'clipboard', tone: 'lime', value: fmt.number(k.ordersCount), foot: t('Last 30 days') },
              { label: 'Rescue rate', icon: 'leaf', tone: 'orange', value: fmt.pct(k.rescueRatePct, { dec: 0 }), foot: t('Bags collected vs listed') },
              { label: 'Refund rate', icon: 'refund', tone: 'mauve', value: fmt.pct(k.refundRatePct), foot: t('Of completed orders') },
            ], 4)}
            <div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)">
              ${UI.card({ title: 'Orders — last 7 days', icon: 'trend', body: Charts.area({ series: [{ name: 'Orders', values: pts.map((p) => p.y), color: 'rose' }], labels: pts.map((p) => D1.dayLabel(p.x)), height: 220, fill: true, label: 'Orders — last 7 days' }) })}
              ${UI.card({ title: 'Business', icon: 'building', tone: 'mauve', body: D1.dl([['Legal name', esc(d.business.legalName)], ['Trade license', fmt.id(d.business.tradeLicenseNo)], ['VAT number', d.business.vatNo ? fmt.id(d.business.vatNo) : ''], ['Owner', esc(d.contact.ownerName)], ['Email', `<a class="lnk plain" href="mailto:${esc(d.contact.email)}">${esc(d.contact.email)}</a>`], ['Phone', fmt.id(d.contact.phone)], ['Bank', esc(d.banking.bankName)], ['IBAN', d.banking.iban ? fmt.id(d.banking.iban) : ''], ['Commission', fmt.pct(d.commissionRate, { dec: 0 })]]) })}
            </div>`;
          }, { skeleton: 'cards', n: 3 }),
          branches: () => UI.async(body, () => api('GET', `/admin/merchants/${id}/branches`), ({ data }) => UI.card({ title: 'Branches', icon: 'branch', count: fmt.number(data.length), flush: true, body: `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t('Branch'))}</th><th>${esc(t('Address'))}</th><th>${esc(t('Opening hours'))}</th><th>${esc(t('Pickup window'))}</th><th class="end">${esc(t('Active listings'))}</th><th>${esc(t('Status'))}</th></tr></thead><tbody>${data.map((b) => `<tr><td><b>${esc(b.name)}</b><small class="faint" style="display:block">${fmt.id(b.id)}</small></td><td class="muted">${esc(b.address)}</td><td>${fmt.timeRange(...b.hours.split('–'))}</td><td>${D1.win(b.pickupWindow)}</td><td class="end"><b>${fmt.number(b.activeListings)}</b></td><td>${D1.pill('branch', b.state)}</td></tr>`).join('')}</tbody></table></div>` }), { empty: { icon: 'branch', title: 'No branches yet', text: 'Branches added by the merchant will appear here.' } }),
          listings: () => UI.async(body, () => api('GET', `/admin/merchants/${id}/listings`), ({ data }) => UI.card({ title: 'Listings', icon: 'bag', count: fmt.number(data.length), actions: UI.link('Open in Drops', 'admin-drops'), flush: true, body: `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t('Drops'))}</th><th>${esc(t('Price'))}</th><th>${esc(t('Availability'))}</th><th>${esc(t('Window'))}</th><th>${esc(t('Status'))}</th><th class="end">${esc(t('Actions'))}</th></tr></thead><tbody>${data.map((r) => `<tr><td>${D1.prod(r.thumb, r.title, fmt.id(r.id))}</td><td><div class="price"><small><s>${D1.money(r.originalPrice)}</s></small><b>${D1.money(r.price)}</b></div></td><td><div class="avail"><div class="t">${t('{a}/{b} reserved', { a: fmt.number(r.reserved), b: fmt.number(r.quantity) })}</div>${Charts.progress(r.reserved, { max: r.quantity || 1 })}</div></td><td>${D1.win(r.pickupWindow)}</td><td>${D1.pill('drop', r.status)}</td><td class="end">${UI.btn('Edit', { variant: 'icon', icon: 'edit', go: 'admin-drop-edit', params: { id: r.id } })}</td></tr>`).join('')}</tbody></table></div>` }), { empty: { icon: 'bag', title: 'No listings yet', text: 'This merchant hasn’t published any drops.' } }),
          payouts: () => UI.async(body, () => api('GET', `/admin/merchants/${id}/payouts`), ({ data }) => UI.card({ title: 'Payouts', icon: 'wallet', actions: UI.link('Open Financials', 'admin-financials'), flush: true, body: `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t('Payout'))}</th><th>${esc(t('Period'))}</th><th class="end">${esc(t('Gross'))}</th><th class="end">${esc(t('Commission'))}</th><th class="end">${esc(t('Fees'))}</th><th class="end">${esc(t('Net'))}</th><th>${esc(t('Status'))}</th><th class="end">${esc(t('Actions'))}</th></tr></thead><tbody>${data.map((p) => `<tr><td>${fmt.id(p.id)}</td><td>${fmt.range(p.period.from, p.period.to)}</td><td class="end">${D1.money(p.gross)}</td><td class="end">${D1.money(p.commission)}</td><td class="end">${D1.money(p.fees)}</td><td class="end"><b>${D1.money(p.net)}</b></td><td>${D1.pill('payout', p.status)}</td><td class="end">${UI.btn('View payout', { variant: 'icon', icon: 'eye', go: 'admin-payout-detail', params: { id: p.id } })}</td></tr>`).join('')}</tbody></table></div>` }), { empty: { icon: 'wallet', title: 'No payouts yet', text: 'Payouts appear after the first completed orders.' } }),
          compliance: () => UI.async(body, () => api('GET', `/admin/merchants/${id}/compliance`), ({ data: c }) => `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,2fr)">
            ${UI.card({ title: 'Hygiene score', icon: 'shield', tone: 'lime', body: `<div class="row" style="gap:18px;align-items:center">${c.hygieneScore != null ? Charts.ring(c.hygieneScore, { size: 96, color: c.hygieneScore >= 80 ? 'lime' : c.hygieneScore >= 60 ? 'orange' : 'rose', text: fmt.text.number(c.hygieneScore), label: 'Hygiene score' }) : `<span class="qs na" style="width:96px;height:96px;border-radius:50%;font-size:22px">—</span>`}<div style="display:grid;gap:8px">${D1.pill('compliance', c.status)}<small class="muted">${c.lastInspectionAt ? t('Last inspection {d}', { d: fmt.date(c.lastInspectionAt.slice(0, 10)) }) : esc(t('Not inspected yet'))}</small>${UI.link('Open in Quality & Safety', 'admin-compliance-detail', { id })}</div></div>` })}
            ${UI.card({ title: 'Certificates & documents', icon: 'file', tone: 'mauve', flush: true, body: `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t('Document'))}</th><th>${esc(t('Number'))}</th><th>${esc(t('Expires'))}</th><th>${esc(t('Status'))}</th></tr></thead><tbody>${c.certificates.map((x) => `<tr><td><b>${esc(D1.lab(D1.CERT, x.type))}</b></td><td>${x.number ? fmt.id(x.number) : '—'}</td><td>${x.expiresAt ? fmt.date(x.expiresAt) : '<span class="faint">—</span>'}</td><td>${D1.pill('cert', x.status)}</td></tr>`).join('') || `<tr><td colspan="4">${UI.empty({ icon: 'file', title: 'No documents uploaded' })}</td></tr>`}</tbody></table></div>` })}
          </div>`, { skeleton: 'cards', n: 2 }),
          activity: () => UI.async(body, () => api('GET', `/admin/merchants/${id}/activity`), ({ data }) => UI.card({ title: 'Activity', icon: 'activity', body: `<ol class="d1-timeline">${data.map((a) => `<li><i aria-hidden="true"></i><div><b>${esc(t(ACTIVITY[a.action] || a.action))}</b><small>${D1.dt(a.at)} · ${esc(a.actor)}</small>${a.detail ? `<p>${esc(detailLabel(a.detail))}</p>` : ''}</div></li>`).join('')}</ol>` }), { skeleton: 'list', empty: { icon: 'activity', title: 'No activity yet' } }),
        };
        (T[tab] || T.overview)();
      }
      loadHead(); paintTab();
    },
  });

  /* =================== add merchant (multi-step) =================== */
  const STEPS = ['Business details', 'Contact & location', 'Branches', 'Banking & commission', 'Documents', 'Review'];
  App.route('admin-merchant-new', {
    nav: 'Merchants', title: 'Add Merchant', subtitle: 'Onboard a new merchant in a few steps.',
    render(el) {
      const S = { step: 0, dirty: false, v: { nameEn: '', nameAr: '', legalName: '', category: '', tradeLicenseNo: '', vatNo: '', ownerName: '', email: '', phone: '', country: (App.market() !== 'all' && App.market()) || Markets.primary().code, city: '', address: '', branches: [{ name: 'Main Branch', address: '', open: '08:00', close: '21:00', pickStart: '18:00', pickEnd: '20:00' }], bankName: '', iban: '', accountName: '', commissionRate: (window.WBStore ? WBStore.commercial.defaultCommissionRate : 19), docs: { trade_license: { files: 0, expiresAt: '' }, food_safety_certificate: { files: 0, expiresAt: '' }, vat_certificate: { files: 0, expiresAt: '' } }, invite: true } };
      el.innerHTML = `<div class="d1-head">${UI.btn('Back to Merchants', { variant: 'ghost', icon: 'chev-l', iconCls: 'flip', attrs: 'data-nact="exit"' })}</div><div data-stepper></div>${UI.card({ body: '<form class="d1-form" novalidate data-form></form>', footer: '<div class="d1-head" data-foot></div>' })}`;
      const form = el.querySelector('[data-form]');
      const branchHTML = (b, i) => `<div class="d1-branch" data-branch="${i}"><h4>${esc(t('Branch {n}', { n: i + 1 }))}</h4>${S.v.branches.length > 1 ? `<span class="rm">${UI.btn('Remove branch', { variant: 'icon', icon: 'trash', attrs: `data-rmb="${i}"` })}</span>` : ''}
        ${UI.field({ name: `b${i}_name`, label: 'Branch name', value: b.name, required: true })}${UI.field({ name: `b${i}_address`, label: 'Address', value: b.address || S.v.address, required: true })}
        ${UI.field({ type: 'time', name: `b${i}_open`, label: 'Opens', value: b.open, required: true })}${UI.field({ type: 'time', name: `b${i}_close`, label: 'Closes', value: b.close, required: true })}
        ${UI.field({ type: 'time', name: `b${i}_pickStart`, label: 'Pickup window starts', value: b.pickStart, required: true })}${UI.field({ type: 'time', name: `b${i}_pickEnd`, label: 'Pickup window ends', value: b.pickEnd, required: true })}</div>`;
      const v = S.v;
      const STEP = [
        () => `<div class="form-grid">${UI.field({ name: 'nameEn', label: 'Business name (English)', value: v.nameEn, required: true, maxlength: 80 })}${UI.field({ name: 'nameAr', label: 'Business name (Arabic)', value: v.nameAr, maxlength: 80 })}
          ${UI.field({ name: 'legalName', label: 'Legal name', value: v.legalName, hint: 'As shown on the trade license.' })}${UI.field({ type: 'select', name: 'category', label: 'Category', value: v.category, required: true, placeholder: 'Select category', options: D1.opts(D1.CATEGORY) })}
          ${UI.field({ name: 'tradeLicenseNo', label: 'Trade license number', value: v.tradeLicenseNo, required: true, placeholder: 'e.g. TL-720130' })}${UI.field({ name: 'vatNo', label: 'VAT number', value: v.vatNo, pattern: '\\d{15}', hint: '15 digits (optional).' })}</div>`,
        () => `<div class="form-grid">${UI.field({ name: 'ownerName', label: 'Owner name', value: v.ownerName, required: true })}${UI.field({ type: 'email', name: 'email', label: 'Email', value: v.email, required: true, placeholder: 'owner@business.example.com' })}
          ${UI.field({ type: 'tel', name: 'phone', label: 'Phone', value: v.phone, required: true, placeholder: `${(Markets.get(v.country) || Markets.primary()).phoneCode} ${(Markets.get(v.country) || Markets.primary()).phonePlaceholder}` })}${UI.field({ type: 'select', name: 'country', label: 'Country', value: v.country, required: true, options: Markets.options(true) })}
          ${UI.field({ type: 'select', name: 'city', label: 'City', value: v.city, required: true, placeholder: 'Select city', options: Markets.cityOptions(v.country) })}${UI.field({ name: 'address', label: 'Business address', value: v.address, required: true })}</div>`,
        () => `<p class="muted" style="margin:0">${esc(t('Add every location that will publish drops. Pickup windows can be changed later by the merchant.'))}</p>${v.branches.map(branchHTML).join('')}<div>${UI.btn('Add branch', { variant: 'secondary', icon: 'plus', attrs: 'data-nact="addb"' })}</div>`,
        () => `<div class="form-grid">${UI.field({ name: 'bankName', label: 'Bank name', value: v.bankName, required: true })}${UI.field({ name: 'accountName', label: 'Account name', value: v.accountName || v.legalName || v.nameEn, required: true })}
          ${UI.field({ name: 'iban', label: 'IBAN', value: v.iban, required: true, placeholder: 'QA00 DEMO 0000 0000 0000 0000 0000 000', pattern: '[A-Za-z]{2}\\d{2}[\\s\\dA-Za-z]{10,32}', hint: 'Payouts are sent to this account.' })}${UI.field({ type: 'number', name: 'commissionRate', label: 'Commission rate', value: v.commissionRate, suffix: '%', min: 0, max: 50, required: true, hint: 'Platform default is 20%.' })}</div>`,
        () => Object.keys(v.docs).map((k) => `<div class="form-grid" style="align-items:start">${UI.dropzone({ name: 'doc_' + k, label: D1.CERT[k], accept: 'image/*,application/pdf', multiple: false, required: k !== 'vat_certificate', hint: 'PDF, PNG or JPG, up to 5 MB', files: v.docs[k].files ? ['ph5'] : [] })}${k === 'vat_certificate' ? '<div></div>' : UI.field({ type: 'date', name: 'exp_' + k, label: 'Expiry date', value: v.docs[k].expiresAt, required: true, min: '2026-11-20' })}</div>`).join(''),
        () => {
          const sec = (title, step, rows) => `<section><h4>${esc(t(title))}${UI.btn('Edit', { variant: 'ghost', size: 'sm', icon: 'edit', attrs: `data-goto="${step}"` })}</h4>${D1.dl(rows)}</section>`;
          return `<div class="d1-rev">
            ${sec('Business details', 0, [['Business name', esc(v.nameEn)], ['Arabic name', esc(v.nameAr)], ['Legal name', esc(v.legalName)], ['Category', esc(D1.lab(D1.CATEGORY, v.category))], ['Trade license', fmt.id(v.tradeLicenseNo)], ['VAT number', v.vatNo ? fmt.id(v.vatNo) : '']])}
            ${sec('Contact & location', 1, [['Owner', esc(v.ownerName)], ['Email', esc(v.email)], ['Phone', fmt.id(v.phone)], ['City', esc(D1.lab(D1.CITY, v.city))], ['Address', esc(v.address)]])}
            ${sec('Branches', 2, v.branches.map((b) => [b.name || '—', `${esc(b.address)}<br><small class="faint">${fmt.timeRange(b.open, b.close)} · ${t('Pickup')} ${fmt.timeRange(b.pickStart, b.pickEnd)}</small>`, true]))}
            ${sec('Banking & commission', 3, [['Bank', esc(v.bankName)], ['Account name', esc(v.accountName)], ['IBAN', fmt.id(v.iban)], ['Commission', fmt.pct(v.commissionRate, { dec: 0 })]])}
            ${sec('Documents', 4, Object.keys(v.docs).map((k) => [D1.CERT[k], v.docs[k].files ? `${UI.icon('checkc')} ${esc(t('Uploaded'))}${v.docs[k].expiresAt ? ` · ${t('expires {d}', { d: fmt.date(v.docs[k].expiresAt) })}` : ''}` : `<span class="faint">${esc(t('Not provided'))}</span>`]))}
            <section>${UI.field({ type: 'checkbox', name: 'invite', label: 'Email an onboarding invite to the owner', checked: v.invite })}<p class="muted" style="font-size:12.5px;margin:8px 0 0">${esc(t('The merchant is created as Pending and appears in the verification queue.'))}</p></section>
          </div>`;
        },
      ];
      const capture = () => {
        const x = UI.formValues(form);
        Object.keys(x).forEach((k) => {
          const bm = k.match(/^b(\d+)_(\w+)$/); if (bm) { v.branches[+bm[1]][bm[2]] = x[k]; return; }
          const em = k.match(/^exp_(\w+)$/); if (em) { v.docs[em[1]].expiresAt = x[k]; return; }
          const dm = k.match(/^doc_(\w+)$/); if (dm) { v.docs[dm[1]].files = (x[k] || []).length; return; }
          if (k in v) v[k] = k === 'commissionRate' ? +x[k] : x[k];
        });
      };
      function paint() {
        el.querySelector('[data-stepper]').innerHTML = UI.stepper({ steps: STEPS, current: S.step });
        form.innerHTML = `<h3 class="h-serif" style="margin:0">${esc(t(STEPS[S.step]))}</h3>${STEP[S.step]()}`;
        const last = S.step === STEPS.length - 1;
        el.querySelector('[data-foot]').innerHTML = `${UI.btn('Cancel', { variant: 'ghost', attrs: 'data-nact="exit"' })}<span class="sp"></span><span class="muted" style="font-size:12.5px">${t('Step {a} of {b}', { a: fmt.number(S.step + 1), b: fmt.number(STEPS.length) })}</span>${S.step ? UI.btn('Back', { variant: 'secondary', icon: 'chev-l', iconCls: 'flip', attrs: 'data-nact="back"' }) : ''}${last ? UI.btn('Create merchant', { variant: 'primary', icon: 'check', attrs: 'data-nact="submit"' }) : UI.btn('Next', { variant: 'primary', iconEnd: 'chev-r', attrs: 'data-nact="next"' })}`;
        const c = form.querySelector('[name="country"]'); if (c) c.addEventListener('change', () => { capture(); v.city = ''; paint(); });
      }
      function validStep() {
        const r = UI.validate(form); if (!r.ok) return false;
        if (S.step === 2) {
          for (let i = 0; i < v.branches.length; i++) {
            const x = UI.formValues(form);
            const bad = (n, msg) => { const f = form.querySelector(`[data-field="b${i}_${n}"]`); f.classList.add('invalid'); f.querySelector('.err').textContent = t(msg); f.querySelector('input').focus(); return false; };
            if (x[`b${i}_close`] <= x[`b${i}_open`]) return bad('close', 'Closing time must be after opening time');
            if (x[`b${i}_pickEnd`] <= x[`b${i}_pickStart`]) return bad('pickEnd', 'Pickup window end must be after start');
          }
        }
        return true;
      }
      async function submit(btn) {
        btn.disabled = true;
        try {
          const { data } = await api('POST', '/admin/merchants', {
            business: { name: { en: v.nameEn, ar: v.nameAr || v.nameEn }, legalName: v.legalName, category: v.category, tradeLicenseNo: v.tradeLicenseNo, vatNo: v.vatNo },
            contact: { ownerName: v.ownerName, email: v.email, phone: v.phone },
            location: { country: v.country, city: v.city, address: v.address },
            branches: v.branches.map((b) => ({ name: b.name, address: b.address, hours: `${b.open}–${b.close}`, pickupWindow: { start: b.pickStart, end: b.pickEnd } })),
            banking: { bankName: v.bankName, iban: v.iban, accountName: v.accountName }, commissionRate: v.commissionRate,
            documents: Object.keys(v.docs).filter((k) => v.docs[k].files).map((k) => ({ type: k, expiresAt: v.docs[k].expiresAt || null, fileName: k + '.pdf' })),
            sendInvite: v.invite,
          });
          S.dirty = false;
          UI.toast(t(v.invite ? '{name} added · invite sent to {email}' : '{name} added', { name: data.name, email: v.email }), { tone: 'success' });
          App.go('admin-merchant-detail', { id: data.id, tab: 'overview' });
        } catch (e) {
          btn.disabled = false;
          const map = { 'business.name': 0, 'business.category': 0, 'business.tradeLicenseNo': 0, 'contact.ownerName': 1, 'contact.email': 1, 'contact.phone': 1, 'location.city': 1, 'location.address': 1, commissionRate: 3 };
          const first = e.details && Object.keys(e.details).map((k) => map[k]).filter((x) => x != null).sort()[0];
          if (first != null) { S.step = first; paint(); const fld = { 'business.name': 'nameEn', 'business.category': 'category', 'business.tradeLicenseNo': 'tradeLicenseNo', 'contact.ownerName': 'ownerName', 'contact.email': 'email', 'contact.phone': 'phone', 'location.city': 'city', 'location.address': 'address', commissionRate: 'commissionRate' }; Object.keys(e.details).forEach((k) => { const f = form.querySelector(`[data-field="${fld[k]}"]`); if (f) { f.classList.add('invalid'); f.querySelector('.err').textContent = D1.err(e); } }); }
          D1.toastErr(e);
        }
      }
      form.addEventListener('input', () => { S.dirty = true; });
      form.addEventListener('submit', (e) => { e.preventDefault(); const n = el.querySelector('[data-nact="next"],[data-nact="submit"]'); if (n) n.click(); });
      UI.on(el, 'click', '[data-goto]', (e, b) => { capture(); S.step = +b.dataset.goto; paint(); });
      UI.on(el, 'click', '[data-rmb]', (e, b) => { capture(); v.branches.splice(+b.dataset.rmb, 1); paint(); });
      UI.on(el, 'click', '[data-nact]', async (e, b) => {
        const a = b.dataset.nact;
        if (a === 'exit') { if (S.dirty && !(await UI.confirm({ title: t('Discard this merchant?'), text: t('Your entries will be lost.'), confirm: 'Discard', danger: true }))) return; S.dirty = false; App.go('admin-merchants'); return; }
        if (a === 'addb') { capture(); v.branches.push({ name: '', address: v.address, open: '08:00', close: '21:00', pickStart: '18:00', pickEnd: '20:00' }); paint(); return; }
        if (a === 'back') { capture(); S.step--; paint(); return; }
        if (a === 'next') { if (!validStep()) return; capture(); S.step++; paint(); return; }
        if (a === 'submit') { capture(); submit(b); }
      });
      paint();
    },
  });
})();
