/* =====================================================================
   Admin · Support  (owner: D1)
   Routes: admin-support {priority?}, admin-ticket-detail {id}
   API: GET /admin/support/summary, GET /admin/support/tickets, GET|PATCH /admin/support/tickets/:id,
        POST /admin/support/tickets/:id/messages, GET /admin/support/agents
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc;
  const PRIO_TABS = [{ id: 'all', label: 'All' }, { id: 'urgent', label: 'Urgent' }, { id: 'high', label: 'High' }, { id: 'medium', label: 'Normal' }, { id: 'low', label: 'Low' }];
  const CH_COLOR = { in_app: 'rose', email: 'mauve', chat: 'green', phone: 'orange', social: 'grey' };
  const prioPill = (p) => UI.pill(p, { label: D1.PRIO[p][0], tone: D1.PRIO[p][1], icon: p === 'urgent' ? 'alert' : p === 'high' ? 'up' : 'minus' });
  const assignee = (a) => (a ? `<span class="row" style="gap:8px;flex-wrap:nowrap">${UI.avatar(a.name, { size: 24 })}<span>${esc(a.name)}</span></span>` : `<span class="row" style="gap:8px;flex-wrap:nowrap"><span class="avt" style="width:24px;height:24px;opacity:.5" aria-hidden="true">?</span><span class="faint">${esc(t('Unassigned'))}</span></span>`);

  UI.css('d1-support', `
    .d1-thread{display:grid;gap:14px}
    .d1-msg{display:grid;grid-template-columns:32px 1fr;gap:10px;align-items:start}
    .d1-msg .bub{padding:12px 14px;border-radius:14px;background:var(--card-2);border:1px solid var(--line);font-size:13px;line-height:1.55}
    .d1-msg.agent .bub{background:color-mix(in srgb,var(--accent) 10%,var(--card-2));border-color:color-mix(in srgb,var(--accent) 28%,var(--line))}
    .d1-msg.note .bub{background:var(--tint-orange);border-style:dashed;border-color:color-mix(in srgb,var(--warn) 45%,transparent)}
    .d1-msg header{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-block-end:4px;font-size:12px}
    .d1-msg header b{font-size:12.5px}
    .d1-msg header small{color:var(--faint)}
    .d1-msg .att{display:flex;gap:6px;margin-block-start:8px;flex-wrap:wrap}
    .d1-compose{display:grid;gap:12px;border-block-start:1px solid var(--line);padding-block-start:16px;margin-block-start:6px}
    .d1-compose .row{align-items:center}
    .d1-tk{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:var(--gap);align-items:start}
    @media (max-width:1300px){.d1-tk{grid-template-columns:minmax(0,1fr) 300px}}
  `);

  function reportModal(s) {
    const p = s.responseTrend.points;
    UI.modal({
      title: 'Response time report', icon: 'clock', size: 'md',
      body: `${Charts.line({ series: [{ name: 'Avg first response (min)', values: p.map((x) => x.y), color: 'rose' }], labels: p.map((x) => D1.dayLabel(x.x)), height: 200, yFormat: (v) => v + 'm', label: 'Response time report' })}
        <div class="tbl-wrap" style="margin-block-start:14px"><table class="tbl"><thead><tr><th>${esc(t('Date'))}</th><th class="end">${esc(t('Avg first response'))}</th><th>${esc(t('SLA'))}</th></tr></thead><tbody>${p.map((x) => `<tr><td>${fmt.date(x.x)}</td><td class="end"><b>${fmt.number(x.y, 1)}</b> ${esc(t('min'))}</td><td>${x.y <= s.kpis.firstResponseSlaMinutes ? UI.pill('ok', { label: 'Within SLA', tone: 'g', icon: 'checkc' }) : UI.pill('late', { label: 'Breached', tone: 'r', icon: 'alert' })}</td></tr>`).join('')}</tbody></table></div>`,
      actions: [{ label: 'Close', variant: 'secondary', close: true }, { label: 'Export', variant: 'primary', icon: 'upload', run: (m) => { m.close(); Overlays.export({ scope: 'Support response times', endpoint: '/admin/support/summary' }); } }],
    });
  }

  App.route('admin-support', {
    nav: 'Support', title: 'Support', subtitle: 'Customer support ticketing and response times.',
    render(el, ctx) {
      let prio = PRIO_TABS.some((x) => x.id === ctx.params.priority) ? ctx.params.priority : 'all';
      let summary = null;
      el.innerHTML = `<div data-kpis></div><div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)" data-charts></div><div class="d1-tabbar" data-bar></div>${UI.card({ title: 'Tickets', icon: 'headset', flush: true, body: '<div data-table></div>', actions: UI.btn('Export', { variant: 'secondary', size: 'sm', icon: 'upload', attrs: 'data-act="export"' }) })}`;
      const charts = el.querySelector('[data-charts]');
      charts.innerHTML = UI.skeleton('cards', 2);
      const loadTop = () => UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/support/summary', api.ctx()), ({ data: s }) => {
        summary = s; const k = s.kpis, p = s.responseTrend.points;
        charts.innerHTML = UI.card({ title: 'Response Time — Last 7 Days', icon: 'clock', actions: `<button type="button" class="lnk" data-act="report">${esc(t('View report'))}${UI.icon('chev-r', 'flip')}</button>`, body: Charts.line({ series: [{ name: 'Avg first response (min)', values: p.map((x) => x.y), color: 'rose' }], labels: p.map((x) => D1.dayLabel(x.x)), height: 200, yFormat: (v) => v + 'm', label: 'Response Time — Last 7 Days' }) })
          + UI.card({ title: 'Tickets by Channel', icon: 'bars', tone: 'mauve', body: `${Charts.bars({ series: s.byChannel.map((c) => ({ name: D1.CHANNEL[c.key], values: s.byChannel.map((x) => (x.key === c.key ? x.count : 0)), color: CH_COLOR[c.key] })), labels: s.byChannel.map((c) => D1.CHANNEL[c.key]), height: 200, stacked: true, legend: false, label: 'Tickets by Channel' })}` });
        el.querySelector('[data-bar]').innerHTML = UI.tabs({ name: 'prio', label: 'Priority', active: prio, tabs: PRIO_TABS.map((x) => ({ ...x, count: s.byPriority[x.id] })) });
        return UI.kpis([
          { label: 'Open Tickets', icon: 'inbox', tone: 'rose', value: fmt.number(k.openTickets), foot: t('{n} unassigned', { n: fmt.number(k.unassigned) }) },
          { label: 'Avg First Response', icon: 'clock', tone: 'lime', value: `${fmt.number(k.avgFirstResponseMinutes, 1)}<small>${esc(t('m'))}</small>`, foot: t(k.avgFirstResponseMinutes <= k.firstResponseSlaMinutes ? 'Within SLA' : 'Outside SLA') },
          { label: 'Avg Resolution Time', icon: 'activity', tone: 'berry', value: `${fmt.number(k.avgResolutionHours, 1)}<small>${esc(t('h'))}</small>`, delta: { value: `+${k.resolutionDeltaMinutes}m`, dir: 'up', good: false }, foot: t('vs. last week') },
          { label: 'CSAT Score', icon: 'star', tone: 'orange', value: fmt.number(k.csat, 1), foot: t('Out of {n}, past {d} days', { n: k.csatScale, d: k.csatPeriodDays }) },
        ], 4);
      }, { skeleton: 'kpis', n: 4 });
      loadTop();
      const table = UI.dataTable(el.querySelector('[data-table]'), {
        pageSize: 20, caption: 'Tickets',
        columns: [
          { key: 'id', label: 'Ticket', render: (r) => `<b>${fmt.id(r.id)}</b>` },
          { key: 'customer', label: 'Customer', render: (r) => `<b style="font-weight:600">${esc(r.requester.name)}</b>` },
          { key: 'subject', label: 'Subject', render: (r) => `<span class="d1-desc muted">${esc(r.subject)}</span>` },
          { key: 'channel', label: 'Channel', render: (r) => esc(D1.lab(D1.CHANNEL, r.channel)) },
          { key: 'priority', label: 'Priority', sortable: true, render: (r) => prioPill(r.priority) },
          { key: 'status', label: 'Status', render: (r) => D1.pill('ticket', r.status) },
          { key: 'assignee', label: 'Assigned To', render: (r) => assignee(r.assignee) },
          { key: 'createdAt', label: 'Age', sortable: true, render: (r) => fmt.ago(r.ageMinutes) },
        ],
        fetch: (q) => api('GET', '/admin/support/tickets', { ...api.ctx(), ...q, priority: prio === 'all' ? '' : prio, sort: q.sort || '-createdAt' }),
        rowClick: (r) => App.go('admin-ticket-detail', { id: r.id }),
        rowActions: (r) => [{ icon: 'eye', label: 'Open ticket', run: () => App.go('admin-ticket-detail', { id: r.id }) }],
        empty: { icon: 'headset', title: 'No tickets', text: 'No tickets match this priority.' },
      });
      el.addEventListener('ui:tab', (e) => { if (e.detail.name !== 'prio') return; prio = e.detail.value; ctx.params.priority = prio; table.setQuery({ page: 1 }); });
      UI.on(el, 'click', '[data-act="report"]', () => summary && reportModal(summary));
      UI.on(el, 'click', '[data-act="export"]', () => Overlays.export({ scope: 'Support tickets', endpoint: '/admin/support/tickets', columns: ['Ticket', 'Customer', 'Subject', 'Channel', 'Priority', 'Status', 'Assigned To', 'Age'] }));
    },
  });

  /* ---------------- ticket detail ---------------- */
  App.route('admin-ticket-detail', {
    nav: 'Support', title: 'Ticket', subtitle: 'Conversation, assignment and status.',
    render(el, ctx) {
      const id = ctx.params.id;
      if (!id) { el.innerHTML = UI.card({ body: UI.empty({ icon: 'headset', title: 'No ticket selected', text: 'Open a ticket from the Support queue.', action: UI.btn('Back to Support', { variant: 'primary', go: 'admin-support' }) }) }); return; }
      el.innerHTML = UI.skeleton('cards', 2);
      let cur = null, draft = '';
      const load = async () => {
        let tk, agents;
        try { [tk, agents] = await Promise.all([api('GET', '/admin/support/tickets/' + id).then((r) => r.data), D1.agents()]); }
        catch (e) { el.innerHTML = UI.card({ body: UI.errorState({ text: D1.err(e) }) }); el.addEventListener('ui:retry', load, { once: true }); return; }
        cur = tk; D1.setTitle(t('Ticket {id}', { id: tk.id }));
        const closed = ['resolved', 'closed'].includes(tk.status);
        const msgs = tk.messages.map((m) => {
          const kind = m.internal ? 'note' : m.author.type === 'agent' ? 'agent' : 'req';
          return `<article class="d1-msg ${kind}">${UI.avatar(m.author.name, { size: 32 })}<div><header><b>${esc(m.author.name)}</b>${m.internal ? UI.chip('Internal note', { tone: 'orange', icon: 'lock' }) : kind === 'agent' ? UI.chip('Agent', { tone: 'mauve' }) : ''}<small>${D1.dt(m.at)}</small></header><div class="bub">${esc(m.body)}${m.attachments && m.attachments.length ? `<div class="att">${m.attachments.map((a) => UI.chip(a.name, { icon: 'file' })).join('')}</div>` : ''}</div></div></article>`;
        }).join('');
        el.innerHTML = `<div class="d1-head">${UI.btn('Back to Support', { variant: 'ghost', icon: 'chev-l', iconCls: 'flip', go: 'admin-support' })}<span class="sp"></span>${fmt.id(tk.id)}${prioPill(tk.priority)}${D1.pill('ticket', tk.status)}</div>
          <div class="d1-tk">
            ${UI.card({ title: tk.subject, icon: 'chat', sub: t('{n} messages · {ch}', { n: fmt.text.number(tk.messages.length), ch: D1.lab(D1.CHANNEL, tk.channel) }), body: `<div class="d1-thread" aria-live="polite">${msgs}</div>
              <form class="d1-compose" novalidate data-reply>
                ${UI.field({ type: 'textarea', name: 'body', label: 'Reply', rows: 4, required: true, maxlength: 2000, placeholder: 'Write a reply to the customer…', value: draft })}
                <div class="row wrap" style="gap:12px"><label class="check"><input type="checkbox" name="internal"> ${esc(t('Internal note (not sent to customer)'))}</label><label class="btn ghost sm" style="cursor:pointer">${UI.icon('file')}${esc(t('Attach file'))}<input type="file" hidden data-attach></label><span class="faint" data-files style="font-size:12px"></span><span class="sp" style="flex:1"></span>
                ${closed ? '' : UI.btn('Send & resolve', { variant: 'secondary', icon: 'checkc', attrs: 'data-send="resolve"' })}${UI.btn('Send', { variant: 'primary', icon: 'send', attrs: 'data-send="send"' })}</div>
              </form>` })}
            <div style="display:grid;gap:var(--gap)">
              ${UI.card({ title: 'Properties', icon: 'gear', tone: 'mauve', body: `<form class="d1-form" data-props novalidate>
                ${UI.field({ type: 'select', name: 'status', label: 'Status', value: tk.status, options: ['open', 'pending', 'in_progress', 'escalated', 'resolved', 'closed'].map((s) => ({ value: s, label: D1.ST.ticket[s][0] })) })}
                ${UI.field({ type: 'select', name: 'priority', label: 'Priority', value: tk.priority, options: ['urgent', 'high', 'medium', 'low'].map((p) => ({ value: p, label: D1.PRIO[p][0] })) })}
                ${UI.field({ type: 'select', name: 'assigneeId', label: 'Assigned To', value: tk.assignee ? tk.assignee.id : '', placeholder: 'Unassigned', options: agents.map((a) => ({ value: a.id, label: a.name })) })}
                <div class="row" style="gap:10px">${UI.btn('Assign to me', { variant: 'ghost', size: 'sm', icon: 'user', attrs: 'data-me' })}<span class="sp" style="flex:1"></span>${UI.btn('Save', { variant: 'primary', size: 'sm', icon: 'check', type: 'submit' })}</div></form>` })}
              ${UI.card({ title: 'Customer', icon: 'user', body: D1.dl([
                ['Name', tk.requester.type === 'merchant' ? `<a class="lnk plain" href="#admin-merchant-detail" data-go="admin-merchant-detail" data-params='${UI.attrJSON({ id: tk.requester.id })}'>${esc(tk.requester.name)}</a>` : `<a class="lnk plain" href="#admin-consumer-detail" data-go="admin-consumer-detail" data-params='${UI.attrJSON({ id: tk.requester.id })}'>${esc(tk.requester.name)}</a>`],
                ['Type', esc(t(tk.requester.type === 'merchant' ? 'Merchant' : 'Consumer'))], ['Email', `<span dir="ltr">${esc(tk.requester.email)}</span>`],
                ['Category', esc(D1.lab(D1.TICKET_CAT, tk.category))], ['Channel', esc(D1.lab(D1.CHANNEL, tk.channel))], ['Opened', D1.dt(tk.createdAt)], ['Last message', D1.dt(tk.lastMessageAt)],
                ['Related order', tk.relatedOrderId ? `<button type="button" class="lnk" data-order="${esc(tk.relatedOrderId)}">${fmt.id(tk.relatedOrderId)}</button>` : ''],
              ]) })}
            </div>
          </div>`;
        const th = el.querySelector('.d1-thread'); th.lastElementChild && th.lastElementChild.scrollIntoView({ block: 'nearest' });
      };
      const files = [];
      el.addEventListener('change', (e) => { if (e.target.matches('[data-attach]')) { [...e.target.files].forEach((f) => files.push(f.name)); e.target.value = ''; el.querySelector('[data-files]').textContent = files.join(', '); } });
      el.addEventListener('input', (e) => { if (e.target.name === 'body') draft = e.target.value; });
      UI.on(el, 'click', '[data-order]', (e, b) => D1.openOrder(b.dataset.order));
      UI.on(el, 'click', '[data-me]', (e) => { const s = el.querySelector('[data-props] [name="assigneeId"]'); s.value = 'usr_01'; });
      UI.on(el, 'click', '[data-send]', async (e, b) => {
        e.preventDefault();
        const form = el.querySelector('[data-reply]'); const v = UI.validate(form); if (!v.ok) return;
        b.disabled = true;
        try {
          await api('POST', `/admin/support/tickets/${id}/messages`, { body: v.values.body, internal: !!v.values.internal, attachments: files.slice() });
          if (b.dataset.send === 'resolve') await api('PATCH', '/admin/support/tickets/' + id, { status: 'resolved' });
          draft = ''; files.length = 0;
          UI.toast(t(v.values.internal ? 'Internal note added' : b.dataset.send === 'resolve' ? 'Reply sent · ticket resolved' : 'Reply sent'), { tone: 'success' });
          load();
        } catch (err) { D1.toastErr(err); b.disabled = false; }
      });
      el.addEventListener('submit', async (e) => {
        if (!e.target.matches('[data-props]')) { e.preventDefault(); return; }
        e.preventDefault(); const x = UI.formValues(e.target);
        if (await D1.run(() => api('PATCH', '/admin/support/tickets/' + id, { status: x.status, priority: x.priority, assigneeId: x.assigneeId || null }), 'Ticket updated')) load();
      });
      load();
    },
  });
})();
