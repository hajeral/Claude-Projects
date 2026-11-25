/* =====================================================================
   Admin · Performance (owner: D2)
   Routes: admin-performance · admin-performance-report (View report) · admin-performance-merchants (View all merchants)
   API: GET /admin/analytics/performance · GET /admin/analytics/performance/report
        GET /admin/analytics/performance/merchants?q&status&city&category&sort&page
        GET /admin/analytics/performance/merchants/{merchantId}   (merchant performance detail — see CORE_REQUESTS)
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc, ic = UI.icon;
  const KPI = { dropAccuracy: { icon: 'pin', tone: 'rose', go: 'admin-performance-report' }, onTimePickupRate: { icon: 'package', tone: 'lime', go: 'admin-pickups' }, fulfilmentRate: { icon: 'check', tone: 'rose', go: 'admin-operations' }, avgFulfilmentTime: { icon: 'clock', tone: 'orange', go: 'admin-operations' }, platformUptime: { icon: 'activity', tone: 'mauve' } };
  const FUN = [['', 'cal'], ['m', 'package'], ['', 'star']];
  const SORTS = [{ value: '-qualityScore', label: 'Quality score: high to low' }, { value: 'qualityScore', label: 'Quality score: low to high' }, { value: '-onTimePct', label: 'On-time %: high to low' }, { value: 'name', label: 'Name A–Z' }];

  const rankCols = () => [
    { key: 'merchant', label: 'Merchant', render: (r) => `<div class="prod">${UI.avatar(App.loc(r.merchant.name), { size: 30, square: true })}<div><b>${D2.loc(r.merchant.name)}</b><small>${esc(D2.lab(D2.CITY, r.city))} · ${esc(D2.lab(D2.CATEGORY, r.category))}</small></div></div>` },
    { key: 'qualityScore', label: 'Quality Score', sortable: true, render: (r) => `<b>${fmt.number(r.qualityScore)}</b>` },
    { key: 'trend', label: 'Trend', render: (r) => { const up = r.trend[r.trend.length - 1] >= r.trend[0]; return `<span class="perf-sp">${Charts.spark(r.trend, { color: up ? 'lime' : 'rose', width: 90, height: 26 })}</span>`; } },
    { key: 'onTimePct', label: 'On-Time %', sortable: true, render: (r) => fmt.pct(r.onTimePct, { dec: 0 }) },
    { key: 'status', label: 'Status', render: (r) => D2.pill('quality', r.status) },
  ];

  App.route('admin-performance', {
    nav: 'Performance', title: 'Performance', subtitle: 'Operational performance metrics across the platform.',
    exportResource: 'admin.performance', exportColumns: ['Merchant', 'Quality Score', 'On-Time %', 'Fulfilment Rate', 'Rating', 'Status'],
    render(el) {
      el.classList.add('d2-page');
      D2.async(el, () => api('GET', '/admin/analytics/performance', api.ctx()), ({ data: d }) => {
        const pts = d.dropAccuracy.points;
        const chart = Charts.area({ series: [{ ...d.dropAccuracy, color: 'rose', dots: true }], min: 94, max: 97, yTicks: [94, 95, 96, 97], yFormat: (v) => v + '%', width: 640, height: 240, legend: false, label: 'Drop Accuracy — Last 7 Days',
          tooltip: { index: pts.length - 2, title: esc(t(pts[pts.length - 2].x)), value: fmt.pct(pts[pts.length - 2].y, { dec: 1 }) } });
        const f = d.fulfilmentFunnel; const max = f.steps[0].value || 1;
        const funnel = `<div class="d2-bars">${f.steps.map((s, i) => D2.bar(`<span class="d2-mi t-${['rose', 'mauve', 'green'][i]}">${ic(FUN[i][1])}</span>${esc(t(s.label))}`, fmt.number(s.value), (s.value / max) * 100, FUN[i][0])).join('')}</div><div class="perf-conv"><span>${esc(t(f.conversionLabel))}</span><b>${fmt.pct(f.conversion, { dec: 1 })}</b>${D2.delta({ key: 'c', delta: f.delta, deltaUnit: 'pp' })}</div>`;
        return `${D2.kpiGrid(d.kpis, KPI, 5)}
          <div class="grid perf-r2">
            ${UI.card({ title: 'Drop Accuracy — Last 7 Days', icon: 'pin', tone: 'rose', actions: UI.link('View report', 'admin-performance-report'), body: chart })}
            ${UI.card({ title: 'Fulfilment Funnel', icon: 'activity', tone: 'mauve', body: funnel })}
          </div>
          ${UI.card({ title: 'Merchant Performance Ranking', icon: 'award', tone: 'orange', actions: UI.link('View all merchants', 'admin-performance-merchants', {}), flush: true, body: d.ranking.length ? `<div data-rank></div>` : UI.empty({ icon: 'store', title: 'No merchants match these filters' }) })}`;
      }, { skeleton: 'cards', n: 3, after: (root, res) => {
        const box = root.querySelector('[data-rank]'); if (!box) return;
        const rows = res.data.ranking;
        UI.dataTable(box, { columns: rankCols().map((c) => ({ ...c, sortable: false })), pagination: false, caption: 'Merchant Performance Ranking', fetch: async () => ({ data: rows, meta: { total: rows.length } }), rowClick: (r) => merchantDrawer(r.id), rowActions: (r) => [{ icon: 'eye', label: 'View performance', run: () => merchantDrawer(r.id) }] });
      } });
    },
  });

  /* ---------------- all merchants ---------------- */
  App.route('admin-performance-merchants', {
    nav: 'Performance', title: 'Merchant Performance', subtitle: 'Quality score, on-time pickups and status for every merchant.',
    exportResource: 'admin.performance', exportColumns: ['Merchant', 'City', 'Category', 'Quality Score', 'On-Time %', 'Fulfilment Rate', 'Rating', 'Orders', 'Status'],
    render(el) {
      el.classList.add('d2-page');
      el.innerHTML = `${D2.back('Back to Performance', 'admin-performance')}<div data-f></div>${UI.card({ title: 'All merchants', icon: 'store', tone: 'orange', flush: true, body: '<div data-t></div>' })}`;
      const f = UI.mountFilters(el.querySelector('[data-f]'), {
        search: { name: 'q', placeholder: 'Search by merchant name or ID' },
        selects: [{ name: 'status', label: 'All Status', options: D2.statusOpts('quality') }, { name: 'city', label: 'All Cities', options: D2.opts(D2.CITY) }, { name: 'category', label: 'All Categories', options: D2.opts(D2.CATEGORY, ['bakery', 'restaurant', 'grocery', 'cafe', 'desserts']) }],
        sort: { name: 'sort', options: SORTS, value: '-qualityScore' },
        actions: UI.btn('Export', { variant: 'secondary', icon: 'upload', attrs: 'data-act="export"' }),
      }, () => tbl.setQuery({ page: 1, sort: f.values().sort }));
      const tbl = UI.dataTable(el.querySelector('[data-t]'), {
        pageSize: 10, sort: '-qualityScore', caption: 'Merchant Performance',
        columns: [...rankCols(), { key: 'fulfilmentRate', label: 'Fulfilment Rate', align: 'end', render: (r) => fmt.pct(r.fulfilmentRate, { dec: 1 }) }, { key: 'rating', label: 'Rating', align: 'end', render: (r) => `${ic('star')} ${fmt.number(r.rating, 1)}` }, { key: 'orders', label: 'Orders', align: 'end', render: (r) => fmt.number(r.orders) }],
        fetch: (q) => api('GET', '/admin/analytics/performance/merchants', { ...api.ctx(), ...f.values(), ...q }),
        rowClick: (r) => merchantDrawer(r.id),
        rowActions: (r) => [{ icon: 'eye', label: 'View performance', run: () => merchantDrawer(r.id) }, { icon: 'store', label: 'Open merchant profile', go: 'admin-merchant-detail', params: { id: r.id } }],
        empty: { icon: 'store', title: 'No merchants found', text: 'Try changing the filters or search.' },
      });
      UI.on(el, 'click', '[data-act="export"]', () => Overlays.export({ scope: 'Merchant Performance', resource: 'admin.performance', filters: f.values(), columns: ['Merchant', 'City', 'Category', 'Quality Score', 'On-Time %', 'Fulfilment Rate', 'Rating', 'Orders', 'Status'] }));
    },
  });

  /* ---------------- merchant performance detail (drawer) ---------------- */
  function merchantDrawer(id) {
    const dr = UI.drawer({ title: 'Merchant performance', width: 560, body: UI.skeleton('form', 5) });
    const fill = async () => {
      try {
        const { data: d } = await api('GET', '/admin/analytics/performance/merchants/' + id);
        if (dr.closed) return;
        const r = d.row; const s = d.onTimeTrend;
        dr.el.querySelector('.ov-h h2').innerHTML = D2.loc(r.merchant.name);
        dr.body.innerHTML = `<div class="perf-dh">${UI.avatar(App.loc(r.merchant.name), { size: 44, square: true })}<div><b>${D2.loc(r.merchant.name)}</b><small>${fmt.id(r.id)} · ${esc(D2.lab(D2.CITY, d.city))} · ${esc(D2.lab(D2.CATEGORY, d.category))}</small></div>${D2.pill('quality', r.status)}</div>
          <div class="grid d2-kg mt-16" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">${d.kpis.slice(0, 3).map((k) => D2.kpi(k, { compact: true, foot: '' })).join('')}</div>
          <div class="grid d2-kg mt-16" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">${d.kpis.slice(3).map((k) => D2.kpi(k, { compact: true, foot: '' })).join('')}</div>
          <div class="d2-sect mt-16"><h4>${esc(t('On-time pickups — last 14 days'))}</h4>${Charts.area({ series: [{ ...s, color: 'lime' }], min: 50, max: 100, yTicks: [50, 75, 100], yFormat: (v) => v + '%', width: 500, height: 180, legend: false, labelEvery: D2.every(s.points.length), label: 'On-Time %' })}</div>
          <div class="d2-sect mt-16"><h4>${esc(t('Open signals'))}</h4><div class="d2-mrows perf-sig">${d.issues.map((x) => `<div class="d2-mr"><span class="d2-ml">${esc(t(x.label))}</span><b class="d2-mv">${fmt.number(x.count)}</b></div>`).join('')}</div></div>`;
        D2.setFooter(dr, [
          { label: 'View compliance', variant: 'secondary', icon: 'shield', run: () => { dr.close(); App.go('admin-compliance-detail', { id }); } },
          { label: 'Open merchant profile', variant: 'primary', icon: 'store', run: () => { dr.close(); App.go('admin-merchant-detail', { id }); } },
        ]);
      } catch (e) { dr.body.innerHTML = UI.errorState({ text: e.message }); dr.body.addEventListener('ui:retry', fill, { once: true }); }
    };
    fill();
  }
  D2.merchantPerformance = merchantDrawer;

  /* ---------------- drop accuracy report ---------------- */
  App.route('admin-performance-report', {
    nav: 'Performance', title: 'Drop Accuracy Report', subtitle: 'Daily accuracy, city breakdown and the most common mismatch reasons.',
    exportResource: 'admin.performance', exportColumns: ['Date', 'Drop Accuracy', 'City', 'Drops', 'Mismatches'],
    render(el) {
      el.classList.add('d2-page');
      D2.async(el, () => api('GET', '/admin/analytics/performance/report', api.ctx()), ({ data }) =>
        `<div class="d2-pagehead">${D2.back('Back to Performance', 'admin-performance')}<span class="sp"></span>${UI.btn('Export report', { variant: 'secondary', icon: 'upload', attrs: 'data-act="export"' })}</div>
         ${D2.reportHead(data)}<div class="grid perf-rep">${D2.report(data)}</div>`, { skeleton: 'cards', n: 4 });
      UI.on(el, 'click', '[data-act="export"]', () => Overlays.export({ scope: 'Drop Accuracy Report', resource: 'admin.performance', columns: ['Date', 'Drop Accuracy', 'City', 'Drops', 'Mismatches'] }));
    },
  });

  UI.css('d2-perf', `
    .perf-r2{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)}
    .perf-conv{display:flex;align-items:center;gap:8px;margin-block-start:18px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card-2);font-size:12px}
    .perf-conv span{flex:1;color:var(--muted)}
    .perf-sp svg.sp{width:90px;height:26px;display:block}
    .perf-dh{display:flex;align-items:center;gap:12px}
    .perf-dh>div{flex:1;min-width:0}
    .perf-dh b{display:block;font-size:15px}
    .perf-dh small{display:block;font-size:12px;color:var(--faint)}
    .perf-sig{border:1px solid var(--line-soft);border-radius:12px}
    .perf-rep{grid-template-columns:repeat(2,minmax(0,1fr))}
    .perf-rep>.cd:nth-child(-n+2){grid-column:1/-1}
  `);
})();
