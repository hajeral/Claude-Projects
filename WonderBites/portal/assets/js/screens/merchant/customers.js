/* Merchant · Customers (owner: D4) — routes m-customers, m-customer-new {id?}, m-customer-detail {id} */
(function () {
  'use strict';
  const { L, LE, opts, label, CATS, money, orderState, importDialog } = Ops;
  const STATUS = [['active', 'Active'], ['inactive', 'Inactive'], ['blocked', 'Blocked']];
  const CODES = () => Markets.phoneOptions(true).map((o) => [o.value, o.label]); // (v1.3) phone codes of enabled markets
  const phone = (c) => `<span class="num">${UI.esc((c.code || '') + ' ' + (c.mobile || ''))}</span>`;
  const score = (c) => `<b>${fmt.number(c.rescueScore)}</b><small class="faint" style="display:block;font-size:11.5px">${t('Rescue score')}</small>`;

  async function del(c, after) {
    if (!(await UI.confirm({ html: true, title: t('Delete customer?'), text: t('{name} and their saved details will be removed. Past orders stay in your reports.', { name: LE(c.name) }), confirm: t('Delete'), danger: true }))) return;
    await api('DELETE', '/merchant/customers/' + c.id); UI.toast(t('Customer deleted'), { tone: 'success', html: true }); after && after();
  }

  App.route('m-customers', {
    nav: 'Customers', title: 'Customers', subtitle: 'See who is ordering from you.',
    render(el) {
      el.innerHTML = `<div data-kpis>${UI.skeleton('kpis', 5)}</div><div data-filters></div>
        ${UI.card({ title: t('All Users'), sub: t('User list'), icon: 'users', tone: 'rose', flush: true, body: '<div data-table></div>' })}`;
      const loadKpis = () => UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/merchant/customers', { ...api.ctx(), pageSize: 1 }), (res) => {
        const s = Ops.summaryOf(res);
        return UI.kpis([
          { label: t('Total Users'), icon: 'users', tone: 'rose', value: fmt.number(s.total), foot: t('Registered on platform') },
          { label: t('Active'), icon: 'checkc', tone: 'lime', value: fmt.number(s.active), foot: t('Currently active') },
          { label: t('Inactive'), icon: 'clock', tone: 'orange', value: fmt.number(s.inactive), foot: t('No recent activity') },
          { label: t('Blocked'), icon: 'shield', tone: 'mauve', value: fmt.number(s.blocked), foot: t('Access restricted') },
          { label: t('Avg Rescue Score'), icon: 'leaf', tone: 'lime', value: fmt.number(s.avgRescueScore), foot: t('Sustainability impact') },
        ], 5);
      }, { skeleton: 'kpis' });
      loadKpis();
      const filters = UI.mountFilters(el.querySelector('[data-filters]'), {
        search: { name: 'q', placeholder: t('Search by name, email or phone') },
        selects: [{ name: 'status', label: t('All Status'), options: opts(STATUS) }, { name: 'category', label: t('All Categories'), options: opts(CATS) }],
        sort: { name: 'sort', value: '-createdAt', options: [{ value: '-createdAt', label: t('Newest First') }, { value: 'createdAt', label: t('Oldest First') }, { value: '-ordersCount', label: t('Most orders') }, { value: '-rescueScore', label: t('Highest rescue score') }, { value: 'name', label: t('Name A–Z') }] },
        actions: UI.btn(t('Add Customer'), { variant: 'primary', icon: 'plus', go: 'm-customer-new', params: {} }) + UI.btn(t('Import'), { variant: 'green', icon: 'download', attrs: 'data-act="import"' }) + UI.btn(t('Export'), { variant: 'green', icon: 'upload', attrs: 'data-act="export"' }),
        clear: true,
      }, () => table.setQuery({ page: 1 }));
      const table = UI.dataTable(el.querySelector('[data-table]'), {
        pageSize: 10, select: true,
        columns: [
          { key: 'name', label: t('Name'), sortable: true, render: (c) => `<div class="ops-row">${UI.avatar(L(c.name), { size: 32 })}<b>${LE(c.name)}</b></div>` },
          { key: 'mobile', label: t('Mobile Number'), render: phone },
          { key: 'email', label: t('Email Address'), render: (c) => `<span class="muted">${UI.esc(c.email)}</span>` },
          { key: 'createdAt', label: t('Created at'), sortable: true, render: (c) => `${fmt.date(c.createdAt)}<small class="faint" style="display:block">${fmt.clock(c.createdAt)}</small>` },
          { key: 'ordersCount', label: t('Orders'), sortable: true, render: (c) => fmt.number(c.ordersCount) },
          { key: 'rescueScore', label: t('Rescue score'), sortable: true, render: score },
          { key: 'status', label: t('Status'), render: (c) => UI.pill(c.status) },
        ],
        fetch: (q) => api('GET', '/merchant/customers', { ...api.ctx(), ...filters.values(), ...q }),
        rowClick: (c) => App.go('m-customer-detail', { id: c.id }),
        rowActions: (c) => [
          { icon: 'eye', label: t('View'), run: () => App.go('m-customer-detail', { id: c.id }) },
          { icon: 'edit', label: t('Edit'), run: () => App.go('m-customer-new', { id: c.id }) },
          { icon: 'trash', label: t('Delete'), danger: true, run: () => del(c, reload) },
        ],
        bulkActions: [
          { label: t('Export selected'), icon: 'upload', run: (ids) => Overlays.export({ scope: t('Customers'), endpoint: '/merchant/customers', columns: ['Name', 'Mobile Number', 'Email Address', 'Orders', 'Rescue score', 'Status'].map((x) => t(x)), filters: { ids } }) },
          { label: t('Block'), icon: 'shield', danger: true, run: async (ids) => { await Promise.all(ids.map((id) => api('PATCH', '/merchant/customers/' + id, { status: 'blocked' }))); UI.toast(t('{n} customers blocked', { n: fmt.number(ids.length) }), { tone: 'success', html: true }); reload(); } },
        ],
        empty: { icon: 'users', title: t('No customers found'), text: t('Try changing the filters.') },
      });
      function reload() { table.reload(); loadKpis(); }
      UI.on(el, 'click', '[data-act="import"]', () => importDialog({ resource: 'customers', title: 'Import customers', columns: ['Name', 'Code', 'Mobile Number', 'Email Address'], onDone: reload }));
      UI.on(el, 'click', '[data-act="export"]', () => Overlays.export({ scope: t('Customers'), endpoint: '/merchant/customers', columns: ['Name', 'Mobile Number', 'Email Address', 'Created at', 'Orders', 'Rescue score', 'Status'].map((x) => t(x)) }));
    },
  });

  App.route('m-customer-new', {
    nav: 'Customers', title: 'Add Customer', subtitle: 'Add a customer to your store.',
    async render(el, ctx) {
      const id = ctx.params && ctx.params.id;
      let c = null;
      if (id) {
        el.innerHTML = UI.skeleton('form', 5);
        try { c = (await api('GET', '/merchant/customers/' + id)).data; } catch (e) { el.innerHTML = UI.errorState({ text: t('Could not load this customer.'), retry: true }); UI.on(el, 'ui:retry', '*', () => ctx.refresh()); return; }
        ctx.setTitle && ctx.setTitle('Edit Customer', 'Update the customer details.');
      }
      const row = (title, text, body) => `<div class="ops-split" style="grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);padding:24px;border-block-end:1px solid var(--line)"><div><h3 style="font-size:15px;margin:0">${t(title)}</h3><p class="muted" style="font-size:12.5px;margin:4px 0 0">${t(text)}</p></div><div class="ops-form">${body}</div></div>`;
      el.innerHTML = `<form data-cf novalidate class="cd" style="padding:0">
        ${row('Personal Info', 'Edit your information', `${UI.field({ name: 'name', label: t('Name'), required: true, value: c ? L(c.name) : '', placeholder: t('Enter name') })}
          <div class="ops-grid2" style="grid-template-columns:160px 1fr">${UI.field({ type: 'select', name: 'code', label: t('Code'), required: true, value: c ? c.code : App.marketInfo().phoneCode, options: opts(CODES()) })}
          ${UI.field({ type: 'tel', name: 'mobile', label: t('Mobile Number'), required: true, value: c ? c.mobile : '', placeholder: '5550 0000', pattern: '^[0-9 ]{7,12}$' })}</div>
          ${UI.field({ type: 'email', name: 'email', label: t('Email'), required: true, value: c ? c.email : '', placeholder: t('Enter email address') })}
          ${c ? UI.field({ type: 'select', name: 'status', label: t('Status'), value: c.status, options: opts(STATUS) }) : `<div class="ops-grid2">${UI.field({ type: 'password', name: 'password', label: t('Password'), required: true, minlength: 8, placeholder: '••••••••', hint: t('At least 8 characters') })}
          ${UI.field({ type: 'password', name: 'confirm', label: t('Confirm Password'), required: true, minlength: 8, placeholder: '••••••••' })}</div>`}`)}
        ${row('Profile', 'Upload your profile', UI.dropzone({ name: 'avatar', accept: 'image/*', multiple: false, hint: t('Drop or select file') }))}
        <div style="display:flex;justify-content:flex-end;gap:10px;padding:16px 24px">${UI.btn(t('Cancel'), { variant: 'ghost', attrs: 'data-act="cancel"' })}${UI.btn(c ? t('Save changes') : t('Add Customer'), { variant: 'primary', icon: 'check', type: 'submit' })}</div></form>`;
      UI.on(el, 'click', '[data-act="cancel"]', () => App.go(c ? 'm-customer-detail' : 'm-customers', c ? { id: c.id } : {}));
      el.querySelector('[data-cf]').addEventListener('submit', async (e) => {
        e.preventDefault(); const r = UI.validate(e.currentTarget); if (!r.ok) return;
        const v = r.values;
        if (!c && v.password !== v.confirm) { UI.toast(t('Passwords do not match.'), { tone: 'error', html: true }); const f = e.currentTarget.querySelector('[name="confirm"]'); f && f.focus(); return; }
        try {
          const body = { name: v.name, code: v.code, mobile: v.mobile, email: v.email, ...(c ? { status: v.status } : { password: v.password }), avatarFileId: v.avatar && v.avatar.length ? 'file-' + Date.now() : undefined };
          const res = c ? await api('PATCH', '/merchant/customers/' + c.id, body) : await api('POST', '/merchant/customers', body);
          UI.toast(c ? t('Customer updated') : t('Customer added'), { tone: 'success', html: true }); App.go('m-customer-detail', { id: res.data.id });
        } catch (er) { UI.toast(er.status === 409 ? t('This email is already registered.') : er.message, { tone: 'error', html: true }); }
      });
    },
  });

  App.route('m-customer-detail', {
    nav: 'Customers', title: 'Customers', subtitle: 'See who is ordering from you.',
    async render(el, ctx) {
      const id = ctx.params && ctx.params.id; if (!id) { App.go('m-customers'); return; }
      el.innerHTML = UI.skeleton('cards', 3);
      let c; try { c = (await api('GET', '/merchant/customers/' + id)).data; }
      catch (e) { el.innerHTML = UI.errorState({ text: t('Could not load this customer.'), retry: true }); UI.on(el, 'ui:retry', '*', () => ctx.refresh()); return; }
      const ords = c.orders || [];
      el.innerHTML = `
        <div class="ops-head"><div style="display:flex;gap:16px;align-items:center">${UI.avatar(L(c.name), { size: 56 })}<div><h2>${LE(c.name)} ${UI.pill(c.status)}</h2><p>${fmt.id(c.id)} · ${t('Customer since {date}', { date: fmt.date(c.createdAt) })}</p></div></div>
          <div class="ops-actions">${UI.btn(t('Back to customers'), { variant: 'ghost', icon: 'chev-l', go: 'm-customers' })}
            ${UI.btn(c.status === 'blocked' ? t('Unblock') : t('Block'), { variant: 'secondary', icon: 'shield', attrs: 'data-act="block"' })}
            ${UI.btn(t('Edit'), { variant: 'secondary', icon: 'edit', go: 'm-customer-new', params: { id: c.id } })}${UI.btn(t('Delete'), { variant: 'danger', icon: 'trash', attrs: 'data-act="delete"' })}</div></div>
        ${UI.kpis([
          { label: t('Orders'), icon: 'file', tone: 'mauve', value: fmt.number(c.ordersCount), foot: t('All time') },
          { label: t('Total spent'), icon: 'wallet', tone: 'rose', value: money(c.totalSpent), foot: t('At your store') },
          { label: t('Meals saved'), icon: 'leaf', tone: 'lime', value: fmt.number(c.mealsSaved), foot: t('Through rescued bags') },
          { label: t('Rescue score'), icon: 'star', tone: 'orange', value: fmt.number(c.rescueScore), foot: t('Out of 100') },
        ], 4)}
        <div class="grid" style="grid-template-columns:360px minmax(0,1fr);align-items:start">
          ${UI.card({ title: t('Contact details'), icon: 'user', tone: 'mauve', body: `<div class="cd-b"><dl class="ops-dl">
            <dt>${t('Mobile Number')}</dt><dd>${phone(c)}</dd><dt>${t('Email')}</dt><dd style="word-break:break-all">${UI.esc(c.email)}</dd><dt>${t('City')}</dt><dd>${UI.esc(Markets.cityName(c.city))}</dd>
            <dt>${t('Favourite category')}</dt><dd>${label(CATS, c.favoriteCategory)}</dd><dt>${t('Last order')}</dt><dd>${c.lastOrderAt ? fmt.date(c.lastOrderAt) : '—'}</dd></dl></div>` })}
          ${UI.card({ title: t('Order history'), icon: 'package', tone: 'rose', flush: true, count: fmt.number(ords.length), body: ords.length ? `<table class="tbl"><thead><tr><th>${t('Order')}</th><th>${t('Bag')}</th><th>${t('Amount')}</th><th>${t('Window')}</th><th>${t('Status')}</th></tr></thead><tbody>
              ${ords.map((o) => `<tr data-order="${UI.esc(o.id)}" style="cursor:pointer"><td><b>${fmt.id(o.id)}</b></td><td>${LE(o.bag)}</td><td>${money(o.total)}</td><td>${fmt.timeRange(o.pickupWindow.start, o.pickupWindow.end)}</td><td>${UI.pill(orderState(o))}</td></tr>`).join('')}</tbody></table>`
            : `<div class="cd-b">${UI.empty({ icon: 'package', title: t('No orders in this period'), text: t('Orders from this customer will appear here.') })}</div>` })}
        </div>`;
      UI.on(el, 'click', '[data-order]', (e, tr) => Ops.openOrder(tr.dataset.order, () => ctx.refresh()));
      UI.on(el, 'click', '[data-act="delete"]', () => del(c, () => App.go('m-customers')));
      UI.on(el, 'click', '[data-act="block"]', async () => {
        const block = c.status !== 'blocked';
        if (block && !(await UI.confirm({ html: true, title: t('Block customer?'), text: t('{name} will not be able to reserve your bags.', { name: LE(c.name) }), confirm: t('Block'), danger: true }))) return;
        await api('PATCH', '/merchant/customers/' + c.id, { status: block ? 'blocked' : 'active' }); UI.toast(block ? t('Customer blocked') : t('Customer unblocked'), { tone: 'success', html: true }); ctx.refresh();
      });
    },
  });
})();
