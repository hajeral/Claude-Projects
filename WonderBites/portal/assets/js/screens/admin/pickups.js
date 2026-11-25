/* =====================================================================
   Admin · Pickups  (owner: D1)
   Route: admin-pickups {status?, q?}
   API: GET /admin/pickups, /admin/pickups/summary, GET|PATCH /admin/pickups/:id,
        POST /admin/pickups/:id/verify, POST /admin/pickups/:id/cancel
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc;
  const STATUS_OPTS = ['upcoming', 'ready', 'flagged', 'missed', 'verified', 'picked_up', 'cancelled'].map((k) => ({ value: k, label: D1.ST.pickup[k][0] }));
  const SORTS = [{ value: '-createdAt', label: 'Newest First' }, { value: 'createdAt', label: 'Oldest First' }, { value: 'window', label: 'Pickup window' }];
  const CANCEL_REASONS = [['merchant_closed', 'Merchant closed early'], ['consumer_request', 'Consumer request'], ['food_safety', 'Food safety concern'], ['duplicate', 'Duplicate reservation'], ['other', 'Other']];
  const verifiable = (p) => ['upcoming', 'ready', 'flagged'].includes(p.status);
  const codeTone = { ready: 'g', flagged: 'r', missed: 'o', upcoming: 'n', verified: 'g', picked_up: 'g', cancelled: 'n' };
  const codeCell = (r) => `<span class="d1-code tone-${codeTone[r.status] || 'n'}">${esc(r.code)}</span>`;

  /** Verify modal. If pickup is unknown, asks for code first and looks it up. */
  function verifyModal(pickup, done) {
    const known = !!pickup;
    const body = `<form class="d1-form" novalidate>
      ${known ? `<div class="d1-banner">${UI.icon('package')}<div><b>${esc(pickup.bag ? pickup.bag.title : pickup.id)}</b><p>${fmt.id(pickup.id)} · ${esc(pickup.consumer ? pickup.consumer.name : '')} · ${D1.win(pickup.window)}</p></div></div>` : `<p class="muted" style="margin:0">${esc(t('Enter the 6-character pickup code shown on the consumer’s pickup passport.'))}</p>`}
      ${UI.field({ name: 'code', label: 'Pickup code', required: true, minlength: 6, maxlength: 6, placeholder: 'e.g. K3D8E7', pattern: '[A-Za-z0-9]{6}', autocomplete: 'off', hint: 'Letters and numbers, not case-sensitive.' })}
    </form>`;
    UI.modal({
      title: 'Verify pickup code', icon: 'qr', tone: 'lime', size: 'sm', body,
      onOpen: (m) => { const i = m.el.querySelector('[name="code"]'); i.style.textTransform = 'uppercase'; i.setAttribute('dir', 'ltr'); },
      actions: [
        { label: 'Cancel', variant: 'secondary', close: true },
        { label: 'Verify', variant: 'primary', run: async (m) => {
          const form = m.el.querySelector('form'); const v = UI.validate(form); if (!v.ok) return false;
          const code = String(v.values.code).toUpperCase();
          const fail = (msg) => { const f = form.querySelector('[data-field="code"]'); f.classList.add('invalid'); f.querySelector('.err').textContent = t(msg); form.querySelector('[name="code"]').focus(); return false; };
          try {
            let target = pickup;
            if (!target) {
              const { data } = await api('GET', '/admin/pickups', { q: code, pageSize: 5 });
              target = data.find((p) => p.code === code);
              if (!target) return fail('No pickup found with this code.');
            }
            const { data: res } = await api('POST', `/admin/pickups/${target.id}/verify`, { code });
            if (!res.valid) return fail('Code does not match this pickup.');
            m.close(true); UI.toast(t('Pickup {id} verified', { id: res.pickup.id }), { tone: 'success' }); if (done) done(res.pickup, res.order);
          } catch (e) { if (e.status === 409 || e.status === 422) return fail(e.message); D1.toastErr(e); return false; }
        } },
      ],
    });
  }

  App.route('admin-pickups', {
    nav: 'Pickups', title: 'Pickups',
    subtitle: 'Monitor pickup windows, passport codes and collection status across all locations.',
    render(el, ctx) {
      el.innerHTML = `<div data-kpis></div><div data-filters></div>
        ${UI.card({ title: 'All Pickups', sub: 'Summary of all pickups', icon: 'package', flush: true, body: '<div data-table></div>' })}`;
      const loadKpis = () => UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/pickups/summary', api.ctx()), ({ data: k }) => UI.kpis([
        { label: 'Total Pickups Today', icon: 'bag', tone: 'rose', value: fmt.number(k.totalToday), foot: t('Across all restaurants') },
        { label: 'Completed', icon: 'checkc', tone: 'lime', value: fmt.number(k.completed), foot: t('Verified at pickup'), go: 'admin-pickups', params: { status: 'verified' } },
        { label: 'Upcoming / Ready', icon: 'clock', tone: 'orange', value: fmt.number(k.upcomingReady), foot: t('Awaiting collection'), go: 'admin-pickups', params: { status: 'ready' } },
        { label: 'Missed', icon: 'xc', tone: 'mauve', value: fmt.number(k.missed), foot: t('Window passed without pickup'), go: 'admin-pickups', params: { status: 'missed' } },
        { label: 'On-time Rate', icon: 'gauge', tone: 'berry', value: fmt.pct(k.onTimeRatePct), foot: t('Collected within window') },
      ]), { skeleton: 'kpis', n: 5 });
      loadKpis();

      const filters = UI.mountFilters(el.querySelector('[data-filters]'), {
        search: { name: 'q', placeholder: 'Search by pickup code, ID or user' },
        selects: [
          { name: 'status', label: 'All Status', options: STATUS_OPTS },
          { name: 'category', label: 'All Categories', options: D1.opts(D1.CATEGORY).filter((o) => !['produce', 'other'].includes(o.value)) },
          { name: 'city', label: 'All Cities', options: D1.opts(D1.CITY) },
          { name: 'dietary', label: 'All Dietary tags', options: D1.opts(D1.DIET) },
        ],
        sort: { name: 'sort', label: 'Sort', options: SORTS, value: '-createdAt' },
        values: { status: (() => { const st = D1.take(ctx, 'status'), fl = D1.take(ctx, 'filter'); return fl === 'attention' ? 'flagged' : st === 'completed' ? 'verified' : st || ''; })(), q: D1.take(ctx, 'q') || '' },
        actions: UI.btn('Verify code', { variant: 'primary', icon: 'qr', attrs: 'data-act="verify"' }) + UI.btn('Export', { variant: 'secondary', icon: 'upload', attrs: 'data-act="export"' }),
      }, () => table.setQuery({ page: 1 }));

      const refreshAll = () => { table.reload(); loadKpis(); };
      const table = UI.dataTable(el.querySelector('[data-table]'), {
        select: true, pageSize: 10, caption: 'All Pickups',
        columns: [
          { key: 'pickup', label: 'Pickup', render: (r) => D1.prod(r.bag && r.bag.thumb, r.bag ? r.bag.title : '—', fmt.id(r.id)) },
          { key: 'user', label: 'User', render: (r) => (r.consumer ? `<a class="lnk plain" href="#admin-consumer-detail" data-go="admin-consumer-detail" data-params='${UI.attrJSON({ id: r.consumer.id })}'>${esc(r.consumer.name)}</a>` : '—') },
          { key: 'merchant', label: 'Restaurants', render: (r) => esc(r.merchant.name) },
          { key: 'window', label: 'Window', render: (r) => D1.win(r.window) },
          { key: 'code', label: 'Code', render: codeCell },
          { key: 'city', label: 'City', render: (r) => esc(D1.lab(D1.CITY, r.city)) },
          { key: 'status', label: 'Status', render: (r) => D1.pill('pickup', r.status) },
        ],
        fetch: (q) => { const f = filters.values(); return api('GET', '/admin/pickups', { ...api.ctx(), ...f, ...q, sort: q.sort || f.sort }); },
        rowClick: (r) => openDrawer(r.id),
        rowActions: (r) => [
          { icon: 'eye', label: 'View', run: () => openDrawer(r.id) },
          { icon: 'edit', label: 'Edit', run: () => editModal(r) },
          { icon: 'trash', label: 'Cancel pickup', danger: true, run: () => cancel(r) },
        ],
        bulkActions: [{ label: 'Export selected', icon: 'upload', run: (ids) => { Overlays.export({ scope: 'Pickups', endpoint: '/admin/pickups', filters: { ids } }); return false; } }],
        empty: { icon: 'package', title: 'No pickups found', text: 'Try changing the filters or search.' },
      });

      UI.on(el, 'click', '[data-act="export"]', () => Overlays.export({ scope: 'Pickups', endpoint: '/admin/pickups', columns: ['Pickup', 'User', 'Restaurants', 'Window', 'Code', 'City', 'Status'], filters: filters.values() }));
      UI.on(el, 'click', '[data-act="verify"]', () => verifyModal(null, refreshAll));

      function editModal(r, done) {
        if (['verified', 'picked_up', 'cancelled'].includes(r.status)) { UI.toast(t('Completed or cancelled pickups can’t be edited.'), { tone: 'info' }); return; }
        const opts = ['upcoming', 'ready', 'flagged'].map((k) => ({ value: k, label: D1.ST.pickup[k][0] }));
        UI.modal({
          title: 'Edit pickup', icon: 'edit', size: 'sm',
          body: `<form class="d1-form" novalidate><p class="muted" style="margin:0">${fmt.id(r.id)} · ${esc(r.bag ? r.bag.title : '')}</p>
            <div class="form-grid">${UI.field({ type: 'time', name: 'start', label: 'Window starts', value: r.window.start, required: true })}${UI.field({ type: 'time', name: 'end', label: 'Window ends', value: r.window.end, required: true })}</div>
            ${UI.field({ type: 'select', name: 'status', label: 'Status', value: r.status === 'missed' ? 'upcoming' : r.status, options: opts, hint: r.status === 'missed' ? 'Rescheduling a missed pickup re-opens it as Upcoming.' : '' })}</form>`,
          actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Save changes', variant: 'primary', run: async (m) => {
            const form = m.el.querySelector('form'); const v = UI.validate(form); if (!v.ok) return false;
            if (v.values.end <= v.values.start) { const f = form.querySelector('[data-field="end"]'); f.classList.add('invalid'); f.querySelector('.err').textContent = t('Pickup window end must be after start'); return false; }
            try { await api('PATCH', '/admin/pickups/' + r.id, { window: { start: v.values.start, end: v.values.end }, status: v.values.status }); m.close(true); UI.toast(t('Pickup updated'), { tone: 'success' }); refreshAll(); if (done) done(); } catch (e) { D1.showFieldErrors(form, e); D1.toastErr(e); return false; }
          } }],
        });
      }
      async function cancel(r, done) {
        if (['verified', 'picked_up', 'cancelled'].includes(r.status)) { UI.toast(t('This pickup is already closed.'), { tone: 'info' }); return; }
        const v = await D1.reasonModal({
          title: 'Cancel pickup?', icon: 'alert', danger: true, confirm: 'Cancel pickup',
          text: esc(t('The reservation is cancelled and the consumer is notified.')),
          reasons: CANCEL_REASONS,
          extra: UI.field({ type: 'checkbox', name: 'refund', label: 'Refund the consumer to the original payment method', checked: true }),
          onSubmit: (vals) => api('POST', `/admin/pickups/${r.id}/cancel`, { reason: vals.reason, note: vals.note, refund: vals.refund }),
        });
        if (v) { UI.toast(t(v.refund ? 'Pickup cancelled · refund issued' : 'Pickup cancelled'), { tone: 'success' }); refreshAll(); if (done) done(); }
      }

      function openDrawer(id) {
        const d = UI.drawer({ title: 'Pickup details', width: 520, body: UI.skeleton('form', 6) });
        const paint = async () => {
          try {
            const { data: p } = await api('GET', '/admin/pickups/' + id);
            if (d.closed) return;
            const o = p.order;
            d.body.innerHTML = `
              <div class="d1-head" style="margin-block-end:16px">${UI.thumb(p.bag ? p.bag.thumb : 'ph1', 'lg')}<div style="min-width:0"><h3 class="h-serif" style="margin:0 0 4px">${esc(p.bag ? p.bag.title : p.id)}</h3><div class="row wrap" style="gap:8px">${fmt.id(p.id)}${D1.pill('pickup', p.status)}</div></div></div>
              ${p.flagReason ? `<div class="d1-banner bad" style="margin-block-end:16px">${UI.icon('flag')}<div><b>${esc(t('Flagged'))}</b><p>${esc(p.flagReason)}</p></div></div>` : ''}
              ${p.verifiedAt ? `<div class="d1-banner ok" style="margin-block-end:16px">${UI.icon('checkc')}<div><b>${esc(t('Verified'))}</b><p>${D1.dt(p.verifiedAt)} · ${esc(p.verifiedBy || '')}</p></div></div>` : ''}
              ${D1.section('Pickup', D1.dl([
                ['Pickup code', codeCell(p)], ['Date', fmt.date(p.window.date)], ['Window', D1.win(p.window)], ['Quantity', fmt.number(p.quantity)],
                ['Restaurant', `<a class="lnk plain" href="#admin-merchant-detail" data-go="admin-merchant-detail" data-params='${UI.attrJSON({ id: p.merchant.id })}'>${esc(p.merchant.name)}</a>`], ['Branch', esc(p.branch.name)], ['City', esc(D1.lab(D1.CITY, p.city))],
              ]))}
              ${D1.section('Consumer', D1.dl([['Name', p.consumer ? `<a class="lnk plain" href="#admin-consumer-detail" data-go="admin-consumer-detail" data-params='${UI.attrJSON({ id: p.consumer.id })}'>${esc(p.consumer.name)}</a>` : '—']]))}
              ${o ? D1.section('Order', D1.dl([['Order', fmt.id(o.id)], ['Amount', `<b>${D1.money(o.total)}</b>`], ['Payment', D1.card(o.paymentMethod)], ['Order status', D1.pill('order', o.status)]]), UI.btn('View order', { variant: 'ghost', size: 'sm', icon: 'clipboard', attrs: 'data-dact="order"' })) : ''}`;
            let f = d.el.querySelector('.ov-f'); if (!f) { f = document.createElement('div'); f.className = 'ov-f'; d.el.appendChild(f); }
            const open = verifiable(p) || p.status === 'missed';
            f.innerHTML = `${open ? UI.btn('Cancel pickup', { variant: 'danger', icon: 'x', attrs: 'data-dact="cancel"' }) : ''}<span style="flex:1"></span>${open ? UI.btn('Edit', { variant: 'secondary', icon: 'edit', attrs: 'data-dact="edit"' }) : ''}${verifiable(p) ? UI.btn('Verify code', { variant: 'primary', icon: 'qr', attrs: 'data-dact="verify"' }) : UI.btn('Close', { variant: 'secondary', attrs: 'data-close' })}`;
            f.onclick = (e) => {
              const b = e.target.closest('[data-dact]'); if (!b) return; const a = b.dataset.dact;
              if (a === 'verify') verifyModal(p, () => { refreshAll(); paint(); });
              if (a === 'edit') editModal(p, paint);
              if (a === 'cancel') cancel(p, paint);
              if (a === 'order') { d.close(); App.go('admin-orders', { q: o.id, open: o.id }); }
            };
            d.body.onclick = (e) => { if (e.target.closest('[data-dact="order"]')) { d.close(); App.go('admin-orders', { q: o.id, open: o.id }); } };
          } catch (e) { d.body.innerHTML = UI.errorState({ text: D1.err(e) }); d.body.addEventListener('ui:retry', paint, { once: true }); }
        };
        paint();
      }
      { const o = D1.take(ctx, 'open'); if (o) openDrawer(o); }
    },
  });
  window.D1.verifyPickup = verifyModal;
})();
