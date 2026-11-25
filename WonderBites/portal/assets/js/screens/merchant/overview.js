/* (v1.4 dates) seeded dates rebased onto api.DEMO_TODAY = 2026-11-19 by qa/rebase_dates.py */
/* =====================================================================
   Merchant · Overview (#m-overview) — reference screen   [LEAD]
   + This month's impact (#m-sustainability)
   API (docs/API_CONTRACT.md): GET /merchant/overview?branchId&from&to
        GET /merchant/overview/sales?period= · PATCH /merchant/branches/{id}/state
        GET /shared/impact?period=YYYY-MM&branchId
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc, ic = UI.icon, S = App.state;
  UI.status.ensure({ confirmed: { label: 'Processing', tone: 'm', icon: 'loader' }, ready_for_pickup: { label: 'Ready', tone: 'o', icon: 'clock' }, reserved: { label: 'Placed', tone: 'o', icon: 'clock' }, no_show: { label: 'No-show', tone: 'r', icon: 'xc' }, temporarily_closed: { label: 'Temporarily closed', tone: 'o', icon: 'pause' } });

  const KPI = {
    totalSales: { icon: 'bag', tone: 'rose', go: 'm-analytics' },
    totalOrders: { icon: 'basket', tone: 'lime', go: 'm-orders' },
    pendingPickups: { icon: 'clock', tone: 'orange', go: 'm-orders', params: { status: 'ready_for_pickup' }, goodWhen: 'down' },
    completedOrders: { icon: 'checkc', tone: 'mauve', go: 'm-orders', params: { status: 'completed' } },
    cancelledOrders: { icon: 'xc', tone: 'rose', go: 'm-orders', params: { status: 'cancelled' }, goodWhen: 'down' },
  };
  const SEG_COLOR = { in_stock: 'green', low_stock: 'mauve', sold_out: 'orange', paused: 'rose', expired: 'grey' };
  const thumbFor = (id) => 'ph' + ((String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 6) + 1);
  const PERIODS = [{ value: 'this_week', label: 'This Week' }, { value: '7d', label: 'Last 7 days' }, { value: 'this_month', label: 'This Month' }];

  function salesHTML(s) {
    const pts = s.series.points; const i = Math.max(0, pts.length - 3); const prev = pts[i - 1] || pts[i];
    const dd = prev && prev.y ? ((pts[i].y - prev.y) / prev.y) * 100 : 0;
    return `<div class="row wrap" style="align-items:baseline;gap:4px 8px;margin-block-end:6px"><span class="k-v" style="margin:0;font-size:24px">${fmt.money(s.total)}</span><span class="dl ${s.delta >= 0 ? 'up' : 'dn'}">${ic(s.delta >= 0 ? 'up' : 'down')}${fmt.pct(s.delta, { sign: true })}</span><span class="cd-sub">${esc(t('vs last week'))}</span></div>` +
      Charts.area({ series: [{ ...s.series, color: 'rose' }], yFormat: (v) => fmt.text.compact(v), width: 520, height: 290, legend: false,
        tooltip: { index: i, title: `${fmt.date(pts[i].x, 'short')} · ${fmt.num('18:00')}`, value: fmt.money(pts[i].y), delta: (dd >= 0 ? '+' : '') + dd.toFixed(1) + '%' } });
  }
  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning, {name}' : h < 18 ? 'Good afternoon, {name}' : 'Good evening, {name}'; };
  const first = () => t((S.user && (S.user.firstName || S.user.name)) || 'Sara');

  App.route('m-overview', {
    nav: 'Overview',
    title: () => `${esc(t(greet(), { name: first() }))} ${ic('sun')}`,
    subtitle: () => esc(t('Here’s how {store} is doing today.', { store: t((S.user && S.user.merchant && S.user.merchant.name) || 'Fig & Bloom Bakery') })),
    exportResource: 'merchant.orders', exportColumns: ['Order', 'Customer', 'Items', 'Status', 'Amount', 'Placed at'],
    render(el) {
      UI.async(el, () => api('GET', '/merchant/overview', api.ctx()), ({ data }) => body(data), { skeleton: 'cards', n: 6, isEmpty: () => false, after: (root, res) => wire(root, res.data) });
    },
  });

  function body(d) {
    const kpis = UI.kpis(d.kpis.map((k) => UI.kpiData(k, KPI[k.key] || {})), 5);
    const sales = UI.card({ title: 'Sales Overview', icon: 'trend', tone: 'rose', actions: UI.select({ name: 'salesPeriod', label: 'Period', value: d.salesOverview.period, options: PERIODS }), body: `<div data-sales>${salesHTML(d.salesOverview)}</div>`,
      footer: `<span class="cd-sub">${esc(t('Branch'))}: ${esc(S.branch.id === 'all' ? t('All branches') : App.loc(S.branch.name))}</span><span class="sp"></span>${UI.link('View sales report', 'm-analytics')}` });
    const top = UI.card({ title: 'Top Selling Bags', icon: 'bag', tone: 'rose', actions: UI.link('View All', 'm-listings'), flush: true,
      body: `<div class="rows">${d.topSellingBags.map((b) => `<button type="button" class="rw" data-go="m-inventory-detail" data-params="${UI.attrJSON({ id: b.listing.id })}"><b class="num faint" style="width:12px">${b.rank}</b>${UI.thumb(thumbFor(b.listing.id), 'sm')}<span style="flex:1;min-width:0"><span class="ellipsis" style="display:block;font-weight:600">${esc(App.loc(b.listing.name))}</span><small class="faint">${t('{n} sold', { n: fmt.number(b.sold) })}</small></span><b class="nowrap">${fmt.money(b.revenue)}</b></button>`).join('')}</div>` });
    const recent = UI.card({ title: 'Recent Orders', icon: 'clipboard', tone: 'rose', actions: UI.link('View All', 'm-orders'), flush: true,
      body: `<div class="rows">${d.recentOrders.map((o) => `<button type="button" class="rw" data-go="m-orders" data-params="${UI.attrJSON({ id: o.id })}"><b class="num" style="width:44px">${esc(o.number)}</b><span style="flex:1;min-width:0"><span style="display:block;font-weight:600">${esc(t(o.customerName))}</span><small class="faint ellipsis" style="display:block">${t('{n} bags', { n: fmt.number(o.itemsSold || 1) })} · ${fmt.clock(o.placedAt)}</small></span>${UI.pill(o.status, o.status === 'confirmed' ? { label: 'Processing', tone: 'm', icon: 'loader' } : {})}<b class="nowrap" style="min-width:62px;text-align:end">${fmt.money(o.amount)}</b>${ic('chev-r', 'flip')}</button>`).join('')}</div>` });
    const inv = d.inventoryStatus;
    const invCard = UI.card({ title: 'Inventory Status', icon: 'package', tone: 'lime', actions: UI.link('View All', 'm-inventory'),
      body: `<div style="display:flex;gap:16px;align-items:center">${Charts.donut({ segments: inv.segments.map((s) => ({ label: s.label, value: s.value, color: SEG_COLOR[s.key] || 'grey' })), size: 132, thickness: 20, center: { value: fmt.number(inv.totalBags), label: 'Total Bags' }, legend: false })}<div class="leg">${inv.segments.map((s) => `<button type="button" class="row" style="width:100%;font-size:12.5px" data-go="m-inventory" data-params="${UI.attrJSON({ status: s.key })}"><i style="width:9px;height:9px;border-radius:3px;background:${Charts.color(SEG_COLOR[s.key] || 'grey')}"></i><span class="muted" style="flex:1;text-align:start">${esc(t(s.label))}</span><b class="num">${s.value}</b><span class="faint num" style="font-size:11px;min-width:34px;flex:none;text-align:end">${s.share}%</span></button>`).join('')}</div></div>` });
    const ops = UI.card({ title: 'Operational Status', icon: 'store', tone: 'lime', body: `<div data-ops>${opsHTML(d.operationalStatus)}</div>`, footer: `<span class="sp"></span>${UI.link('Edit hours', 'm-settings', { tab: 'hours' })}` });
    const rv = d.reviews;
    const stars = [1, 2, 3, 4, 5].map((i) => `<svg class="i ${i <= Math.round(rv.average - 0.2) ? 'f' : 'e'}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/></svg>`).join('');
    const reviews = UI.card({ title: 'Reviews', icon: 'star', tone: 'orange', actions: UI.link('View All', 'm-reviews'),
      body: `<div class="row" style="align-items:baseline;gap:6px"><b class="num" style="font-family:var(--font-num);font-size:30px;line-height:1.2">${rv.average}</b><span class="num muted">(${fmt.text.number(rv.count)})</span></div><div class="stars" style="margin:2px 0 10px" role="img" aria-label="${esc(t('{n} out of 5 stars', { n: rv.average }))}">${stars}</div>${Charts.histogram(rv.distribution.map((h) => ({ label: String(h.stars), value: h.count, tone: h.stars <= 2 ? 'o' : '' })), { max: Math.max(...rv.distribution.map((x) => x.count)), star: true })}` });
    const notes = UI.card({ title: 'Alerts & Notifications', icon: 'bell', tone: 'orange', actions: UI.link('View All', 'm-notifications'), flush: true,
      body: `<div class="lst" data-notes>${d.alerts.map((n) => Overlays.itemHTML(n, 'li')).join('')}</div>` });
    return `${kpis}
      <div class="grid ov-r1">${sales}${top}${recent}</div>
      <div class="grid ov-r2">${invCard}${ops}${reviews}${notes}</div>
      ${UI.banner('m-templates')}`;
  }
  function opsHTML(o) {
    const open = o.state === 'open';
    return `<div class="ops ${open ? '' : 'closed'}"><span class="oi">${ic('store')}</span><div><b><i></i>${esc(UI.status.label(o.state === 'open' ? 'open' : o.state))}</b><small>${esc(t(o.caption))}</small></div></div>
      <div class="ophr"><div><small>${ic('clock')}${esc(t('Today’s Hours'))}</small><b>${fmt.num(o.todayHours.start + ' – ' + o.todayHours.end)}</b></div><div><small>${ic('bag')}${esc(t('Pickup Window'))}</small><b>${fmt.num(o.pickupWindow.start + ' – ' + o.pickupWindow.end)}</b></div></div>
      <button type="button" class="btn secondary mt-16" style="width:100%" data-branch-state="${open ? 'closed' : 'open'}">${ic('refresh')}${esc(t('Tap to change branch state'))}</button>`;
  }
  function wire(root, d) {
    root.addEventListener('ui:select', (e) => {
      if (e.detail.name !== 'salesPeriod') return;
      UI.async(root.querySelector('[data-sales]'), () => api('GET', '/merchant/overview/sales', { ...api.ctx(), period: e.detail.value }), ({ data }) => salesHTML(data), { skeleton: 'card', isEmpty: () => false });
    });
    UI.on(root, 'click', '[data-nid]', (e, b) => { const n = JSON.parse(b.dataset.n); api('PATCH', '/shared/notifications/' + n.id, { read: true }).catch(() => {}); Overlays.openLink(n.link); });
    UI.on(root, 'click', '[data-branch-state]', async (e, b) => {
      const next = b.dataset.branchState; const opening = next === 'open';
      if (S.branch.id === 'all') { UI.toast('Select a single branch to change its state.', { tone: 'info' }); return Overlays.open('branch', document.querySelector('[data-ov="branch"]')); }
      const ok = await UI.confirm({ title: opening ? 'Open branch?' : 'Close branch?', text: opening ? 'Customers will be able to reserve and collect bags again.' : 'New reservations will be paused until you reopen. Existing orders stay active.', confirm: opening ? 'Open branch' : 'Close branch', danger: !opening });
      if (!ok) return;
      try {
        const { data } = await api('PATCH', '/merchant/branches/' + (S.branch.id || 'BR-01') + '/state', { state: next });
        d.operationalStatus.state = data.state; d.operationalStatus.caption = data.state === 'open' ? 'Accepting pickups' : 'Not accepting pickups';
        root.querySelector('[data-ops]').innerHTML = opsHTML(d.operationalStatus);
        root.querySelector('[data-branch-state]').focus();
        UI.toast(t(data.state === 'open' ? '{b} is now open' : '{b} is now closed', { b: App.loc(S.branch.name) }));
      } catch (x) { UI.toast(x.message, { tone: 'error' }); }
    });
  }

  /* ------------------------------ This month's impact ------------------------------ */
  App.route('m-sustainability', {
    nav: '', title: 'Sustainability & Impact', subtitle: 'Your branch’s contribution to reducing food waste this month.',
    render(el) {
      const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(api.DEMO_TODAY + 'T00:00:00Z'); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 5 + i); return d.toISOString().slice(0, 7); }); // (v1.4) relative to demo today
      UI.async(el, async () => {
        const [cur, ...hist] = await Promise.all([api('GET', '/shared/impact', { portal: 'merchant', period: api.DEMO_TODAY.slice(0, 7), branchId: S.branch.id }), ...months.map((m, i) => api('GET', '/shared/impact', { portal: 'merchant', period: m, branchId: S.branch.id }).then((r) => ({ ...r.data, mealsSaved: Math.round(r.data.mealsSaved * (0.5 + i * 0.1)), co2Tonnes: +(r.data.co2Tonnes * (0.5 + i * 0.1)).toFixed(2) })))]);
        const ov = await api('GET', '/merchant/overview', api.ctx());
        return { data: { cur: cur.data, hist, bags: ov.data.topSellingBags } };
      }, ({ data }) => {
        const c = data.cur;
        return `${UI.kpis([
          { label: 'Meals rescued', icon: 'leaf', tone: 'lime', value: fmt.number(c.mealsSaved), delta: { value: '+18%', dir: 'up' }, foot: esc(t('vs last month')), spark: data.hist.map((h) => h.mealsSaved) },
          { label: 'CO₂ avoided', icon: 'co2', tone: 'lime', value: `${fmt.number(c.co2Tonnes, 2)} ${esc(t('t'))}`, foot: esc(t('this month')), spark: data.hist.map((h) => h.co2Tonnes) },
          { label: 'Water saved', icon: 'water', tone: 'mauve', value: `${fmt.compact(c.waterLitres)} ${esc(t('L'))}`, foot: esc(t('this month')) },
          { label: 'Food rescued', icon: 'recycle', tone: 'orange', value: `${fmt.number(c.foodKg)} ${esc(t('kg'))}`, foot: esc(t('this month')) },
        ])}
        <div class="grid g-2">
          ${UI.card({ title: 'Meals rescued by month', icon: 'bars', tone: 'lime', body: Charts.bars({ series: [{ name: 'Meals rescued', color: 'lime', points: data.hist.map((h, i) => ({ x: months[i], y: h.mealsSaved })) }], width: 560, height: 260 }) })}
          ${UI.card({ title: 'Impact by bag', icon: 'bag', tone: 'rose', actions: UI.link('View sales report', 'm-analytics'), body: Charts.donut({ segments: data.bags.slice(0, 4).map((b, i) => ({ label: App.loc(b.listing.name), value: b.sold, color: ['rose', 'lime', 'mauve', 'orange'][i] })), size: 150, thickness: 20, center: { value: fmt.number(data.bags.slice(0, 4).reduce((a, b) => a + b.sold, 0)), label: 'bags' } }) })}
        </div>
        ${UI.card({ title: 'Sustainability Impact', icon: 'leaf', tone: 'lime', hero: 'lime', cls: 'sust', body: `<p style="color:#C6E3D0;font-size:13px">${t('Your rescued meals this month equal {n} car miles avoided. Share your impact with customers from Templates or your store profile.', { n: `<b style="color:#B7EF76">${fmt.number(1450)}</b>` })}</p><div class="sust-ft">${UI.link('Create from Template', 'm-templates')}</div>` })}`;
      }, { skeleton: 'cards', n: 4, isEmpty: () => false });
    },
  });
})();
