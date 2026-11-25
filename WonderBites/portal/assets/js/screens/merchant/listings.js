/* Merchant · Listings (Bags), Inventory, Add/Edit Listing, Listing detail, Create Product (owner: D4)
   Routes: m-listings, m-inventory, m-inventory-new {id?}, m-inventory-detail {id}, m-create-product {templateId?} */
(function () {
  'use strict';
  const { L, LE, money, ph, opts, label, CATS, DIET } = Ops;
  const STATUS = [['active', 'Active'], ['sold_out', 'Sold Out'], ['paused', 'Paused'], ['disabled', 'Disabled'], ['draft', 'Draft'], ['expired', 'Expired']];
  /* (v1.3) cities of the active branch's market, from the registry */
  const cityOpts = () => Markets.cityOptions(App.market());
  const TYPES = [['surprise_bag', 'Surprise Bag'], ['box', 'Box'], ['single_item', 'Single Item'], ['bundle', 'Bundle']];
  const AVAIL = [['daily', 'Daily'], ['weekdays', 'Weekdays'], ['weekends', 'Weekends'], ['one_time', 'One time']];
  const pct = (l) => (l.originalPrice && l.originalPrice.amount ? Math.round((1 - l.price.amount / l.originalPrice.amount) * 100) : 0);

  /* ------------------------------------------------------ list (shared) */
  function listScreen(el, ctx, mode) {
    const inv = mode === 'inventory';
    el.innerHTML = `${inv ? '' : `<div data-kpis>${UI.skeleton('kpis', 4)}</div>`}<div data-filters></div>
      ${UI.card({ title: inv ? t('Inventory') : t('Listings (Bags)'), icon: inv ? 'clipboard' : 'bag', tone: 'rose', flush: true, actions: '<span data-count class="muted" style="font-size:12.5px"></span>', body: '<div data-table></div>' })}`;
    const loadKpis = () => !inv && UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/merchant/listings', { ...api.ctx(), pageSize: 1 }), (res) => {
      const s = Ops.summaryOf(res);
      return UI.kpis([
        { label: t('Active Listings'), icon: 'bag', tone: 'lime', value: fmt.number(s.active), foot: t('Visible to customers') },
        { label: t('Force-Disabled'), icon: 'x', tone: 'rose', value: fmt.number(s.disabled), foot: t('Hidden until re-enabled') },
        { label: t('Sold Out'), icon: 'alert', tone: 'orange', value: fmt.number(s.soldOut), foot: t('No quantity left today') },
        { label: t('Total Listings'), icon: 'layers', tone: 'mauve', value: fmt.number(s.total), foot: t('Across all statuses') },
      ], 4);
    }, { skeleton: 'kpis' });
    loadKpis();
    const filters = UI.mountFilters(el.querySelector('[data-filters]'), {
      search: { name: 'q', placeholder: t('Search by box ID') },
      selects: [
        { name: 'status', label: t('All Status'), options: opts(STATUS) },
        { name: 'category', label: t('All Categories'), options: opts(CATS) },
        { name: 'city', label: t('All Cities'), options: cityOpts() },
        { name: 'dietary', label: t('All Dietary tags'), options: opts(DIET) },
      ],
      sort: { name: 'sort', value: '-createdAt', options: [{ value: '-createdAt', label: t('Newest First') }, { value: 'createdAt', label: t('Oldest First') }, { value: 'price', label: t('Price: Low to High') }, { value: '-price', label: t('Price: High to Low') }, { value: '-sold', label: t('Best Selling') }] },
      actions: inv ? UI.btn(t('Add Inventory'), { variant: 'primary', icon: 'plus', go: 'm-inventory-new', params: {} }) : '',
      clear: true,
    }, () => table.setQuery({ page: 1 }));
    let offset = 0;
    const act = async (l, action, msg) => { await api('POST', `/merchant/listings/${l.id}/${action}`, {}); UI.toast(msg, { tone: 'success', html: true }); reload(); };
    const del = async (l) => {
      if (!(await UI.confirm({ html: true, title: t('Delete listing?'), text: t('“{name}” will be removed permanently. This cannot be undone.', { name: LE(l.title) }), confirm: t('Delete'), danger: true }))) return;
      await api('DELETE', '/merchant/listings/' + l.id); UI.toast(t('Listing deleted'), { tone: 'success', html: true }); reload();
    };
    const table = UI.dataTable(el.querySelector('[data-table]'), {
      pageSize: 10,
      columns: [
        { key: 'n', label: '#', render: (l, i) => `<span class="faint">${fmt.number(offset + (Number(i) || 0) + 1)}</span>` },
        { key: 'title', label: t('Box ID'), render: (l) => `<div class="ops-row">${UI.thumb(ph(l.images[0] && l.images[0].tone))}<div><b>${LE(l.title)}</b><small>${t('{n} sold', { n: fmt.number(l.stats.sold) })} · ${fmt.id(l.id)}</small></div></div>` },
        { key: 'category', label: t('Category'), render: (l) => `<span class="muted">${label(CATS, l.category)}</span>` },
        { key: 'price', label: t('Price'), sortable: true, render: (l) => `<b>${money(l.price, 2)}</b>` },
        { key: 'originalPrice', label: t('Value'), render: (l) => `<s class="faint">${money(l.originalPrice, 2)}</s>` },
        { key: 'quantity', label: t('Qty'), render: (l) => fmt.number(l.remaining) },
        { key: 'window', label: t('Pickup Window'), render: (l) => fmt.timeRange(l.pickupWindow.start, l.pickupWindow.end) },
        { key: 'status', label: t('Status'), render: (l) => UI.pill(l.status) },
      ],
      fetch: async (q) => { const r = await api('GET', '/merchant/listings', { ...api.ctx(), ...filters.values(), ...q }); offset = ((r.meta && r.meta.page ? r.meta.page : 1) - 1) * (r.meta && r.meta.pageSize ? r.meta.pageSize : 10); const c = el.querySelector('[data-count]'); if (c) c.innerHTML = t('{n} listings', { n: fmt.number(r.meta ? r.meta.total : r.data.length) }); return r; },
      rowClick: (l) => App.go('m-inventory-detail', { id: l.id }),
      rowActions: (l) => {
        const base = [
          { icon: 'eye', label: t('View'), run: () => App.go('m-inventory-detail', { id: l.id }) },
          { icon: 'edit', label: t('Edit'), run: () => App.go('m-inventory-new', { id: l.id }) },
        ];
        if (!inv) return [...base,
          l.status === 'disabled' ? { icon: 'refresh', label: t('Enable'), run: () => act(l, 'resume', t('Listing enabled')) } : { icon: 'ban', label: t('Disable'), run: () => act(l, 'disable', t('Listing disabled')) },
          { icon: 'trash', label: t('Delete'), danger: true, run: () => del(l) }];
        const run = async (action, msg) => { const { data } = await api('POST', `/merchant/listings/${l.id}/${action}`, {}); UI.toast(msg, { tone: 'success', html: true }); if (action === 'duplicate') App.go('m-inventory-detail', { id: data.id }); else reload(); };
        return [...base,
          { icon: 'copy', label: t('Duplicate'), run: () => run('duplicate', t('Listing duplicated as a draft')) },
          l.status === 'paused' || l.status === 'disabled' ? { icon: 'play', label: t('Resume'), run: () => run('resume', t('Listing resumed')) } : { icon: 'pause', label: t('Pause'), run: () => run('pause', t('Listing paused')) },
          { icon: 'trash', label: t('Delete'), danger: true, run: () => del(l) }];
      },
      empty: { icon: 'bag', title: t('No listings found'), text: t('Try changing the filters or add a new listing.'), action: inv ? UI.btn(t('Add Inventory'), { variant: 'primary', icon: 'plus', go: 'm-inventory-new', params: {} }) : '' },
    });
    function reload() { table.reload(); loadKpis(); }
  }

  function moreMenu(ev, l, after, extra = []) {
    const anchor = (ev && (ev.currentTarget || ev.target)) || document.activeElement;
    const run = async (action, msg, go) => { const { data } = await api('POST', `/merchant/listings/${l.id}/${action}`, {}); UI.toast(msg, { tone: 'success', html: true }); if (go) App.go('m-inventory-detail', { id: data.id }); else after && after(); };
    UI.menu(anchor, [
      ...extra,
      { label: t('Duplicate'), icon: 'copy', run: () => run('duplicate', t('Listing duplicated as a draft'), true) },
      l.status === 'paused' || l.status === 'disabled'
        ? { label: t('Resume'), icon: 'play', run: () => run('resume', t('Listing resumed')) }
        : { label: t('Pause'), icon: 'pause', run: () => run('pause', t('Listing paused')) },
      { label: t('Delete'), icon: 'trash', danger: true, run: async () => {
        if (!(await UI.confirm({ html: true, title: t('Delete listing?'), text: t('“{name}” will be removed permanently. This cannot be undone.', { name: LE(l.title) }), confirm: t('Delete'), danger: true }))) return;
        await api('DELETE', '/merchant/listings/' + l.id); UI.toast(t('Listing deleted'), { tone: 'success', html: true }); if (App.state.route === 'm-inventory-detail' || (ctxName() === 'm-inventory-detail')) App.go('m-inventory'); else after && after();
      } },
    ]);
  }
  const ctxName = () => (location.hash || '').replace(/^#/, '').replace(/-(ar|en)$/, '');

  App.route('m-listings', { nav: 'Listings (Bags)', title: 'Listings (Bags)', subtitle: 'Manage the bags you offer to customers.', render: (el, ctx) => listScreen(el, ctx, 'listings') });
  App.route('m-inventory', { nav: 'Inventory', title: 'Inventory', subtitle: 'Monitor stock levels across all bags.', render: (el, ctx) => listScreen(el, ctx, 'inventory') });

  /* ------------------------------------------------- preview card */
  function previewCard(v, { tone = 1, big = false } = {}) {
    const title = v.title ? UI.esc(v.title) : t('Listing Title');
    const cat = v.category ? label(CATS, v.category) : t('Category');
    const loc = [v.address, v.city && Markets.cityName(v.city)].filter(Boolean).map(UI.esc).join(', ') || t('Location');
    const desc = v.shortDescription ? UI.esc(v.shortDescription) : t('This is a short description of your listing that will appear in the listing card preview.');
    const price = Number(v.price) || 0, orig = Number(v.originalPrice) || 0;
    return `<div class="ops-preview">
      <div class="ops-hero">${UI.thumb(ph(tone), 'xl')}<span class="ops-tag">${UI.chip(t('Preview'))}</span></div>
      <h3>${title}</h3>${UI.chip(cat, { tone: 'rose' })}
      <p class="muted ops-il" style="font-size:12.5px;margin:8px 0">${UI.icon('pin')} ${loc}</p>
      <p class="muted" style="font-size:12.5px;margin:0 0 10px">${desc}</p>
      <div class="ops-price"><b>${fmt.money(price, v.currency, 2)}</b>${orig > price ? `<s>${fmt.money(orig, v.currency, 2)}</s>${UI.chip(t('{n}% OFF', { n: fmt.text.number(Math.round((1 - price / orig) * 100)) }), { tone: 'lime' })}` : ''}</div>
      <div class="pm">
        <span>${UI.icon('clock')} ${v.availability ? label(AVAIL, v.availability) : t('Available')}</span><span>${UI.icon('percent')} ${v.listingType ? label(TYPES, v.listingType) : t('Type')}</span>
        ${v.start && v.end ? `<span>${UI.icon('bag')} ${t('Pickup')}: ${fmt.timeRange(v.start, v.end)}</span>` : ''}</div></div>`;
  }

  /* ------------------------------------------------- add / edit listing */
  App.route('m-inventory-new', {
    nav: 'Inventory', title: 'Inventory', subtitle: 'Monitor stock levels across all bags.',
    async render(el, ctx) {
      const id = ctx.params && ctx.params.id;
      el.innerHTML = UI.skeleton('form', 6);
      let l = null;
      if (id) { try { l = (await api('GET', '/merchant/listings/' + id)).data; } catch (e) { el.innerHTML = UI.errorState({ text: t('Could not load this listing.'), retry: true }); UI.on(el, 'ui:retry', '*', () => ctx.refresh()); return; } }
      const v0 = l ? { title: L(l.title), category: l.category, shortDescription: L(l.shortDescription), address: L(l.address), city: l.city, state: L(l.state), zip: l.zip, price: l.price.amount, originalPrice: l.originalPrice.amount, listingType: l.listingType, availability: l.availability, description: L(l.description), quantity: l.quantity, start: l.pickupWindow.start, end: l.pickupWindow.end }
        : { start: '18:00', end: '20:00', quantity: 10 };
      const s0 = l ? l.settings : { publish: true, featured: false, allowNegotiation: true, expiresOn: '' };
      const sec = (title, body) => `<div class="ops-sec" style="font-size:14px;color:var(--text)">${t(title)}</div>${body}`;
      el.innerHTML = `
        <form data-lf novalidate class="cd" style="padding:24px;display:grid;gap:20px">
          <div class="ops-head"><div><h2>${id ? t('Edit Listing') : t('Add New Listing')}</h2><p>${id ? t('Update the details of {id}.', { id: fmt.id(id) }) : t('Fill in the details below to create a new listing.')}</p></div>
            <div class="ops-actions">${UI.btn(t('Preview'), { variant: 'secondary', icon: 'eye', attrs: 'data-act="preview"' })}${UI.btn(t('Cancel'), { variant: 'secondary', attrs: 'data-act="cancel"' })}${UI.btn(t('Save Listing'), { variant: 'primary', type: 'submit', icon: 'check' })}</div></div>
          <div class="ops-split">
            <div class="cd ops-pad" style="display:grid;gap:14px;align-content:start">
              ${sec('Basic Information', `<div class="ops-grid2">${UI.field({ name: 'title', label: t('Title'), required: true, value: v0.title, placeholder: t('Enter listing title'), maxlength: 80 })}
                ${UI.field({ type: 'select', name: 'category', label: t('Category'), required: true, value: v0.category, placeholder: t('Select category'), options: opts(CATS) })}</div>
                ${UI.field({ name: 'shortDescription', label: t('Short Description'), required: true, value: v0.shortDescription, placeholder: t('Enter a short description about your listing'), maxlength: 150 })}<span class="ops-cnt"><span data-cnt="shortDescription">0</span>/${fmt.number(150)}</span>`)}
              ${sec('Location', `<div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end">${UI.field({ name: 'address', label: t('Address'), required: true, value: v0.address, placeholder: t('Enter address') })}
                <div style="padding-block-end:2px">${UI.btn(t('Use Current Location'), { variant: 'secondary', icon: 'pin', attrs: 'data-act="locate"' })}</div></div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${UI.field({ type: 'select', name: 'city', label: t('City'), required: true, value: v0.city, placeholder: t('Select city'), options: cityOpts() })}
                ${UI.field({ name: 'state', label: t('State/Province'), required: true, value: v0.state, placeholder: t('Enter state or province') })}
                ${UI.field({ name: 'zip', label: t('Zip/Postal Code'), required: true, value: v0.zip, placeholder: t('Enter zip code') })}</div>`)}
              ${sec('Listing Details', `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">
                ${UI.field({ type: 'money', name: 'price', label: t('Price'), required: true, value: v0.price, currency: l ? l.price.currency : undefined, placeholder: t('Enter price'), min: 1 })}
                ${UI.field({ type: 'select', name: 'listingType', label: t('Listing Type'), required: true, value: v0.listingType, placeholder: t('Select type'), options: opts(TYPES) })}
                ${UI.field({ type: 'select', name: 'availability', label: t('Availability'), required: true, value: v0.availability, placeholder: t('Select availability'), options: opts(AVAIL) })}
              </div><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px">
                ${UI.field({ type: 'money', name: 'originalPrice', label: t('Original value'), value: v0.originalPrice, currency: l ? l.price.currency : undefined, placeholder: t('Retail value'), min: 1, hint: t('Shown struck through') })}
                ${UI.field({ type: 'number', name: 'quantity', label: t('Quantity'), required: true, value: v0.quantity, min: 0, hint: l && (l.reserved || l.collected) ? 'Bags already reserved or collected today can’t be removed.' : '' })}
                ${UI.field({ type: 'time', name: 'start', label: t('Pickup from'), required: true, value: v0.start })}${UI.field({ type: 'time', name: 'end', label: t('Pickup until'), required: true, value: v0.end })}</div>
                <div><label class="fld-l" style="display:block;font-weight:600;font-size:13px;margin-block-end:6px">${t('Description')} <span style="color:var(--accent)">*</span></label>
                ${UI.richText({ name: 'description', value: v0.description ? UI.esc(v0.description) : '', placeholder: t('Write a detailed description...') })}
                <div class="faint" style="font-size:12px;text-align:end;margin-block-start:4px"><span data-cnt="description">0</span>/2000</div></div>`)}
              ${sec('Images', `<p class="muted" style="margin:-4px 0 0;font-size:12.5px">${t('Upload high-quality images to attract more interest.')}</p>
                <div style="display:grid;grid-template-columns:minmax(0,1.4fr) 1fr;gap:16px;align-items:start">
                  <div>${UI.dropzone({ name: 'images', accept: 'image/jpeg,image/png,image/webp', multiple: true, hint: t('JPG, PNG or WEBP (Max. 5MB each)') })}
                    <div style="display:flex;justify-content:space-between;font-size:12px;margin-block-start:6px"><span class="faint">${t('You can upload up to 10 images')}</span><b style="color:var(--accent)"><span data-imgs>${fmt.number(l ? l.images.length : 0)}</span>/${fmt.number(10)} ${t('uploaded')}</b></div></div>
                  <div><b style="font-size:13px">${t('Image Guidelines')}</b><ul style="list-style:none;padding:0;margin:8px 0 0;display:grid;gap:6px;font-size:12.5px" class="muted">
                    ${['Use high-quality images', 'Minimum 800x600px', 'Maximum 10 images', 'First image will be the cover'].map((g) => `<li style="display:flex;gap:6px;align-items:center"><span style="color:var(--pos)">${UI.icon('checkc')}</span>${t(g)}</li>`).join('')}</ul></div></div>`)}
            </div>
            <div class="ops-side">
              ${UI.card({ title: t('Listing Preview'), icon: 'eye', tone: 'rose', body: `<div class="cd-b" data-preview></div>` })}
              ${UI.card({ title: t('Settings'), icon: 'gear', tone: 'mauve', body: `<div class="cd-b" style="display:grid;gap:14px">
                ${[['publish', 'Publish Listing', 'Make this listing visible to everyone'], ['featured', 'Feature Listing', 'Mark as featured listing'], ['allowNegotiation', 'Allow Negotiation', 'Buyers can negotiate the price']].map(([n, a, b]) => `<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><b style="font-size:13.5px">${t(a)}</b><div class="muted" style="font-size:12px">${t(b)}</div></div>${UI.toggle({ name: n, checked: !!s0[n], label: t(a) })}</div>`).join('')}
                ${UI.field({ type: 'date', name: 'expiresOn', label: t('Expires On'), value: s0.expiresOn || '', hint: t('Set an expiry date for this listing') })}</div>` })}
            </div></div></form>`;
      const form = el.querySelector('[data-lf]');
      const vals = () => { const v = UI.formValues(form); const rt = form.querySelector('[data-rich], [contenteditable]'); if (rt && !v.description) v.description = rt.innerText.trim(); return v; };
      const update = () => {
        const v = vals(); el.querySelector('[data-preview]').innerHTML = previewCard({ ...v, currency: l ? l.price.currency : undefined }, { tone: l && l.images[0] ? l.images[0].tone : 1 });
        const sd = el.querySelector('[data-cnt="shortDescription"]'); if (sd) sd.innerHTML = fmt.number(String(v.shortDescription || '').length);
        const rt = form.querySelector('[contenteditable]'); const dc = el.querySelector('[data-cnt="description"]'); if (dc) dc.innerHTML = fmt.number((rt ? rt.innerText.trim() : String(v.description || '')).length);
        const imgs = Array.isArray(v.images) ? v.images.length : 0; el.querySelector('[data-imgs]').innerHTML = fmt.number(Math.min(10, (l ? l.images.length : 0) + imgs));
      };
      update();
      ['input', 'change', 'ui:change', 'ui:toggle'].forEach((ev) => form.addEventListener(ev, update));
      UI.on(el, 'click', '[data-act="locate"]', () => {
        const set = (n, v) => { const i = form.querySelector(`[name="${n}"]`); if (i) i.value = v; };
        /* (v1.3) fill from the active branch (its market's city) */
        const b = App.state.branch && App.state.branch.id !== 'all' ? App.state.branch : null;
        api('GET', '/merchant/branches/' + ((b && b.id) || 'BR-01')).then(({ data: bb }) => { set('address', L(bb.address)); set('city', bb.city); set('state', Markets.cityName(bb.city, bb.country)); set('zip', '00000'); update(); }).catch(() => {});
        update(); UI.toast(t('Location filled from your branch'), { tone: 'info', html: true });
      });
      UI.on(el, 'click', '[data-act="cancel"]', () => App.go(id ? 'm-inventory-detail' : 'm-inventory', id ? { id } : {}));
      UI.on(el, 'click', '[data-act="preview"]', () => UI.modal({ title: t('Listing Preview'), size: 'sm', body: previewCard(vals(), { tone: l && l.images[0] ? l.images[0].tone : 1, big: true }), actions: [{ label: t('Close'), variant: 'secondary', close: true }] }));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const r = UI.validate(form); const v = vals();
        if (!r.ok) return;
        if (!String(v.description || '').trim()) { UI.toast(t('Please add a description.'), { tone: 'error', html: true }); return; }
        if (v.end && v.start && v.end <= v.start) { UI.toast(t('Pickup end time must be after the start time.'), { tone: 'error', html: true }); return; }
        const body = { title: v.title, category: v.category, shortDescription: v.shortDescription, address: v.address, city: v.city, state: v.state, zip: v.zip, price: Number(v.price), originalPrice: Number(v.originalPrice || v.price * 3),
          listingType: v.listingType, availability: v.availability, description: String(v.description).replace(/<[^>]+>/g, ''), quantity: Number(v.quantity), pickupWindow: { start: v.start, end: v.end }, branchId: App.state.branch && App.state.branch.id !== 'all' ? App.state.branch.id : undefined,
          settings: { publish: !!v.publish, featured: !!v.featured, allowNegotiation: !!v.allowNegotiation, expiresOn: v.expiresOn || null } };
        if (!id) body.images = (Array.isArray(v.images) ? v.images : []).slice(0, 10).map((f, i) => ({ id: 'up-' + i, tone: (i % 4) + 1, name: f.name || '' }));
        try {
          const res = id ? await api('PATCH', '/merchant/listings/' + id, body) : await api('POST', '/merchant/listings', body);
          UI.toast(id ? t('Listing updated') : t('Listing created'), { tone: 'success', html: true }); App.go('m-inventory-detail', { id: res.data.id });
        } catch (er) {
          /* (v1.4 F-001) quantity below what is already reserved/collected → inline field error */
          const d = er.details || {};
          if (d.quantity === 'below_committed' && UI.fieldError(form, 'quantity', t('Quantity can’t be lower than the {n} bags already reserved or collected today.', { n: fmt.number(d.committed) }))) return;
          UI.toast(er.message || t('Something went wrong'), { tone: 'error', html: true });
        }
      });
    },
  });

  /* ------------------------------------------------- listing detail */
  App.route('m-inventory-detail', {
    nav: 'Inventory', title: 'Inventory', subtitle: 'Monitor stock levels across all bags.',
    async render(el, ctx) {
      const id = ctx.params && ctx.params.id;
      if (!id) { App.go('m-inventory'); return; }
      el.innerHTML = UI.skeleton('cards', 4);
      let l;
      try { l = (await api('GET', '/merchant/listings/' + id)).data; }
      catch (e) { el.innerHTML = e.status === 404 ? UI.empty({ icon: 'bag', title: t('Listing not found'), text: t('It may have been deleted.'), action: UI.btn(t('Back to Inventory'), { variant: 'primary', go: 'm-inventory' }) }) : UI.errorState({ text: t('Could not load this listing.'), retry: true }); UI.on(el, 'ui:retry', '*', () => ctx.refresh()); return; }
      const sets = Object.assign({}, l.settings);
      const meta = [['tag', 'Category', label(CATS, l.category)], ['money', 'Original Price', money(l.originalPrice, 2)], ['store', 'Branch', LE(l.branch && l.branch.name)], ['tag', 'Discount Price', money(l.price, 2)],
        ['clock', 'Pickup Time', fmt.timeRange(l.pickupWindow.start, l.pickupWindow.end)], ['percent', 'Discount', `<b style="color:var(--pos)">${t('{n}% OFF', { n: fmt.number(pct(l)) })}</b>`],
        ['package', 'Quantity', t('{n} bags', { n: fmt.number(l.remaining) }) + ` <span class="faint">/ ${fmt.number(l.quantity)}</span>`], ['calendar', 'Expires On', l.settings.expiresOn ? fmt.date(l.settings.expiresOn) : '—'],
        ['clock', 'Reserved', t('{n} bags', { n: fmt.number(l.reserved || 0) })], ['checkc', 'Collected today', t('{n} bags', { n: fmt.number(l.collected || 0) })]];
      /* (v1.4 FLOW-02) a listing an admin flagged/disabled in Admin → Drops shows why */
      const MOD_REASON = { misleading_photo: 'Misleading photo', allergen_missing: 'Allergen info missing', pricing: 'Pricing issue', food_safety: 'Food safety concern', bulk_review: 'Under review' };
      const modBanner = l.flagged ? `<div class="li hot" role="status" data-moderation style="align-items:center;border-radius:12px;padding:12px 14px"><span class="ic t-rose">${UI.icon('alert')}</span><span class="tx"><b>${t('Disabled by WonderBites for review')}</b><small style="display:block" class="muted">${t(MOD_REASON[(l.moderation || {}).reason] || 'Under review')}${(l.moderation || {}).note ? ' — ' + UI.esc(l.moderation.note) : ''} · ${t('Contact support to re-enable it.')}</small></span></div>` : '';
      const settingsRow = () => [['eye', 'Visibility', 'publish', sets.publish ? t('Visible to everyone') : t('Hidden')], ['star', 'Featured Listing', 'featured', sets.featured ? t('Yes') : t('No')], ['chat', 'Allow Negotiation', 'allowNegotiation', sets.allowNegotiation ? t('Yes') : t('No')]]
        .map(([ic, a, n, s]) => `<div style="display:flex;gap:12px;align-items:center;justify-content:space-between"><div class="ops-row"><span class="ops-meta"><span class="ic">${UI.icon(ic)}</span></span><div><b style="font-size:13px">${t(a)}</b><small style="color:${sets[n] ? 'var(--pos)' : 'var(--faint)'}">${s}</small></div></div>${UI.toggle({ name: n, checked: !!sets[n], label: t(a) })}</div>`).join('')
        + `<div class="ops-row"><span class="ops-meta"><span class="ic">${UI.icon('cal')}</span></span><div><b style="font-size:13px">${t('Auto Expiry')}</b><small style="color:var(--accent)">${sets.expiresOn ? fmt.date(sets.expiresOn) : t('Not set')}</small></div></div>`;
      el.innerHTML = `
        <div class="cd ops-pad" style="display:grid;gap:var(--gap);padding:24px">
          ${modBanner}
          <div class="ops-head"><div><h2>${LE(l.title)} ${UI.pill(l.status)}</h2><p>${t('Listed on {date}', { date: fmt.date(l.createdAt) })} · ${t('ID')}: ${fmt.id(l.id)}</p></div>
            <div class="ops-actions">${UI.btn('', { variant: 'icon', icon: 'dots', attrs: `data-act="more" aria-label="${t('More actions')}"` })}${UI.btn(t('Edit Listing'), { variant: 'secondary', icon: 'edit', go: 'm-inventory-new', params: { id: l.id } })}${UI.btn(t('Save Listing'), { variant: 'primary', icon: 'check', attrs: 'data-act="save" disabled' })}</div></div>
          <div class="ops-split">
            <div style="display:grid;gap:var(--gap)">
              ${UI.card({ title: t('Overview'), icon: 'info', tone: 'mauve', body: `<div class="cd-b ops-meta">${meta.map(([ic, a, b]) => `<div><span class="ic">${UI.icon(ic)}</span><div><small>${t(a)}</small><b>${b}</b></div></div>`).join('')}</div>` })}
              ${UI.card({ title: t('Description'), icon: 'file', tone: 'mauve', body: `<div class="cd-b"><p class="muted" style="margin:0">${LE(l.description)}</p>${l.dietary.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-block-start:12px">${l.dietary.map((d) => UI.chip(label(DIET, d), { tone: 'lime' })).join('')}</div>` : ''}</div>` })}
              ${UI.card({ title: t('Images'), icon: 'image', tone: 'rose', count: fmt.number(l.images.length) + '/' + fmt.number(10), body: `<div class="cd-b ops-imgs">${l.images.map((im, i) => `<div class="ops-img">${UI.thumb(ph(im.tone), 'xl')}<button type="button" data-img="${UI.esc(im.id)}" aria-label="${t('Remove image')}">${UI.icon('x')}</button>${i === 0 ? `<span class="ops-tag" style="inset-inline-end:auto;inset-inline-start:6px">${UI.chip(t('Cover'))}</span>` : ''}</div>`).join('')}
                ${l.images.length < 10 ? `<label class="ops-add">${UI.icon('plus')}<span>${t('Add Image')}</span><input type="file" accept="image/*" data-addimg hidden></label>` : ''}</div>` })}
            </div>
            <div class="ops-side">
              ${UI.card({ title: t('Listing Preview'), icon: 'eye', tone: 'rose', body: `<div class="cd-b">${previewCard({ currency: l.price.currency, title: L(l.title), category: l.category, address: L(l.address), city: l.city, shortDescription: L(l.shortDescription), price: l.price.amount, originalPrice: l.originalPrice.amount, availability: l.availability, listingType: l.listingType, start: l.pickupWindow.start, end: l.pickupWindow.end }, { tone: l.images[0] && l.images[0].tone })}
                <div class="muted" style="font-size:12.5px;margin-block-start:8px;display:flex;gap:5px;align-items:center">${UI.icon('package')} ${t('Available')}: ${t('{n} bags', { n: fmt.number(l.remaining) })}</div></div>` })}
              ${UI.card({ title: t('Activity'), icon: 'activity', tone: 'mauve', body: `<div class="cd-b"><ol class="ops-timeline">${l.activity.slice().reverse().map((a) => `<li><b style="font-size:13px">${LE(a.label)}</b><small>${fmt.date(a.at)} · ${fmt.clock(a.at)}</small></li>`).join('')}</ol></div>` })}
            </div></div>
          ${UI.card({ title: t('Settings'), icon: 'gear', tone: 'mauve', body: `<div class="cd-b ops-settings" data-sets>${settingsRow()}</div>` })}
        </div>`;
      const saveBtn = el.querySelector('[data-act="save"]');
      UI.on(el, 'ui:toggle', '*', (e) => { const d = e.detail || {}; if (!d.name) return; sets[d.name] = !!d.value; saveBtn.disabled = false; el.querySelector('[data-sets]').innerHTML = settingsRow(); });
      UI.on(el, 'click', '[data-act="save"]', async () => {
        await api('PATCH', '/merchant/listings/' + l.id, { settings: sets, status: !sets.publish && l.status === 'active' ? 'draft' : sets.publish && l.status === 'draft' ? 'active' : undefined });
        UI.toast(t('Listing saved'), { tone: 'success', html: true }); ctx.refresh();
      });
      UI.on(el, 'click', '[data-act="more"]', (e, b) => moreMenu({ currentTarget: b }, l, () => ctx.refresh(), [
        l.status === 'disabled' ? { label: t('Enable'), icon: 'refresh', run: async () => { await api('POST', `/merchant/listings/${l.id}/resume`, {}); UI.toast(t('Listing enabled'), { tone: 'success', html: true }); ctx.refresh(); } }
          : { label: t('Disable'), icon: 'ban', run: async () => { await api('POST', `/merchant/listings/${l.id}/disable`, {}); UI.toast(t('Listing disabled'), { tone: 'success', html: true }); ctx.refresh(); } }]));
      UI.on(el, 'click', '[data-img]', async (e, b) => {
        if (!(await UI.confirm({ html: true, title: t('Remove image?'), text: t('The image will be removed from this listing.'), confirm: t('Remove'), danger: true }))) return;
        await api('DELETE', `/merchant/listings/${l.id}/images/${b.dataset.img}`); UI.toast(t('Image removed'), { tone: 'success', html: true }); ctx.refresh();
      });
      UI.on(el, 'change', '[data-addimg]', async (e, inp) => {
        if (!inp.files || !inp.files.length) return;
        try { await api('POST', `/merchant/listings/${l.id}/images`, { fileId: 'file-' + Date.now() }); UI.toast(t('Image added'), { tone: 'success', html: true }); ctx.refresh(); } catch (er) { UI.toast(er.message, { tone: 'error', html: true }); }
      });
    },
  });

  /* ------------------------------------------------- create product */
  App.route('m-create-product', {
    nav: 'Inventory', title: 'Create Product', subtitle: 'Add stock and inventory.',
    async render(el, ctx) {
      const tplId = ctx.params && ctx.params.templateId;
      let d = {}, tpl = null;
      if (tplId) {
        el.innerHTML = UI.skeleton('form', 5);
        try { tpl = (await api('GET', '/merchant/templates/' + tplId)).data; d = (await api('POST', `/merchant/templates/${tplId}/create-product`, { branchId: App.state.branch.id !== 'all' ? App.state.branch.id : undefined })).data.draft; }
        catch (e) { UI.toast(t('Template could not be loaded — starting from a blank product.'), { tone: 'error', html: true }); }
      }
      const row = (n, title, text, body) => `<div class="ops-split" style="grid-template-columns:320px minmax(0,1fr);padding:24px;border-block-start:${n > 1 ? '1px solid var(--line)' : '0'}">
        <div><h3 style="font-size:15px;margin:0;display:flex;gap:10px;align-items:center"><span class="ops-meta"><span class="ic" style="width:26px;height:26px;border-radius:50%;font-size:12px;font-weight:700">${fmt.number(n)}</span></span>${t(title)}</h3><p class="muted" style="font-size:12.5px;margin:6px 0 0;padding-inline-start:38px">${t(text)}</p></div><div class="ops-form">${body}</div></div>`;
      el.innerHTML = `
        ${tpl ? `<div class="cd ops-pad" style="display:flex;gap:12px;align-items:center;padding:14px 18px"><span class="ops-meta"><span class="ic" style="background:var(--tint-rose);color:var(--ic-rose)">${UI.icon('layers')}</span></span><div style="flex:1"><b>${t('Prefilled from template “{name}”', { name: LE(tpl.name) })}</b><div class="muted" style="font-size:12.5px">${t('Adjust the details and create your product.')}</div></div>${UI.link(t('Change template'), 'm-templates')}</div>` : ''}
        <form data-pf novalidate class="cd" style="padding:0">
          ${row(1, 'General Info', 'Edit your product description and necessary information from here.', `<div class="ops-grid2">${UI.field({ name: 'name', label: t('Name'), required: true, value: L(d.name), placeholder: t('Enter product name') })}
            ${UI.field({ type: 'select', name: 'category', label: t('Category'), required: true, value: d.category || 'bakery', options: opts(CATS) })}</div>
            ${UI.field({ type: 'textarea', name: 'description', label: t('Description'), required: true, rows: 4, value: L(d.description), placeholder: t('Give a brief description here...'), maxlength: 1000 })}`)}
          ${row(2, 'Photos', 'Upload your product image gallery here.', UI.dropzone({ name: 'photos', accept: 'image/png,image/jpeg', multiple: true, hint: t('PNG or JPG') }))}
          ${row(3, 'Pricing & Quantity', 'Add your product pricing here.', `<div class="ops-grid2">${UI.field({ type: 'money', name: 'price', label: t('Price'), required: true, value: d.price, placeholder: t('Enter Price'), min: 1 })}
            ${UI.field({ type: 'number', name: 'quantity', label: t('Quantity'), required: true, value: d.quantity, placeholder: t('Enter Qty'), min: 1 })}</div>
            ${UI.field({ type: 'checkbox', name: 'saveAsTemplate', label: t('Save as template'), hint: t('Reuse these details next time from My Templates.') })}`)}
          <div style="display:flex;justify-content:flex-end;gap:10px;padding:16px 24px;border-block-start:1px solid var(--line)">
            ${UI.btn(t('Cancel'), { variant: 'ghost', attrs: 'data-act="cancel"' })}${UI.btn(t('Create Product'), { variant: 'primary', icon: 'check', type: 'submit' })}</div></form>`;
      UI.on(el, 'click', '[data-act="cancel"]', () => App.go(tplId ? 'm-templates' : 'm-inventory'));
      el.querySelector('[data-pf]').addEventListener('submit', async (e) => {
        e.preventDefault(); const r = UI.validate(e.currentTarget); if (!r.ok) return;
        const v = r.values;
        try {
          const { data } = await api('POST', '/merchant/products', { branchId: App.state.branch.id !== 'all' ? App.state.branch.id : undefined, name: v.name, category: v.category, description: v.description, price: Number(v.price), quantity: Number(v.quantity), images: (v.photos || []).map((f) => ({ name: f.name })), templateId: tplId || null, saveAsTemplate: !!v.saveAsTemplate });
          UI.toast(v.saveAsTemplate ? t('Product created and saved to My Templates') : t('Product created'), { tone: 'success', html: true });
          App.go('m-inventory-detail', { id: data.listingId });
        } catch (er) { UI.toast(er.message || t('Something went wrong'), { tone: 'error', html: true }); }
      });
    },
  });
})();
