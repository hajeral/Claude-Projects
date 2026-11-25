/* Merchant · Sales & Analytics (owner: D4) — routes m-analytics (sections A–H), m-analytics-days */
(function () {
  'use strict';
  const { LE, money, ph } = Ops;
  const PERIODS = [['today', 'Today'], ['7d', '7 Days'], ['30d', '30 Days'], ['3m', '3 Months'], ['custom', 'Custom']];
  const GRAINS = [['day', 'Day'], ['week', 'Week'], ['month', 'Month']];
  let period = '30d', grain = 'day';

  const deltaOf = (k) => k.delta == null ? null : { value: (k.deltaDirection === 'down' ? '−' : '+') + fmt.text.number(k.delta) + (k.deltaUnit === 'pp' ? 'pp' : k.deltaUnit === '%' ? '%' : ''), dir: k.deltaDirection === 'down' ? 'down' : 'up', good: k.deltaDirection !== 'down' };
  const KPI_META = { salesRevenue: ['money', 'rose'], ordersSold: ['receipt', 'mauve'], boxesSold: ['package', 'orange'], avgOrderValue: ['tag', 'lime'], sellThrough: ['chart', 'lime'], netEarnings: ['wallet', 'lime'],
    pendingPayout: ['clock', 'orange'], nextPayout: ['calendar', 'mauve'], uniqueCustomers: ['users', 'rose'], repeatRate: ['refresh', 'mauve'], avgRating: ['star', 'orange'], recoveryRate: ['leaf', 'lime'] };
  const kv = (k) => k.key === 'nextPayout' ? money(k.value) : typeof k.value === 'object' ? money(k.value, k.key === 'avgOrderValue' ? 1 : 0) : k.unit === '%' ? fmt.pct(k.value) : k.key === 'avgRating' ? `${fmt.number(k.value)} ★` : fmt.number(k.value);
  const kfoot = (k) => k.key === 'nextPayout' ? `${fmt.date(k.date, 'short')} · ${t('{n} days left', { n: fmt.number(11) })}` : k.key === 'pendingPayout' ? t('Settles on the next payout') : k.hint ? t(k.hint) : t('vs previous period');

  function dayRow(d) {
    return `<tr><td><b>${Ops.day(d.date)}</b></td><td class="num-c">${fmt.number(d.orders)}</td><td>${fmt.number(d.boxes)}</td><td>${money(d.grossSales)}</td><td>${money(d.commission)}</td><td>${money(d.adjustments)}</td>
      <td><b style="color:var(--pos)">${money(d.netEarnings)}</b></td><td>${UI.pill(d.payout)}</td><td>${fmt.number(d.mealsSaved)}</td><td>${fmt.number(d.foodKg)}</td><td>${fmt.number(d.co2T)}</td></tr>`;
  }
  const DAY_HEAD = ['Day', 'Orders', 'Boxes', 'Gross Sales', 'Commission', 'Adjustments', 'Net Earnings', 'Payout', 'Meals Saved', 'Food (kg)', 'CO₂ (t)'];
  const csvRows = (days) => days.map((d) => [d.date, d.orders, d.boxes, d.grossSales.amount, d.commission.amount, d.adjustments.amount, d.netEarnings.amount, d.payout, d.mealsSaved, d.foodKg, d.co2T]);
  async function exportDays() {
    const res = await api('GET', '/merchant/analytics/sales/days', { ...api.ctx(), pageSize: 100 });
    Ops.downloadCSV(`sales-by-day-${(App.state.dateRange && App.state.dateRange.from) || ''}.csv`, DAY_HEAD.map((h) => t(h)), csvRows(res.data));
  }
  const rangeLabel = () => { const r = App.state.dateRange || {}; return `${r.from ? fmt.date(r.from, 'short') : ''} – ${r.to ? fmt.date(r.to, 'short') : ''} · ${UI.esc(App.state.branch && App.state.branch.id !== 'all' ? App.loc(App.state.branch.name) : t('All branches'))}`; };

  App.route('m-analytics', {
    nav: 'Analytics', title: 'Sales & Analytics', subtitle: 'Deeper performance insights over time.',
    render(el, ctx) {
      el.innerHTML = `<div data-root>${UI.skeleton('kpis', 5)}${UI.skeleton('cards', 3)}</div>`;
      const load = () => UI.async(el.querySelector('[data-root]'), () => api('GET', '/merchant/analytics/sales', { ...api.ctx(), period, grain }), ({ data: a }) => {
        const s = a.salesPerformance, rev = s[0].points.map((p) => p.y), ord = s[1].points.map((p) => p.y);
        const labels = rev.map((_, i) => grain === 'month' ? fmt.text.month(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i % 12]) : grain === 'week' ? t('W{n}', { n: i + 1 }) : (i % 5 === 0 ? String(i + 1) : ''));
        const maxRev = Math.ceil(Math.max(...rev) / 500) * 500, sr = a.surplusRecovery, op = a.ordersPickups, e = a.earnings, ci = a.customerInsights, im = a.impact;
        const ordScaled = ord.map((v) => v * (maxRev / Math.max(1, Math.max(...ord) * 1.15)));
        return `
          <div class="grid g-4" style="gap:16px">${a.kpis.map((k) => UI.kpi({ label: t(k.label), icon: KPI_META[k.key][0], tone: KPI_META[k.key][1], value: kv(k), delta: deltaOf(k), foot: kfoot(k) })).join('')}</div>
          <div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:stretch">
            ${UI.card({ title: t('A) Sales Performance'), icon: 'bars', tone: 'rose', actions: UI.segmented({ name: 'grain', label: 'Granularity', value: grain, options: GRAINS.map(([value, l]) => ({ value, label: t(l) })) }),
              body: `<div class="cd-b"><div style="display:flex;justify-content:flex-end;margin-block-end:10px">${UI.segmented({ name: 'period', label: 'Period', value: period, options: PERIODS.map(([value, l]) => ({ value, label: t(l) })) })}</div>
                ${Charts.area({ series: [{ name: t('Revenue ({cur})', { cur: fmt.text.currency() }), values: rev, color: 'rose' }, { name: t('Orders'), values: ordScaled, color: 'lime', dashed: true }], labels, yTicks: [0, maxRev / 2, maxRev], yFormat: (v) => fmt.text.compact ? fmt.text.compact(v) : v, height: 230, fill: true,
                  tooltip: { index: Math.floor(rev.length * 0.6), title: labels[Math.floor(rev.length * 0.6)], value: fmt.text.money(rev[Math.floor(rev.length * 0.6)]), delta: t('{n} orders', { n: fmt.text.number(ord[Math.floor(rev.length * 0.6)]) }) } })}</div>` })}
            ${UI.card({ title: t('B) Surplus Recovery'), icon: 'leaf', tone: 'lime', body: `<div class="cd-b"><div style="display:flex;gap:18px;align-items:center">${Charts.ring(sr.recoveryRate, { size: 120, color: 'green', label: t('Recovery Rate') })}
                <div class="ops-list" style="flex:1"><div><span>${t('Surplus Listed')}</span><b>${fmt.number(sr.listed)}</b></div><div><span>${t('Surplus Sold')}</span><b>${fmt.number(sr.sold)}</b></div><div><span>${t('Unsold')}</span><b>${fmt.number(sr.unsold)}</b></div></div></div>
                <div class="ops-list" style="margin-block-start:14px"><div><span>${t('Recovered Revenue')}</span><b>${money(sr.recoveredRevenue)}</b></div><div><span>${t('Retail Value Saved')}</span><b>${money(sr.retailValueSaved)}</b></div><div><span>${t('Recovery Rate')}</span><b style="color:var(--pos)">${fmt.pct(sr.recoveryRate)}</b></div></div></div>` })}
          </div>
          <div class="grid g-2" style="align-items:stretch">
            ${UI.card({ title: t('C) Top Performing Offers'), icon: 'star', tone: 'orange', flush: true, body: `<table class="tbl"><thead><tr><th>${t('Offer')}</th><th>${t('Sold')}</th><th>${t('Revenue')}</th><th>${t('Sell-through')}</th></tr></thead><tbody>
                ${a.topOffers.map((o) => `<tr data-go="m-inventory-detail" data-params='${JSON.stringify({ id: o.id })}' style="cursor:pointer"><td><div class="ops-row">${UI.thumb(ph(o.tone), 'sm')}<b>${LE(o.title)}</b></div></td><td>${fmt.number(o.sold)}</td><td>${money(o.revenue)}</td><td><b style="color:var(--pos)">${fmt.pct(o.sellThrough)}</b></td></tr>`).join('')}</tbody></table>` })}
            ${UI.card({ title: t('D) Orders & Pickups'), icon: 'package', tone: 'mauve', actions: UI.link(t('View All'), 'm-orders'), body: `<div class="cd-b" style="display:grid;gap:14px">
                <div class="ops-stat">${[['bag', 'Orders Reserved', fmt.number(op.reserved)], ['checkc', 'Orders Collected', fmt.number(op.collected)], ['clock', 'Pickup Completion Rate', fmt.pct(op.completionRate)]].map(([ic, l, v]) => `<div><span class="ic">${UI.icon(ic)}</span><small>${t(l)}</small><b>${v}</b></div>`).join('')}</div>
                <div class="ops-stat" style="grid-template-columns:repeat(4,minmax(0,1fr))">${[['x', 'Customer Cancellations', op.customerCancellations], ['store', 'Merchant Cancellations', op.merchantCancellations], ['alert', 'No-Shows', op.noShows], ['refresh', 'Refunds', op.refunds]].map(([ic, l, v]) => `<div><span class="ic" style="background:var(--tint-rose);color:var(--ic-rose)">${UI.icon(ic)}</span><small>${t(l)}</small><b>${fmt.number(v)}</b></div>`).join('')}</div></div>` })}
          </div>
          <div class="grid g-2" style="align-items:stretch">
            ${UI.card({ title: t('E) Earnings & Payout Summary'), icon: 'wallet', tone: 'lime', body: `<div class="cd-b" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center">
                <div class="ops-list"><div><span>${t('Gross Sales')}</span><b>${money(e.grossSales)}</b></div><div><span>${t('WonderBites Commission')}</span><b>${money(e.commission)}</b></div><div><span>${t('Refund Adjustments')}</span><b>${money(e.refundAdjustments)}</b></div>
                  <div class="hl"><span>${t('Merchant Net Earnings')}</span><b>${money(e.netEarnings)}</b></div><div><span>${t('Paid to Date')}</span><b>${money(e.paidToDate)}</b></div><div><span>${t('Pending Payout')}</span><b>${money(e.pendingPayout)}</b></div></div>
                ${Charts.donut({ segments: e.split.map((x, i) => ({ label: t(x.label), value: x.pct, color: ['green', 'berry', 'orange'][i] })), size: 140, thickness: 18, center: { value: fmt.compact(e.netEarnings.amount), label: t('Net Earnings ({cur})', { cur: fmt.text.currency() }) }, legend: true, legendFormat: (v) => v + '%' })}</div>` })}
            ${UI.card({ title: t('F) Customer Insights'), icon: 'users', tone: 'rose', actions: UI.link(t('View All'), 'm-customers'), body: `<div class="cd-b ops-list">
                ${[['user', 'New Customers', fmt.number(ci.newCustomers)], ['refresh', 'Returning Customers', fmt.number(ci.returningCustomers)], ['chart', 'Repeat Purchase Rate', fmt.pct(ci.repeatRate)], ['star', 'Average Rating', fmt.number(ci.avgRating) + ' ★'], ['chat', 'Reviews', fmt.number(ci.reviews)]].map(([ic, l, v]) => `<div><span>${UI.icon(ic)} ${t(l)}</span><b>${v}</b></div>`).join('')}
                <div style="padding-block-start:10px">${UI.link(t('Read reviews'), 'm-reviews')}</div></div>` })}
          </div>
          ${UI.card({ title: t('G) Your Impact'), icon: 'leaf', tone: 'lime', body: `<div class="cd-b grid g-4" style="gap:16px">${[['bag', 'Meals Saved', fmt.number(im.mealsSaved), 'Surprise boxes'], ['package', 'Food Saved', fmt.compact(im.foodKgSaved) + ' ' + t('kg'), 'Total food saved'], ['cloud', 'CO₂ Avoided', fmt.number(im.co2TAvoided) + ' ' + t('t'), 'Tonnes of CO₂'], ['leaf', 'Food Waste Value Saved', money(im.foodWasteValueSaved), 'Retail value saved']]
            .map(([ic, l, v, s]) => `<div class="ops-row"><span class="ops-meta"><span class="ic" style="background:var(--tint-green);color:var(--ic-green);width:42px;height:42px;border-radius:50%">${UI.icon(ic)}</span></span><div><small class="muted">${t(l)}</small><b style="display:block;font-size:22px;font-family:var(--font-num)">${v}</b><small>${t(s)}</small></div></div>`).join('')}</div>` })}
          ${UI.card({ title: t('H) Sales, Financial & Sustainability Breakdown — by Day'), icon: 'cal', tone: 'mauve', flush: true,
            actions: `<span class="muted" style="font-size:12px">${rangeLabel()}</span>${UI.btn(t('Export CSV'), { variant: 'secondary', size: 'sm', icon: 'download', attrs: 'data-act="csv"' })}`,
            body: `<div style="overflow-x:auto"><table class="tbl"><thead><tr>${DAY_HEAD.map((h) => `<th>${t(h)}</th>`).join('')}</tr></thead><tbody>${a.days.map(dayRow).join('')}</tbody></table></div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-block-start:1px solid var(--line);font-size:12.5px"><span class="faint">${t('Showing the latest {n} of {total} periods — aggregated per day', { n: fmt.number(a.days.length), total: fmt.number(a.daysTotal) })}</span>${UI.link(t('View all day records'), 'm-analytics-days')}</div>` })}`;
      }, { skeleton: 'cards' });
      load();
      UI.on(el, 'ui:seg', '*', (e) => { const d = e.detail || {}; if (d.name === 'period') period = d.value; else if (d.name === 'grain') grain = d.value; else return; if (d.name === 'period' && d.value === 'custom' && window.Overlays) { Overlays.dateRange(e.target.closest('button') || e.target); } load(); });
      UI.on(el, 'click', '[data-act="csv"]', exportDays);
    },
  });

  App.route('m-analytics-days', {
    nav: 'Analytics', title: 'Sales & Analytics', subtitle: 'Deeper performance insights over time.',
    render(el) {
      el.innerHTML = UI.card({ title: t('All day records'), icon: 'cal', tone: 'mauve', flush: true, sub: rangeLabel(),
        actions: UI.btn(t('Back to analytics'), { variant: 'ghost', size: 'sm', icon: 'chev-l', go: 'm-analytics' }) + UI.btn(t('Export CSV'), { variant: 'secondary', size: 'sm', icon: 'download', attrs: 'data-act="csv"' }), body: '<div data-table></div>' });
      UI.dataTable(el.querySelector('[data-table]'), {
        pageSize: 10,
        columns: [
          { key: 'date', label: t('Day'), render: (d) => `<b>${Ops.day(d.date)}</b>` }, { key: 'orders', label: t('Orders'), render: (d) => fmt.number(d.orders) }, { key: 'boxes', label: t('Boxes'), render: (d) => fmt.number(d.boxes) },
          { key: 'gross', label: t('Gross Sales'), render: (d) => money(d.grossSales) }, { key: 'commission', label: t('Commission'), render: (d) => money(d.commission) }, { key: 'adj', label: t('Adjustments'), render: (d) => money(d.adjustments) },
          { key: 'net', label: t('Net Earnings'), render: (d) => `<b style="color:var(--pos)">${money(d.netEarnings)}</b>` }, { key: 'payout', label: t('Payout'), render: (d) => UI.pill(d.payout) },
          { key: 'meals', label: t('Meals Saved'), render: (d) => fmt.number(d.mealsSaved) }, { key: 'food', label: t('Food (kg)'), render: (d) => fmt.number(d.foodKg) }, { key: 'co2', label: t('CO₂ (t)'), render: (d) => fmt.number(d.co2T) },
        ],
        fetch: (q) => api('GET', '/merchant/analytics/sales/days', { ...api.ctx(), ...q }),
        empty: { icon: 'cal', title: t('No records for this period'), text: t('Try a different date range.') },
      });
      UI.on(el, 'click', '[data-act="csv"]', exportDays);
    },
  });
})();
