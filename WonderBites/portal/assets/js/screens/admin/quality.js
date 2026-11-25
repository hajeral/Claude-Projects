/* (v1.4 dates) seeded dates rebased onto api.DEMO_TODAY = 2026-11-19 by qa/rebase_dates.py */
/* =====================================================================
   Admin · Quality & Safety (owner: D2)
   Routes: admin-quality · admin-compliance-detail {id}
   API: GET /admin/compliance (+summary) · GET|PATCH|DELETE /admin/compliance/{merchantId}
        POST /admin/compliance/{merchantId}/certificates · PATCH|DELETE /admin/compliance/certificates/{id}
        POST /admin/compliance/certificates/{id}/approve|reject · POST /admin/compliance/{merchantId}/hygiene-score
        POST /admin/compliance/{merchantId}/actions · POST /shared/uploads/presign
   Note: the Figma copied the Consumers KPIs here — this screen uses its own compliance KPIs (contract ComplianceSummary).
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc, ic = UI.icon;
  const TODAY = api.DEMO_TODAY; // (v1.4) single demo anchor
  const days = (iso) => Math.round((Date.parse(String(iso).slice(0, 10) + 'T00:00:00Z') - Date.parse(TODAY + 'T00:00:00Z')) / 864e5);
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const thumbFor = (id) => 'ph' + ((String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 6) + 1);
  const SORTS = [{ value: '-createdAt', label: 'Newest First' }, { value: 'createdAt', label: 'Oldest First' }, { value: '-hygieneScore', label: 'Hygiene score: high to low' }, { value: 'hygieneScore', label: 'Hygiene score: low to high' }, { value: 'name', label: 'Name A–Z' }];
  const hyg = (r) => { const p = (r.hygieneScore / r.hygieneMax) * 100; return `<div class="q-hyg"><span>${fmt.num(`${r.hygieneScore}/${r.hygieneMax}`)}</span>${Charts.progress(p, { height: 5, tone: p >= 75 ? '' : p >= 60 ? 'o' : 'r', label: 'Hygiene score' })}</div>`; };
  const expiryNote = (iso) => { if (!iso) return ''; const d = days(iso); return d < 0 ? `<small class="neg">${esc(t('Expired {n} days ago', { n: -d }))}</small>` : d <= 30 ? `<small class="q-warn">${esc(t('{n} days left', { n: d }))}</small>` : ''; };
  let F = {};

  App.route('admin-quality', {
    nav: 'Quality & Safety', title: 'Quality & Safety', subtitle: 'Monitor merchant compliance, food-safety certificates and hygiene scores.',
    exportResource: 'admin.compliance', exportColumns: ['Merchant', 'Merchant ID', 'Category', 'City', 'Food safety', 'Hygiene score', 'Open indicators', 'Compliance', 'Next expiry'],
    render(el) {
      el.classList.add('d2-page');
      el.innerHTML = `<div data-kpis>${UI.skeleton('kpis', 5)}</div><div data-f></div>${UI.card({ title: 'Merchant Compliance', sub: 'Compliance monitoring and food safety', icon: 'shield', tone: 'lime', flush: true, cls: 'q-tbl', body: '<div data-t></div>' })}`;
      const loadKpis = () => D2.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/compliance', { pageSize: 1 }), ({ summary: s }) => { const K = (label, icon, tone, value, foot, act) => D2.kpi({ key: label, label, delta: null }, { icon, tone, value, foot, act }); return `<div class="grid d2-kg" style="grid-template-columns:repeat(5,minmax(0,1fr))">${[
        K('Merchants Monitored', 'store', 'rose', fmt.number(s.monitored), esc(t('Under compliance monitoring')), 'f:'),
        K('Compliant', 'checkc', 'lime', fmt.number(s.compliant), `<b class="pos">${esc(t('All documents valid'))}</b>`, 'f:compliant'),
        K('Non-Compliant', 'xc', 'mauve', fmt.number(s.nonCompliant), `<b class="neg">${esc(t('Action required'))}</b>`, 'f:non_compliant'),
        K('Expiring Certificates', 'clock', 'orange', fmt.number(s.expiringCertificates), esc(t('Within the next 30 days')), 'c:expiring_soon'),
        K('Avg Hygiene Score', 'award', 'rose', `<span class="num">${fmt.text.number(s.avgHygieneScore, 1)}<small class="q-of">/${fmt.text.number(s.hygieneMax || 20)}</small></span>`, esc(t('Latest inspections'))),
      ].join('')}</div>`; }, { skeleton: 'kpis', n: 5 });
      loadKpis();
      const f = UI.mountFilters(el.querySelector('[data-f]'), {
        search: { name: 'q', placeholder: 'Search by merchant or ID' },
        selects: [{ name: 'complianceStatus', label: 'All compliance statuses', options: D2.statusOpts('compliance') }, { name: 'certificateStatus', label: 'All certificate statuses', options: D2.statusOpts('cert') }, { name: 'category', label: 'All categories', options: D2.opts(D2.CATEGORY, ['bakery', 'restaurant', 'grocery', 'cafe', 'desserts']) }],
        sort: { name: 'sort', options: SORTS, value: '-createdAt' }, values: F,
        actions: UI.btn('Export', { variant: 'secondary', icon: 'upload', attrs: 'data-act="export"' }),
      }, (v) => { F = v; tbl.setQuery({ page: 1, sort: v.sort }); });
      const reload = () => { tbl.reload(); loadKpis(); };
      const tbl = UI.dataTable(el.querySelector('[data-t]'), {
        select: true, pageSize: 10, sort: F.sort || '-createdAt', caption: 'Merchant Compliance',
        columns: [
          { key: 'name', label: 'Merchant', sortable: true, render: (r) => `<div class="prod">${UI.thumb(thumbFor(r.id))}<div><b>${D2.loc(r.merchant.name)}</b><small>${fmt.id(r.merchantCode)}</small></div></div>` },
          { key: 'category', label: 'Category', render: (r) => esc(D2.lab(D2.CATEGORY, r.category)) },
          { key: 'city', label: 'City', render: (r) => esc(D2.lab(D2.CITY, r.city)) },
          { key: 'foodSafety', label: 'Food safety', render: (r) => D2.pill('cert', r.foodSafety) },
          { key: 'hygieneScore', label: 'Hygiene score', sortable: true, render: hyg },
          { key: 'openIndicators', label: 'Open indicators', sortable: true, render: (r) => `<span class="${r.openIndicators ? 'b' : 'mut'}">${fmt.number(r.openIndicators)}</span>` },
          { key: 'compliance', label: 'Compliance', render: (r) => D2.pill('compliance', r.compliance) },
        ],
        fetch: (q) => api('GET', '/admin/compliance', { ...api.ctx(), ...f.values(), ...q }),
        rowClick: (r) => App.go('admin-compliance-detail', { id: r.id }),
        rowActions: (r) => [
          { icon: 'eye', label: 'View compliance', go: 'admin-compliance-detail', params: { id: r.id } },
          { icon: 'edit', label: 'Edit compliance status', run: () => editRow(r, reload) },
          { icon: 'trash', label: 'Remove from monitoring', danger: true, run: () => removeRow(r, reload) },
        ],
        bulkActions: [{ label: 'Request documents', icon: 'mail', run: (ids) => requestDocs(ids, reload) }, { label: 'Export selected', icon: 'upload', run: (ids) => { Overlays.export({ scope: 'Merchant Compliance', resource: 'admin.compliance', filters: { ids }, columns: ['Merchant', 'Category', 'City', 'Food safety', 'Hygiene score', 'Open indicators', 'Compliance'] }); return false; } }],
        empty: { icon: 'shield', title: 'No merchants match these filters', text: 'Try changing the filters or search.' },
      });
      UI.on(el, 'click', '[data-kact]', (e, b) => { const [k, v] = b.dataset.kact.split(':'); const key = k === 'c' ? 'certificateStatus' : 'complianceStatus'; f.set({ complianceStatus: '', certificateStatus: '', ...(v ? { [key]: v } : {}) }); F = f.values(); tbl.setQuery({ page: 1 }); });
      UI.on(el, 'click', '[data-act="export"]', () => Overlays.export({ scope: 'Merchant Compliance', resource: 'admin.compliance', filters: f.values(), columns: ['Merchant', 'Merchant ID', 'Category', 'City', 'Food safety', 'Hygiene score', 'Open indicators', 'Compliance', 'Next expiry'] }));
    },
  });

  function editRow(r, after) {
    UI.modal({ title: t('Edit compliance — {name}', { name: App.loc(r.merchant.name) }), icon: 'edit', tone: 'mauve', size: 'sm',
      body: `<form class="form-grid" novalidate>${UI.field({ type: 'select', name: 'compliance', label: 'Compliance status', required: true, value: r.compliance, options: D2.statusOpts('compliance'), full: true })}${UI.field({ type: 'textarea', name: 'note', label: 'Note', required: true, minlength: 5, rows: 3, full: true, placeholder: 'Why are you changing the status?' })}</form>`,
      actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Save changes', variant: 'primary', run: async (m) => {
        const form = m.el.querySelector('form'); const v = UI.validate(form); if (!v.ok) return false;
        try { await api('PATCH', '/admin/compliance/' + r.id, v.values); m.close(); UI.toast(t('Compliance status updated'), { tone: 'success' }); after && after(); } catch (e) { D2.fail(e, form); return false; }
      } }] });
  }
  async function removeRow(r, after) {
    if (!(await UI.confirm({ title: t('Remove {name} from monitoring?', { name: App.loc(r.merchant.name) }), text: t('Certificates and inspection history are kept, but the merchant no longer appears in this list or in expiry alerts.'), confirm: t('Remove'), danger: true }))) return false;
    try { await api('DELETE', '/admin/compliance/' + r.id); UI.toast(t('Removed from compliance monitoring'), { tone: 'success' }); after && after(); return true; } catch (e) { D2.fail(e); return false; }
  }
  function requestDocs(ids, after) {
    return new Promise((res) => UI.modal({ title: 'Request documents', icon: 'mail', tone: 'orange', size: 'sm',
      body: `<form class="form-grid" novalidate><p class="muted full" style="font-size:13px">${esc(ids.length === 1 ? t('The merchant gets an email and an in-app task to upload the missing or expiring documents.') : t('{n} merchants get an email and an in-app task to upload the missing or expiring documents.', { n: ids.length }))}</p>${UI.field({ type: 'date', name: 'dueAt', label: 'Due date', required: true, min: addDays(TODAY, 1), value: addDays(TODAY, 7), full: true })}${UI.field({ type: 'textarea', name: 'note', label: 'Message to merchant', rows: 3, full: true, placeholder: 'Optional' })}</form>`,
      actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Send request', variant: 'primary', icon: 'send', run: async (m) => {
        const form = m.el.querySelector('form'); const v = UI.validate(form); if (!v.ok) return false;
        if (v.values.dueAt <= TODAY) { D2.fieldErr(form, 'dueAt', 'Due date must be in the future.'); return false; }
        try { for (const id of ids) await api('POST', `/admin/compliance/${id}/actions`, { action: 'request_documents', dueAt: v.values.dueAt, note: v.values.note }); m.close(true); UI.toast(t(ids.length === 1 ? 'Document request sent' : 'Document requests sent to {n} merchants', { n: ids.length }), { tone: 'success' }); after && after(); }
        catch (e) { D2.fail(e, form); return false; }
      } }], onClose: (ok) => res(ok ? undefined : false) }));
  }

  /* ------------------------------------------------------------ compliance detail */
  function certRows(list) {
    if (!list.length) return UI.empty({ icon: 'file', title: 'No certificates on file', text: 'Upload the merchant’s food safety certificate to start.' });
    return `<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">${esc(t('Certificates'))}</caption><thead><tr><th>${esc(t('Document'))}</th><th>${esc(t('Expires'))}</th><th>${esc(t('Status'))}</th><th class="end">${esc(t('Actions'))}</th></tr></thead><tbody>${list.map((c) => `<tr data-cid="${esc(c.id)}"><td><div class="prod"><span class="d2-mi t-mauve">${ic('file')}</span><div><b>${esc(D2.lab(D2.CERT, c.type))}</b><small>${c.file ? (c.number ? fmt.id(esc(c.number)) : esc(t('No number'))) : esc(t('No file uploaded'))}</small></div></div></td><td><div class="q-exp">${c.expiresAt && c.status !== 'missing' ? D2.date(c.expiresAt) : '—'}${c.status !== 'missing' ? expiryNote(c.expiresAt) : ''}</div></td><td>${D2.pill('cert', c.status)}${c.reviewNote ? `<small class="q-note">${esc(D2.tx(c.reviewNote))}</small>` : ''}</td><td class="end"><div class="acts">
      ${c.status === 'pending_review' ? `<button type="button" class="btn icon" data-ca="approve" title="${esc(t('Approve'))}" aria-label="${esc(t('Approve'))}">${ic('check')}</button><button type="button" class="btn icon del" data-ca="reject" title="${esc(t('Reject'))}" aria-label="${esc(t('Reject'))}">${ic('xc')}</button>` : ''}
      ${c.file ? `<button type="button" class="btn icon" data-ca="file" title="${esc(t('View file'))}" aria-label="${esc(t('View file'))}">${ic('eye')}</button>` : `<button type="button" class="btn icon" data-ca="upload" title="${esc(t('Upload certificate'))}" aria-label="${esc(t('Upload certificate'))}">${ic('upload')}</button>`}
      ${c.status !== 'missing' ? `<button type="button" class="btn icon" data-ca="edit" title="${esc(t('Edit expiry'))}" aria-label="${esc(t('Edit expiry'))}">${ic('edit')}</button>` : ''}
      <button type="button" class="btn icon del" data-ca="delete" title="${esc(t('Delete'))}" aria-label="${esc(t('Delete'))}">${ic('trash')}</button></div></td></tr>`).join('')}</tbody></table></div>`;
  }
  const ACTIONS = [
    { key: 'request_documents', label: 'Request documents', icon: 'mail', variant: 'secondary' },
    { key: 'schedule_inspection', label: 'Schedule inspection', icon: 'cal', variant: 'secondary' },
    { key: 'warn', label: 'Send warning', icon: 'alert', variant: 'secondary' },
    { key: 'clear', label: 'Mark compliant', icon: 'checkc', variant: 'green' },
    { key: 'suspend', label: 'Suspend', icon: 'ban', variant: 'danger' },
  ];
  App.route('admin-compliance-detail', {
    nav: 'Quality & Safety', title: 'Compliance details', subtitle: 'Certificates, hygiene score, open indicators and compliance actions.',
    exportResource: 'admin.compliance', exportColumns: ['Document', 'Number', 'Issued', 'Expires', 'Status'],
    render(el, ctx) {
      el.classList.add('d2-page');
      const id = ctx.params && ctx.params.id;
      if (!id) { el.innerHTML = UI.card({ body: UI.empty({ icon: 'shield', title: 'No merchant selected', action: UI.btn('Back to Quality & Safety', { variant: 'primary', go: 'admin-quality' }) }) }); return; }
      let D = null;
      const draw = () => D2.async(el, () => api('GET', '/admin/compliance/' + id), ({ data }) => { D = data; return body(data); }, { skeleton: 'cards', n: 4 });
      function body(d) {
        const r = d.row; const p = Math.round((r.hygieneScore / r.hygieneMax) * 100);
        D2.setTitle(`${esc(t('Compliance'))} · ${D2.loc(r.merchant.name)}`);
        const openInd = d.indicators.filter((x) => x.open);
        return `<div class="d2-pagehead">${D2.back('Back to Quality & Safety', 'admin-quality')}</div>
          ${UI.card({ body: `<div class="q-head"><span class="ph ${thumbFor(r.id)} q-logo" aria-hidden="true"></span><div class="q-hd"><h2 class="sect-title">${D2.loc(r.merchant.name)}</h2><span class="d2-sub">${fmt.id(r.merchantCode)} · ${esc(D2.lab(D2.CATEGORY, r.category))} · ${esc(D2.lab(D2.CITY, r.city))}</span><div class="row wrap" style="margin-block-start:8px">${D2.pill('compliance', r.compliance)}${D2.pill('cert', r.foodSafety)}${r.suspended ? UI.chip('Suspended from listing', { tone: 'r', icon: 'ban' }) : ''}</div></div>
            <div class="q-acts">${ACTIONS.filter((a) => !(a.key === 'clear' && r.compliance === 'compliant') && !(a.key === 'suspend' && r.suspended)).map((a) => UI.btn(a.label, { variant: a.variant, icon: a.icon, size: 'sm', attrs: `data-qa="${a.key}"` })).join('')}${UI.btn('Merchant profile', { variant: 'ghost', icon: 'store', size: 'sm', go: 'admin-merchant-detail', params: { id: r.id } })}</div></div>
            <div class="q-facts">${[['Hygiene score', `${fmt.num(r.hygieneScore + '/' + r.hygieneMax)}`], ['Open indicators', fmt.number(r.openIndicators)], ['Next certificate expiry', r.nextExpiry ? D2.date(r.nextExpiry) + ' ' + expiryNote(r.nextExpiry) : '—'], ['Last inspection', r.lastInspectionAt ? D2.date(r.lastInspectionAt) : '—']].map(([k, v]) => `<div><span>${esc(t(k))}</span><b>${v}</b></div>`).join('')}</div>` })}
          <div class="grid q-g">
            <div class="grid" style="align-content:start">
              ${UI.card({ title: 'Certificates', icon: 'file', tone: 'mauve', count: fmt.number(d.certificates.length), actions: UI.btn('Upload certificate', { variant: 'primary', icon: 'upload', size: 'sm', attrs: 'data-act="upload"' }), flush: true, body: certRows(d.certificates) })}
              ${UI.card({ title: 'Activity', icon: 'clock', tone: 'rose', body: D2.timeline(d.actions) })}
            </div>
            <div class="grid" style="align-content:start">
              ${UI.card({ title: 'Hygiene score', icon: 'award', tone: 'lime', actions: UI.btn('Record score', { variant: 'secondary', icon: 'plus', size: 'sm', attrs: 'data-act="score"' }), body: `<div class="wal-ring">${Charts.ring(p, { size: 104, thickness: 10, color: p >= 75 ? 'lime' : p >= 60 ? 'orange' : 'rose', label: 'Hygiene score', text: fmt.num(`${r.hygieneScore}/${r.hygieneMax}`) })}<div><b>${esc(t(p >= 75 ? 'Good standing' : p >= 60 ? 'Needs improvement' : 'Below standard'))}</b><span class="d2-sub">${esc(t('Last inspection'))}: ${r.lastInspectionAt ? D2.date(r.lastInspectionAt) : '—'}</span></div></div>
                <div class="mt-16">${Charts.line({ series: [{ ...d.hygieneHistory, color: 'lime', dots: true }], min: 0, max: 20, yTicks: [0, 10, 20], width: 380, height: 150, legend: false, label: 'Hygiene score' })}</div>` })}
              ${UI.card({ title: 'Open indicators', icon: 'alert', tone: 'orange', count: fmt.number(openInd.length), actions: UI.link('View in Issues', 'admin-issues', { tab: 'issues' }), flush: true, body: d.indicators.length ? `<div class="d2-mrows">${d.indicators.map((x) => `<div class="d2-mr"><span class="d2-mi t-${x.open ? 'orange' : 'green'}">${ic(x.open ? 'alert' : 'checkc')}</span><span class="d2-ml">${esc(t(x.label))}</span>${UI.chip((D2.SEV[x.severity] || [x.severity])[0], { tone: (D2.SEV[x.severity] || [0, 'n'])[1] })}<b class="d2-mv" style="min-width:24px;text-align:end">${x.open ? fmt.number(x.count) : `<span class="pos">${esc(t('Closed'))}</span>`}</b></div>`).join('')}</div>` : UI.empty({ icon: 'checkc', title: 'No open indicators' }) })}
            </div>
          </div>`;
      }
      draw();
      UI.on(el, 'click', '[data-qa]', (e, b) => action(b.dataset.qa));
      UI.on(el, 'click', '[data-act="upload"]', () => uploadCert());
      UI.on(el, 'click', '[data-act="score"]', () => recordScore());
      UI.on(el, 'click', '[data-ca]', (e, b) => { const c = D.certificates.find((x) => x.id === b.closest('[data-cid]').dataset.cid); certAction(b.dataset.ca, c); });

      async function action(key) {
        const a = ACTIONS.find((x) => x.key === key); const name = App.loc(D.row.merchant.name);
        if (key === 'request_documents') { if ((await requestDocs([id], null)) !== false) draw(); return; }
        if (key === 'clear') { if (!(await UI.confirm({ title: t('Mark {name} compliant?', { name }), text: t('Open indicators are closed and the merchant’s compliance status becomes Compliant.'), confirm: t('Mark compliant') }))) return; return post({ action: 'clear' }, 'Marked compliant'); }
        const needsDate = key === 'schedule_inspection'; const danger = key === 'suspend';
        UI.modal({ title: t(danger ? 'Suspend {name}?' : a.label, { name }), icon: a.icon, tone: danger ? 'berry' : 'orange', size: 'sm',
          body: `<form class="form-grid" novalidate>${danger ? `<p class="muted full" style="font-size:13px">${esc(t('Live drops are paused and the merchant can’t publish new listings until the suspension is lifted.'))}</p>` : ''}${needsDate ? UI.field({ type: 'date', name: 'dueAt', label: 'Inspection date', required: true, min: addDays(TODAY, 1), value: addDays(TODAY, 3), full: true }) : ''}${UI.field({ type: 'textarea', name: 'note', label: danger ? 'Reason' : 'Note', required: danger || key === 'warn', minlength: danger || key === 'warn' ? 5 : undefined, rows: 3, full: true })}</form>`,
          actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: danger ? 'Suspend' : a.label, variant: danger ? 'danger' : 'primary', run: async (m) => {
            const form = m.el.querySelector('form'); const v = UI.validate(form); if (!v.ok) return false;
            if (v.values.dueAt && v.values.dueAt <= TODAY) { D2.fieldErr(form, 'dueAt', 'Due date must be in the future.'); return false; }
            try { await api('POST', `/admin/compliance/${id}/actions`, { action: key, ...v.values }); m.close(); UI.toast(t({ warn: 'Warning sent', schedule_inspection: 'Inspection scheduled', suspend: 'Merchant suspended' }[key]), { tone: 'success' }); draw(); } catch (e) { D2.fail(e, form); return false; }
          } }] });
      }
      async function post(body, msg) { try { await api('POST', `/admin/compliance/${id}/actions`, body); UI.toast(t(msg), { tone: 'success' }); draw(); } catch (e) { D2.fail(e); } }

      function certForm(c) {
        return `<form class="form-grid" novalidate>
          ${UI.field({ type: 'select', name: 'type', label: 'Document type', required: true, value: c ? c.type : 'food_safety', options: D2.opts(D2.CERT), full: true, disabled: !!c })}
          ${UI.field({ type: 'text', name: 'number', label: 'Certificate number', value: c ? c.number : '', maxlength: 40 })}
          ${UI.field({ type: 'date', name: 'issuedAt', label: 'Issued on', value: c && c.issuedAt ? c.issuedAt : '', max: TODAY })}
          ${UI.field({ type: 'date', name: 'expiresAt', label: 'Expires on', required: true, value: c && c.status !== 'missing' ? c.expiresAt : '', full: true })}
          ${c ? '' : UI.dropzone({ name: 'file', label: 'Certificate file', required: true, multiple: false, accept: 'application/pdf,image/png,image/jpeg', hint: 'PDF, JPG or PNG, up to 5 MB', full: true })}
        </form>`;
      }
      function uploadCert(preset) {
        UI.modal({ title: 'Upload certificate', icon: 'upload', tone: 'mauve', size: 'md', body: certForm(null),
          onOpen: (m) => { if (preset) m.el.querySelector('[name="type"]').value = preset; },
          actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Upload', variant: 'primary', icon: 'upload', run: async (m) => {
            const form = m.el.querySelector('form'); const v = UI.validate(form); if (!v.ok) return false;
            if (v.values.issuedAt && v.values.issuedAt >= v.values.expiresAt) { D2.fieldErr(form, 'expiresAt', 'Expiry must be after the issue date.'); return false; }
            const file = v.values.file[0];
            try {
              const pre = (await api('POST', '/shared/uploads/presign', { fileName: file.name, contentType: file.type || 'application/pdf', size: file.size || 0, purpose: 'certificate' })).data;
              await api('POST', `/admin/compliance/${id}/certificates`, { type: v.values.type, number: v.values.number, issuedAt: v.values.issuedAt || null, expiresAt: v.values.expiresAt, fileId: pre.fileId, fileName: file.name, size: file.size });
              m.close(); UI.toast(t('Certificate uploaded — pending review'), { tone: 'success' }); draw();
            } catch (e) { D2.fail(e, form); return false; }
          } }] });
      }
      function recordScore() {
        UI.modal({ title: 'Record hygiene score', icon: 'award', tone: 'lime', size: 'sm',
          body: `<form class="form-grid" novalidate>${UI.field({ type: 'number', name: 'score', label: 'Score', required: true, min: 0, max: 20, suffix: '/ 20', value: D.row.hygieneScore })}${UI.field({ type: 'date', name: 'inspectedAt', label: 'Inspection date', required: true, max: TODAY, value: TODAY })}${UI.field({ type: 'textarea', name: 'note', label: 'Inspector notes', rows: 3, full: true })}</form>`,
          actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Save score', variant: 'primary', run: async (m) => {
            const form = m.el.querySelector('form'); const v = UI.validate(form); if (!v.ok) return false;
            try { await api('POST', `/admin/compliance/${id}/hygiene-score`, { score: v.values.score, max: 20, inspectedAt: v.values.inspectedAt, note: v.values.note }); m.close(); UI.toast(t('Hygiene score recorded'), { tone: 'success' }); draw(); } catch (e) { D2.fail(e, form); return false; }
          } }] });
      }
      async function certAction(kind, c) {
        const label = D2.lab(D2.CERT, c.type);
        if (kind === 'upload') return uploadCert(c.type);
        if (kind === 'file') return UI.modal({ title: label, icon: 'file', tone: 'mauve', size: 'sm', body: `<div class="q-file"><span class="ph ph5" aria-hidden="true"></span><div><b>${esc(c.file.name)}</b><small>${esc(t('PDF document'))} · ${fmt.number(Math.round((c.file.size || 0) / 1024))} ${esc(t('KB'))}</small></div></div>${D2.dl([['Number', c.number ? fmt.id(esc(c.number)) : ''], ['Issued', c.issuedAt ? D2.date(c.issuedAt) : ''], ['Expires', D2.date(c.expiresAt)], ['Reviewed by', c.reviewedBy ? esc(c.reviewedBy.name) : '']])}`,
          actions: [{ label: 'Close', variant: 'secondary', close: true }, { label: 'Download', variant: 'primary', icon: 'download', run: (m) => { m.close(); UI.toast(t('Download started — {f}', { f: c.file.name }), { tone: 'info' }); } }] });
        if (kind === 'approve') { if (!(await UI.confirm({ title: t('Approve {doc}?', { doc: label }), text: t('The document is marked valid until its expiry date.'), confirm: t('Approve') }))) return; try { await api('POST', `/admin/compliance/certificates/${c.id}/approve`, {}); UI.toast(t('Certificate approved'), { tone: 'success' }); draw(); } catch (e) { D2.fail(e); } return; }
        if (kind === 'reject') return UI.modal({ title: t('Reject {doc}?', { doc: label }), icon: 'xc', tone: 'berry', size: 'sm', body: `<form novalidate>${UI.field({ type: 'textarea', name: 'reason', label: 'Reason', required: true, minlength: 5, rows: 3, placeholder: 'e.g. Document is not legible' })}</form>`,
          actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Reject', variant: 'danger', run: async (m) => { const form = m.el.querySelector('form'); const v = UI.validate(form); if (!v.ok) return false; try { await api('POST', `/admin/compliance/certificates/${c.id}/reject`, v.values); m.close(); UI.toast(t('Certificate rejected'), { tone: 'success' }); draw(); } catch (e) { D2.fail(e, form); return false; } } }] });
        if (kind === 'edit') return UI.modal({ title: t('Edit {doc}', { doc: label }), icon: 'edit', tone: 'mauve', size: 'md', body: certForm(c),
          actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Save changes', variant: 'primary', run: async (m) => {
            const form = m.el.querySelector('form'); const v = UI.validate(form); if (!v.ok) return false;
            if (v.values.issuedAt && v.values.issuedAt >= v.values.expiresAt) { D2.fieldErr(form, 'expiresAt', 'Expiry must be after the issue date.'); return false; }
            try { await api('PATCH', `/admin/compliance/certificates/${c.id}`, { number: v.values.number, issuedAt: v.values.issuedAt || null, expiresAt: v.values.expiresAt }); m.close(); UI.toast(t('Certificate updated'), { tone: 'success' }); draw(); } catch (e) { D2.fail(e, form); return false; }
          } }] });
        if (kind === 'delete') { if (!(await UI.confirm({ title: t('Delete {doc}?', { doc: label }), text: t('The file is removed from the merchant’s compliance record. This cannot be undone.'), confirm: t('Delete'), danger: true }))) return; try { await api('DELETE', `/admin/compliance/certificates/${c.id}`); UI.toast(t('Certificate deleted'), { tone: 'success' }); draw(); } catch (e) { D2.fail(e); } }
      }
    },
  });

  UI.css('d2-q', `
    .q-hyg{display:grid;gap:4px;min-width:64px}
    .q-hyg>span{font-weight:600}
    .q-of{font-size:14px;color:var(--muted);font-weight:600}
    .q-tbl .tbl th{white-space:normal;line-height:1.25}
    .q-tbl .tbl td{padding-inline:8px}
    .q-head{display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap}
    .q-logo{width:56px;height:56px;border-radius:14px;flex:none}
    .q-hd{flex:1;min-width:220px}
    .q-acts{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;max-width:560px}
    .q-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-block-start:18px}
    .q-facts>div{padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card-2);min-width:0}
    .q-facts span{display:block;font-size:11.5px;color:var(--muted)}
    .q-facts b{font-size:15px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
    .q-facts small{font-size:11px;font-weight:600}
    .q-g{grid-template-columns:minmax(0,1fr) 340px}
    .q-exp{display:grid;gap:2px}
    .q-exp small,.q-note{font-size:11px;font-weight:600;display:block}
    .q-warn{color:var(--warn)}
    .q-note{color:var(--muted);font-weight:500;margin-block-start:3px;white-space:normal;max-width:160px}
    .q-file{display:flex;gap:12px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:12px;margin-block-end:14px}
    .q-file .ph{width:44px;height:52px;border-radius:8px;flex:none}
    .q-file b{display:block;font-size:13px;overflow-wrap:anywhere}
    .q-file small{color:var(--faint);font-size:11.5px}
  `);
})();
