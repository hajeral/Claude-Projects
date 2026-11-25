/* =====================================================================
   Admin · Financials (owner: D2)
   Routes: admin-financials · admin-payout-detail {id}
   API: GET /admin/financials/filter-options · GET /admin/financials/summary
        GET /admin/financials/revenue-snapshot|gmv-trend|revenue-trend|monthly-trends|unit-economics
        GET /admin/financials/payouts-settlements|refunds-adjustments (section period selectors)
        GET /admin/financials/payouts (+/{id}, POST /{id}/process|hold|retry)
        GET /admin/financials/refunds (+ POST /{id}/approve|reject)
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc, ic = UI.icon;
  let OPTS = null;              // filter options (cached)
  const F = {};                 // current filter values (kept across language/theme re-renders)
  const LEDGER = { tab: 'payouts' };
  const curLabel = (c) => fmt.currency(c); // (v1.3) labels from the markets registry
  /** 'This Period (QAR)' → translated base + localized currency */
  const sName = (label) => { const m = String(label).match(/^(.*) \(([A-Z]{3})\)$/); return m ? `${t(m[1])} (${curLabel(m[2])})` : t(label); };

  const KPI = {
    gmv: { icon: 'trend', tone: 'rose' }, wbRevenue: { icon: 'coins', tone: 'lime' }, commissionRevenue: { icon: 'percent', tone: 'rose' },
    pendingPayouts: { icon: 'wallet', tone: 'mauve', act: 'ledger-payouts' }, refundValue: { icon: 'refund', tone: 'rose', act: 'ledger-refunds' }, contributionMargin: { icon: 'trend', tone: 'lime' },
    netRevenue: { icon: 'bars', tone: 'lime' }, processingFees: { icon: 'card', tone: 'orange' }, creditsLiability: { icon: 'gift', tone: 'mauve', go: 'admin-wallet', params: { tab: 'credit' } },
    subscriptionRevenue: { icon: 'receipt', tone: 'orange' }, revenuePerOrder: { icon: 'clipboard', tone: 'rose' }, revenuePerBox: { icon: 'bag', tone: 'orange' },
  };
  const PAY = { merchantGrossEarnings: { icon: 'store', tone: 'rose' }, amountPaid: { icon: 'checkc', tone: 'green', act: 'ledger-payouts:paid' }, pendingPayout: { icon: 'clock', tone: 'mauve', act: 'ledger-payouts:scheduled' }, failedHeld: { icon: 'alert', tone: 'berry', act: 'ledger-payouts:failed' }, avgSettlementDays: { icon: 'cal', tone: 'orange' } };
  const REF = { refundAmount: { icon: 'refund', tone: 'rose', act: 'ledger-refunds' }, refundRate: { icon: 'percent', tone: 'orange' }, cancellationValue: { icon: 'xc', tone: 'berry' }, creditsIssued: { icon: 'gift', tone: 'green', go: 'admin-wallet', params: { tab: 'credit' } }, chargebacks: { icon: 'card', tone: 'mauve' } };
  const UE = { revenuePerOrder: ['clipboard', 'rose'], revenuePerBox: ['bag', 'orange'], commissionPerOrder: ['percent', 'lime'], paymentFeePerOrder: ['card', 'mauve'], contributionPerOrder: ['coins', 'rose'], contributionMargin: ['trend', 'mauve'], refundRate: ['refund', 'rose'], chargebackRate: ['alert', 'mauve'] };
  const SEG = { commission: 'rose', subscriptions: 'mauve', other: 'orange' };
  const MONTHS = [{ value: '3', label: 'Last 3 Months' }, { value: '6', label: 'Last 6 Months' }, { value: '12', label: 'Last 12 Months' }];

  const q = () => ({ ...api.ctx(), ...F });

  /* ------------------------------------------------------------ card bodies */
  function snapshotHTML(rs) {
    const m = rs.metrics;
    const tone = { grossRevenue: 'var(--line-mauve)', netRevenue: 'var(--line-rose)', contributionMargin: 'var(--line-green)', netMargin: 'var(--line-orange)' };
    return `<div class="fin-snap"><div class="fin-snap-m">${m.map((k) => `<div><span><i style="background:${tone[k.key] || 'var(--faint)'}"></i>${esc(t(k.label))}</span><b>${D2.val(k)}</b>${D2.delta(k)}</div>`).join('')}</div>
      <div class="fin-snap-d"><p class="d2-h4">${esc(t('Revenue Composition'))}</p>${Charts.donut({ segments: rs.composition.map((s) => ({ label: s.label, value: s.share, color: SEG[s.key] || 'grey' })), size: 120, thickness: 16, center: { value: D2.money(rs.centerValue), label: 'Net Revenue' }, legendFormat: (v) => fmt.pct(v, { dec: 1 }) })}</div></div>`;
  }
  function trendHTML(tc, kind) {
    const s = D2.series(tc.series, kind === 'gmv' ? ['rose', 'mauve'] : ['rose', 'mauve']);
    s.series.forEach((x, i) => { x.name = sName(x.name); if (i) x.dashed = true; });
    const opts = { series: s.series, labels: s.labels, labelEvery: D2.every(s.labels.length), height: 220, width: 330, legend: true, yFormat: (v) => fmt.text.compact(v), label: kind === 'gmv' ? 'GMV Trend' : 'Revenue Trend' };
    return (kind === 'gmv' ? Charts.area(opts) : Charts.line(opts)) + D2.totals(tc.totals);
  }
  function monthlyHTML(series) {
    const s = D2.series(series, ['rose', 'mauve', 'green']); s.series.forEach((x) => (x.name = sName(x.name)));
    return Charts.bars({ series: s.series, labels: s.labels, height: 250, width: 330, barWidth: 6, yFormat: (v) => fmt.text.compact(v), label: 'Financial Trends (Monthly)' });
  }
  const unitHTML = (ue) => `<div class="grid d2-kg fin-ue">${ue.metrics.map((k) => D2.kpi(k, { icon: (UE[k.key] || [])[0], tone: (UE[k.key] || [])[1], compact: true, foot: '' })).join('')}</div>`;

  function dashboard(root, d) {
    root.querySelector('[data-kpis]').innerHTML = D2.kpiGrid(d.kpis, KPI, 6);
    root.querySelector('[data-snap]').innerHTML = snapshotHTML(d.revenueSnapshot);
    root.querySelector('[data-gmv]').innerHTML = trendHTML(d.gmvTrend, 'gmv');
    root.querySelector('[data-rev]').innerHTML = trendHTML(d.revenueTrend, 'rev');
    root.querySelector('[data-pay]').innerHTML = D2.metricRows(d.payoutsSettlements, PAY);
    root.querySelector('[data-ref]').innerHTML = D2.metricRows(d.refundsAdjustments, REF);
    root.querySelector('[data-mon]').innerHTML = monthlyHTML(d.monthlyTrends);
    root.querySelector('[data-ue]').innerHTML = unitHTML(d.unitEconomics);
  }

  /* ------------------------------------------------------------ route */
  App.route('admin-financials', {
    nav: 'Financials', title: 'Financials', subtitle: 'Track financial performance, revenue, margins, and payouts.',
    exportResource: 'admin.financials', exportColumns: ['Metric', 'Value', 'Change', 'Period', 'Country', 'City', 'Category', 'Merchant'],
    async render(el, ctx) {
      el.classList.add('d2-page');
      if (ctx.params && ctx.params.ledger) LEDGER.tab = ctx.params.ledger;
      const sel = (name) => D2.period(name, undefined);
      el.innerHTML = `<div class="fin-filters" data-filters>${UI.skeleton('list', 1)}</div>
        <div data-dash>
          <div data-kpis>${UI.skeleton('kpis', 6)}</div>
          <div class="grid fin-r3">
            ${UI.card({ title: 'Revenue & Margin Snapshot', badge: D2.info('Gross and net revenue, margins and how WonderBites revenue is composed for the selected period and filters.'), actions: sel('snapPeriod'), body: `<div data-snap>${UI.skeleton('card')}</div>` })}
            ${UI.card({ title: 'GMV Trend', badge: D2.info('Cumulative gross merchandise value in this period compared with the previous period of the same length.'), actions: UI.select({ name: 'gmvGran', label: 'Granularity', value: 'daily', options: D2.GRAN }), body: `<div data-gmv>${UI.skeleton('card')}</div>` })}
            ${UI.card({ title: 'Revenue Trend', badge: D2.info('WonderBites revenue against net revenue after payment fees, refunds and credits.'), actions: UI.select({ name: 'revGran', label: 'Granularity', value: 'daily', options: D2.GRAN }), body: `<div data-rev>${UI.skeleton('card')}</div>` })}
          </div>
          <div class="grid fin-r3">
            ${UI.card({ title: 'Payouts & Settlements', actions: sel('payPeriod'), flush: true, body: `<div data-pay>${UI.skeleton('list', 5)}</div>`, footer: `<button type="button" class="lnk" data-kact="ledger-payouts">${esc(t('View all payouts'))}${ic('chev-r', 'flip')}</button>` })}
            ${UI.card({ title: 'Refunds & Adjustments', actions: sel('refPeriod'), flush: true, body: `<div data-ref>${UI.skeleton('list', 5)}</div>`, footer: `<button type="button" class="lnk" data-kact="ledger-refunds">${esc(t('View all refunds'))}${ic('chev-r', 'flip')}</button>` })}
            ${UI.card({ title: 'Financial Trends (Monthly)', badge: D2.info('Monthly GMV, net revenue and commission revenue.'), actions: UI.select({ name: 'months', label: 'Period', value: '6', options: MONTHS }), body: `<div data-mon>${UI.skeleton('card')}</div>` })}
          </div>
          ${UI.card({ title: 'Unit Economics', badge: D2.info('Per-order and per-box economics for the selected filters.'), body: `<div data-ue>${UI.skeleton('kpis', 8)}</div>` })}
        </div>
        ${UI.card({ title: 'Payouts & Refunds Ledger', icon: 'receipt', tone: 'mauve', id: 'fin-ledger', sub: 'Settlement runs and refund requests', actions: UI.btn('Export', { variant: 'secondary', icon: 'upload', size: 'sm', attrs: 'data-act="ledger-export"' }), flush: true, body: '<div class="fin-ltabs" data-ltabs></div><div data-lfilters></div><div data-ltable></div>' })}`;

      const dash = el.querySelector('[data-dash]');
      let loaded = null; // eslint-disable-line no-unused-vars
      let table = null, lf = null;
      /* filters */
      try { if (!OPTS) OPTS = (await api('GET', '/admin/financials/filter-options')).data; }
      catch (e) { el.querySelector('[data-filters]').innerHTML = UI.errorState({ text: e.message }); el.querySelector('[data-filters]').addEventListener('ui:retry', () => ctx.refresh(), { once: true }); }
      if (!el.isConnected) return;
      let filters = null;
      if (OPTS) {
        filters = UI.mountFilters(el.querySelector('[data-filters]'), filtersCfg(), () => { cascade(); load(); });
        cascade(true);
      } else load();
      function filtersCfg() {
        return { clear: false, chips: false, values: F,
          selects: [
            { name: 'country', label: 'All Countries', options: OPTS.countries.map((c) => ({ value: c.value, label: App.loc(c.label) })) },
            { name: 'city', label: 'All Cities', options: OPTS.cities.map((c) => ({ value: c.value, label: App.loc(c.label) })) },
            { name: 'category', label: 'All Categories', options: D2.opts(D2.CATEGORY, OPTS.categories.map((c) => c.value)) },
            { name: 'merchantId', label: 'All Merchants', options: OPTS.merchants.map((m) => ({ value: m.value, label: App.loc(m.label) })) },
            { name: 'branchId', label: 'All Branches', options: [] },
            { name: 'fulfillment', label: 'All Order Types', options: [{ value: 'pickup', label: 'Self-Pickup' }, { value: 'delivery', label: 'Driver Delivery' }] },
          ],
          actions: `<button type="button" class="clear" data-clear>${esc(t('Clear all'))}</button>` };
      }
      /* dependent options: country → cities → merchants → branches */
      function cascade(first) {
        const box = el.querySelector('[data-filters]'); const v = filters.values();
        const setOpts = (name, list, allLabel) => { const s = box.querySelector(`select[name="${name}"]`); const cur = s.value || (first ? F[name] || '' : ''); s.innerHTML = `<option value="">${esc(t(allLabel))}</option>` + list.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join(''); s.value = list.some((o) => o.value === cur) ? cur : ''; };
        const cities = OPTS.cities.filter((c) => !v.country || c.country === v.country);
        setOpts('city', cities.map((c) => ({ value: c.value, label: App.loc(c.label) })), 'All Cities');
        const v2 = filters.values();
        const ms = OPTS.merchants.filter((m) => (!v2.country || m.country === v2.country) && (!v2.city || m.city === v2.city) && (!v2.category || m.category === v2.category));
        setOpts('merchantId', ms.map((m) => ({ value: m.value, label: App.loc(m.label) })), 'All Merchants');
        const m = OPTS.merchants.find((x) => x.value === filters.values().merchantId);
        setOpts('branchId', m ? m.branches.map((b) => ({ value: b.value, label: App.loc(b.label) })) : [], 'All Branches');
        box.querySelector('select[name="branchId"]').disabled = !m;
        const now = filters.values(); Object.keys(F).forEach((k) => delete F[k]); Object.keys(now).forEach((k) => { if (now[k]) F[k] = now[k]; });
        box.querySelector('[data-clear]').hidden = !Object.keys(F).length;
        if (first) load();
      }

      /* dashboard */
      function load() {
        const seq = (dash.__seq = (dash.__seq || 0) + 1);
        ['[data-snap]', '[data-gmv]', '[data-rev]', '[data-mon]'].forEach((s) => (dash.querySelector(s).innerHTML = UI.skeleton('card')));
        dash.querySelector('[data-kpis]').innerHTML = UI.skeleton('kpis', 6);
        dash.querySelectorAll('.msel').forEach((b) => { const o = JSON.parse(b.dataset.options); b.dataset.value = o[b.dataset.select === 'months' ? 1 : 0].value; b.querySelector('span').textContent = t(o[b.dataset.select === 'months' ? 1 : 0].label); });
        api('GET', '/admin/financials/summary', q()).then(({ data }) => {
          if (seq !== dash.__seq || !el.isConnected) return;
          if (data.empty) { loaded = null; dash.querySelector('[data-kpis]').innerHTML = UI.empty({ icon: 'bars', title: 'No financial data for these filters', text: 'Try a different country, city or merchant.', action: UI.btn('Clear all', { variant: 'secondary', size: 'sm', attrs: 'data-clear-all' }) }); ['[data-snap]', '[data-gmv]', '[data-rev]', '[data-pay]', '[data-ref]', '[data-mon]', '[data-ue]'].forEach((s) => (dash.querySelector(s).innerHTML = UI.empty({ icon: 'bars', title: 'No data' }))); return; }
          loaded = data; dashboard(dash, data);
        }).catch((e) => {
          if (seq !== dash.__seq || !el.isConnected) return;
          dash.querySelector('[data-kpis]').innerHTML = UI.errorState({ text: e.message });
          ['[data-snap]', '[data-gmv]', '[data-rev]', '[data-pay]', '[data-ref]', '[data-mon]', '[data-ue]'].forEach((s) => (dash.querySelector(s).innerHTML = ''));
        });
      }
      dash.addEventListener('ui:retry', load);
      UI.on(el, 'click', '[data-clear-all]', () => { el.querySelector('[data-filters] [data-clear]').click(); });

      /* card selectors → section endpoints */
      dash.addEventListener('ui:select', (e) => {
        const { name, value } = e.detail;
        const map = {
          snapPeriod: ['[data-snap]', '/admin/financials/revenue-snapshot', { period: value }, ({ data }) => snapshotHTML(data)],
          gmvGran: ['[data-gmv]', '/admin/financials/gmv-trend', { granularity: value }, ({ data }) => trendHTML(data, 'gmv')],
          revGran: ['[data-rev]', '/admin/financials/revenue-trend', { granularity: value }, ({ data }) => trendHTML(data, 'rev')],
          payPeriod: ['[data-pay]', '/admin/financials/payouts-settlements', { period: value }, ({ data }) => D2.metricRows(data, PAY)],
          refPeriod: ['[data-ref]', '/admin/financials/refunds-adjustments', { period: value }, ({ data }) => D2.metricRows(data, REF)],
          months: ['[data-mon]', '/admin/financials/monthly-trends', { months: value }, ({ data }) => monthlyHTML(data)],
        }[name];
        if (!map) return;
        D2.async(dash.querySelector(map[0]), () => api('GET', map[1], { ...q(), ...map[2] }), map[3], { skeleton: name.endsWith('Period') && name !== 'snapPeriod' ? 'list' : 'card' });
      });

      /* tiles / rows that open the ledger */
      UI.on(el, 'click', '[data-kact]', (e, b) => {
        const [what, status] = b.dataset.kact.split(':');
        if (!/^ledger-/.test(what)) return;
        LEDGER.tab = what.replace('ledger-', ''); LEDGER.status = status || '';
        drawLedger(); document.getElementById('fin-ledger').scrollIntoView({ block: 'start' });
        const tab = el.querySelector('[data-ltabs] [aria-selected="true"]'); if (tab) tab.focus({ preventScroll: true });
      });

      /* ledger */
      function drawLedger() {
        el.querySelector('[data-ltabs]').innerHTML = UI.tabs({ name: 'ledger', label: 'Ledger', active: LEDGER.tab, tabs: [{ id: 'payouts', label: 'Payouts', icon: 'wallet' }, { id: 'refunds', label: 'Refunds', icon: 'refund' }] });
        const isPay = LEDGER.tab === 'payouts';
        /* fresh containers so listeners from the previous tab don't pile up */
        const fbox = el.querySelector('[data-lfilters]'); fbox.innerHTML = '<div></div>';
        const tbox = el.querySelector('[data-ltable]'); tbox.innerHTML = '<div></div>';
        lf = UI.mountFilters(fbox.firstChild, {
          search: { name: 'q', placeholder: isPay ? 'Search by payout ID, merchant or reference' : 'Search by refund ID, order, consumer or merchant' },
          selects: [
            { name: 'status', label: 'All Status', options: D2.statusOpts(isPay ? 'payout' : 'refund') },
            { name: 'merchantId', label: 'All Merchants', options: (OPTS ? OPTS.merchants : []).map((m) => ({ value: m.value, label: App.loc(m.label) })) },
            ...(isPay ? [] : [{ name: 'reason', label: 'All Reasons', options: D2.opts(D2.REASON) }]),
          ],
          values: { status: LEDGER.status || '' },
        }, () => table.setQuery({ page: 1 }));
        table = UI.dataTable(tbox.firstChild, isPay ? payoutTableCfg() : refundTableCfg());
      }
      const payoutTableCfg = () => ({
        pageSize: 8, sort: '-periodTo', caption: 'Payouts',
        columns: [
          { key: 'id', label: 'Payout', sortable: true, render: (r) => `<div class="prod"><div><b>${fmt.id(r.id)}</b><small>${fmt.range(r.periodFrom, r.periodTo)}</small></div></div>` },
          { key: 'merchant', label: 'Merchant', render: (r) => `<b>${D2.loc(r.merchant.name)}</b>` },
          { key: 'gross', label: 'Gross', align: 'end', render: (r) => D2.money(r.gross) },
          { key: 'fees', label: 'Commission & Fees', align: 'end', render: (r) => `<span class="mut">${D2.money({ ...r.commission, amount: r.commission.amount + r.fees.amount })}</span>` },
          { key: 'net', label: 'Net Payout', align: 'end', sortable: true, render: (r) => `<b>${D2.money(r.net)}</b>` },
          { key: 'status', label: 'Status', render: (r) => D2.pill('payout', r.status) },
          { key: 'periodTo', label: 'Paid / Scheduled', sortable: true, render: (r) => `<span class="mut">${r.paidAt ? D2.date(r.paidAt) : r.scheduledAt ? D2.date(r.scheduledAt) : '—'}</span>` },
        ],
        fetch: (qq) => api('GET', '/admin/financials/payouts', { ...api.ctx(), ...lf.values(), ...qq }),
        rowClick: (r) => payoutDrawer(r.id, () => table.reload()),
        rowActions: (r) => [
          { icon: 'eye', label: 'View', run: () => payoutDrawer(r.id, () => table.reload()) },
          ['scheduled', 'pending', 'on_hold'].includes(r.status) ? { icon: 'play', label: 'Process now', run: () => payoutAction(r, 'process', () => table.reload()) } : null,
          ['scheduled', 'pending', 'processing'].includes(r.status) ? { icon: 'pause', label: 'Put on hold', run: () => payoutAction(r, 'hold', () => table.reload()) } : null,
          r.status === 'failed' ? { icon: 'refresh', label: 'Retry payout', run: () => payoutAction(r, 'retry', () => table.reload()) } : null,
          { icon: 'external', label: 'Open full page', run: () => App.go('admin-payout-detail', { id: r.id }) },
        ],
        empty: { icon: 'wallet', title: 'No payouts found', text: 'Try changing the filters or search.' },
      });
      const refundTableCfg = () => ({
        pageSize: 8, sort: '-requestedAt', caption: 'Refunds',
        columns: [
          { key: 'id', label: 'Refund', sortable: true, render: (r) => `<div class="prod"><div><b>${fmt.id(r.id)}</b><small>${esc(t('Order'))} ${fmt.id(r.order.id)}</small></div></div>` },
          { key: 'consumer', label: 'Consumer', render: (r) => `<div class="prod">${UI.avatar(App.loc(r.consumer.name), { size: 28 })}<b>${D2.loc(r.consumer.name)}</b></div>` },
          { key: 'merchant', label: 'Merchant', render: (r) => `<span class="mut">${D2.loc(r.merchant.name)}</span>` },
          { key: 'amount', label: 'Amount', align: 'end', sortable: true, render: (r) => `<b>${D2.money(r.amount)}</b>` },
          { key: 'reason', label: 'Reason', render: (r) => esc(D2.lab(D2.REASON, r.reason)) },
          { key: 'status', label: 'Status', render: (r) => D2.pill('refund', r.status) },
          { key: 'requestedAt', label: 'Requested', sortable: true, render: (r) => `<span class="mut">${D2.dt(r.requestedAt)}</span>` },
        ],
        fetch: (qq) => api('GET', '/admin/financials/refunds', { ...api.ctx(), ...lf.values(), ...qq }),
        rowClick: (r) => refundDrawer(r, () => table.reload()),
        rowActions: (r) => [
          { icon: 'eye', label: 'View', run: () => refundDrawer(r, () => table.reload()) },
          r.status === 'requested' ? { icon: 'check', label: 'Approve refund', run: () => refundAction(r, 'approve', () => table.reload()) } : null,
          r.status === 'requested' ? { icon: 'xc', label: 'Reject refund', danger: true, run: () => refundAction(r, 'reject', () => table.reload()) } : null,
        ],
        empty: { icon: 'refund', title: 'No refunds found', text: 'Try changing the filters or search.' },
      });
      el.addEventListener('ui:tab', (e) => { if (e.detail.name !== 'ledger') return; LEDGER.tab = e.detail.value; LEDGER.status = ''; drawLedger(); });
      UI.on(el, 'click', '[data-act="ledger-export"]', () => Overlays.export({
        scope: LEDGER.tab === 'payouts' ? 'Payouts' : 'Refunds', resource: LEDGER.tab === 'payouts' ? 'admin.payouts' : 'admin.refunds', filters: { ...F, ...(lf ? lf.values() : {}) },
        columns: LEDGER.tab === 'payouts' ? ['Payout', 'Merchant', 'Period', 'Gross', 'Commission', 'Fees', 'Net Payout', 'Status', 'Paid At'] : ['Refund', 'Order', 'Consumer', 'Merchant', 'Amount', 'Reason', 'Status', 'Requested'],
      }));
      drawLedger();
    },
  });

  /* ------------------------------------------------------------ payout detail (drawer + page) */
  function payoutBody(d, o = {}) {
    const p = d.payout;
    const amounts = [['Gross sales', p.gross], ['Commission', { ...p.commission, amount: -p.commission.amount }], ['Payment fees', { ...p.fees, amount: -p.fees.amount }], ['Refunds', { ...p.refunds, amount: -p.refunds.amount }], ['Adjustments', { ...(p.adjustments || p.fees), amount: -((p.adjustments && p.adjustments.amount) || 0) }]];
    const head = `<div class="fin-po-h"><div><span class="d2-sub">${esc(t('Net payout'))}</span><div class="d2-big">${D2.money(p.net)}</div></div>${D2.pill('payout', p.status)}</div>
      ${p.failureReason ? `<div class="fin-alert">${ic('alert')}<span>${esc(D2.tx(p.failureReason))}</span></div>` : ''}`;
    const info = D2.dl([
      ['Payout ID', fmt.id(p.id)], ['Merchant', `<a class="lnk" href="#admin-merchant-detail" data-go="admin-merchant-detail" data-params="${UI.attrJSON({ id: p.merchant.id })}">${D2.loc(p.merchant.name)}${ic('chev-r', 'flip')}</a>`],
      ['Settlement period', fmt.range(p.periodFrom, p.periodTo)], ['Scheduled', p.scheduledAt ? D2.dt(p.scheduledAt) : ''], ['Paid', p.paidAt ? D2.dt(p.paidAt) : ''], ['Bank reference', p.reference ? fmt.id(p.reference) : ''],
    ]);
    const breakdown = `<div class="fin-brk">${amounts.map(([l, m]) => `<div><span>${esc(t(l))}</span><b>${D2.signed(m)}</b></div>`).join('')}<div class="tot"><span>${esc(t('Net payout'))}</span><b>${D2.money(p.net)}</b></div></div>`;
    const lines = `<div class="tbl-wrap"><table class="tbl compact"><caption class="sr-only">${esc(t('Daily lines'))}</caption><thead><tr><th>${esc(t('Date'))}</th><th class="end">${esc(t('Orders'))}</th><th class="end">${esc(t('Gross'))}</th><th class="end">${esc(t('Commission'))}</th><th class="end">${esc(t('Net'))}</th></tr></thead><tbody>${d.lines.map((l) => `<tr><td>${D2.date(l.date, 'short')}</td><td class="end">${fmt.number(l.orders)}</td><td class="end">${D2.money(l.gross, 2)}</td><td class="end mut">${D2.money(l.commission, 2)}</td><td class="end b">${D2.money(l.net, 2)}</td></tr>`).join('')}</tbody></table></div>`;
    if (o.page) return { head, info, breakdown, lines, activity: D2.timeline(d.activity) };
    return `<div class="d2-sect">${head}</div><div class="d2-sect mt-16"><h4>${esc(t('Details'))}</h4>${info}</div><div class="d2-sect mt-16"><h4>${esc(t('Breakdown'))}</h4>${breakdown}</div><div class="d2-sect mt-16"><h4>${esc(t('Daily lines'))}</h4><div class="fin-lines">${lines}</div></div><div class="d2-sect mt-16"><h4>${esc(t('Activity'))}</h4>${D2.timeline(d.activity)}</div>`;
  }
  function payoutActions(p, after, close) {
    const a = [];
    if (['scheduled', 'pending', 'on_hold'].includes(p.status)) a.push({ label: 'Process now', variant: 'primary', icon: 'play', run: async () => { if (await payoutAction(p, 'process', after)) close && close(); } });
    if (['scheduled', 'pending', 'processing'].includes(p.status)) a.push({ label: 'Put on hold', variant: 'secondary', icon: 'pause', run: async () => { if (await payoutAction(p, 'hold', after)) close && close(); } });
    if (p.status === 'failed') a.push({ label: 'Retry payout', variant: 'primary', icon: 'refresh', run: async () => { if (await payoutAction(p, 'retry', after)) close && close(); } });
    return a;
  }
  async function payoutDrawer(id, after) {
    const dr = UI.drawer({ title: t('Payout {id}', { id }), width: 560, body: UI.skeleton('form', 5), actions: [] });
    const fill = async () => {
      try {
        const { data } = await api('GET', '/admin/financials/payouts/' + id);
        if (dr.closed) return;
        dr.body.innerHTML = payoutBody(data);
        const acts = [...payoutActions(data.payout, () => { after && after(); fill(); }), { label: 'Open full page', variant: 'secondary', icon: 'external', run: () => { dr.close(); App.go('admin-payout-detail', { id }); } }];
        setFooter(dr, acts);
      } catch (e) { dr.body.innerHTML = UI.errorState({ text: e.message }); dr.body.addEventListener('ui:retry', fill, { once: true }); }
    };
    fill();
  }
  /* (drawer footers are rebuilt after the content loads) */
  function setFooter(dlg, acts) {
    let f = dlg.el.querySelector('.ov-f'); if (!f) { f = document.createElement('div'); f.className = 'ov-f'; dlg.el.appendChild(f); }
    f.innerHTML = acts.map((a, i) => `<button type="button" class="btn ${a.variant || 'secondary'}" data-fa="${i}">${a.icon ? ic(a.icon) : ''}${esc(t(a.label))}</button>`).join('');
    f.onclick = async (e) => { const b = e.target.closest('[data-fa]'); if (!b) return; b.disabled = true; try { await acts[+b.dataset.fa].run(); } finally { if (b.isConnected) b.disabled = false; } };
  }
  D2.setFooter = setFooter;
  async function payoutAction(p, kind, after) {
    const META = {
      process: { title: 'Process payout now?', text: 'The net amount is sent to the merchant’s bank account in the next settlement run.', confirm: 'Process now', done: 'Payout sent for processing' },
      hold: { title: 'Put payout on hold?', confirm: 'Put on hold', done: 'Payout put on hold', reason: true },
      retry: { title: 'Retry failed payout?', text: 'Make sure the merchant has updated their bank details before retrying.', confirm: 'Retry payout', done: 'Payout retry requested' },
    }[kind];
    let reason;
    if (META.reason) {
      reason = await new Promise((res) => {
        let val = null;
        UI.modal({ title: META.title, size: 'sm', icon: 'pause', tone: 'orange', body: `<form novalidate>${UI.field({ type: 'textarea', name: 'reason', label: 'Reason', required: true, minlength: 5, rows: 3, placeholder: 'e.g. Bank details under verification' })}<p class="faint" style="font-size:12px;margin-top:8px">${esc(t('The merchant is notified that this payout is on hold.'))}</p></form>`,
          actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: META.confirm, variant: 'primary', run: (m) => { const v = UI.validate(m.el.querySelector('form')); if (!v.ok) return false; val = v.values.reason; m.close(true); } }], onClose: () => res(val) });
      });
      if (!reason) return false;
    } else if (!(await UI.confirm({ title: t(META.title), text: t(META.text), confirm: t(META.confirm) }))) return false;
    try { await api('POST', `/admin/financials/payouts/${p.id}/${kind}`, { reason }); UI.toast(t(META.done), { tone: 'success' }); after && after(); return true; }
    catch (e) { D2.fail(e); return false; }
  }

  /* ------------------------------------------------------------ refunds */
  function refundDrawer(r, after) {
    const dr = UI.drawer({ title: t('Refund {id}', { id: r.id }), width: 480,
      body: `<div class="fin-po-h"><div><span class="d2-sub">${esc(t('Refund amount'))}</span><div class="d2-big">${D2.money(r.amount)}</div></div>${D2.pill('refund', r.status)}</div>
        <div class="mt-16">${D2.dl([
          ['Order', `<a class="lnk" href="#admin-orders" data-go="admin-orders" data-params="${UI.attrJSON({ id: r.order.id })}">${fmt.id(r.order.id)}${ic('chev-r', 'flip')}</a>`],
          ['Consumer', `<a class="lnk" href="#admin-consumer-detail" data-go="admin-consumer-detail" data-params="${UI.attrJSON({ id: r.consumer.id })}">${D2.loc(r.consumer.name)}${ic('chev-r', 'flip')}</a>`],
          ['Merchant', D2.loc(r.merchant.name)], ['Reason', esc(D2.lab(D2.REASON, r.reason))], ['Policy outcome', esc(D2.lab(D2.OUTCOME, r.outcome))], ['Refund to', esc(D2.lab(D2.DEST, r.destination))],
          ['Requested', D2.dt(r.requestedAt)], ['Reviewed', r.processedAt ? D2.dt(r.processedAt) : ''], ['Reviewed by', r.processedBy ? esc(r.processedBy.name) : ''], ['Note', r.note ? esc(r.note) : ''],
        ])}</div>`,
      actions: r.status === 'requested' ? [{ label: 'Reject', variant: 'danger', run: async (m) => { if (await refundAction(r, 'reject', after)) m.close(); } }, { label: 'Approve refund', variant: 'primary', icon: 'check', run: async (m) => { if (await refundAction(r, 'approve', after)) m.close(); } }] : [{ label: 'Close', variant: 'secondary', close: true }] });
    return dr;
  }
  async function refundAction(r, kind, after) {
    let reason;
    if (kind === 'approve') { if (!(await UI.confirm({ title: t('Approve refund?'), text: t('{amount} is returned to the consumer’s {dest}.', { amount: fmt.text.money(r.amount), dest: D2.lab(D2.DEST, r.destination).toLowerCase() }), confirm: t('Approve refund') }))) return false; }
    else {
      reason = await new Promise((res) => { let val = null; UI.modal({ title: 'Reject refund?', size: 'sm', icon: 'xc', tone: 'berry', body: `<form novalidate>${UI.field({ type: 'textarea', name: 'reason', label: 'Reason', required: true, minlength: 5, rows: 3, placeholder: 'Explain why the refund is rejected' })}</form>`, actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Reject refund', variant: 'danger', run: (m) => { const v = UI.validate(m.el.querySelector('form')); if (!v.ok) return false; val = v.values.reason; m.close(true); } }], onClose: () => res(val) }); });
      if (!reason) return false;
    }
    try { await api('POST', `/admin/financials/refunds/${r.id}/${kind}`, { reason }); UI.toast(t(kind === 'approve' ? 'Refund approved' : 'Refund rejected'), { tone: 'success' }); after && after(); return true; }
    catch (e) { D2.fail(e); return false; }
  }

  /* ------------------------------------------------------------ payout detail page */
  App.route('admin-payout-detail', {
    nav: 'Financials', title: 'Payout details', subtitle: 'Settlement breakdown, daily lines and activity.',
    exportResource: 'admin.payouts', exportColumns: ['Date', 'Orders', 'Gross', 'Commission', 'Net'],
    render(el, ctx) {
      const id = ctx.params && ctx.params.id;
      if (!id) { el.innerHTML = UI.card({ body: UI.empty({ icon: 'wallet', title: 'No payout selected', text: 'Open a payout from the Financials ledger.', action: UI.btn('Back to Financials', { variant: 'primary', go: 'admin-financials', params: { ledger: 'payouts' } }) }) }); return; }
      const draw = () => D2.async(el, () => api('GET', '/admin/financials/payouts/' + id), ({ data }) => {
        const b = payoutBody(data, { page: true });
        D2.setTitle(`${esc(t('Payout'))} ${fmt.id(data.payout.id)}`);
        return `<div class="d2-pagehead">${D2.back('Back to Financials', 'admin-financials', { ledger: 'payouts' })}<span class="sp"></span><span data-acts></span></div>
          <div class="grid" style="grid-template-columns:minmax(0,1fr) 380px">
            <div class="grid" style="align-content:start">${UI.card({ title: 'Summary', icon: 'wallet', tone: 'mauve', body: b.head + '<div class="mt-16">' + b.info + '</div>' })}${UI.card({ title: 'Daily lines', icon: 'cal', tone: 'rose', flush: true, body: b.lines })}</div>
            <div class="grid" style="align-content:start">${UI.card({ title: 'Breakdown', icon: 'receipt', tone: 'orange', body: b.breakdown })}${UI.card({ title: 'Activity', icon: 'clock', tone: 'lime', body: b.activity })}</div>
          </div>`;
      }, { skeleton: 'cards', n: 3, after: (root, res) => {
        const acts = payoutActions(res.data.payout, draw);
        root.querySelector('[data-acts]').innerHTML = acts.map((a, i) => UI.btn(a.label, { variant: a.variant, icon: a.icon, attrs: `data-pa="${i}"` })).join('');
        UI.on(root, 'click', '[data-pa]', async (e, b) => { b.disabled = true; await acts[+b.dataset.pa].run(); if (b.isConnected) b.disabled = false; });
      } });
      draw();
    },
  });

  UI.css('d2-fin', `
    .fin-r3{grid-template-columns:repeat(3,minmax(0,1fr))}
    .fin-filters .fr>.inp.sel{flex:1 1 130px;min-width:0;width:auto}
    .fin-filters .fr{flex-wrap:nowrap!important}
    .fin-snap{display:grid;gap:16px}
    .fin-snap-m{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px}
    .fin-snap-m>div{display:flex;flex-direction:column;gap:3px;min-width:0;align-items:flex-start}
    .fin-snap-m>div>span{font-size:11.5px;color:var(--muted);display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
    .fin-snap-m>div>span i{width:8px;height:8px;border-radius:50%;flex:none}
    .fin-snap-m b{font-size:15px;font-weight:700;white-space:nowrap}
    .fin-snap-d{border-top:1px solid var(--line-soft);padding-block-start:12px}
    .fin-snap-d .d2-h4{margin-block-end:8px;font-size:12.5px}
    .fin-snap-d .donut-c b{font-size:13px}
    .fin-snap-d .donut-c span{font-size:10px}
    .fin-ue{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    .fin-ltabs{padding:0 var(--pad)}
    [data-lfilters] .fbar{padding:14px var(--pad) 0}
    [data-lfilters]+[data-ltable]{margin-block-start:12px}
    .fin-po-h{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .fin-alert{display:flex;gap:8px;align-items:center;margin-block-start:12px;padding:10px 12px;border-radius:12px;background:var(--tint-berry);color:var(--neg);font-size:12.5px;font-weight:600}
    .fin-alert svg.i{width:16px;height:16px;flex:none}
    .fin-brk{display:grid;gap:0;font-size:13px}
    .fin-brk>div{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid var(--line-soft)}
    .fin-brk>div:first-child{border-top:0}
    .fin-brk span{color:var(--muted)}
    .fin-brk .tot{border-top:1px solid var(--line-2);font-size:14px}
    .fin-brk .tot span{color:var(--text);font-weight:600}
    .fin-lines{max-height:280px;overflow:auto;border:1px solid var(--line-soft);border-radius:12px}
    .mt-16{margin-block-start:16px}
    @media (max-width:1360px){ .d2-kg .d2-k-v{font-size:17px} .fin-ue{grid-template-columns:repeat(4,minmax(0,1fr))} }
  `);
})();
