/* =====================================================================
   Admin · Operations Analytics (owner: D2)
   Route: admin-operations
   API: GET /admin/analytics/operations · GET /admin/analytics/operations/{section}?granularity&period
        section ∈ operational-trends | fulfilment-funnel | marketplace-health | pickup-cancellation-health |
                  quality-signals | drop-accuracy-trend | operations-summary
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc, ic = UI.icon;

  const KPI = {
    fulfilmentRate: { icon: 'checkc', tone: 'rose' }, pickupCompletionRate: { icon: 'package', tone: 'lime', go: 'admin-pickups' }, dropAccuracy: { icon: 'pin', tone: 'orange', go: 'admin-performance-report' },
    merchantCancellationRate: { icon: 'store', tone: 'mauve', go: 'admin-orders', params: { status: 'cancelled' } }, noShowRate: { icon: 'users', tone: 'rose', go: 'admin-pickups', params: { status: 'missed' } }, openCriticalIssues: { icon: 'alert', tone: 'rose', go: 'admin-issues', params: { tab: 'issues', severity: 'critical' } },
    ordersAtRisk: { icon: 'alert', tone: 'orange', go: 'admin-orders' }, customerCancellationRate: { icon: 'user', tone: 'mauve', go: 'admin-orders', params: { status: 'cancelled' } }, refundRate: { icon: 'refund', tone: 'rose', go: 'admin-financials', params: { ledger: 'refunds' } },
    verificationSuccess: { icon: 'qr', tone: 'mauve', go: 'admin-pickups' }, merchantActivationRate: { icon: 'store', tone: 'lime', go: 'admin-merchants' }, platformUptime: { icon: 'activity', tone: 'rose' },
  };
  const MH = { activeMerchants: { icon: 'store', tone: 'rose', go: 'admin-merchants' }, merchantsListingToday: { icon: 'bag', tone: 'orange', go: 'admin-drops' }, activeConsumers: { icon: 'users', tone: 'mauve', go: 'admin-consumers' }, liveDrops: { icon: 'radio', tone: 'mauve', go: 'admin-drops', params: { status: 'live' } }, sellThroughRate: { icon: 'trend', tone: 'orange' }, averageRating: { icon: 'star', tone: 'green' } };
  const PC = { pickupCompletion: { icon: 'checkc', tone: 'green', go: 'admin-pickups' }, merchantCancellations: { icon: 'store', tone: 'rose', go: 'admin-orders', params: { status: 'cancelled' } }, customerCancellations: { icon: 'user', tone: 'mauve', go: 'admin-orders', params: { status: 'cancelled' } }, noShows: { icon: 'clock', tone: 'orange', go: 'admin-pickups', params: { status: 'missed' } }, refundRate: { icon: 'refund', tone: 'rose', go: 'admin-financials', params: { ledger: 'refunds' } }, ordersAtRisk: { icon: 'alert', tone: 'orange', go: 'admin-orders' } };
  const QS = { temperatureAlerts: { icon: 'fire', tone: 'orange', go: 'admin-issues', params: { tab: 'alerts' } }, pickupDelays: { icon: 'clock', tone: 'rose', go: 'admin-issues', params: { tab: 'issues' } }, listingMismatches: { icon: 'bag', tone: 'mauve', go: 'admin-moderation' }, verificationFailures: { icon: 'qr', tone: 'rose', go: 'admin-pickups', params: { status: 'flagged' } }, openComplaints: { icon: 'chat', tone: 'orange', go: 'admin-support' }, criticalEscalations: { icon: 'flag', tone: 'berry', go: 'admin-issues', params: { tab: 'issues', severity: 'critical' } } };
  const SUM = { avgFulfilmentTime: ['clock', 'rose'], avgPickupDelay: ['clock', 'orange'], pickupsCompleted: ['checkc', 'lime'], ordersProcessed: ['clipboard', 'mauve'], ratedOrders: ['star', 'rose'], verificationAttention: ['qr', 'orange'], wasteDiverted: ['recycle', 'lime'], mealsSaved: ['leaf', 'mauve'] };
  const FUN_TONE = ['r', 'm', ''];
  const FUN_IC = [['cal', 'rose'], ['package', 'mauve'], ['star', 'green']];

  const trendsHTML = (d) => {
    const s = d.series; const lab = s[0].points.map((p) => p.x);
    const rates = s[2].points.map((p) => p.y);
    const lo = Math.max(0, Math.floor(Math.min(...rates) / 5) * 5 - 5);
    return D2.combo({ labels: lab, bars: [{ name: s[0].label, values: s[0].points.map((p) => p.y), color: 'rose' }, { name: s[1].label, values: s[1].points.map((p) => p.y), color: 'mauve' }],
      line: { name: s[2].label, values: rates, color: 'green', min: lo, max: 100, ticks: [lo, Math.round((lo + 100) / 2), 100], format: (v) => v + '%' }, width: 360, height: 220, barWidth: s[0].points.length > 14 ? 3 : 8 }) + D2.totals(d.totals);
  };
  const funnelHTML = (f) => `<div class="d2-bars">${f.steps.map((st, i) => D2.bar(`<span class="d2-mi t-${FUN_IC[i][1]}">${ic(FUN_IC[i][0])}</span><span><span style="display:block">${esc(t(st.label))}</span><b style="font-size:15px;color:var(--text)">${fmt.number(st.value)}</b></span>`, fmt.pct(st.rate, { dec: 1 }), st.rate, FUN_TONE[i])).join('')}</div>
    <div class="ops-conv"><span>${esc(t(f.conversionLabel))}</span><b>${fmt.pct(f.conversion, { dec: 1 })}</b>${D2.delta({ key: 'c', delta: f.delta, deltaUnit: 'pp' })}</div>`;
  const accHTML = (d) => {
    const s = d.series[0]; const pts = s.points;
    const wk = d.week ? fmt.range(d.week.from, d.week.to) : '';
    return Charts.area({ series: [{ ...s, color: 'rose' }], min: 90, max: 100, yTicks: [90, 95, 100], yFormat: (v) => v + '%', width: 360, height: 200, legend: false, labelEvery: D2.every(pts.length), label: 'Drop Accuracy Trend' }) +
      D2.totals(d.totals, { showComparison: true, labelHtml: (k) => (k.key === 'currentWeek' && wk ? `${esc(t(k.label))} (${wk})` : esc(t(k.label))) });
  };
  const summaryHTML = (list) => `<div class="grid d2-kg ops-sum">${list.map((k) => D2.kpi(k, { icon: (SUM[k.key] || [])[0], tone: (SUM[k.key] || [])[1], compact: true, foot: '' })).join('')}</div>`;

  App.route('admin-operations', {
    nav: 'Operations Analytics', title: 'Operations Analytics', subtitle: 'Track platform operational performance and health.',
    exportResource: 'admin.operations', exportColumns: ['Metric', 'Value', 'Change', 'Period'],
    render(el) {
      el.classList.add('d2-page');
      const per = (n) => D2.period(n);
      el.innerHTML = `<div data-kpis>${UI.skeleton('kpis', 6)}</div>
        <div class="grid ops-r3">
          ${UI.card({ title: 'Operational Trends', badge: D2.info('Daily orders and completed pickups (bars) with the fulfilment rate (line).'), actions: UI.select({ name: 'operational-trends', label: 'Granularity', value: 'daily', options: D2.GRAN }), body: `<div data-sec="operational-trends">${UI.skeleton('card')}</div>` })}
          ${UI.card({ title: 'Fulfilment Funnel', badge: D2.info('How many reservations were picked up and then rated.'), actions: per('fulfilment-funnel'), body: `<div data-sec="fulfilment-funnel">${UI.skeleton('card')}</div>` })}
          ${UI.card({ title: 'Marketplace Health', actions: per('marketplace-health'), flush: true, body: `<div data-sec="marketplace-health">${UI.skeleton('list', 6)}</div>` })}
        </div>
        <div class="grid ops-r3">
          ${UI.card({ title: 'Pickup & Cancellation Health', actions: per('pickup-cancellation-health'), flush: true, body: `<div data-sec="pickup-cancellation-health">${UI.skeleton('list', 6)}</div>` })}
          ${UI.card({ title: 'Quality & Incident Signals', actions: per('quality-signals'), flush: true, body: `<div data-sec="quality-signals">${UI.skeleton('list', 6)}</div>` })}
          ${UI.card({ title: 'Drop Accuracy Trend', badge: D2.info('Share of drops whose contents matched the listing, checked at pickup.'), actions: UI.select({ name: 'drop-accuracy-trend', label: 'Granularity', value: 'daily', options: D2.GRAN }), body: `<div data-sec="drop-accuracy-trend">${UI.skeleton('card')}</div>` })}
        </div>
        ${UI.card({ title: 'Operations Summary', badge: D2.info('Headline operations figures for the selected period.'), actions: per('operations-summary'), body: `<div data-sec="operations-summary">${UI.skeleton('kpis', 8)}</div>` })}`;
      const RENDER = {
        'operational-trends': trendsHTML, 'fulfilment-funnel': funnelHTML, 'marketplace-health': (d) => D2.metricRows(d, MH),
        'pickup-cancellation-health': (d) => D2.metricRows(d, PC), 'quality-signals': (d) => D2.metricRows(d, QS), 'drop-accuracy-trend': accHTML, 'operations-summary': summaryHTML,
      };
      const KEY = { 'operational-trends': 'operationalTrends', 'fulfilment-funnel': 'fulfilmentFunnel', 'marketplace-health': 'marketplaceHealth', 'pickup-cancellation-health': 'pickupCancellationHealth', 'quality-signals': 'qualitySignals', 'drop-accuracy-trend': 'dropAccuracyTrend', 'operations-summary': 'operationsSummary' };
      const load = () => {
        const k = el.querySelector('[data-kpis]');
        D2.async(k, () => api('GET', '/admin/analytics/operations', api.ctx()), ({ data }) => {
          Object.keys(RENDER).forEach((sec) => { el.querySelector(`[data-sec="${sec}"]`).innerHTML = RENDER[sec](data[KEY[sec]]); });
          return D2.kpiGrid(data.kpis, KPI, 6);
        }, { skeleton: 'kpis', n: 6 }).then((r) => { if (r === null && el.isConnected) Object.keys(RENDER).forEach((sec) => (el.querySelector(`[data-sec="${sec}"]`).innerHTML = '')); });
      };
      load();
      el.addEventListener('ui:select', (e) => {
        const sec = e.detail.name; if (!RENDER[sec]) return;
        const isGran = ['operational-trends', 'drop-accuracy-trend'].includes(sec);
        D2.async(el.querySelector(`[data-sec="${sec}"]`), () => api('GET', '/admin/analytics/operations/' + sec, { ...api.ctx(), [isGran ? 'granularity' : 'period']: e.detail.value }), ({ data }) => RENDER[sec](data), { skeleton: RENDER[sec] === summaryHTML ? 'kpis' : isGran || sec === 'fulfilment-funnel' ? 'card' : 'list', n: 6 });
      });
    },
  });

  UI.css('d2-ops', `
    .ops-r3{grid-template-columns:repeat(3,minmax(0,1fr))}
    .ops-conv{display:flex;align-items:center;gap:8px;margin-block-start:16px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card-2);font-size:12px}
    .ops-conv span{flex:1;color:var(--muted)}
    .ops-conv b{font-size:14px}
    .ops-sum{grid-template-columns:repeat(8,minmax(0,1fr));gap:12px}
    @media (max-width:1360px){ .ops-sum{grid-template-columns:repeat(4,minmax(0,1fr))} }
  `);
})();
