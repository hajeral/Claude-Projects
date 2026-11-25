/* =====================================================================
   Admin · Sustainability & Impact (owner: D2)
   Routes: admin-sustainability · admin-sustainability-report {tab:'report'|'breakdown', groupBy}
   API: GET /admin/analytics/sustainability · GET /admin/analytics/sustainability/report
        GET /admin/analytics/sustainability/breakdown?groupBy=city|merchant|category|month
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc, ic = UI.icon;
  const HERO_IC = { mealsSaved: 'leaf', co2Offset: 'co2', waterSaved: 'water', wasteDiverted: 'recycle' };
  const CAT_COLOR = ['green', 'lime', 'mauve', 'orange', 'rose', 'grey'];
  const CAT = { ...D2.CATEGORY, prepared_foods: 'Prepared' };

  App.route('admin-sustainability', {
    nav: 'Sustainability & Impact', title: 'Sustainability & Impact', subtitle: 'Meals saved, carbon offset, and marketplace impact.',
    exportResource: 'admin.sustainability', exportColumns: ['Region', 'Merchant', 'Category', 'Meals Saved', 'Food (kg)', 'CO₂ (t)', 'Water (L)'],
    render(el) {
      el.classList.add('d2-page');
      D2.async(el, () => api('GET', '/admin/analytics/sustainability', api.ctx()), ({ data: d }) => {
        const hero = UI.card({ title: 'Sustainability Impact', icon: 'leaf', tone: 'lime', hero: 'lime', cls: 'sust sus-hero', actions: `<a class="lnk" href="#admin-sustainability-report" data-go="admin-sustainability-report" data-params='{"tab":"report"}'>${esc(t('Learn more'))}${ic('chev-r', 'flip')}</a>`,
          body: `<div class="sus-h4">${d.hero.map((k) => `<div><span class="sus-ic">${ic(HERO_IC[k.key] || 'leaf')}</span><b>${D2.val(k)}</b><small>${esc(t(k.label))}</small><em>${ic(k.delta >= 0 ? 'trend' : 'trend-down')}${fmt.num(esc(D2.deltaText(k)))} ${esc(t(k.comparison || ''))}</em></div>`).join('')}</div>
            <div class="sust-ft"><span>${t('Equivalent to taking {n} cars off the road for a year.', { n: `<b>${fmt.number(d.equivalentCars)}</b>` })}</span></div>` });
        const pts = d.mealsSavedTrend.points;
        const meals = UI.card({ title: 'Meals Saved — Last 7 Days', icon: 'leaf', tone: 'lime', actions: UI.link('View report', 'admin-sustainability-report', { tab: 'report' }),
          body: Charts.area({ series: [{ ...d.mealsSavedTrend, color: 'green', dots: true }], width: 640, height: 230, legend: false, label: 'Meals Saved', tooltip: { index: pts.length - 2, title: esc(t(pts[pts.length - 2].x)), value: fmt.number(pts[pts.length - 2].y) } }) });
        const cat = UI.card({ title: 'Impact by Category', icon: 'layers', tone: 'mauve', body: d.impactByCategory.length ? Charts.donut({ segments: d.impactByCategory.map((s, i) => ({ label: CAT[s.key] || s.label, value: s.share, color: CAT_COLOR[i] })), size: 150, thickness: 20, center: { value: fmt.compact(d.impactByCategory.reduce((a, s) => a + s.value, 0)), label: 'meals' }, legendFormat: (v) => fmt.pct(v, { dec: 0 }) }) : UI.empty({ icon: 'layers', title: 'No data' }) });
        const max = Math.max(1, ...d.impactByRegion.map((r) => r.mealsSaved));
        const reg = UI.card({ title: 'Impact by Region', icon: 'map', tone: 'lime', actions: UI.link('View full breakdown', 'admin-sustainability-report', { tab: 'breakdown', groupBy: 'city' }),
          body: d.impactByRegion.length ? `<div class="d2-bars">${d.impactByRegion.map((r) => D2.bar(D2.loc(r.region), `${fmt.number(r.mealsSaved)} ${esc(t('meals'))}`, (r.mealsSaved / max) * 100, '')).join('')}</div>` : UI.empty({ icon: 'map', title: 'No regions match these filters' }) });
        return `${hero}<div class="grid sus-r2">${meals}${cat}</div>${reg}`;
      }, { skeleton: 'cards', n: 4 });
    },
  });

  /* ---------------- report + full breakdown ---------------- */
  const GROUPS = [{ value: 'city', label: 'By city' }, { value: 'merchant', label: 'By merchant' }, { value: 'category', label: 'By category' }, { value: 'month', label: 'By month' }];
  function breakdownHTML(b, by) {
    const tbl = (head, rows) => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map((h, i) => `<th class="${i ? 'end' : ''}">${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    if (by === 'merchant') return b.byMerchant.length ? tbl(['Merchant', 'City', 'Meals Saved', 'Food (kg)', 'CO₂ (t)', 'Water (L)'], b.byMerchant.map((r) => `<tr class="click" data-go="admin-merchant-detail" data-params="${UI.attrJSON({ id: r.merchant.id })}" tabindex="0"><td><b>${D2.loc(r.merchant.name)}</b></td><td class="end mut">${D2.loc(r.city)}</td><td class="end b">${fmt.number(r.mealsSaved)}</td><td class="end">${fmt.number(r.foodKg)}</td><td class="end">${fmt.number(r.co2Tonnes, 2)}</td><td class="end">${fmt.compact(r.waterLitres)}</td></tr>`)) : UI.empty({ icon: 'store', title: 'No data' });
    if (by === 'category') { const max = Math.max(1, ...b.byCategory.map((s) => s.value)); return `<div class="cd-b">${Charts.donut({ segments: b.byCategory.map((s, i) => ({ label: D2.lab(D2.CATEGORY, s.key), value: s.share, color: CAT_COLOR[i % 6] })), size: 160, thickness: 22, legendFormat: (v) => fmt.pct(v, { dec: 1 }) })}<div class="d2-bars mt-16">${b.byCategory.map((s) => D2.bar(esc(D2.lab(D2.CATEGORY, s.key)), `${fmt.number(s.value)} ${esc(t('meals'))}`, (s.value / max) * 100)).join('')}</div></div>`; }
    if (by === 'month') { const s = D2.series([b.monthly[0]], ['green']); return `<div class="cd-b">${Charts.bars({ ...s, height: 260, width: 900, barWidth: 30, legend: false, label: 'Meals Saved' })}</div>` + tbl(['Month', 'Meals Saved', 'CO₂ Offset (t)'], b.monthly[0].points.map((p, i) => `<tr><td>${esc(Charts.label(p.x))}</td><td class="end b">${fmt.number(p.y)}</td><td class="end">${fmt.number(b.monthly[1].points[i].y, 1)}</td></tr>`)); }
    return b.byCity.length ? tbl(['City', 'Meals Saved', 'Share', 'Food (kg)', 'CO₂ (t)'], b.byCity.map((r) => `<tr><td><b>${D2.loc(r.region)}</b></td><td class="end b">${fmt.number(r.mealsSaved)}</td><td class="end">${fmt.pct(r.share, { dec: 1 })}</td><td class="end">${fmt.number(r.foodKg)}</td><td class="end">${fmt.number(r.co2Tonnes, 1)}</td></tr>`)) : UI.empty({ icon: 'map', title: 'No data' });
  }
  App.route('admin-sustainability-report', {
    nav: 'Sustainability & Impact', title: 'Sustainability Impact Report', subtitle: 'Impact report and full breakdown by city, merchant, category and month.',
    exportResource: 'admin.sustainability', exportColumns: ['Group', 'Meals Saved', 'Food (kg)', 'CO₂ (t)', 'Water (L)'],
    render(el, ctx) {
      el.classList.add('d2-page');
      const st = { tab: (ctx.params && ctx.params.tab) || 'report', groupBy: (ctx.params && ctx.params.groupBy) || 'city' };
      el.innerHTML = `<div class="d2-pagehead">${D2.back('Back to Sustainability & Impact', 'admin-sustainability')}<span class="sp"></span>${UI.btn('Export', { variant: 'secondary', icon: 'upload', attrs: 'data-act="export"' })}</div><div data-tabs></div><div data-body></div>`;
      const draw = () => {
        el.querySelector('[data-tabs]').innerHTML = UI.tabs({ name: 'sus', label: 'Report sections', active: st.tab, tabs: [{ id: 'report', label: 'Impact report', icon: 'file' }, { id: 'breakdown', label: 'Full breakdown', icon: 'layers' }] });
        const body = el.querySelector('[data-body]');
        if (st.tab === 'report') D2.async(body, () => api('GET', '/admin/analytics/sustainability/report', api.ctx()), ({ data }) => `${D2.reportHead(data)}<div class="grid perf-rep sus-rep">${D2.report(data, { color: 'green' })}</div>`, { skeleton: 'cards', n: 4 });
        else {
          body.innerHTML = UI.card({ title: 'Full breakdown', icon: 'layers', tone: 'lime', actions: UI.segmented({ name: 'groupBy', label: 'Group by', value: st.groupBy, options: GROUPS }), flush: true, body: '<div data-bd></div>' });
          D2.async(body.querySelector('[data-bd]'), () => api('GET', '/admin/analytics/sustainability/breakdown', { ...api.ctx(), groupBy: st.groupBy }), ({ data }) => breakdownHTML(data, st.groupBy), { skeleton: 'table' });
        }
      };
      draw();
      el.addEventListener('ui:tab', (e) => { if (e.detail.name !== 'sus') return; st.tab = e.detail.value; App.state.params['admin-sustainability-report'] = { ...st }; draw(); });
      el.addEventListener('ui:seg', (e) => { if (e.detail.name !== 'groupBy') return; st.groupBy = e.detail.value; App.state.params['admin-sustainability-report'] = { ...st }; D2.async(el.querySelector('[data-bd]'), () => api('GET', '/admin/analytics/sustainability/breakdown', { ...api.ctx(), groupBy: st.groupBy }), ({ data }) => breakdownHTML(data, st.groupBy), { skeleton: 'table' }); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('tr[data-go]')) e.target.click(); });
      UI.on(el, 'click', '[data-act="export"]', () => Overlays.export({ scope: st.tab === 'report' ? 'Sustainability Impact Report' : 'Full breakdown', resource: 'admin.sustainability', filters: { groupBy: st.groupBy }, columns: ['Group', 'Meals Saved', 'Food (kg)', 'CO₂ (t)', 'Water (L)'] }));
    },
  });

  UI.css('d2-sus', `
    .sus-h4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
    .sus-h4>div{display:flex;flex-direction:column;gap:3px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(183,239,118,.22);min-width:0}
    .sus-ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:rgba(183,239,118,.14);color:#B7EF76;margin-block-end:4px}
    .sus-ic svg.i{width:16px;height:16px}
    .sus-h4 b{font-family:var(--font-num);font-size:26px;font-weight:700;color:#fff;white-space:nowrap}
    .sus-h4 small{font-size:12px;color:#C6E3D0}
    .sus-h4 em{font-style:normal;font-size:11.5px;color:#B7EF76;font-weight:600;display:inline-flex;gap:4px;align-items:center}
    .sus-h4 em svg.i{width:12px;height:12px}
    .sus-hero .cd-h .lnk{color:#fff}
    .sus-r2{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)}
    .sus-rep .tbl td:first-child{white-space:normal}
    @media (max-width:1360px){ .sus-h4 b{font-size:22px} }
  `);
})();
