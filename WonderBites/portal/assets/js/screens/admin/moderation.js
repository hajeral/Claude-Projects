/* =====================================================================
   Admin · Moderation  (owner: D1) — reached from Issues & Alerts
   Route: admin-moderation {type?, open?}
   API: GET /admin/moderation, /admin/moderation/summary, GET /admin/moderation/:id,
        POST /admin/moderation/:id/approve|reject|escalate
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc;
  const TABS = [{ id: 'all', label: 'All' }, { id: 'listing', label: 'Listings' }, { id: 'review', label: 'Reviews' }, { id: 'user', label: 'User Behaviour' }, { id: 'merchant_profile', label: 'Merchant Profile' }];
  const REJECT = [['policy_violation', 'Violates content policy'], ['misleading', 'Misleading or inaccurate'], ['abuse', 'Abuse or harassment'], ['spam', 'Spam or fake'], ['safety', 'Food safety risk'], ['other', 'Other']];
  const ACTIONS = { listing: [['hide_listing', 'Hide the listing'], ['request_changes', 'Ask the merchant to fix it']], review: [['remove_review', 'Remove the review'], ['warn_author', 'Warn the author']], user: [['warn_user', 'Warn the user'], ['suspend_user', 'Suspend the account']], merchant_profile: [['request_documents', 'Request new documents'], ['suspend_merchant', 'Suspend the merchant']] };
  const SEV_COLOR = { critical: 'var(--neg)', high: 'var(--warn)', medium: '#B783A7', low: 'var(--pos)' };
  const decided = (m) => ['approved', 'rejected'].includes(m.status);

  async function approve(m, done) {
    const ok = await UI.confirm({ title: t('Approve {id}?', { id: m.id }), text: t('The report is dismissed and the content stays visible.'), confirm: 'Approve', icon: 'checkc' });
    if (ok && await D1.run(() => api('POST', `/admin/moderation/${m.id}/approve`, {}), 'Approved · report dismissed') && done) done();
  }
  async function reject(m, done) {
    const acts = ACTIONS[m.type] || ACTIONS.listing;
    const v = await D1.reasonModal({
      title: 'Reject content', icon: 'x', danger: true, confirm: 'Reject', reasons: REJECT, noteLabel: 'Note for the record (optional)',
      text: `${fmt.id(m.id)} · ${esc(m.item)}`,
      extra: UI.field({ type: 'select', name: 'action', label: 'Follow-up action', value: acts[0][0], options: acts.map((a) => ({ value: a[0], label: a[1] })) }),
      onSubmit: (vals) => api('POST', `/admin/moderation/${m.id}/reject`, { reason: vals.reason, note: vals.note, action: vals.action }),
    });
    if (v) { UI.toast(t('Rejected · {action}', { action: t(acts.find((a) => a[0] === v.action)[1]) }), { tone: 'success' }); if (done) done(); }
  }
  async function escalate(m, done) {
    const ok = await UI.confirm({ title: t('Escalate to Trust & Safety?'), text: t('A senior reviewer will take over this case.'), confirm: 'Escalate', icon: 'flag' });
    if (ok && await D1.run(() => api('POST', `/admin/moderation/${m.id}/escalate`, {}), 'Escalated to Trust & Safety') && done) done();
  }

  function openItem(id, after) {
    const d = UI.drawer({ title: 'Moderation case', width: 540, body: UI.skeleton('form', 6) });
    const paint = async () => {
      try {
        const { data: m } = await api('GET', '/admin/moderation/' + id);
        if (d.closed) return;
        d.body.innerHTML = `
          <div style="display:grid;gap:8px;margin-block-end:16px"><div class="row wrap" style="gap:8px">${fmt.id(m.id)}${D1.chip(D1.MODTYPE, m.type)}${D1.sevDot(m.severity)}${D1.pill('moderation', m.status)}</div><h3 class="h-serif" style="margin:0">${esc(m.item)}</h3></div>
          ${m.decision ? `<div class="d1-banner ${m.decision.outcome === 'approved' ? 'ok' : 'bad'}" style="margin-block-end:16px">${UI.icon(m.decision.outcome === 'approved' ? 'checkc' : 'x')}<div><b>${esc(t(m.decision.outcome === 'approved' ? 'Approved' : 'Rejected'))}</b><p>${esc(m.decision.by)} · ${D1.dt(m.decision.at)}${m.decision.note ? ' — ' + esc(m.decision.note) : ''}</p></div></div>` : ''}
          ${D1.section('Report', D1.dl([['Reason', esc(m.reason)], ['Reporter', esc(D1.lab(D1.REPORTER, m.reporter))], ['Reports', fmt.number(m.reportsCount)], ['Filter confidence', m.autoScore != null ? fmt.pct(m.autoScore * 100, { dec: 0 }) : ''], ['Reported', D1.dt(m.createdAt)], ['Assignee', m.assignee ? esc(m.assignee.name) : `<span class="faint">${esc(t('Unassigned'))}</span>`]]))}
          ${D1.section('Reported content', `<blockquote style="margin:0;padding:12px 14px;border-inline-start:3px solid var(--accent);background:var(--card-2);border-radius:10px;font-size:13px">${esc(m.content)}</blockquote>`)}`;
        let f = d.el.querySelector('.ov-f'); if (!f) { f = document.createElement('div'); f.className = 'ov-f'; d.el.appendChild(f); }
        f.innerHTML = decided(m) ? `<span style="flex:1"></span>${UI.btn('Close', { variant: 'secondary', attrs: 'data-close' })}` : `${m.status !== 'escalated' ? UI.btn('Escalate', { variant: 'ghost', icon: 'flag', attrs: 'data-mx="escalate"' }) : ''}<span style="flex:1"></span>${UI.btn('Reject', { variant: 'danger', icon: 'x', attrs: 'data-mx="reject"' })}${UI.btn('Approve', { variant: 'primary', icon: 'check', attrs: 'data-mx="approve"' })}`;
        const again = () => { paint(); if (after) after(); };
        f.onclick = (e) => { const b = e.target.closest('[data-mx]'); if (!b) return; ({ approve, reject, escalate })[b.dataset.mx](m, again); };
      } catch (e) { d.body.innerHTML = UI.errorState({ text: D1.err(e) }); d.body.addEventListener('ui:retry', paint, { once: true }); }
    };
    paint();
  }

  App.route('admin-moderation', {
    nav: 'Issues & Alerts', title: 'Moderation', subtitle: 'Review reported listings, reviews, users and merchant profiles.',
    render(el, ctx) {
      let tab = TABS.some((x) => x.id === ctx.params.type) ? ctx.params.type : 'all';
      el.innerHTML = `<div class="d1-head">${UI.btn('Back to Issues & Alerts', { variant: 'ghost', icon: 'chev-l', iconCls: 'flip', go: 'admin-issues', params: { tab: 'moderation' } })}</div><div data-kpis></div><div class="d1-tabbar" data-bar></div>${UI.card({ flush: true, body: '<div data-table></div>' })}`;
      const loadTop = () => UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/moderation/summary', api.ctx()), ({ data: k }) => {
        el.querySelector('[data-bar]').innerHTML = UI.tabs({ name: 'mtype', label: 'Content type', active: tab, tabs: TABS.map((x) => ({ ...x, count: x.id === 'all' ? undefined : k.byType[x.id] })) });
        return UI.kpis([
          { label: 'Pending Review', icon: 'chat', tone: 'rose', value: fmt.number(k.pendingReview), foot: t('Awaiting moderator action') },
          { label: 'Auto-Flagged Today', icon: 'alert', tone: 'orange', value: fmt.number(k.autoFlaggedToday), foot: t('By keyword & image filters') },
          { label: 'Escalated to Trust & Safety', icon: 'shield', tone: 'berry', value: fmt.number(k.escalated), foot: t('Needs senior review') },
          { label: 'Resolved Today', icon: 'checkc', tone: 'lime', value: fmt.number(k.resolvedToday), foot: t('{n} vs. yesterday', { n: fmt.pct(k.resolvedDeltaVsYesterday, { sign: true, dec: 0 }).replace('%', '') }) },
        ], 4);
      }, { skeleton: 'kpis', n: 4 });
      loadTop();
      const refreshAll = () => { table.reload(); loadTop(); };
      const table = UI.dataTable(el.querySelector('[data-table]'), {
        pageSize: 20, caption: 'Moderation queue',
        columns: [
          { key: 'id', label: 'Case', render: (r) => `<span class="d1-idrail" style="--sev:${SEV_COLOR[r.severity]}">${fmt.id(r.id)}</span>` },
          { key: 'type', label: 'Type', render: (r) => D1.chip(D1.MODTYPE, r.type) },
          { key: 'item', label: 'Reported Item', render: (r) => `<b style="font-weight:600" class="d1-desc">${esc(r.item)}</b>` },
          { key: 'reason', label: 'Reason', render: (r) => `<span class="d1-desc muted">${esc(r.reason)}</span>` },
          { key: 'reporter', label: 'Reporter', render: (r) => `<span class="muted">${esc(D1.lab(D1.REPORTER, r.reporter))}</span>` },
          { key: 'severity', label: 'Severity', render: (r) => D1.sevDot(r.severity) },
          { key: 'status', label: 'Status', render: (r) => D1.pill('moderation', r.status) },
          { key: 'age', label: 'Age', render: (r) => fmt.ago(r.ageMinutes) },
        ],
        fetch: (q) => api('GET', '/admin/moderation', { ...api.ctx(), ...q, type: tab === 'all' ? '' : tab }),
        rowClick: (r) => openItem(r.id, refreshAll),
        rowActions: (r) => (decided(r) ? [{ icon: 'eye', label: 'View', run: () => openItem(r.id, refreshAll) }] : [
          { icon: 'check', label: 'Approve', run: () => approve(r, refreshAll) },
          { icon: 'x', label: 'Reject', danger: true, run: () => reject(r, refreshAll) },
        ]),
        empty: { icon: 'shield', title: 'Queue is clear', text: 'No reports in this category.' },
      });
      el.addEventListener('ui:tab', (e) => { if (e.detail.name !== 'mtype') return; tab = e.detail.value; ctx.params.type = tab; table.setQuery({ page: 1 }); });
      { const o = D1.take(ctx, 'open'); if (o) openItem(o, refreshAll); }
    },
  });
})();
