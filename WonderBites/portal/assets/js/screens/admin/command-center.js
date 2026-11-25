/* =====================================================================
   Admin · Command Center (#admin-command-center) — reference screen   [LEAD]
   API (docs/API_CONTRACT.md): GET /admin/dashboard · GET /admin/dashboard/drop-accuracy?period=
        POST /admin/alerts/{id}/dismiss
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc, ic = UI.icon;
  UI.status.ensure({ sold_out: { label: 'Sold Out', tone: 'o', icon: 'minus' }, scheduled: { label: 'Scheduled', tone: 'o', icon: 'cal' }, flagged: { label: 'Flagged', tone: 'r', icon: 'flag' }, good: { label: 'Good', tone: 'g', icon: 'checkc' }, needs_review: { label: 'Needs Review', tone: 'r', icon: 'alert' } });

  /* Kpi.key → icon, tone, deep link */
  const KPI = {
    liveDrops: { icon: 'radio', tone: 'rose', go: 'admin-drops', params: { status: 'live' } },
    reservedToday: { icon: 'cal', tone: 'lime', go: 'admin-orders', params: { status: 'reserved' } },
    pickupsCompleted: { icon: 'clock', tone: 'orange', go: 'admin-pickups', params: { status: 'picked_up' } },
    openIssues: { icon: 'alert', tone: 'mauve', go: 'admin-issues', params: { tab: 'issues' }, captionTone: 'neg' },
    dropAccuracy: { icon: 'pin', tone: 'rose', go: 'admin-operations' },
  };
  const ALERT = { merchant: ['alert', 'rose'], warning: ['clock', 'orange'], information: ['store', 'mauve'], monitor: ['bars', 'green'] };
  const SEG_COLOR = { active_verified: 'green', expiring_soon: 'mauve', needs_attention: 'orange', inactive: 'grey' };
  const thumbFor = (id) => 'ph' + ((String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 6) + 1);
  const PERIODS = [{ value: 'this_week', label: 'This Week' }, { value: '7d', label: 'Last 7 days' }, { value: 'this_month', label: 'This Month' }];

  function accuracyHTML(d) {
    const pts = d.series.points; const i = Math.max(0, pts.length - 2); const prev = pts[i - 1] || pts[i];
    const dd = prev ? ((pts[i].y - prev.y) / prev.y) * 100 : 0;
    return `<div class="row wrap" style="align-items:baseline;gap:4px 8px;margin-block-end:8px"><span class="k-v" style="margin:0;font-size:24px">${fmt.pct(d.value)}</span>${d.delta != null ? `<span class="dl ${d.delta >= 0 ? 'up' : 'dn'}">${ic(d.delta >= 0 ? 'up' : 'down')}${fmt.num(fmt.delta(d))}</span>` : ''}<span class="cd-sub">${esc(t(PERIODS.find((p) => p.value === d.period) ? PERIODS.find((p) => p.value === d.period).label : 'This Week'))}</span></div>` +
      Charts.area({ series: [{ ...d.series, color: 'rose' }], yTicks: [90, 92, 94, 96, 98], min: 90, max: 98, yFormat: (v) => v + '%', width: 640, height: 300, legend: false,
        tooltip: { index: i, title: `${fmt.date(pts[i].x, 'short')} · ${fmt.num('00:00')}`, value: fmt.pct(pts[i].y), delta: (dd >= 0 ? '+' : '') + dd.toFixed(1) + '%' } });
  }
  function alertsHTML(list) {
    if (!list.length) return UI.empty({ icon: 'checkc', title: 'No priority alerts', text: 'You’re all caught up.' });
    return list.map((a) => { const [icn, tone] = ALERT[a.type] || ALERT.information; return `<div class="li ${a.severity === 'critical' ? 'hot' : ''}" data-alert="${esc(a.id)}"><span class="ic t-${tone}">${ic(icn)}</span><button type="button" class="tx" style="text-align:start" data-link="${UI.attrJSON(a.link || {})}"><span class="tt" style="display:block">${fmt.iso(esc(t(a.title)))}</span><span class="mm"><b>${esc(t(a.source || ''))}</b> · ${fmt.iso(esc(t(a.subtitle || '')))}</span></button><span class="tm">${fmt.ago(a.createdAt)}</span><button type="button" class="x" data-dismiss="${esc(a.id)}" aria-label="${esc(t('Dismiss'))}">${ic('x')}</button></div>`; }).join('');
  }

  App.route('admin-command-center', {
    nav: 'Command Center', title: 'Command Center',
    subtitle: "Live view of today's drops, pickups, quality signals, and marketplace health.",
    exportResource: 'admin.drops', exportColumns: ['Drop', 'Merchant', 'Location', 'Window', 'Status', 'Reserved', 'Picked Up'],
    render(el) {
      UI.async(el, () => api('GET', '/admin/dashboard', api.ctx()), ({ data }) => body(data), { skeleton: 'cards', n: 6, isEmpty: () => false, after: (root, res) => wire(root, res.data) });
    },
  });

  function body(d) {
    const kpis = UI.kpis(d.kpis.map((k) => UI.kpiData(k, KPI[k.key] || {})), 5);
    const alerts = UI.card({ title: 'Priority Alerts', icon: 'bell', tone: 'rose', hero: 'rose', count: `<span data-acount class="num">${d.priorityAlerts.length}</span>`, actions: UI.link('View All', 'admin-issues', { tab: 'alerts' }), flush: true, body: `<div class="lst" data-alerts>${alertsHTML(d.priorityAlerts)}</div>` });
    const th = (l, c) => `<th class="${c || ''}">${esc(t(l))}</th>`;
    const orders = UI.card({ title: 'Recent Orders', icon: 'clipboard', tone: 'rose', actions: UI.link('Manage drops', 'admin-drops'), flush: true,
      body: `<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">${esc(t('Recent Orders'))}</caption><thead><tr>${th('Drop')}${th('Merchant')}${th('Location')}${th('Window')}${th('Status')}${th('Reserved', 'end')}${th('Picked Up', 'end')}</tr></thead><tbody>${d.recentOrders.map((o) => `<tr class="click" tabindex="0" data-go="admin-drops" data-params="${UI.attrJSON({ id: o.dropId })}"><td class="b">${fmt.id('#' + o.dropId)}</td><td><div class="prod">${UI.thumb(thumbFor(o.dropId), 'sm')}<div><b>${esc(t(o.merchant.name))}</b><small>${esc(t(o.title))}</small></div></div></td><td class="mut">${esc(t(o.location))}</td><td>${fmt.timeRange(o.pickupWindow.start, o.pickupWindow.end)}</td><td>${UI.pill(o.status)}</td><td class="end b">${fmt.number(o.reserved)}</td><td class="end b">${fmt.number(o.pickedUp)}</td></tr>`).join('')}</tbody></table></div>` });
    const pm = d.passportMonitoring;
    const passport = UI.card({ title: 'Pickup Passport Monitoring', icon: 'shield', tone: 'lime', actions: UI.link('View All', 'admin-pickups'),
      body: Charts.donut({ segments: pm.segments.map((s) => ({ label: s.label, value: s.share, color: SEG_COLOR[s.key] || 'grey' })), size: 140, thickness: 18, center: { value: fmt.number(pm.total), label: 'passports' }, legendFormat: (v) => fmt.pct(v, { dec: 0 }) }) +
        `<button type="button" class="li hot mt-16" style="align-items:center" data-go="admin-pickups" data-params='{"filter":"attention","segment":"needs_attention"}'><span class="ic t-rose">${ic('alert')}</span><span class="tx tt">${t('{n} Passport attention', { n: fmt.number(pm.attentionCount) })}</span><span class="lnk">${esc(t('Review Now'))}${ic('chev-r', 'flip')}</span></button>` });
    const openKpi = d.kpis.find((k) => k.key === 'openIssues') || { value: d.issueAlerts.length };
    const issues = UI.card({ title: 'Issue Alerts', icon: 'alert', tone: 'orange', count: t('{n} open', { n: fmt.number(openKpi.value) }), actions: UI.link('View All', 'admin-issues', { tab: 'issues' }), flush: true,
      body: `<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">${esc(t('Issue Alerts'))}</caption><thead><tr>${th('ID')}${th('Type')}${th('Merchant')}${th('Status')}${th('Time', 'end')}</tr></thead><tbody>${d.issueAlerts.map((i) => `<tr class="click" tabindex="0" data-go="admin-issues" data-params="${UI.attrJSON({ tab: 'issues', id: i.id })}"><td class="b">${fmt.id('#' + i.id.replace(/^\D+/, ''))}</td><td>${esc(t(i.type))}</td><td class="mut">${esc(t(i.merchant.name))}</td><td>${UI.pill(i.status)}</td><td class="end mut">${fmt.ago(i.createdAt)}</td></tr>`).join('')}</tbody></table></div>` });
    const acc = UI.card({ title: 'Drop Accuracy', icon: 'pin', tone: 'rose', actions: UI.select({ name: 'accPeriod', label: 'Period', value: d.dropAccuracy.period, options: PERIODS }), body: `<div data-acc>${accuracyHTML(d.dropAccuracy)}</div>` });
    const quality = UI.card({ title: 'Merchant Quality Watch', icon: 'star', tone: 'orange', actions: UI.link('View All', 'admin-quality'), flush: true,
      body: `<div class="rows">${d.merchantQualityWatch.map((m) => `<button type="button" class="rw" data-go="admin-merchant-detail" data-params="${UI.attrJSON({ id: m.merchant.id })}"><span class="nm">${esc(t(m.merchant.name))}</span><b class="num">${m.score}</b>${Charts.spark(m.sparkline, { color: m.badge === 'excellent' || m.badge === 'good' ? 'lime' : 'rose', width: 64, height: 22 })}<span style="min-width:100px;text-align:end">${UI.pill(m.badge)}</span></button>`).join('')}</div>` });
    const s = d.sustainability;
    const tile = (k, icn, extra) => `<div>${ic(icn)}<b>${fmt.kpi(k)}</b><small>${esc(t(k.label))}</small><em>${ic('trend')}${fmt.num(fmt.delta(k))}${extra ? ' ' + esc(t(extra)) : ''}</em></div>`;
    const sust = UI.card({ title: 'Sustainability Impact', icon: 'leaf', tone: 'lime', hero: 'lime', cls: 'sust',
      body: `<div class="st4">${tile(s.mealsSaved, 'leaf', s.mealsSaved.comparison)}${tile(s.co2Offset, 'co2')}${tile(s.waterSaved, 'water')}${tile(s.wasteDiverted, 'recycle')}</div>
        <div class="sust-ft"><span>${t('Equivalent to {n} car miles avoided', { n: `<b>${fmt.number(s.equivalentCarMiles)}</b>` })}</span>${UI.link('Learn More', 'admin-sustainability')}</div>` });
    return `${kpis}
      <div class="grid" style="grid-template-columns:350px minmax(0,1fr)">${alerts}${orders}</div>
      <div class="grid" style="grid-template-columns:350px minmax(0,1fr)">${passport}${issues}</div>
      <div class="grid" style="grid-template-columns:minmax(0,1fr) 430px">${acc}<div class="grid" style="align-content:start">${quality}${sust}</div></div>
      ${UI.banner('admin-templates')}`;
  }
  function wire(root) {
    root.addEventListener('ui:select', (e) => {
      if (e.detail.name !== 'accPeriod') return;
      UI.async(root.querySelector('[data-acc]'), () => api('GET', '/admin/dashboard/drop-accuracy', { ...api.ctx(), period: e.detail.value }), ({ data }) => accuracyHTML(data), { skeleton: 'card', isEmpty: () => false });
    });
    UI.on(root, 'click', '[data-link]', (e, b) => Overlays.openLink(JSON.parse(b.dataset.link)));
    UI.on(root, 'click', '[data-dismiss]', async (e, b) => {
      const id = b.dataset.dismiss; const row = b.closest('[data-alert]');
      try {
        await api('POST', '/admin/alerts/' + id + '/dismiss', {});
        row.remove(); const left = root.querySelectorAll('[data-alert]').length; root.querySelector('[data-acount]').textContent = left;
        if (!left) root.querySelector('[data-alerts]').innerHTML = alertsHTML([]);
        else root.querySelector('[data-alert] .x').focus();
        UI.toast('Alert dismissed', { tone: 'info' });
      } catch (x) { UI.toast(x.message, { tone: 'error' }); }
    });
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('tr[data-go]')) e.target.click(); });
  }
})();
