/* Merchant · Reports / Dispute (owner: D3)
   Routes: m-reports {tab}, m-report-detail {id}
   API: GET /merchant/disputes?status&q&branchId (+meta.summary) ; GET /merchant/disputes/{id} ;
        POST /merchant/disputes/{id}/replies ; POST /merchant/disputes/{id}/close
   Figma copy fix: subtitle was copied from Reviews; KPI "Total" now equals the real total. */
(function () {
  const { lt, ltx, esc } = D3;
  const TABS = [{ id: 'all', label: 'All' }, { id: 'open', label: 'Open' }, { id: 'in_progress', label: 'In progress' }, { id: 'resolved', label: 'Resolved' }, { id: 'closed', label: 'Closed' }];
  const PRI_TONE = { urgent: 'rose', high: 'orange', medium: 'mauve', low: 'lime' };
  const PRI_LABEL = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };
  const TYPE_LABEL = { delivery: 'Delivery', app: 'App', quality: 'Food quality', pickup: 'Pickup', payment: 'Payment' };

  function quickReply(r, after) {
    D3.modal({ title: t('Reply to {id}', { id: fmt.id(`#${r.number}`) }), size: 'md',
      body: `<form novalidate class="d3-fc"><div class="d3-qr-sub"><b>${ltx(r.subject)}</b><small class="d3-muted">${esc(r.customer.name)} · ${D3.date(r.createdAt)}</small></div>${UI.field({ type: 'textarea', name: 'body', label: t('Your reply'), rows: 5, required: true, minlength: 2, maxlength: 1500, placeholder: t('Write a reply to the customer and WonderBites support…') })}</form>`,
      actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Send reply', variant: 'primary', run: async (m) => {
        const f = m.el.querySelector('form'); const v = UI.validate(f); if (!v.ok) return;
        try { await api('POST', `/merchant/disputes/${r.id}/replies`, v.values); m.close(); D3.toast(t('Reply sent'), { tone: 'success' }); after && after(); } catch (err) { D3.fail(err, f); }
      } }] });
  }
  async function closeReport(r, after) {
    const m = D3.modal({ title: t('Close {id}?', { id: fmt.id(`#${r.number}`) }), size: 'sm',
      body: `<form novalidate class="d3-fc"><p class="d3-muted" style="margin:0">${t('Closing tells the customer and WonderBites support that no further action is needed.')}</p>${UI.field({ type: 'textarea', name: 'note', label: t('Closing note (optional)'), rows: 3, maxlength: 500 })}</form>`,
      actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Close report', variant: 'danger', run: async (mm) => {
        try { await api('POST', `/merchant/disputes/${r.id}/close`, UI.formValues(mm.el.querySelector('form'))); mm.close(); D3.toast(t('{id} closed', { id: fmt.id(`#${r.number}`) }), { tone: 'success' }); after && after(); } catch (err) { D3.fail(err); }
      } }] });
    return m;
  }

  /* ================= m-reports ================= */
  App.route('m-reports', {
    nav: 'Reports / Dispute', title: 'Reports / Dispute', subtitle: 'Track and resolve customer reports and disputes.',
    render(el, ctx) {
      let tab = (ctx.params && ctx.params.tab) || 'all';
      el.innerHTML = `<div data-kpis>${UI.skeleton('kpis', 4)}</div>
        <div class="d3-head">${UI.tabs({ name: 'rtab', label: 'Report status', active: tab, tabs: TABS.map((x) => ({ id: x.id, label: t(x.label) })) })}
          <div class="d3-rsearch">${UI.field({ type: 'search', name: 'q', label: t('Search reports'), placeholder: t('Search by ticket, customer or subject') })}</div></div>
        ${D3.card({ flush: true, body: '<div data-table></div>' })}`;
      let q = '';
      const loadKpis = () => D3.async(el.querySelector('[data-kpis]'), () => api('GET', '/merchant/disputes', { ...api.ctx(), pageSize: 1 }), (res) => {
        const s = res.meta.summary;
        return UI.kpis([
          { label: t('Open'), icon: 'info', tone: 'mauve', value: fmt.number(s.open), foot: t('Waiting for a first reply') },
          { label: t('In Progress'), icon: 'clock', tone: 'orange', value: fmt.number(s.inProgress), foot: t('Being worked on') },
          { label: t('Resolved'), icon: 'checkc', tone: 'lime', value: fmt.number(s.resolved), foot: t('Solution agreed') },
          { label: t('Total'), icon: 'clipboard', tone: 'rose', value: fmt.number(s.total), foot: t('{n} closed', { n: fmt.number(s.closed) }) },
        ], 4);
      }, { skeleton: 'kpis' });
      loadKpis();
      let rowNo = 0, rows = [];
      const table = UI.dataTable(el.querySelector('[data-table]'), {
        pageSize: 10,
        columns: [
          { key: 'n', label: '#', render: (r) => `<span class="d3-muted num">${r.__n}</span>` },
          { key: 'number', label: 'Ticket ID', render: (r) => `<b>${fmt.id(`#${r.number}`)}</b>` },
          { key: 'customer', label: 'User', render: (r) => esc(r.customer.name) },
          { key: 'subject', label: 'Subject', render: (r) => `<b>${ltx(r.subject)}</b>${r.orderId ? `<small class="d3-muted" style="display:block">${t('Order')} ${fmt.id(r.orderId)}</small>` : ''}` },
          { key: 'assignee', label: 'Assigned To', render: (r) => esc(r.assignee.name) },
          { key: 'createdAt', label: 'Date', render: (r) => D3.date(r.createdAt) },
          { key: 'status', label: 'Status', render: (r) => UI.pill(r.status) },
          { key: 'act', label: 'Actions', render: (r) => `<div style="display:flex;gap:6px">${UI.btn('View', { variant: 'secondary', size: 'sm', go: 'm-report-detail', params: { id: r.id } })}${UI.btn('Reply', { variant: 'primary', size: 'sm', attrs: `data-reply="${r.id}" ${r.status === 'closed' ? 'disabled aria-disabled="true" title="' + t('This report is closed.') + '"' : ''}` })}</div>` },
        ],
        fetch: async (qq) => { const res = await api('GET', '/merchant/disputes', { ...api.ctx(), ...qq, status: tab, q }); rowNo = ((res.meta.page || 1) - 1) * (res.meta.pageSize || 10); res.data.forEach((r) => { r.__n = ++rowNo; }); rows = res.data; return res; },
        rowClick: (r) => App.go('m-report-detail', { id: r.id }),
        empty: { icon: 'clipboard', title: 'No reports here', text: 'Nothing needs your attention in this tab.' },
      });
      el.addEventListener('ui:tab', (e) => { if (e.detail.name !== 'rtab') return; tab = e.detail.value; table.setQuery({ page: 1 }); });
      let deb; el.querySelector('[name="q"]').addEventListener('input', (e) => { clearTimeout(deb); deb = setTimeout(() => { q = e.target.value.trim(); table.setQuery({ page: 1 }); }, 250); });
      UI.on(el, 'click', '[data-reply]', (e, b) => { e.stopPropagation(); const r = rows.find((x) => x.id === b.dataset.reply); if (r) quickReply(r, () => { table.reload(); loadKpis(); }); });
    },
  });

  /* ================= m-report-detail ================= */
  App.route('m-report-detail', {
    nav: 'Reports / Dispute', title: 'Report details', subtitle: 'Track and resolve customer reports and disputes.',
    render(el, ctx) {
      const id = ctx.params && ctx.params.id;
      if (!id) { App.go('m-reports'); return; }
      D3.async(el, () => api('GET', `/merchant/disputes/${id}`), ({ data: r }) => {
        const closed = r.status === 'closed';
        setTimeout(() => wire(r), 0);
        return `
          <div><button type="button" class="d3-back" data-go="m-reports">${UI.icon('arrow-r', 'd3-backic')} ${t('Back to Reports / Dispute')}</button></div>
          <div class="d3-rd">
            ${D3.card({ title: `${ltx(r.subject)} <span class="d3-faint" style="font-weight:500">${fmt.id('#' + r.number)}</span>`, icon: 'chat', actions: UI.pill(r.status), body: `<div >
              <ol class="d3-thread" aria-label="${t('Conversation')}">${r.messages.map((m) => `<li class="d3-msg ${m.role}">
                ${UI.avatar(m.from.name, { size: 32 })}<div class="d3-bubble"><div class="d3-msg-h"><b>${esc(m.from.name)}</b><small class="d3-muted">${t({ customer: 'Customer', merchant: 'You', support: 'WonderBites Support' }[m.role] || '')} · ${D3.dateTime(m.at)}</small></div><p>${ltx(m.body)}</p></div></li>`).join('')}</ol>
              ${closed ? `<div class="d3-note">${UI.icon('info')}<span>${t('This report is closed. Replies are turned off.')}</span></div>` : `<form class="d3-compose" novalidate>${UI.field({ type: 'textarea', name: 'body', label: t('Reply'), rows: 3, required: true, maxlength: 1500, placeholder: t('Write a reply to the customer and WonderBites support…') })}<div class="d3-actions" style="padding-top:8px">${UI.btn('Send reply', { variant: 'primary', icon: 'send', type: 'submit' })}</div></form>`}
            </div>` })}
            <aside class="d3-tb-side">
              ${D3.card({ title: t('Details'), icon: 'info', body: `<div >
                ${[['Ticket ID', fmt.id(`#${r.number}`)], ['Customer', esc(r.customer.name)], ['Order', r.orderId ? fmt.id(r.orderId) : '—'], ['Type', t(TYPE_LABEL[r.type] || r.type)], ['Priority', UI.chip(t(PRI_LABEL[r.priority]), { tone: PRI_TONE[r.priority] })], ['Assigned To', esc(r.assignee.name)], ['Opened', D3.dateTime(r.createdAt)]].map(([k, v]) => `<div class="d3-row"><div class="d3-row-l"><b>${t(k)}</b></div><div>${v}</div></div>`).join('')}
              </div>` })}
              <div class="cd d3-cpad d3-tb-act">
                ${r.orderId ? UI.btn('View order', { variant: 'secondary', icon: 'clipboard', go: 'm-orders', params: { orderId: r.orderId } }) : ''}
                ${closed ? '' : UI.btn('Close report', { variant: 'danger', icon: 'xc', attrs: 'data-act="close"' })}
              </div>
            </aside>
          </div>`;
      }, { skeleton: 'form' });
      el.addEventListener('ui:retry', () => ctx.refresh());

      function wire(r) {
        const form = el.querySelector('.d3-compose');
        if (form) form.addEventListener('submit', async (e) => {
          e.preventDefault(); const v = UI.validate(form); if (!v.ok) return;
          await D3.busy(form.querySelector('[type="submit"]'), async () => {
            try { await api('POST', `/merchant/disputes/${r.id}/replies`, v.values); D3.toast(t('Reply sent'), { tone: 'success' }); ctx.refresh(); } catch (err) { D3.fail(err, form); }
          });
        });
        UI.on(el, 'click', '[data-act="close"]', () => closeReport(r, () => ctx.refresh()));
      }
    },
  });

  UI.css('d3-reports', `
    .d3-rsearch{min-width:300px}.d3-rsearch label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
    .d3-rd{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:var(--gap,24px);align-items:start}
    .d3-thread{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:14px}
    .d3-msg{display:flex;gap:10px;align-items:flex-start}
    .d3-msg.merchant{flex-direction:row-reverse}
    .d3-bubble{max-width:78%;padding:10px 14px;border-radius:14px;background:var(--card-2,var(--tint-mauve));border:1px solid var(--line)}
    .d3-msg.merchant .d3-bubble{background:var(--tint-rose);border-color:transparent}
    .d3-msg.support .d3-bubble{background:var(--tint-green)}
    .d3-msg-h{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
    .d3-bubble p{margin:4px 0 0;line-height:1.65}
    .d3-qr-sub b,.d3-qr-sub small{display:block}
    @media (max-width:1200px){.d3-rd{grid-template-columns:1fr}}
  `);
})();
