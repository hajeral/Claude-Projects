/* Admin · Listings & Templates (owner: D3)
   Routes: admin-listings (list + category tabs), admin-template-new {fromId?}, admin-template-edit {id},
           admin-templates (gallery: WonderBites templates + My Templates)
   API: GET/POST/PATCH/DELETE /admin/templates[/{id}], POST /admin/templates/{id}/duplicate|publish|unpublish,
        GET /admin/templates/fields */
(function () {
  const { lt, ltx, esc } = D3;
  const TAB_CATS = [{ id: 'all', label: 'All' }, { id: 'bakery', label: 'Bakery' }, { id: 'grocery', label: 'Grocery' }, { id: 'meals', label: 'Prepared Foods' }, { id: 'other', label: 'Other' }];
  const tplIcon = (c) => ({ bakery: 'package', grocery: 'basket', meals: 'bag', other: 'layers' }[c] || 'bag');

  /* template status: contract `published` is shown as "Active" (Figma wording) */
  const tplPill = (s) => (s === 'published' ? UI.pill('published', { label: 'Active' }) : UI.pill(s));

  async function duplicate(r, after) {
    const { data } = await api('POST', `/admin/templates/${r.id}/duplicate`);
    D3.toast(t('Template duplicated as draft'), { tone: 'success' });
    after ? after(data) : App.go('admin-template-edit', { id: data.id });
  }
  async function togglePublish(r, after) {
    const pub = r.status !== 'published';
    if (!pub && !(await D3.confirm({ title: t('Move to draft?'), text: t('Merchants will no longer be able to create bags from this template.'), confirm: t('Move to draft') }))) return;
    await api('POST', `/admin/templates/${r.id}/${pub ? 'publish' : 'unpublish'}`);
    D3.toast(t(pub ? 'Template published' : 'Template moved to drafts'), { tone: 'success' }); after && after();
  }
  async function remove(r, after) {
    if (!(await D3.confirm({ title: t('Delete template?'), text: t('“{name}” will be removed. Bags already created from it are not affected.', { name: esc(lt(r.name)) }), confirm: t('Delete'), danger: true }))) return;
    await api('DELETE', `/admin/templates/${r.id}`);
    D3.toast(t('Template deleted'), { tone: 'success' }); after && after();
  }

  /* ================= admin-listings ================= */
  App.route('admin-listings', {
    nav: 'Listings & Templates', title: 'Listings & Templates', subtitle: 'Manage listing templates and content structures.',
    render(el, ctx) {
      const tab = (ctx.params && ctx.params.tab) || 'all';
      el.innerHTML = `
        <div data-kpis>${UI.skeleton('kpis', 4)}</div>
        <div class="d3-head">
          ${UI.tabs({ name: 'tplcat', label: 'Template categories', active: tab, tabs: TAB_CATS.map((c) => ({ id: c.id, label: t(c.label) })) })}
          <div style="display:flex;gap:10px">
            ${UI.btn('Templates gallery', { variant: 'secondary', icon: 'grid', go: 'admin-templates' })}
            ${UI.btn('New Template', { variant: 'primary', icon: 'plus', go: 'admin-template-new', params: {} })}
          </div>
        </div>
        ${D3.card({ flush: true, body: '<div data-table></div>' })}`;

      const loadKpis = () => D3.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/templates', { pageSize: 1 }), (res) => {
        const s = res.meta.summary;
        return UI.kpis([
          { label: t('Total Templates'), icon: 'layers', tone: 'rose', value: fmt.number(s.total), foot: t('Across {n} categories', { n: fmt.number(s.categories) }) },
          { label: t('Active Templates'), icon: 'checkc', tone: 'lime', value: fmt.number(s.active), foot: t('In use by merchants') },
          { label: t('Drafts'), icon: 'edit', tone: 'orange', value: fmt.number(s.drafts), foot: t('Awaiting publish') },
          { label: t('Most Used'), icon: 'star', tone: 'mauve', value: `<span class="h-serif" style="font-size:22px">${s.mostUsed ? ltx(s.mostUsed.name) : '—'}</span>`, foot: s.mostUsed ? t('Used by {n} merchants', { n: fmt.number(s.mostUsed.usageCount) }) : '' },
        ], 4);
      }, { skeleton: 'kpis' });
      loadKpis();

      let category = tab;
      const table = UI.dataTable(el.querySelector('[data-table]'), {
        pageSize: 10, sort: '-updatedAt',
        columns: [
          { key: 'name', label: 'Template', sortable: true, render: (r) => `<b>${ltx(r.name)}</b>` },
          { key: 'category', label: 'Category', sortable: true, render: (r) => `<span class="d3-muted">${D3.catLabel(r.category)}</span>` },
          { key: 'fields', label: 'Fields', render: (r) => `<div class="d3-chips">${r.fields.map((f) => UI.chip(lt(f.label))).join('')}</div>` },
          { key: 'usageCount', label: 'Used By', sortable: true, render: (r) => `<b>${t('{n} merchants', { n: fmt.number(r.usageCount) })}</b>` },
          { key: 'updatedAt', label: 'Last Modified', sortable: true, render: (r) => `<span class="d3-muted">${D3.dateShort(r.updatedAt)}</span>` },
          { key: 'status', label: 'Status', render: (r) => tplPill(r.status) },
        ],
        fetch: (q) => api('GET', '/admin/templates', { ...q, category: category === 'all' ? '' : category }),
        rowActions: (r) => [
          { icon: 'edit', label: 'Edit', run: () => App.go('admin-template-edit', { id: r.id }) },
          { icon: 'copy', label: 'Duplicate', run: () => duplicate(r, () => { table.reload(); loadKpis(); }) },
          { icon: r.status === 'published' ? 'pause' : 'upload', label: r.status === 'published' ? 'Move to draft' : 'Publish', run: () => togglePublish(r, () => { table.reload(); loadKpis(); }) },
          { icon: 'trash', label: 'Delete', danger: true, run: () => remove(r, () => { table.reload(); loadKpis(); }) },
        ],
        rowClick: (r) => App.go('admin-template-edit', { id: r.id }),
        empty: { icon: 'layers', title: 'No templates in this category', text: 'Create a template so merchants can list bags faster.', action: UI.btn('New Template', { variant: 'primary', icon: 'plus', go: 'admin-template-new', params: {} }) },
      });
      el.addEventListener('ui:tab', (e) => { if (e.detail.name !== 'tplcat') return; category = e.detail.value; table.setQuery({ page: 1 }); });
    },
  });

  /* ================= builder (new / edit) ================= */
  function builder(el, ctx, mode) {
    const id = ctx.params && ctx.params.id, fromId = ctx.params && ctx.params.fromId;
    el.innerHTML = UI.skeleton('form', 6);
    Promise.all([
      api('GET', '/admin/templates/fields'),
      id ? api('GET', `/admin/templates/${id}`) : fromId ? api('GET', `/admin/templates/${fromId}`) : Promise.resolve({ data: null }),
    ]).then(([lib, cur]) => draw(lib.data, cur.data)).catch((err) => {
      el.innerHTML = UI.errorState({ text: err && err.status === 404 ? t('This template no longer exists.') : t('We couldn’t load this template.'), retry: true });
      el.addEventListener('ui:retry', () => ctx.refresh(), { once: true });
    });

    function draw(library, tpl) {
      const isEdit = mode === 'edit';
      const base = tpl ? JSON.parse(JSON.stringify(tpl)) : { name: { en: '', ar: '' }, description: { en: '', ar: '' }, category: 'bakery', fields: library.filter((f) => f.key === 'photo').map((f) => ({ ...f, required: true })), defaults: { quantity: 8, pickupWindow: { start: '18:00', end: '20:00' }, suggestedPrice: { amount: 15, currency: App.currency() } }, status: 'draft' };
      if (!isEdit && tpl) { base.name = { en: `${tpl.name.en}`, ar: tpl.name.ar }; base.status = 'draft'; }
      let fields = base.fields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: !!f.required }));
      if (isEdit) ctx.setTitle('Edit Template', 'Update the fields merchants fill in when they use this template.');
      else ctx.setTitle('New Template', 'Build a reusable structure merchants can list bags from.');

      el.innerHTML = `
        <div><button type="button" class="d3-back" data-go="admin-listings">${UI.icon('arrow-r', 'd3-backic')} ${t('Back to Listings & Templates')}</button></div>
        <form class="grid d3-tb" novalidate>
          <div class="d3-tb-main">
            ${D3.card({ title: t('Basics'), icon: 'file', body: `<div class="d3-fc c2">
              ${UI.field({ type: 'text', name: 'name_en', label: t('Template name (English)'), value: base.name.en, required: true, placeholder: 'e.g. Morning Pastry Box', maxlength: 60 })}
              ${UI.field({ type: 'text', name: 'name_ar', label: t('Template name (Arabic)'), value: base.name.ar, placeholder: 'مثال: صندوق معجنات الصباح', maxlength: 60 })}
              ${UI.field({ type: 'select', name: 'category', label: t('Category'), value: base.category, required: true, options: D3.opts(D3.CATEGORIES.filter((c) => ['bakery', 'grocery', 'meals', 'other'].includes(c.value))) })}
              ${UI.field({ type: 'select', name: 'status', label: t('Status'), value: base.status === 'published' ? 'published' : 'draft', options: [{ value: 'draft', label: t('Draft') }, { value: 'published', label: t('Active') }] })}
              ${UI.field({ type: 'textarea', name: 'desc_en', label: t('Description (English)'), value: base.description.en, rows: 3, cols: 2, placeholder: t('What merchants should know about this template') })}
              ${UI.field({ type: 'textarea', name: 'desc_ar', label: t('Description (Arabic)'), value: base.description.ar, rows: 3, cols: 2 })}
            </div>` })}
            ${D3.card({ title: t('Fields'), icon: 'layers', body: `<div><p class="d3-muted" style="margin:0 0 12px;font-size:12.5px">${t('Pick the fields merchants fill in. Required fields must be completed before a bag can be published.')}</p>
              <div class="d3-lib" role="group" aria-label="${t('Field library')}" data-lib></div>
              <div class="d3-sel" data-sel></div>
            </div>` })}
            ${D3.card({ title: t('Defaults'), icon: 'gear', sub: t('Pre-filled values a merchant can change.'), body: `<div class="d3-fc c2">
              ${UI.field({ type: 'number', name: 'quantity', label: t('Default quantity'), value: base.defaults.quantity, min: 1, max: 200, required: true })}
              ${UI.field({ type: 'money', name: 'price', label: t('Suggested price'), value: (base.defaults.suggestedPrice || {}).amount, min: 1, currency: (base.defaults.suggestedPrice || {}).currency, required: true })}
              ${UI.field({ type: 'time', name: 'start', label: t('Pickup window starts'), value: (base.defaults.pickupWindow || {}).start, required: true })}
              ${UI.field({ type: 'time', name: 'end', label: t('Pickup window ends'), value: (base.defaults.pickupWindow || {}).end, required: true })}
            </div>` })}
          </div>
          <aside class="d3-tb-side">
            ${D3.card({ title: t('Merchant preview'), icon: 'eye', body: '<div  data-preview></div>' })}
            ${isEdit ? D3.card({ title: t('Usage'), icon: 'activity', body: `<div ><div class="d3-row"><div class="d3-row-l"><b>${t('Used by')}</b></div><div>${t('{n} merchants', { n: fmt.number(base.usageCount || 0) })}</div></div><div class="d3-row"><div class="d3-row-l"><b>${t('Last Modified')}</b></div><div>${D3.date(base.updatedAt)}</div></div></div>` }) : ''}
            <div class="cd d3-cpad d3-tb-act">
              ${UI.btn(isEdit ? 'Save changes' : 'Save as draft', { variant: 'secondary', icon: 'check', attrs: 'data-act="save"' })}
              ${UI.btn(isEdit && base.status === 'published' ? 'Save & keep active' : 'Publish', { variant: 'primary', icon: 'upload', attrs: 'data-act="publish"' })}
              ${isEdit ? `<div class="d3-tb-more">${UI.btn('Duplicate', { variant: 'ghost', icon: 'copy', attrs: 'data-act="dup"' })}${UI.btn('Delete', { variant: 'danger', icon: 'trash', attrs: 'data-act="del"' })}</div>` : ''}
              ${UI.btn('Cancel', { variant: 'ghost', go: 'admin-listings' })}
            </div>
          </aside>
        </form>`;
      const form = el.querySelector('form');
      D3.arDir(form);

      const libEl = el.querySelector('[data-lib]'), selEl = el.querySelector('[data-sel]'), prevEl = el.querySelector('[data-preview]');
      function drawFields() {
        libEl.innerHTML = `<div class="d3-faint" style="font-size:12px;margin-bottom:8px">${t('Field library — click to add or remove')}</div><div class="d3-chips">${library.map((f) => {
          const on = fields.some((x) => x.key === f.key);
          return `<button type="button" class="d3-fchip ${on ? 'on' : ''}" aria-pressed="${on}" data-field="${f.key}">${UI.icon(on ? 'check' : 'plus')}${esc(lt(f.label))}</button>`;
        }).join('')}</div>`;
        selEl.innerHTML = fields.length ? `<div class="d3-faint" style="font-size:12px;margin:16px 0 8px">${t('Selected fields ({n})', { n: fmt.number(fields.length) })}</div>
          <ol class="d3-flist">${fields.map((f, i) => `<li><span class="d3-fnum">${fmt.number(i + 1)}</span><b>${esc(lt(f.label))}</b><span class="d3-faint">${t(f.type)}</span>
            <span class="d3-sp"></span>
            ${UI.toggle({ name: `req_${f.key}`, checked: f.required, label: t('Required') })}
            <button type="button" class="d3-ib" data-move="${i}:-1" aria-label="${t('Move up')}" ${i === 0 ? 'disabled' : ''}>${UI.icon('chev-up')}</button>
            <button type="button" class="d3-ib" data-move="${i}:1" aria-label="${t('Move down')}" ${i === fields.length - 1 ? 'disabled' : ''}>${UI.icon('chev')}</button>
            <button type="button" class="d3-ib" data-remove="${f.key}" aria-label="${t('Remove field')}">${UI.icon('x')}</button></li>`).join('')}</ol>`
          : `<div style="margin-top:16px">${UI.empty({ icon: 'layers', title: t('No fields yet'), text: t('Add at least one field from the library above.') })}</div>`;
        drawPreview();
      }
      function drawPreview() {
        const v = UI.formValues(form);
        const name = (App.state.lang === 'ar' && v.name_ar) || v.name_en || t('Untitled template');
        const desc = (App.state.lang === 'ar' && v.desc_ar) || v.desc_en || t('Description shown to merchants.');
        prevEl.innerHTML = `<div class="d3-gcard">
            <span class="d3-gic">${UI.icon(tplIcon(v.category))}</span>
            <b class="d3-gname">${esc(name)}</b>${UI.chip(D3.catLabel(v.category), { tone: 'rose' })}
            <p class="d3-muted">${esc(desc)}</p>
            <div class="d3-gmeta"><span>${t('{n} fields', { n: fmt.number(fields.length) })}</span><b>${t('{price} suggested', { price: fmt.money(+v.price || 0) })}</b></div>
            <div class="d3-faint" style="font-size:12px">${t('Pickup')} ${v.start && v.end ? fmt.timeRange(v.start, v.end) : '—'} · ${t('Qty')} ${fmt.number(+v.quantity || 0)}</div>
            ${UI.btn('Create from Template', { variant: 'primary', attrs: 'disabled aria-disabled="true" tabindex="-1"' })}
          </div>`;
      }
      drawFields();

      UI.on(libEl, 'click', '[data-field]', (e, b) => {
        const k = b.dataset.field, i = fields.findIndex((x) => x.key === k);
        if (i >= 0) fields.splice(i, 1); else { const f = library.find((x) => x.key === k); fields.push({ key: f.key, label: f.label, type: f.type, required: false }); }
        drawFields(); const nb = libEl.querySelector(`[data-field="${k}"]`); nb && nb.focus();
      });
      UI.on(selEl, 'click', '[data-move]', (e, b) => { const [i, d] = b.dataset.move.split(':').map(Number); const j = i + d; [fields[i], fields[j]] = [fields[j], fields[i]]; drawFields(); });
      UI.on(selEl, 'click', '[data-remove]', (e, b) => { fields = fields.filter((x) => x.key !== b.dataset.remove); drawFields(); });
      selEl.addEventListener('ui:toggle', (e) => { const k = e.detail.name.replace(/^req_/, ''); const f = fields.find((x) => x.key === k); if (f) f.required = e.detail.value; });
      form.addEventListener('input', drawPreview); form.addEventListener('change', drawPreview);

      async function save(btn, publish) {
        D3.clearErr(form);
        const r = UI.validate(form); if (!r.ok) { D3.toast(t('Some fields need attention.'), { tone: 'error' }); return; }
        if (!fields.length) { D3.toast(t('Add at least one field.'), { tone: 'error' }); return; }
        const v = r.values;
        if (v.start >= v.end) { D3.toast(t('The pickup window must end after it starts.'), { tone: 'error' }); return; }
        const body = {
          name: { en: v.name_en.trim(), ar: (v.name_ar || v.name_en).trim() }, category: v.category,
          description: { en: v.desc_en || '', ar: v.desc_ar || v.desc_en || '' },
          fields: fields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: f.required })),
          defaults: { quantity: +v.quantity, pickupWindow: { start: v.start, end: v.end }, suggestedPrice: { amount: +v.price, currency: (base.defaults.suggestedPrice || {}).currency || App.currency() } },
          status: publish ? 'published' : (isEdit ? v.status : 'draft'),
        };
        await D3.busy(btn, async () => {
          try {
            if (isEdit) await api('PATCH', `/admin/templates/${base.id}`, body); else await api('POST', '/admin/templates', body);
            D3.toast(t(publish ? 'Template published' : isEdit ? 'Changes saved' : 'Draft saved'), { tone: 'success' });
            App.go('admin-listings');
          } catch (err) { D3.fail(err, form); }
        });
      }
      UI.on(el, 'click', '[data-act="save"]', (e, b) => save(b, false));
      UI.on(el, 'click', '[data-act="publish"]', (e, b) => save(b, true));
      UI.on(el, 'click', '[data-act="dup"]', () => duplicate(base));
      UI.on(el, 'click', '[data-act="del"]', () => remove(base, () => App.go('admin-listings')));
      form.addEventListener('submit', (e) => { e.preventDefault(); save(el.querySelector('[data-act="save"]'), false); });
    }
  }
  App.route('admin-template-new', { nav: 'Listings & Templates', title: 'New Template', subtitle: 'Build a reusable structure merchants can list bags from.', render: (el, ctx) => builder(el, ctx, 'new') });
  App.route('admin-template-edit', { nav: 'Listings & Templates', title: 'Edit Template', subtitle: 'Update the fields merchants fill in when they use this template.', render: (el, ctx) => builder(el, ctx, 'edit') });

  /* ================= admin-templates (gallery) ================= */
  App.route('admin-templates', {
    nav: 'Listings & Templates', title: 'Templates', subtitle: 'Create new listings from reusable merchant templates.',
    render(el, ctx) {
      el.innerHTML = `
        <div class="banner d3-gban">
          <div class="wb" aria-hidden="true">WB</div>
          <div><h3>${t('Create a new bag faster.')}</h3><p>${t('Templates pre-fill the bag name, category, pickup window, quantity and suggested price — you just adjust the details and publish. Save your own templates for bags you list often.')}</p></div>
          ${UI.btn('Create from Template', { variant: 'secondary', attrs: 'data-act="pick"' })}
        </div>
        <section aria-labelledby="g-wb"><div class="d3-head"><h2 id="g-wb" class="h-serif">${t('WonderBites Templates')}</h2><span class="d3-muted">${t('Ready-made templates for common bag types')}</span></div><div data-wb style="margin-top:14px"></div></section>
        <section aria-labelledby="g-my"><div class="d3-head"><h2 id="g-my" class="h-serif">${t('My Templates')}</h2><span class="d3-muted">${t('Your own saved templates')}</span></div><div data-my style="margin-top:14px"></div></section>`;

      const card = (r, mine) => `<article class="cd d3-gcard">
          <span class="d3-gic">${UI.icon(tplIcon(r.category))}</span>
          <b class="d3-gname">${ltx(r.name)}</b>${UI.chip(D3.catLabel(r.category), { tone: 'rose' })}
          <p class="d3-muted">${ltx(r.description)}</p>
          <div class="d3-gmeta"><span>${t('Used {n} times', { n: fmt.number(r.usageCount) })}</span><b>${t('{price} suggested', { price: fmt.money(r.defaults.suggestedPrice.amount) })}</b></div>
          <div class="d3-gact">
            ${UI.btn(mine ? 'Use Template' : 'Create from Template', { variant: 'primary', go: 'admin-template-new', params: { fromId: r.id } })}
            ${mine ? UI.btn('Edit', { variant: 'icon', icon: 'edit', go: 'admin-template-edit', params: { id: r.id }, attrs: `` }) + UI.btn('Delete', { variant: 'icon', icon: 'trash', attrs: `data-del="${r.id}"` }) : ''}
          </div></article>`;
      let mineRows = [];
      const loadWb = () => D3.async(el.querySelector('[data-wb]'), () => api('GET', '/admin/templates', { source: 'wonderbites', status: 'published', pageSize: 50, sort: '-usageCount' }),
        (res) => res.data.length ? `<div class="grid g-3">${res.data.map((r) => card(r, false)).join('')}</div>` : UI.empty({ icon: 'layers', title: t('No published templates yet'), text: t('Publish a template from Listings & Templates.') }), { skeleton: 'cards' });
      const loadMine = () => D3.async(el.querySelector('[data-my]'), () => api('GET', '/admin/templates', { source: 'mine', pageSize: 50 }),
        (res) => { mineRows = res.data; return res.data.length ? `<div class="grid g-3">${res.data.map((r) => card(r, true)).join('')}</div>` : UI.empty({ icon: 'bag', title: t('No saved templates'), text: t('Templates you create appear here.'), action: UI.btn('New Template', { variant: 'primary', icon: 'plus', go: 'admin-template-new', params: {} }) }); }, { skeleton: 'cards' });
      loadWb(); loadMine();

      UI.on(el, 'click', '[data-del]', (e, b) => { const r = mineRows.find((x) => x.id === b.dataset.del); if (r) remove(r, loadMine); });
      UI.on(el, 'click', '[data-act="pick"]', async () => {
        const { data } = await api('GET', '/admin/templates', { status: 'published', pageSize: 50, sort: '-usageCount' });
        const m = D3.modal({
          title: t('Choose a template'), size: 'md',
          body: `<div class="d3-pick" role="listbox" aria-label="${t('Templates')}">${data.map((r, i) => `<label class="d3-pickrow"><input type="radio" name="pick" value="${r.id}" ${i === 0 ? 'checked' : ''}><span class="d3-gic sm">${UI.icon(tplIcon(r.category))}</span><span><b>${ltx(r.name)}</b><small class="d3-muted">${D3.catLabel(r.category)} · ${t('Used {n} times', { n: fmt.number(r.usageCount) })}</small></span></label>`).join('')}</div>`,
          actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Continue', variant: 'primary', run: (mm) => { const v = mm.el.querySelector('input[name="pick"]:checked'); mm.close(); if (v) App.go('admin-template-new', { fromId: v.value }); } }],
        });
        return m;
      });
    },
  });

  UI.css('d3-templates', `
    .d3-tb{grid-template-columns:minmax(0,1fr) 340px;align-items:start}
    .d3-tb-main,.d3-tb-side{display:grid;gap:var(--gap,24px);align-content:start}
    .d3-tb-act{display:grid;gap:10px}.d3-tb-act .btn{width:100%;justify-content:center}
    .d3-tb-more{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .d3-fchip{display:inline-flex;align-items:center;gap:6px;height:30px;padding-inline:10px 12px;border-radius:999px;border:1px dashed var(--line-2);background:transparent;color:var(--muted);font:inherit;font-size:12.5px;cursor:pointer}
    .d3-fchip svg{width:14px;height:14px}
    .d3-fchip.on{border-style:solid;border-color:var(--accent);background:var(--tint-rose);color:var(--accent);font-weight:600}
    .d3-flist{list-style:none;display:grid;gap:8px;margin:0;padding:0}
    .d3-flist li{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:var(--r-ctl,11px);background:var(--card-2,transparent)}
    .d3-fnum{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;background:var(--tint-mauve);font-size:11px;font-weight:700}
    .d3-sp{flex:1}
    .d3-ib{width:30px;height:30px;border-radius:9px;border:1px solid var(--line);background:transparent;color:var(--muted);display:grid;place-items:center;cursor:pointer}
    .d3-ib:disabled{opacity:.35;cursor:default}.d3-ib svg{width:15px;height:15px}
    .d3-gcard{padding:20px;display:flex;flex-direction:column;gap:8px;align-items:flex-start}
    .d3-gic{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:var(--tint-rose);color:var(--accent)}
    .d3-gic.sm{width:34px;height:34px;border-radius:10px}
    .d3-gname{font-size:15px;font-weight:600}
    .d3-gcard p{font-size:13px;margin:0;min-height:40px}
    .d3-gmeta{display:flex;justify-content:space-between;width:100%;font-size:13px;margin-top:auto}
    .d3-gact{display:flex;gap:8px;width:100%}.d3-gact>.btn:first-child{flex:1;justify-content:center}
    .d3-gcard>.btn{width:100%;justify-content:center}
    .d3-gban{align-items:center}.d3-gban p{max-width:720px}.d3-gban>.btn{margin-inline-start:auto}
    .d3-pick{display:grid;gap:8px;max-height:420px;overflow:auto}
    .d3-pickrow{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:var(--r-ctl,11px);cursor:pointer}
    .d3-pickrow:has(input:checked){border-color:var(--accent);background:var(--tint-rose)}
    .d3-pickrow small{display:block}
    @media (max-width:1200px){.d3-tb{grid-template-columns:1fr}}
  `);
})();
