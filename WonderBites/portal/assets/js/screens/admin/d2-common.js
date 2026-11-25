/* =====================================================================
   D2 shared helpers — Admin business & analytics (owner: D2)
   Kind-specific status pills (never touch the global registry), contract Kpi tiles,
   metric rows, period selects, info popovers, guarded async blocks, combo chart,
   detail lists, timelines and API-error → form mapping.
   ===================================================================== */
(function () {
  'use strict';
  const esc = (s) => UI.esc(s);
  const ic = (n, c) => UI.icon(n, c);
  const D2 = (window.D2 = window.D2 || {});
  const N = (s) => `<span class="num">${s}</span>`;
  D2.esc = esc;

  /* ---------------- status pills per entity kind: enum → [English label, tone, icon] ---------------- */
  const ST = {
    payout: { scheduled: ['Scheduled', 'm', 'cal'], pending: ['Pending', 'o', 'clock'], processing: ['Processing', 'm', 'loader'], paid: ['Paid', 'g', 'checkc'], failed: ['Failed', 'r', 'xc'], on_hold: ['On Hold', 'o', 'pause'] },
    refund: { requested: ['Requested', 'o', 'clock'], approved: ['Approved', 'g', 'checkc'], rejected: ['Rejected', 'r', 'xc'], processed: ['Processed', 'g', 'checkc'], failed: ['Failed', 'r', 'alert'] },
    wallet: { active: ['Active', 'g', 'checkc'], frozen: ['Frozen', 'm', 'pause'], blocked: ['Blocked', 'r', 'ban'] },
    voucher: { draft: ['Draft', 'n', 'edit'], scheduled: ['Scheduled', 'm', 'cal'], active: ['Active', 'g', 'checkc'], frozen: ['Frozen', 'r', 'pause'], expired: ['Expired', 'n', 'clock'], exhausted: ['Exhausted', 'o', 'minus'] },
    cert: { valid: ['Valid', 'g', 'checkc'], expiring_soon: ['Expiring Soon', 'o', 'clock'], expired: ['Expired', 'r', 'alert'], missing: ['Missing', 'r', 'xc'], pending_review: ['Pending Review', 'm', 'clock'], rejected: ['Rejected', 'r', 'xc'] },
    compliance: { compliant: ['Compliant', 'g', 'checkc'], expiring_soon: ['Expiring Soon', 'o', 'clock'], expired: ['Expired', 'r', 'alert'], non_compliant: ['Non-Compliant', 'r', 'xc'], under_review: ['Under Review', 'm', 'clock'] },
    quality: { excellent: ['Excellent', 'g', 'checkc'], good: ['Good', 'g', 'check'], watch: ['Watch', 'o', 'alert'], needs_review: ['Needs Review', 'r', 'flag'] },
  };
  D2.ST = ST;
  D2.pill = (kind, status) => { const m = (ST[kind] || {})[status]; return m ? UI.pill(status, { label: m[0], tone: m[1], icon: m[2] }) : UI.pill(status); };
  D2.statusOpts = (kind, only) => Object.keys(ST[kind]).filter((k) => !only || only.includes(k)).map((k) => ({ value: k, label: ST[kind][k][0] }));

  /* ---------------- labels ---------------- */
  D2.CATEGORY = { bakery: 'Bakery', restaurant: 'Restaurant', grocery: 'Grocery', cafe: 'Café', desserts: 'Desserts', meals: 'Meals', produce: 'Produce', prepared_foods: 'Prepared Foods', deli: 'Deli', meat_poultry: 'Meat & Poultry', beverages: 'Beverages', other: 'Other' };
  D2.CITY = Markets.cityProxy(); // (v1.3) cities of the selected market(s), from the registry
  D2.SOURCE = { promotional: 'Promotional', refund: 'Refund', compensation: 'Compensation', referral: 'Referral', adjustment: 'Adjustment' };
  D2.TXN = { credit: 'Credit', debit: 'Debit', adjustment: 'Adjustment', refund: 'Refund', expiry: 'Expiry', voucher: 'Voucher' };
  D2.VTYPE = { percentage: 'Percentage', fixed: 'Fixed', free_bag: 'Free bag' };
  D2.AUDIENCE = { all_users: 'All users', new_users: 'New users', star_users: 'Star users', premium_users: 'Premium users', merchants: 'Merchants' };
  D2.CERT = { food_safety: 'Food Safety Certificate', trade_license: 'Trade License', health_permit: 'Health Permit', halal: 'Halal Certificate', hygiene_training: 'Hygiene Training', other: 'Other document' };
  D2.REASON = { store_closed: 'Store closed', box_unavailable: 'Box unavailable', serious_food_concern: 'Serious food concern', app_payment_issue: 'App / payment issue', missed_collection: 'Missed collection', late_cancellation: 'Late cancellation', change_of_mind: 'Change of mind', personal_preference: 'Personal preference', wrong_location: 'Wrong location' };
  D2.OUTCOME = { full_refund: 'Full refund', partial_refund: 'Partial refund', wallet_credit: 'Wallet credit', manual_review: 'Manual review', no_refund: 'No refund' };
  D2.DEST = { original_payment: 'Original payment', wallet_credit: 'Wallet credit' };
  D2.SEV = { critical: ['Critical', 'r'], high: ['Warning', 'o'], medium: ['Information', 'm'], low: ['Low', 'g'] };
  D2.lab = (map, k) => t(map[k] || String(k == null ? '—' : k).replace(/_/g, ' '));
  D2.opts = (map, keys) => (keys || Object.keys(map)).map((k) => ({ value: k, label: map[k] }));
  D2.loc = (x) => esc(App.loc(x));
  /** data text: translate seeded phrases we know, leave user-entered text as typed */
  D2.tx = (s) => (s == null ? '' : I18N.has(String(s)) ? t(String(s)) : String(s));

  /* ---------------- formatting ---------------- */
  const grp = (v, d) => fmt.text.number(v, d);
  D2.money = (m, dec) => (m == null ? '—' : typeof m === 'number' ? fmt.money(m, undefined, dec) : fmt.money(m.amount, m.currency || undefined, dec != null ? dec : Math.abs(m.amount) < 100 && m.amount % 1 ? 2 : 0));
  D2.signed = (m) => { const a = m.amount; return `<span class="${a < 0 ? 'neg' : a > 0 ? 'pos' : ''}">${a > 0 ? N('+') : a < 0 ? N('−') : ''}${D2.money({ ...m, amount: Math.abs(a) })}</span>`; };
  D2.date = (iso, s) => (iso ? fmt.date(String(iso).slice(0, 10), s) : '—');
  D2.dt = (iso) => (iso ? `${fmt.date(String(iso))}${App.state.lang === 'ar' ? '،' : ','} ${fmt.clock(iso)}` : '—');
  /** Kpi value — like fmt.kpi but keeps decimals that matter (99.98%, 0.20%, QAR 3.09) */
  D2.val = (k) => {
    const v = k.value;
    if (v == null) return '—';
    if (k.format === 'percent') return N(grp(v, Math.abs(v) < 1 || Math.round(v * 100) % 10 ? 2 : 1) + '%');
    if (k.format === 'money') return fmt.money(v, k.currency || undefined, Math.abs(v) < 100 && v % 1 ? 2 : 0);
    if (k.format === 'days') return `${N(grp(v, v % 1 ? 1 : 0))} ${esc(t(v === 1 ? 'day' : 'days'))}`;
    if (k.format === 'duration_minutes') return `${N(grp(v, 0))} ${esc(t('min'))}`;
    if (k.format === 'number' && Math.abs(v) >= 10000) return fmt.compact(v);
    return fmt.kpi(k);
  };
  /** Kpi delta text (plain) — '+16.4%', '+4.1pp', '+0.2', '−2 min', '−0.6 days' */
  D2.deltaText = (k) => {
    if (k.delta == null) return '';
    const d = Number(k.delta); const s = d > 0 ? '+' : d < 0 ? '−' : ''; const a = Math.abs(d); const u = k.deltaUnit || 'pct';
    if (u === 'pct') return s + grp(a, a % 1 ? 1 : 0) + '%';
    if (u === 'pp') return s + grp(a, a < 0.1 ? 2 : a % 1 ? 2 : 1).replace(/(\.\d)0$/, '$1') + 'pp';
    if (u === 'abs') return s + grp(a, a % 1 ? 1 : 0);
    if (u === 'minutes') return s + grp(a, 0) + ' ' + t('min');
    return s + grp(a, a % 1 ? 1 : 0) + ' ' + t(u);
  };
  /* keys where a falling number is good news */
  const DOWN_GOOD = new Set(['refundValue', 'refundAmount', 'refundRate', 'cancellationValue', 'chargebacks', 'chargebackRate', 'failedHeld', 'avgSettlementDays', 'merchantCancellationRate', 'noShowRate', 'openCriticalIssues', 'ordersAtRisk', 'customerCancellationRate', 'temperatureAlerts', 'pickupDelays', 'listingMismatches', 'verificationFailures', 'openComplaints', 'criticalEscalations', 'merchantCancellations', 'customerCancellations', 'noShows', 'avgFulfilmentTime', 'avgPickupDelay', 'verificationAttention', 'paymentFeePerOrder', 'mismatches', 'nonCompliant', 'expiringCertificates']);
  D2.good = (k) => { if (k.delta == null || k.delta === 0) return null; return DOWN_GOOD.has(k.key) ? k.delta < 0 : k.delta > 0; };
  D2.delta = (k, o = {}) => {
    if (k.delta == null) return '';
    const d = Number(k.delta); const good = o.good != null ? o.good : D2.good(k);
    const cls = d === 0 ? 'flat' : good ? 'up' : 'dn';
    return `<span class="dl ${cls}">${d === 0 ? '' : ic(d > 0 ? 'up' : 'down')}${N(esc(D2.deltaText(k)))}</span>`;
  };

  /* ---------------- KPI tile (icon on top, 2-line label — fits 6-up grids at 1280px) ---------------- */
  D2.kpi = (k, o = {}) => {
    const tone = o.tone || 'rose';
    const go = o.go ? ` data-go="${esc(o.go)}" role="link" tabindex="0"${o.params ? ` data-params="${UI.attrJSON(o.params)}"` : ''}` : o.act ? ` data-kact="${esc(o.act)}" role="button" tabindex="0"` : '';
    const foot = o.foot != null ? o.foot : esc(t(k.caption || k.comparison || ''));
    return `<section class="cd kpi nospark d2-k tone-${tone}${o.compact ? ' sm' : ''}"${go}><div class="cd-b">${o.compact ? '' : `<span class="cd-ic t-${tone === 'lime' ? 'green' : tone}">${ic(o.icon || 'activity')}</span>`}<span class="d2-k-l">${o.compact && o.icon ? `<span class="d2-k-i t-${tone === 'lime' ? 'green' : tone}">${ic(o.icon)}</span>` : ''}<span>${esc(t(o.label || k.label))}</span></span><div class="d2-k-v">${o.value || D2.val(k)}</div><div class="k-f">${D2.delta(k)}${foot ? `<span>${foot}</span>` : ''}</div></div></section>`;
  };
  D2.kpiGrid = (kpis, map = {}, cols = 6, o = {}) => `<div class="grid d2-kg" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${kpis.map((k) => D2.kpi(k, { ...(map[k.key] || {}), compact: o.compact })).join('')}</div>`;

  /* ---------------- metric rows (Payouts & Settlements, Marketplace Health …) ---------------- */
  D2.metricRows = (kpis, map = {}) => `<div class="d2-mrows">${kpis.map((k) => {
    const m = map[k.key] || {};
    const inner = `<span class="d2-mi t-${m.tone || 'rose'}">${ic(m.icon || 'activity')}</span><span class="d2-ml">${esc(t(m.label || k.label))}</span><span class="d2-mvw"><b class="d2-mv">${D2.val(k)}</b>${k.delta == null || k.delta === 0 ? `<span class="faint">${k.delta === 0 ? '—' : ''}</span>` : D2.delta(k)}</span>`;
    if (m.go) return `<button type="button" class="d2-mr lnkrow" data-go="${esc(m.go)}"${m.params ? ` data-params="${UI.attrJSON(m.params)}"` : ''}>${inner}</button>`;
    if (m.act) return `<button type="button" class="d2-mr lnkrow" data-kact="${esc(m.act)}">${inner}</button>`;
    return `<div class="d2-mr">${inner}</div>`;
  }).join('')}</div>`;

  /* mini stat boxes under a chart */
  D2.totals = (kpis, o = {}) => `<div class="d2-tot" style="grid-template-columns:repeat(${kpis.length},minmax(0,1fr))">${kpis.map((k) => `<div><span>${o.labelHtml ? o.labelHtml(k) : esc(t(k.label))}</span><b>${D2.val(k)}</b>${k.delta != null ? `<div>${D2.delta(k)}</div>` : ''}${k.comparison && o.showComparison ? `<small>${fmt.iso(esc(/[A-Za-z]/.test(k.comparison) ? t(k.comparison) : k.comparison))}</small>` : ''}</div>`).join('')}</div>`;

  /* ---------------- selects / info ---------------- */
  D2.PERIODS = [{ value: 'this_period', label: 'This Period' }, { value: 'last_period', label: 'Previous Period' }, { value: 'this_month', label: 'This Month' }, { value: 'this_week', label: 'This Week' }];
  D2.GRAN = [{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }];
  D2.period = (name, value, options) => UI.select({ name, label: 'Period', value: value || (options || D2.PERIODS)[0].value, options: options || D2.PERIODS });
  D2.info = (text) => `<button type="button" class="d2-info" data-info="${esc(text)}" aria-label="${esc(t('About this card'))}">${ic('info')}</button>`;
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.d2-info'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    UI.popover(b, `<div class="d2-tip" role="note">${esc(t(b.dataset.info))}</div>`, { label: t('About this card'), align: 'start' });
  });
  /* keyboard for clickable tiles */
  document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.d2-k[data-go],.d2-k[data-kact]')) { e.preventDefault(); e.target.click(); } });

  /** UI.async guarded against stale responses; renders through renderFn unless o.isEmpty says otherwise */
  D2.async = (el, fetcher, renderFn, o = {}) => {
    const seq = (el.__d2seq = (el.__d2seq || 0) + 1);
    const fresh = () => seq === el.__d2seq;
    return UI.async(el, fetcher, (res) => (fresh() ? renderFn(res) : el.innerHTML), { isEmpty: () => false, ...o, after: o.after ? (e, r) => fresh() && o.after(e, r) : undefined });
  };

  /* ---------------- definition list, timeline, back link ---------------- */
  D2.dl = (rows) => `<dl class="d2-dl">${rows.filter(Boolean).map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${v == null || v === '' ? '<span class="faint">—</span>' : v}</dd>`).join('')}</dl>`;
  const ACT = {
    created: 'Payout created for settlement period', paid: 'Transferred to merchant bank account', failed: 'Transfer failed: IBAN rejected by receiving bank', hold: 'Placed on hold', process: 'Processed manually', retry: 'Retry requested',
    onboarded: 'Added to compliance monitoring', inspection: 'Inspection recorded: {score}/{max}', status_override: 'Status changed to {status}',
    certificate_uploaded: 'Certificate uploaded: {doc}', certificate_updated: 'Certificate updated: {doc}', certificate_deleted: 'Certificate deleted: {doc}', certificate_approved: 'Certificate approved: {doc}', certificate_rejected: 'Certificate rejected: {doc}',
    warn: 'Warning sent to merchant', request_documents: 'Documents requested', schedule_inspection: 'Inspection scheduled', suspend: 'Merchant suspended from listing', clear: 'Marked compliant',
  };
  const actLabel = (a) => {
    const m = a.meta || {}; if (!ACT[a.action]) return fmt.iso(esc(t(a.label)));
    if (a.action === 'hold' && !m.note && /compliance/i.test(a.label)) m.note = t('Compliance review in progress');
    let s = esc(t(ACT[a.action], { score: m.score, max: m.max, doc: D2.lab(D2.CERT, m.doc), status: m.status ? t((ST.compliance[m.status] || [m.status])[0]) : '' }));
    s = fmt.iso(s);
    if (m.dueAt) s += ` · ${esc(t('due'))} ${D2.date(m.dueAt)}`;
    if (m.note) s += ` — <span class="d2-tl-n">${esc(m.note)}</span>`;
    return s;
  };
  D2.timeline = (acts) => (acts && acts.length ? `<ol class="d2-tl">${acts.map((a) => `<li><span class="d2-tl-d" aria-hidden="true"></span><div><b>${actLabel(a)}</b><small>${a.actor ? esc(a.actor.id === 'system' ? t('System') : a.actor.name) + ' · ' : ''}${D2.dt(a.at)}</small></div></li>`).join('')}</ol>` : UI.empty({ icon: 'clock', title: 'No activity yet' }));
  D2.back = (label, route, params) => `<a class="d2-back" href="#${esc(route)}" data-go="${esc(route)}"${params ? ` data-params="${UI.attrJSON(params)}"` : ''}>${ic('arrow-l', 'flip')}<span>${esc(t(label))}</span></a>`;
  D2.setTitle = (html) => { const h = document.querySelector('.top h1'); if (h) h.innerHTML = html; };

  /* API error → toast + inline field errors */
  D2.fail = (e, form) => {
    const msg = (e && e.message) || 'Something went wrong. Please try again.';
    if (form && e && e.details) {
      let first = null;
      Object.keys(e.details).forEach((k) => {
        const c = form.querySelector(`[name="${k}"], [data-drop="${k}"], [data-field="${k}"] input`); const f = c && c.closest('.fld'); if (!f) return;
        f.classList.add('invalid'); const er = f.querySelector('.err'); if (er) er.textContent = t(msg); c.setAttribute('aria-invalid', 'true'); first = first || c;
      });
      if (first && first.focus) first.focus();
    }
    UI.toast(t(msg), { tone: 'error' });
  };
  D2.fieldErr = (form, name, msg) => { const c = form.querySelector(`[name="${name}"]`); const f = c && c.closest('.fld'); if (!f) return; f.classList.add('invalid'); const e = f.querySelector('.err'); if (e) e.textContent = t(msg); c.setAttribute('aria-invalid', 'true'); c.focus(); };

  /* ---------------- combo chart: grouped bars (left axis) + line (right axis, e.g. %) ---------------- */
  D2.combo = (o) => {
    const W0 = o.width || 600, H = o.height || 230, L = 40, R = 40, T = 10, B = 26; const w = W0 - L - R, h = H - T - B;
    const labels = o.labels || []; const n = labels.length;
    const max = Math.max(1, ...o.bars.flatMap((s) => s.values));
    const ticks = Charts.niceTicks(0, max); const tmax = ticks[ticks.length - 1];
    const lmin = o.line.min != null ? o.line.min : 0, lmax = o.line.max != null ? o.line.max : 100;
    const Y = (v) => T + h - (v / tmax) * h; const YL = (v) => T + h - ((v - lmin) / (lmax - lmin || 1)) * h;
    const bw = w / n; const k = o.bars.length; const barW = Math.min(o.barWidth || 7, (bw * 0.72) / k);
    const yf = o.yFormat || ((v) => fmt.text.compact(v));
    const lticks = o.line.ticks || [lmin, lmin + (lmax - lmin) / 2, lmax];
    let g = ticks.map((v) => `<line class="gl" x1="${L}" x2="${W0 - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="ax" x="${L - 8}" y="${Y(v) + 3.5}" text-anchor="end">${esc(yf(v))}</text>`).join('');
    g += lticks.map((v) => `<text class="ax" x="${W0 - R + 8}" y="${YL(v) + 3.5}" text-anchor="start">${esc((o.line.format || ((x) => x + '%'))(v))}</text>`).join('');
    let bars = '';
    for (let i = 0; i < n; i++) {
      const cx = L + i * bw + bw / 2;
      o.bars.forEach((s, j) => { const v = s.values[i] || 0; const x = cx - (barW * k + 2 * (k - 1)) / 2 + j * (barW + 2); bars += `<rect class="grow" style="animation-delay:${i * 25 + j * 20}ms" x="${x.toFixed(1)}" y="${Y(v).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, (v / tmax) * h).toFixed(1)}" rx="2" fill="${Charts.color(s.color)}"><title>${esc(t(s.name))}: ${esc(fmt.text.number(v))}</title></rect>`; });
    }
    bars += Charts.xTicks(labels, (i) => L + i * bw + bw / 2, H - 6, { edges: false }); // (v1.3) collision-free ticks (core)
    const pts = o.line.values.map((v, i) => [L + i * bw + bw / 2, YL(v)]);
    const line = `<path class="draw" pathLength="1" d="${Charts.smooth(pts)}" fill="none" stroke="${Charts.color(o.line.color || 'green')}" stroke-width="2"/>`;
    const lg = `<div class="lgd">${o.bars.map((s) => `<span><i class="sq" style="background:${Charts.color(s.color)}"></i>${esc(t(s.name))}</span>`).join('')}<span><i style="background:${Charts.color(o.line.color || 'green')}"></i>${esc(t(o.line.name))}</span></div>`;
    return `${lg}<div class="chart" role="img" aria-label="${esc([...o.bars.map((s) => t(s.name)), t(o.line.name)].join(', '))}"><svg viewBox="0 0 ${W0} ${H}">${g}${bars}${line}</svg></div>`;
  };
  /** Series[] → {labels, series[{name,values,color}]} with {c} currency placeholder resolved */
  D2.series = (list, colors) => ({ labels: (list[0] ? list[0].points : []).map((p) => p.x), series: list.map((s, i) => ({ name: s.label, values: s.points.map((p) => p.y), color: (colors || [])[i] })) });

  /** x-label step so the first and last labels both show without colliding */
  D2.every = (n, max = 6) => { if (n <= max) return 1; const lo = Math.ceil((n - 1) / max); for (let k = lo; k <= lo + 3; k++) if ((n - 1) % k === 0) return k; return lo; };
  /* ---------------- generic PerformanceReport renderer { title, period, sections[{key,title,kpis,series,rows}], generatedAt } ---------------- */
  const COL = { city: 'City', drops: 'Drops', accuracy: 'Accuracy', mismatches: 'Mismatches', reason: 'Reason', count: 'Count', share: 'Share', metric: 'Metric', value: 'Value' };
  const PCT = new Set(['accuracy', 'share']);
  const cell = (k, v) => (v && typeof v === 'object' ? esc(App.loc(v)) : typeof v === 'number' ? (PCT.has(k) ? fmt.pct(v, { dec: 1 }) : fmt.number(v)) : esc(t(v)));
  D2.report = (r, o = {}) => r.sections.map((sec) => {
    let body = '';
    if (sec.kpis) body += D2.kpiGrid(sec.kpis, o.kpiMap || {}, Math.min(4, sec.kpis.length));
    if (sec.series) {
      const s = D2.series(sec.series, [o.color || 'rose', 'mauve']);
      const isBar = sec.series[0].kind === 'bar'; const pct = sec.series[0].unit === 'percent';
      const vals = s.series[0].values; const mn = Math.floor(Math.min(...vals)) - 1, mx = Math.ceil(Math.max(...vals)) + 1;
      body += isBar ? Charts.bars({ ...s, height: 240, width: 900, barWidth: 26, legend: false, label: sec.title }) : Charts.area({ ...s, height: 240, width: 900, legend: false, labelEvery: D2.every(s.labels.length, 10), label: sec.title, ...(pct ? { min: mn, max: mx, yFormat: (v) => v + '%' } : {}) });
    }
    if (sec.rows && sec.rows.length) {
      const keys = Object.keys(sec.rows[0]);
      body += `<div class="tbl-wrap"><table class="tbl compact"><caption class="sr-only">${esc(t(sec.title))}</caption><thead><tr>${keys.map((k, i) => `<th class="${i ? 'end' : ''}">${esc(t(COL[k] || k))}</th>`).join('')}</tr></thead><tbody>${sec.rows.map((row) => `<tr>${keys.map((k, i) => `<td class="${i ? 'end b' : ''}">${cell(k, row[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    return UI.card({ title: sec.title, flush: !!(sec.rows && !sec.kpis && !sec.series), body });
  }).join('');
  D2.reportHead = (r) => `<div class="d2-rephead"><div><h2 class="sect-title">${esc(t(r.title))}</h2><p class="d2-sub">${esc(t('Generated'))} ${D2.dt(r.generatedAt)}</p></div></div>`;

  /* simple horizontal progress row (funnel / region bars) */
  D2.bar = (label, valueHtml, pct, tone, sub) => `<div class="d2-bar"><div class="d2-bar-h"><span>${label}</span><b>${valueHtml}</b></div>${sub ? `<small class="faint">${sub}</small>` : ''}<div class="trk" style="height:8px"><i class="gw ${tone || ''}" style="width:${Math.max(1.5, Math.min(100, pct))}%"></i></div></div>`;

  UI.css('d2-common', `
    .d2-kg{gap:16px}
    .d2-k .cd-b{padding:14px 16px 14px!important;display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0}
    .d2-k .cd-ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center}
    .d2-k .cd-ic svg.i{width:15px;height:15px}
    .d2-k-l{font-size:12px;color:var(--muted);font-weight:500;line-height:1.35;display:flex;align-items:center;gap:6px;min-height:32px;max-width:100%}
    .d2-k-l>span:last-child{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .d2-k.sm .d2-k-l{min-height:0}
    .d2-k-i{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;flex:none}
    .d2-k-i svg.i{width:12px;height:12px}
    .d2-k-v{font-family:var(--font-num);font-weight:700;font-size:20px;line-height:1.2;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
    .d2-k.sm .d2-k-v{font-size:18px}
    .d2-k .k-f{margin:0;max-width:100%;flex-wrap:wrap;row-gap:3px;white-space:normal}
    .d2-k .k-f>span:last-child{white-space:normal;line-height:1.3}
    .d2-page .cd-t h3{white-space:normal;line-height:1.3}
    .d2-page .fbar .fr{flex-wrap:wrap}
    .d2-k[data-go],.d2-k[data-kact]{cursor:pointer}
    .d2-k[data-go]:hover,.d2-k[data-kact]:hover{border-color:var(--line-2)}
    .d2-info{width:20px;height:20px;display:inline-grid;place-items:center;border-radius:6px;color:var(--faint);flex:none}
    .d2-info:hover{color:var(--text);background:var(--card-2)}
    .d2-info svg.i{width:14px;height:14px}
    .d2-tip{max-width:280px;padding:10px 12px;font-size:12.5px;line-height:1.5;color:var(--muted)}
    .d2-mrows{display:flex;flex-direction:column}
    .d2-mr{display:flex;align-items:center;gap:10px;padding:0 var(--pad);min-height:44px;border-top:1px solid var(--line-soft);font-size:12.5px;width:100%;text-align:start;color:inherit}
    .d2-mr:first-child{border-top:0}
    .d2-mr.lnkrow{cursor:pointer}
    .d2-mr.lnkrow:hover{background:var(--row-hover)}
    .d2-mi{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;flex:none}
    .d2-mi svg.i{width:13px;height:13px}
    .d2-ml{flex:1;min-width:0;color:var(--muted);line-height:1.3;padding-block:6px}
    .d2-mvw{display:flex;flex-direction:column;align-items:flex-end;gap:2px;padding-block:6px}
    .d2-mv{font-weight:700;white-space:nowrap}
    .d2-mvw .dl{height:18px;font-size:11px}
    .d2-tot{display:grid;gap:10px;margin-block-start:12px}
    .d2-tot>div{border:1px solid var(--line);border-radius:12px;padding:9px 12px;min-width:0;background:var(--card-2)}
    .d2-tot>div>span{display:block;font-size:11.5px;color:var(--muted);line-height:1.35}
    .d2-tot b{display:block;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .d2-tot>div>div{margin-block-start:4px}
    .d2-tot small{display:block;font-size:11px;color:var(--faint)}
    .d2-dl{display:grid;grid-template-columns:minmax(120px,38%) 1fr;gap:10px 14px;font-size:13px;margin:0}
    .d2-dl dt{color:var(--muted)}
    .d2-dl dd{margin:0;font-weight:500;min-width:0;overflow-wrap:anywhere}
    .d2-tl{list-style:none;margin:0;padding:0;display:grid;gap:14px}
    .d2-tl li{display:flex;gap:12px;align-items:flex-start;position:relative}
    .d2-tl li:not(:last-child)::after{content:"";position:absolute;inset-inline-start:5px;top:16px;bottom:-14px;border-inline-start:1px dashed var(--line-2)}
    .d2-tl-d{width:11px;height:11px;border-radius:50%;background:var(--accent);margin-top:4px;flex:none;box-shadow:0 0 0 3px var(--tint-rose)}
    .d2-tl b{display:block;font-size:13px;font-weight:600}
    .d2-tl-n{font-weight:500;color:var(--muted)}
    .d2-tl small{display:block;font-size:11.5px;color:var(--faint)}
    .d2-back{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--muted);justify-self:start}
    .d2-back:hover{color:var(--text)}
    .d2-back svg.i{width:15px;height:15px}
    .d2-bar{display:grid;gap:6px}
    .d2-bar-h{display:flex;justify-content:space-between;gap:10px;font-size:12.5px}
    .d2-bar-h span{color:var(--muted);display:inline-flex;align-items:center;gap:8px;min-width:0}
    .d2-bar-h b{font-weight:700;white-space:nowrap}
    .d2-bars{display:grid;gap:14px}
    .trk i.gw.m{background:linear-gradient(var(--g-start),#8A5A80,#B783A7)!important}
    .d2-row-sp{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .d2-pagehead{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .d2-pagehead .sp{flex:1}
    .d2-sub{font-size:12.5px;color:var(--muted)}
    .d2-big{font-family:var(--font-num);font-size:28px;font-weight:700;line-height:1.2}
    .d2-sect{display:grid;gap:12px}
    .d2-sect h4{font-size:13px;font-weight:600}
    .d2-rephead{display:flex;align-items:flex-end;gap:12px}
    .d2-h4{font-size:13.5px;font-weight:600;margin-block-end:10px}
  `);
})();
