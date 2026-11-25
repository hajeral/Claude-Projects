/* =====================================================================
   Admin · Drops  (owner: D1)
   Routes: admin-drops {status?}, admin-drop-edit {id}
   API: GET /admin/drops, /admin/drops/summary, GET|PATCH|DELETE /admin/drops/:id,
        POST /admin/drops/:id/flag|unflag, POST /admin/drops/bulk
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc;
  const FLAG_REASONS = [['misleading_photo', 'Misleading photo'], ['wrong_price', 'Wrong price or value'], ['food_safety', 'Food safety concern'], ['allergen_missing', 'Allergen info missing'], ['duplicate', 'Duplicate drop'], ['other', 'Other']];
  const STATUS_OPTS = [['live', 'Active'], ['scheduled', 'Scheduled'], ['sold_out', 'Sold Out'], ['completed', 'Completed'], ['expired', 'Expired'], ['flagged', 'Flagged'], ['paused', 'Paused']].map(([value, label]) => ({ value, label }));
  const SORTS = [{ value: '-createdAt', label: 'Newest First' }, { value: 'createdAt', label: 'Oldest First' }, { value: 'price', label: 'Price: Low to High' }, { value: '-price', label: 'Price: High to Low' }, { value: '-remaining', label: 'Most Available' }];
  const flagLabel = (k) => t((FLAG_REASONS.find((r) => r[0] === k) || [k, String(k || '').replace(/_/g, ' ')])[1]);

  function priceCell(r) {
    return `<div class="price"><small><s>${D1.money(r.originalPrice)}</s></small><b>${D1.money(r.price)}</b><small><em>${t('{n} off', { n: fmt.pct(r.discountPct, { dec: 0 }) })}</em></small></div>`;
  }
  function availCell(r) {
    return `<div class="avail"><div class="t">${t('{a}/{b} reserved', { a: fmt.number(r.reserved), b: fmt.number(r.quantity) })}</div>${Charts.progress(r.reserved, { max: r.quantity || 1, label: 'Availability' })}</div>`;
  }

  App.route('admin-drops', {
    nav: 'Drops', title: 'Drops',
    subtitle: 'Manage scheduled and active food drops across all locations.',
    render(el, ctx) {
      el.innerHTML = `<div data-kpis></div><div data-filters></div>
        ${UI.card({ title: 'All Drops', sub: 'Summary of all drops', icon: 'bag', flush: true, body: '<div data-table></div>' })}`;

      const loadKpis = () => UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/drops/summary', api.ctx()), ({ data: k }) => UI.kpis([
        { label: 'Total Drops', icon: 'bag', tone: 'rose', value: fmt.number(k.totalDrops), foot: t('Across all restaurants') },
        { label: 'Bags Available Now', icon: 'basket', tone: 'lime', value: fmt.number(k.bagsAvailableNow), foot: t('From active drops'), go: 'admin-drops', params: { status: 'live' } },
        { label: 'Reserved', icon: 'clock', tone: 'orange', value: fmt.number(k.reserved), foot: t('Bags reserved') },
        { label: 'Collected', icon: 'checkc', tone: 'mauve', value: fmt.number(k.collected), foot: t('Bags picked up'), go: 'admin-pickups' },
        { label: 'Flagged for Review', icon: 'flag', tone: 'berry', value: fmt.number(k.flaggedForReview), foot: t('Needs admin action'), go: 'admin-drops', params: { status: 'flagged' } },
      ]), { skeleton: 'kpis', n: 5 });
      loadKpis();

      const filters = UI.mountFilters(el.querySelector('[data-filters]'), {
        search: { name: 'q', placeholder: 'Search by box ID' },
        selects: [
          { name: 'status', label: 'All Status', options: STATUS_OPTS },
          { name: 'category', label: 'All Categories', options: D1.opts(D1.CATEGORY).filter((o) => !['produce', 'other'].includes(o.value)) },
          { name: 'city', label: 'All Cities', options: D1.opts(D1.CITY) },
          { name: 'dietary', label: 'All Dietary tags', options: D1.opts(D1.DIET) },
        ],
        sort: { name: 'sort', label: 'Sort', options: SORTS, value: '-createdAt' },
        values: { status: D1.take(ctx, 'status') || '' },
        actions: UI.btn('Export', { variant: 'secondary', icon: 'upload', attrs: 'data-act="export"' }),
      }, () => table.setQuery({ page: 1 }));

      const refreshAll = () => { table.reload(); loadKpis(); };
      const table = UI.dataTable(el.querySelector('[data-table]'), {
        select: true, pageSize: 10, caption: 'All Drops',
        columns: [
          { key: 'title', label: 'Drops', render: (r) => D1.prod(r.thumb, r.title, fmt.id(r.id)) },
          { key: 'merchant', label: 'Restaurants', render: (r) => `<a class="lnk plain" href="#admin-merchant-detail" data-go="admin-merchant-detail" data-params='${UI.attrJSON({ id: r.merchant.id })}'>${esc(r.merchant.name)}</a>` },
          { key: 'category', label: 'Category', render: (r) => esc(D1.lab(D1.CATEGORY, r.category)) },
          { key: 'price', label: 'Price', render: priceCell },
          { key: 'availability', label: 'Availability', render: availCell },
          { key: 'window', label: 'Window', render: (r) => D1.win(r.pickupWindow) },
          { key: 'city', label: 'City', render: (r) => esc(D1.lab(D1.CITY, r.city)) },
          { key: 'status', label: 'Status', render: (r) => D1.pill('drop', r.status) },
        ],
        fetch: (q) => { const f = filters.values(); return api('GET', '/admin/drops', { ...api.ctx(), ...f, ...q, sort: q.sort || f.sort }); },
        rowClick: (r) => openDrawer(r.id),
        rowActions: (r) => [
          { icon: 'eye', label: 'View', run: () => openDrawer(r.id) },
          { icon: 'edit', label: 'Edit', run: () => App.go('admin-drop-edit', { id: r.id }) },
          { icon: 'trash', label: 'Delete', danger: true, run: () => del(r) },
        ],
        bulkActions: [
          { label: 'Flag for review', icon: 'flag', run: (ids) => bulk(ids, 'flag') },
          { label: 'Pause', icon: 'pause', run: (ids) => bulk(ids, 'pause') },
          { label: 'Activate', icon: 'play', run: (ids) => bulk(ids, 'activate') },
          { label: 'Delete', icon: 'trash', danger: true, run: (ids) => bulk(ids, 'delete') },
        ],
        empty: { icon: 'bag', title: 'No drops found', text: 'Try changing the filters or search.' },
      });

      { const o = D1.take(ctx, 'id'); if (o) setTimeout(() => openDrawer(o), 0); }
      UI.on(el, 'click', '[data-act="export"]', () => Overlays.export({ scope: 'Drops', endpoint: '/admin/drops', columns: ['Drops', 'Restaurants', 'Category', 'Price', 'Availability', 'Window', 'City', 'Status'], filters: filters.values() }));

      async function bulk(ids, action) {
        const n = ids.length;
        const copy = {
          delete: ['Delete {n} drops?', 'Drops with live reservations will be skipped. This cannot be undone.', 'Delete', true],
          flag: ['Flag {n} drops for review?', 'Flagged drops are hidden from consumers until reviewed.', 'Flag for review', false],
          pause: ['Pause {n} drops?', 'Paused drops stop taking new reservations.', 'Pause', false],
          activate: ['Activate {n} drops?', 'Activated drops become visible to consumers again.', 'Activate', false],
        }[action];
        const ok = await UI.confirm({ title: t(copy[0], { n: fmt.text.number(n) }), text: copy[1], confirm: copy[2], danger: copy[3] });
        if (!ok) return false;
        try {
          const { data } = await api('POST', '/admin/drops/bulk', { ids, action });
          const failed = (data.failed || []).length;
          UI.toast(failed ? t('{n} updated, {f} skipped', { n: fmt.text.number(data.updated), f: fmt.text.number(failed) }) : t('{n} drops updated', { n: fmt.text.number(data.updated) }), { tone: failed ? 'info' : 'success' });
          loadKpis(); return true;
        } catch (e) { D1.toastErr(e); return false; }
      }

      async function del(r, after) {
        const ok = await UI.confirm({ title: t('Delete drop?'), text: t('"{name}" will be removed for consumers. This cannot be undone.', { name: r.title }), confirm: 'Delete', danger: true });
        if (!ok) return;
        try {
          await api('DELETE', '/admin/drops/' + r.id);
          UI.toast(t('Drop deleted'), { tone: 'success' }); if (after) after(); refreshAll();
        } catch (e) {
          if (e.status === 409 && e.details && e.details.forceable) {
            const force = await UI.confirm({ title: t('This drop has live reservations'), text: t('{n} consumers have reserved this drop. Deleting it will cancel and refund their reservations.', { n: fmt.text.number(e.details.reserved) }), confirm: 'Delete and refund', danger: true });
            if (!force) return;
            try { const { data } = await api('DELETE', '/admin/drops/' + r.id, { force: true }); UI.toast(t('Drop deleted · {n} reservations refunded', { n: fmt.text.number(data.refundedReservations) }), { tone: 'success' }); if (after) after(); refreshAll(); } catch (e2) { D1.toastErr(e2); }
          } else D1.toastErr(e);
        }
      }

      async function flag(r, done) {
        const v = await D1.reasonModal({
          title: 'Flag drop for review', icon: 'flag', confirm: 'Flag for review',
          text: esc(t('Flagged drops are hidden from consumers and a moderation case is opened.')),
          reasons: FLAG_REASONS,
          onSubmit: (vals) => api('POST', `/admin/drops/${r.id}/flag`, { reason: vals.reason, note: vals.note }),
        });
        if (v) { UI.toast(t('Drop flagged · moderation case opened'), { tone: 'success' }); refreshAll(); if (done) done(); }
      }
      async function unflag(r, done) {
        const ok = await UI.confirm({ title: t('Clear flag?'), text: t('The drop will be visible to consumers again.'), confirm: 'Clear flag' });
        if (!ok) return;
        const res = await D1.run(() => api('POST', `/admin/drops/${r.id}/unflag`), 'Flag cleared');
        if (res) { refreshAll(); if (done) done(); }
      }

      function openDrawer(id) {
        const d = UI.drawer({ title: 'Drop details', width: 520, body: UI.skeleton('form', 6), actions: [] });
        const paint = async () => {
          try {
            const { data: r } = await api('GET', '/admin/drops/' + id);
            if (d.closed) return;
            d.body.innerHTML = `
              <div class="d1-head" style="margin-block-end:16px">${UI.thumb(r.thumb, 'lg')}<div style="min-width:0"><h3 class="h-serif" style="margin:0 0 4px">${esc(r.title)}</h3><div class="row wrap" style="gap:8px">${fmt.id(r.id)}${D1.pill('drop', r.status)}</div></div></div>
              ${r.flagged ? `<div class="d1-banner bad" style="margin-block-end:16px">${UI.icon('flag')}<div><b>${esc(t('Flagged for review'))}</b><p>${esc(flagLabel(r.flagReason))}${r.flagNote ? ' — ' + esc(r.flagNote) : ''}</p></div></div>` : ''}
              ${D1.section('Overview', D1.dl([
                ['Restaurant', `<a class="lnk plain" href="#admin-merchant-detail" data-go="admin-merchant-detail" data-params='${UI.attrJSON({ id: r.merchant.id })}'>${esc(r.merchant.name)}</a>`],
                ['Branch', esc(r.branch.name)], ['Category', esc(D1.lab(D1.CATEGORY, r.category))], ['City', esc(D1.lab(D1.CITY, r.city))],
                ['Pickup date', fmt.date(r.date)], ['Pickup window', D1.win(r.pickupWindow)],
              ]))}
              ${D1.section('Pricing & availability', `${D1.dl([['Original value', D1.money(r.originalPrice)], ['Price', `<b>${D1.money(r.price)}</b> · ${t('{n} off', { n: fmt.pct(r.discountPct, { dec: 0 }) })}`], ['Quantity', fmt.number(r.quantity)], ['Reserved', fmt.number(r.reserved)], ['Collected', fmt.number(r.collected)], ['Remaining', fmt.number(r.remaining)]])}<div style="margin-block-start:12px">${Charts.progress(r.reserved, { max: r.quantity || 1, label: 'Availability' })}</div>`)}
              ${D1.section('Dietary & allergens', `<div class="d1-chips">${(r.dietary || []).map((x) => UI.chip(D1.DIET[x] || x, { tone: 'green', icon: 'leaf' })).join('')}${(r.allergens || []).map((x) => UI.chip(D1.ALLERGEN[x] || x, { tone: 'orange', icon: 'alert' })).join('')}</div>`)}
              ${D1.section('Description', `<p class="muted" style="margin:0;font-size:13px">${esc(r.description)}</p>`)}
              ${D1.section('Created', `<p class="muted" style="margin:0;font-size:13px">${D1.dt(r.createdAt)}</p>`)}`;
            const f = d.el.querySelector('.ov-f') || (() => { const x = document.createElement('div'); x.className = 'ov-f'; d.el.appendChild(x); return x; })();
            f.innerHTML = `${UI.btn('Delete', { variant: 'danger', icon: 'trash', attrs: 'data-dact="delete"' })}<span class="sp" style="flex:1"></span>${r.flagged ? UI.btn('Clear flag', { variant: 'secondary', icon: 'check', attrs: 'data-dact="unflag"' }) : UI.btn('Flag for review', { variant: 'secondary', icon: 'flag', attrs: 'data-dact="flag"' })}${UI.btn('Edit drop', { variant: 'primary', icon: 'edit', attrs: 'data-dact="edit"' })}`;
            f.onclick = (e) => {
              const b = e.target.closest('[data-dact]'); if (!b) return; const a = b.dataset.dact;
              if (a === 'edit') { d.close(); App.go('admin-drop-edit', { id: r.id }); }
              if (a === 'delete') del(r, () => d.close());
              if (a === 'flag') flag(r, paint);
              if (a === 'unflag') unflag(r, paint);
            };
          } catch (e) { d.body.innerHTML = UI.errorState({ text: D1.err(e) }); d.body.addEventListener('ui:retry', paint, { once: true }); }
        };
        paint();
      }
    },
  });

  /* ---------------- Edit drop ---------------- */
  App.route('admin-drop-edit', {
    nav: 'Drops', title: 'Edit Drop', subtitle: 'Update pricing, quantity, pickup window and details.',
    render(el, ctx) {
      const id = ctx.params.id;
      if (!id) { el.innerHTML = UI.card({ body: UI.empty({ icon: 'bag', title: 'No drop selected', text: 'Choose a drop from the list to edit it.', action: UI.btn('Back to Drops', { variant: 'primary', go: 'admin-drops' }) }) }); return; }
      el.innerHTML = `<div data-form>${UI.card({ body: UI.skeleton('form', 8) })}</div>`;
      const box = el.querySelector('[data-form]');
      const load = async () => {
        try {
          const { data: r } = await api('GET', '/admin/drops/' + id);
          ctx.setTitle('Edit Drop', null);
          const STATUSES = [['live', 'Active'], ['paused', 'Paused'], ['scheduled', 'Scheduled']].concat(['live', 'paused', 'scheduled'].includes(r.status) ? [] : [[r.status, D1.ST.drop[r.status][0]]]).map(([value, label]) => ({ value, label }));
          box.innerHTML = `<form class="d1-form" novalidate>
            <div class="d1-head">${UI.btn('Back to Drops', { variant: 'ghost', icon: 'chev-l', iconCls: 'flip', go: 'admin-drops' })}<span class="sp"></span>${fmt.id(r.id)}${D1.pill('drop', r.status)}</div>
            ${UI.card({ title: 'Details', icon: 'bag', body: `<div class="form-grid">
              ${UI.field({ name: 'titleEn', label: 'Title (English)', value: r.titleI18n.en, required: true, maxlength: 80 })}
              ${UI.field({ name: 'titleAr', label: 'Title (Arabic)', value: r.titleI18n.ar, maxlength: 80 })}
              ${UI.field({ type: 'select', name: 'category', label: 'Category', value: r.category, required: true, options: D1.opts(D1.CATEGORY) })}
              ${UI.field({ type: 'select', name: 'status', label: 'Status', value: r.status, options: STATUSES, hint: 'Paused drops stop taking new reservations.' })}
              ${UI.field({ type: 'textarea', name: 'descEn', label: 'Description (English)', value: r.descriptionI18n.en, rows: 3, cols: 2, maxlength: 400 })}
              ${UI.field({ type: 'textarea', name: 'descAr', label: 'Description (Arabic)', value: r.descriptionI18n.ar, rows: 3, cols: 2, maxlength: 400 })}
            </div>` })}
            ${UI.card({ title: 'Pricing & quantity', icon: 'coins', tone: 'orange', body: `<div class="form-grid">
              ${UI.field({ type: 'money', name: 'originalPrice', label: 'Original value', value: r.originalPrice.amount, required: true, min: 1, currency: r.price.currency })}
              ${UI.field({ type: 'money', name: 'price', label: 'Price', value: r.price.amount, required: true, min: 1, hint: 'Must be lower than the original value.', currency: r.price.currency })}
              ${UI.field({ type: 'number', name: 'quantity', label: 'Quantity', value: r.quantity, required: true, min: r.reserved || 1, max: 500, hint: t('{n} bags already reserved', { n: fmt.text.number(r.reserved) }) })}
              <div class="fld"><span class="lbl">${esc(t('Discount'))}</span><div class="d1-stat"><b data-disc>${fmt.pct(r.discountPct, { dec: 0 })}</b><small>${esc(t('Shown to consumers as savings'))}</small></div></div>
            </div>` })}
            ${UI.card({ title: 'Pickup', icon: 'clock', tone: 'mauve', body: `<div class="form-grid">
              ${UI.field({ type: 'date', name: 'date', label: 'Pickup date', value: r.date, required: true })}
              <div></div>
              ${UI.field({ type: 'time', name: 'start', label: 'Window starts', value: r.pickupWindow.start, required: true })}
              ${UI.field({ type: 'time', name: 'end', label: 'Window ends', value: r.pickupWindow.end, required: true })}
            </div>` })}
            ${UI.card({ title: 'Dietary & allergens', icon: 'leaf', tone: 'lime', body: `<div class="form-grid">
              ${UI.field({ type: 'multiselect', name: 'dietary', label: 'Dietary tags', value: r.dietary, options: D1.opts(D1.DIET), cols: 2 })}
              ${UI.field({ type: 'multiselect', name: 'allergens', label: 'Allergens', value: r.allergens, options: D1.opts(D1.ALLERGEN), cols: 2 })}
            </div>` })}
            <div class="d1-head" style="justify-content:flex-end">${UI.btn('Cancel', { variant: 'secondary', go: 'admin-drops' })}${UI.btn('Save changes', { variant: 'primary', icon: 'check', type: 'submit' })}</div>
          </form>`;
          const form = box.querySelector('form');
          const disc = () => { const v = UI.formValues(form); const p = +v.price, o = +v.originalPrice; form.querySelector('[data-disc]').innerHTML = o > 0 && p > 0 ? fmt.pct(Math.round((1 - p / o) * 100), { dec: 0 }) : '—'; };
          form.addEventListener('input', (e) => { if (['price', 'originalPrice'].includes(e.target.name)) disc(); });
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = UI.validate(form); if (!v.ok) return;
            const x = UI.formValues(form);
            if (x.end <= x.start) { const f = form.querySelector('[name="end"]').closest('.fld'); f.classList.add('invalid'); f.querySelector('.err').textContent = t('Pickup window end must be after start'); form.querySelector('[name="end"]').focus(); return; }
            const btn = form.querySelector('[type="submit"]'); btn.disabled = true;
            try {
              await api('PATCH', '/admin/drops/' + id, {
                title: { en: x.titleEn, ar: x.titleAr || x.titleEn }, description: { en: x.descEn, ar: x.descAr || x.descEn }, category: x.category, status: x.status,
                price: { amount: +x.price, currency: r.price.currency }, originalPrice: { amount: +x.originalPrice, currency: r.price.currency }, quantity: +x.quantity,
                date: x.date, pickupWindow: { start: x.start, end: x.end }, dietary: x.dietary, allergens: x.allergens,
              });
              UI.toast(t('Drop updated'), { tone: 'success' }); App.go('admin-drops');
            } catch (err) { D1.showFieldErrors(form, err); D1.toastErr(err); btn.disabled = false; }
          });
        } catch (e) { box.innerHTML = UI.card({ body: UI.errorState({ text: D1.err(e) }) }); box.addEventListener('ui:retry', load, { once: true }); }
      };
      load();
    },
  });
})();
