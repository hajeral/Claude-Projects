/* (v1.4 dates) seeded dates rebased onto api.DEMO_TODAY = 2026-11-19 by qa/rebase_dates.py */
/* =====================================================================
   Admin · Issues & Alerts  (owner: D1)
   Route: admin-issues {tab?: all|issues|alerts|moderation, open?}
   API: GET /admin/cases, /admin/cases/summary, GET /admin/cases/:id,
        POST /admin/cases/:id/assign|resolve|escalate|reopen|notes, GET /admin/support/agents
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc;
  const TAB_KIND = { all: '', issues: 'issue', alerts: 'alert', moderation: 'moderation' };
  const RESOLUTIONS = [['fixed', 'Fixed by merchant'], ['merchant_warned', 'Merchant warned'], ['refund_issued', 'Refund issued'], ['no_action', 'No action needed'], ['duplicate', 'Duplicate case']];
  const TEAMS = [['trust_safety', 'Trust & Safety'], ['operations_lead', 'Operations lead'], ['finance', 'Finance'], ['legal', 'Legal']];
  const ACT = { created: 'Case opened', assigned: 'Assigned to {who}', note: 'Note added', escalated: 'Escalated', resolved: 'Resolved', reopened: 'Reopened' };
  const NOW = Date.parse(api.DEMO_TODAY + 'T10:00:00Z'); // (v1.4) demo clock
  let agentsCache = null;
  const agents = async () => (agentsCache = agentsCache || (await api('GET', '/admin/support/agents')).data);

  UI.css('d1-issues', `
    .d1-idrail{display:inline-block;border-inline-start:3px solid var(--sev);padding-inline-start:10px;margin-inline-start:-10px;line-height:30px;font-weight:600;white-space:nowrap}
    .d1-sevchips{display:flex;gap:6px;flex-wrap:wrap}
    .d1-sevchips button{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:var(--card-2);color:var(--muted);font-size:12px;font-weight:600}
    .d1-sevchips button i{width:7px;height:7px;border-radius:50%;background:var(--sev)}
    .d1-sevchips button[aria-pressed="true"]{border-color:var(--sev);color:var(--text);background:color-mix(in srgb,var(--sev) 16%,var(--card-2))}
    .d1-sla{font-size:12px;font-weight:600}
    .d1-sla.over{color:var(--neg)}
    .d1-desc{max-width:340px;white-space:normal;line-height:1.4}
  `);
  const SEV_COLOR = { critical: 'var(--neg)', high: 'var(--warn)', medium: '#B783A7', low: 'var(--pos)' };
  const entityLink = (en) => {
    if (!en) return '—';
    const route = /^MER-/.test(en.id) ? ['admin-merchant-detail', { id: en.id }] : /^DR-/.test(en.id) ? ['admin-drops', { q: en.id }] : null;
    return route ? `<a class="lnk plain" href="#${route[0]}" data-go="${route[0]}" data-params='${UI.attrJSON(route[1])}'>${esc(en.name)}</a> <small class="faint">${fmt.id(en.id)}</small>` : esc(en.name);
  };
  function sla(c) {
    if (['resolved', 'closed'].includes(c.status)) return `<span class="d1-sla">—</span>`;
    const left = Math.round((Date.parse(c.slaDueAt) - NOW) / 60000);
    return left < 0 ? `<span class="d1-sla over">${t('Overdue by {d}', { d: fmt.ago(-left) })}</span>` : `<span class="d1-sla">${t('Due in {d}', { d: fmt.ago(left) })}</span>`;
  }

  /* ---------- case actions (exported for moderation / command center) ---------- */
  async function resolveCase(c, done) {
    const v = await D1.reasonModal({
      title: 'Resolve case', icon: 'checkc', confirm: 'Resolve', reasons: RESOLUTIONS, noteLabel: 'Resolution note (optional)',
      text: `${fmt.id(c.id)} · ${esc(c.title)}`,
      onSubmit: (vals) => api('POST', `/admin/cases/${c.id}/resolve`, { resolution: vals.reason, note: vals.note }),
    });
    if (v) { UI.toast(t('Case {id} resolved', { id: c.id }), { tone: 'success' }); if (done) done(); }
  }
  async function escalateCase(c, done) {
    const v = await D1.reasonModal({
      title: 'Escalate case', icon: 'flag', confirm: 'Escalate', reasons: TEAMS, noteLabel: 'What should the team know?', noteRequired: true,
      text: `${fmt.id(c.id)} · ${esc(c.title)}`,
      extra: c.severity !== 'critical' ? UI.field({ type: 'checkbox', name: 'raise', label: 'Raise severity to Critical' }) : '',
      onSubmit: (vals) => api('POST', `/admin/cases/${c.id}/escalate`, { to: vals.reason, note: vals.note, raiseSeverity: !!vals.raise }),
    });
    if (v) { UI.toast(t('Case {id} escalated to {team}', { id: c.id, team: t(TEAMS.find((x) => x[0] === v.reason)[1]) }), { tone: 'success' }); if (done) done(); }
  }

  function openCase(id, after) {
    const d = UI.drawer({ title: 'Case details', width: 560, body: UI.skeleton('form', 7) });
    const paint = async () => {
      try {
        const [{ data: c }, list] = await Promise.all([api('GET', '/admin/cases/' + id), agents()]);
        if (d.closed) return;
        const closed = ['resolved', 'closed'].includes(c.status);
        d.body.innerHTML = `
          <div style="display:grid;gap:8px;margin-block-end:16px"><div class="row wrap" style="gap:8px">${fmt.id(c.id)}${D1.chip(D1.KIND, c.kind)}${D1.sevDot(c.severity)}${D1.pill('case', c.status)}</div><h3 class="h-serif" style="margin:0">${esc(c.title)}</h3></div>
          ${D1.section('Details', D1.dl([['Related to', entityLink(c.entity)], ['Reported by', esc(c.reporter)], ['Opened', D1.dt(c.createdAt)], ['Last update', D1.dt(c.updatedAt)], ['SLA', sla(c)]]))}
          ${D1.section('Assignment', `<form class="row" style="gap:10px;align-items:flex-end" data-assign novalidate>${UI.field({ type: 'select', name: 'assigneeId', label: 'Assignee', value: c.assignee ? c.assignee.id : '', placeholder: 'Unassigned', options: list.map((a) => ({ value: a.id, label: a.name })) })}${UI.btn('Assign', { variant: 'secondary', icon: 'user', type: 'submit' })}</form>`)}
          ${D1.section('Activity', `<ol class="d1-timeline">${c.activity.slice().reverse().map((a) => `<li><i aria-hidden="true"></i><div><b>${esc(t(ACT[a.type] || a.type, { who: a.note }))}</b><small>${D1.dt(a.at)} · ${esc(a.by)}</small>${a.note && a.type !== 'assigned' ? `<p>${esc(a.note)}</p>` : ''}</div></li>`).join('')}</ol>`)}
          ${D1.section('Add a note', `<form class="d1-form" data-note novalidate>${UI.field({ type: 'textarea', name: 'body', label: 'Internal note', rows: 3, required: true, maxlength: 1000, placeholder: 'Visible to admins only' })}<div>${UI.btn('Add note', { variant: 'secondary', icon: 'chat', type: 'submit' })}</div></form>`)}`;
        let f = d.el.querySelector('.ov-f'); if (!f) { f = document.createElement('div'); f.className = 'ov-f'; d.el.appendChild(f); }
        f.innerHTML = closed ? `<span style="flex:1"></span>${UI.btn('Reopen case', { variant: 'secondary', icon: 'refresh', attrs: 'data-cx="reopen"' })}`
          : `${c.kind === 'moderation' ? UI.btn('Open moderation queue', { variant: 'ghost', icon: 'shield', attrs: 'data-cx="queue"' }) : ''}<span style="flex:1"></span>${c.status !== 'escalated' ? UI.btn('Escalate', { variant: 'secondary', icon: 'flag', attrs: 'data-cx="escalate"' }) : ''}${UI.btn('Resolve', { variant: 'primary', icon: 'checkc', attrs: 'data-cx="resolve"' })}`;
        const again = () => { paint(); if (after) after(); };
        f.onclick = async (e) => {
          const b = e.target.closest('[data-cx]'); if (!b) return; const a = b.dataset.cx;
          if (a === 'resolve') resolveCase(c, again);
          if (a === 'escalate') escalateCase(c, again);
          if (a === 'reopen') { if (await D1.run(() => api('POST', `/admin/cases/${c.id}/reopen`, {}), 'Case reopened')) again(); }
          if (a === 'queue') { d.close(); App.go('admin-moderation', { open: c.id }); }
        };
        d.body.querySelector('[data-assign]').onsubmit = async (e) => {
          e.preventDefault(); const v = UI.formValues(e.target);
          if (!v.assigneeId) { const fl = e.target.querySelector('.fld'); fl.classList.add('invalid'); fl.querySelector('.err').textContent = t('Choose an assignee'); return; }
          if (await D1.run(() => api('POST', `/admin/cases/${c.id}/assign`, { assigneeId: v.assigneeId }), 'Case assigned')) again();
        };
        d.body.querySelector('[data-note]').onsubmit = async (e) => {
          e.preventDefault(); const r = UI.validate(e.target); if (!r.ok) return;
          if (await D1.run(() => api('POST', `/admin/cases/${c.id}/notes`, { body: r.values.body }), 'Note added')) paint();
        };
      } catch (e) { d.body.innerHTML = UI.errorState({ text: D1.err(e) }); d.body.addEventListener('ui:retry', paint, { once: true }); }
    };
    paint();
  }

  App.route('admin-issues', {
    nav: 'Issues & Alerts', title: 'Issues & Alerts', subtitle: 'Triage platform issues, system alerts and moderation cases.',
    render(el, ctx) {
      let tab = TAB_KIND[ctx.params.tab] !== undefined ? ctx.params.tab : 'all';
      const sev = new Set();
      el.innerHTML = `<div data-kpis></div><div class="d1-tabbar" data-bar></div><div data-modlink></div>${UI.card({ flush: true, body: '<div data-table></div>' })}`;
      const bar = el.querySelector('[data-bar]');
      const loadTop = () => UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/cases/summary', api.ctx()), ({ data: k }) => {
        bar.innerHTML = `${UI.tabs({ name: 'itab', label: 'Case type', active: tab, tabs: [{ id: 'all', label: 'All', count: k.byKind.all }, { id: 'issues', label: 'Issues', count: k.byKind.issue }, { id: 'alerts', label: 'Alerts', count: k.byKind.alert }, { id: 'moderation', label: 'Moderation', count: k.byKind.moderation }] })}
          <div class="d1-sevchips" role="group" aria-label="${esc(t('Severity'))}">${Object.keys(D1.SEV).map((s) => `<button type="button" data-sev="${s}" aria-pressed="${sev.has(s)}" style="--sev:${SEV_COLOR[s]}"><i aria-hidden="true"></i>${esc(D1.lab(D1.SEV, s))}</button>`).join('')}</div>
          <span class="sp"></span><span class="muted" style="font-size:12.5px">${t('{n} open items', { n: fmt.number(k.totalOpen) })}</span>`;
        return UI.kpis([
          { label: 'Critical', icon: 'alert', tone: 'berry', value: fmt.number(k.critical), foot: t('Needs action now') },
          { label: 'Needs Review', icon: 'chat', tone: 'rose', value: fmt.number(k.needsReview), foot: t('Awaiting a decision') },
          { label: 'Under Monitoring', icon: 'eye', tone: 'lime', value: fmt.number(k.underMonitoring), foot: t('Tracking, no action yet') },
          { label: 'Total Open', icon: 'grid', tone: 'mauve', value: fmt.number(k.totalOpen), foot: t('Across all queues') },
        ], 4);
      }, { skeleton: 'kpis', n: 4 });
      loadTop();
      const modLink = () => { el.querySelector('[data-modlink]').innerHTML = tab === 'moderation' ? `<div class="d1-banner">${UI.icon('shield')}<div style="flex:1"><b>${esc(t('Moderation queue'))}</b><p>${esc(t('Review reported listings, reviews, users and merchant profiles with approve / reject actions.'))}</p></div>${UI.btn('Open moderation queue', { variant: 'primary', icon: 'shield', go: 'admin-moderation' })}</div>` : ''; };
      modLink();
      const refreshAll = () => { table.reload(); loadTop(); };
      const table = UI.dataTable(el.querySelector('[data-table]'), {
        pageSize: 20, caption: 'Issues & Alerts',
        columns: [
          { key: 'id', label: 'ID', render: (r) => `<span class="d1-idrail" style="--sev:${SEV_COLOR[r.severity]}">${fmt.id(r.id)}</span>` },
          { key: 'kind', label: 'Type', render: (r) => D1.chip(D1.KIND, r.kind) },
          { key: 'merchant', label: 'Merchant', render: (r) => `<b style="font-weight:600">${esc(r.entity.name)}</b>` },
          { key: 'title', label: 'Description', render: (r) => `<span class="d1-desc muted">${esc(r.title)}</span>` },
          { key: 'severity', label: 'Severity', sortable: true, render: (r) => D1.sevDot(r.severity) },
          { key: 'status', label: 'Status', render: (r) => D1.pill('case', r.status) },
          { key: 'createdAt', label: 'Reported', sortable: true, render: (r) => D1.dt(r.createdAt) },
          { key: 'age', label: 'Age', render: (r) => fmt.ago(r.ageMinutes) },
        ],
        fetch: (q) => api('GET', '/admin/cases', { ...api.ctx(), ...q, kind: TAB_KIND[tab], severity: [...sev].join(','), sort: q.sort || '-createdAt' }),
        rowClick: (r) => openCase(r.id, refreshAll),
        rowActions: (r) => [
          { icon: 'eye', label: 'View', run: () => openCase(r.id, refreshAll) },
          ['resolved', 'closed'].includes(r.status) ? { icon: 'refresh', label: 'Reopen', run: async () => { if (await D1.run(() => api('POST', `/admin/cases/${r.id}/reopen`, {}), 'Case reopened')) refreshAll(); } } : { icon: 'check', label: 'Resolve', run: () => resolveCase(r, refreshAll) },
        ],
        empty: { icon: 'checkc', title: 'Nothing to triage', text: 'No cases match this view.' },
      });
      el.addEventListener('ui:tab', (e) => { if (e.detail.name !== 'itab') return; tab = e.detail.value; ctx.params.tab = tab; modLink(); table.setQuery({ page: 1 }); });
      UI.on(el, 'click', '[data-sev]', (e, b) => { const s = b.dataset.sev; if (sev.has(s)) sev.delete(s); else sev.add(s); b.setAttribute('aria-pressed', String(sev.has(s))); table.setQuery({ page: 1 }); });
      { const o = D1.take(ctx, 'open') || D1.take(ctx, 'id'); if (o) openCase(o, refreshAll); }
    },
  });
  Object.assign(window.D1, { openCase, resolveCase, escalateCase, agents });
})();
