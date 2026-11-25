/* =====================================================================
   Admin · Consumers  (owner: D1)
   Routes: admin-consumers {status?}, admin-consumer-detail {id}
   API: GET /admin/consumers, /admin/consumers/summary, GET|PATCH|DELETE /admin/consumers/:id,
        GET /admin/consumers/:id/orders, POST /admin/consumers/:id/block|unblock
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc;
  const STATUS_OPTS = ['active', 'inactive', 'blocked'].map((k) => ({ value: k, label: D1.ST.consumer[k][0] }));
  const SORTS = [{ value: '-joinedAt', label: 'Newest First' }, { value: 'joinedAt', label: 'Oldest First' }, { value: '-ordersCount', label: 'Most orders' }, { value: '-rescueScore', label: 'Highest rescue score' }, { value: 'name', label: 'Name: A to Z' }];
  const BLOCK_REASONS = [['repeated_no_shows', 'Repeated no-shows'], ['abusive_behaviour', 'Abusive behaviour'], ['payment_fraud', 'Payment fraud'], ['multiple_accounts', 'Multiple accounts'], ['other', 'Other']];
  const blockLabel = (k) => t((BLOCK_REASONS.find((r) => r[0] === k) || [0, String(k || '').replace(/_/g, ' ')])[1]);
  const LANGS = [{ value: 'en', label: 'English' }, { value: 'ar', label: 'Arabic' }];

  function editModal(c, done) {
    UI.modal({
      title: 'Edit consumer', icon: 'user', size: 'md',
      body: `<form class="d1-form" novalidate><div class="form-grid">
        ${UI.field({ name: 'nameEn', label: 'Full name (English)', value: c.nameI18n.en, required: true })}
        ${UI.field({ name: 'nameAr', label: 'Full name (Arabic)', value: c.nameI18n.ar })}
        ${UI.field({ type: 'email', name: 'email', label: 'Email Address', value: c.email, required: true })}
        ${UI.field({ type: 'tel', name: 'phone', label: 'Mobile Number', value: c.phone, required: true })}
        ${UI.field({ type: 'select', name: 'city', label: 'City', value: c.city, options: D1.opts(D1.CITY) })}
        ${UI.field({ type: 'select', name: 'language', label: 'Preferred language', value: c.language, options: LANGS })}
        ${UI.field({ type: 'checkbox', name: 'marketingOptIn', label: 'Receives marketing emails', checked: c.marketingOptIn, cols: 2 })}
      </div></form>`,
      actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Save changes', variant: 'primary', run: async (m) => {
        const f = m.el.querySelector('form'); const v = UI.validate(f); if (!v.ok) return false; const x = v.values;
        try { await api('PATCH', '/admin/consumers/' + c.id, { name: { en: x.nameEn, ar: x.nameAr || x.nameEn }, email: x.email, phone: x.phone, city: x.city, language: x.language, marketingOptIn: x.marketingOptIn }); m.close(true); UI.toast(t('Consumer updated'), { tone: 'success' }); if (done) done(); }
        catch (e) { D1.showFieldErrors(f, e); D1.toastErr(e); return false; }
      } }],
    });
  }
  async function blockToggle(c, done) {
    if (c.status === 'blocked') {
      const ok = await UI.confirm({ title: t('Unblock {name}?', { name: c.name }), text: t('They can reserve bags again straight away.'), confirm: 'Unblock', icon: 'checkc' });
      if (ok && await D1.run(() => api('POST', `/admin/consumers/${c.id}/unblock`, {}), 'Consumer unblocked') && done) done();
      return;
    }
    const v = await D1.reasonModal({
      title: 'Block consumer?', icon: 'ban', danger: true, confirm: 'Block', reasons: BLOCK_REASONS,
      text: esc(t('{name} won’t be able to reserve bags. Existing reservations are cancelled and refunded.', { name: c.name })),
      onSubmit: (vals) => api('POST', `/admin/consumers/${c.id}/block`, { reason: vals.reason, note: vals.note }),
    });
    if (v) { UI.toast(t('Consumer blocked'), { tone: 'success' }); if (done) done(); }
  }
  async function del(c, done) {
    const ok = await UI.confirm({ title: t('Delete {name}?', { name: c.name }), text: t('The account and personal data are permanently deleted. Order history is anonymised for reporting.'), confirm: 'Delete account', danger: true });
    if (ok && await D1.run(() => api('DELETE', '/admin/consumers/' + c.id), 'Consumer deleted') && done) done();
  }
  const scoreCell = (r) => `<div style="display:grid;line-height:1.2"><b class="num">${r.rescueScore}</b><small class="faint" style="font-size:10.5px">${esc(t('Rescue score'))}</small></div>`;

  App.route('admin-consumers', {
    nav: 'Consumers', title: 'Consumers', subtitle: 'View consumer accounts and engagement.',
    render(el, ctx) {
      el.innerHTML = `<div data-kpis></div><div data-filters></div>${UI.card({ title: 'All Users', sub: 'User list', icon: 'users', flush: true, body: '<div data-table></div>' })}`;
      const loadKpis = () => UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/consumers/summary', api.ctx()), ({ data: k }) => UI.kpis([
        { label: 'Total Users', icon: 'users', tone: 'rose', value: fmt.number(k.totalUsers), foot: t('Registered on platform') },
        { label: 'Active', icon: 'radio', tone: 'lime', value: fmt.number(k.active), foot: t('Currently active'), go: 'admin-consumers', params: { status: 'active' } },
        { label: 'Inactive', icon: 'ban', tone: 'orange', value: fmt.number(k.inactive), foot: t('No recent activity'), go: 'admin-consumers', params: { status: 'inactive' } },
        { label: 'Blocked', icon: 'shield', tone: 'mauve', value: fmt.number(k.blocked), foot: t('Access restricted'), go: 'admin-consumers', params: { status: 'blocked' } },
        { label: 'Avg Rescue Score', icon: 'gauge', tone: 'berry', value: fmt.number(k.avgRescueScore), foot: t('Sustainability impact'), go: 'admin-sustainability' },
      ]), { skeleton: 'kpis', n: 5 });
      loadKpis();
      const filters = UI.mountFilters(el.querySelector('[data-filters]'), {
        search: { name: 'q', placeholder: 'Search by name, email or phone' },
        selects: [
          { name: 'status', label: 'All Status', options: STATUS_OPTS },
          { name: 'category', label: 'All Categories', options: D1.opts(D1.CATEGORY).filter((o) => !['produce', 'other'].includes(o.value)) },
          { name: 'city', label: 'All Cities', options: D1.opts(D1.CITY) },
          { name: 'dietary', label: 'All Dietary tags', options: D1.opts(D1.DIET) },
        ],
        sort: { name: 'sort', label: 'Sort', options: SORTS, value: '-joinedAt' },
        values: { status: D1.take(ctx, 'status') || '' },
        actions: UI.btn('Export', { variant: 'secondary', icon: 'upload', attrs: 'data-act="export"' }),
      }, () => table.setQuery({ page: 1 }));
      const refreshAll = () => { table.reload(); loadKpis(); };
      const table = UI.dataTable(el.querySelector('[data-table]'), {
        select: true, pageSize: 10, caption: 'All Users',
        columns: [
          { key: 'name', label: 'Name', sortable: true, render: (r) => `<div class="prod">${UI.avatar(r.name)}<div style="min-width:0"><b class="ellipsis">${esc(r.name)}</b><small>${fmt.id(r.id)}</small></div></div>` },
          { key: 'phone', label: 'Mobile Number', render: (r) => fmt.id(r.phone) },
          { key: 'email', label: 'Email Address', render: (r) => `<span class="muted" dir="ltr">${esc(r.email)}</span>` },
          { key: 'joinedAt', label: 'Created at', sortable: true, render: (r) => `<b style="font-weight:600">${D1.dt(r.joinedAt)}</b>` },
          { key: 'ordersCount', label: 'Orders', sortable: true, align: 'end', render: (r) => fmt.number(r.ordersCount) },
          { key: 'rescueScore', label: 'Rescue score', sortable: true, render: scoreCell },
          { key: 'status', label: 'Status', render: (r) => D1.pill('consumer', r.status) },
        ],
        fetch: (q) => { const f = filters.values(); return api('GET', '/admin/consumers', { ...api.ctx(), ...f, ...q, sort: q.sort || f.sort }); },
        rowClick: (r) => App.go('admin-consumer-detail', { id: r.id }),
        rowActions: (r) => [
          { icon: 'eye', label: 'View', run: () => App.go('admin-consumer-detail', { id: r.id }) },
          { icon: 'edit', label: 'Edit', run: () => editModal(r, refreshAll) },
          { icon: 'trash', label: 'Delete', danger: true, run: () => del(r, refreshAll) },
        ],
        bulkActions: [{ label: 'Export selected', icon: 'upload', run: (ids) => { Overlays.export({ scope: 'Consumers', endpoint: '/admin/consumers', filters: { ids } }); return false; } }],
        empty: { icon: 'users', title: 'No consumers found', text: 'Try changing the filters or search.' },
      });
      UI.on(el, 'click', '[data-act="export"]', () => Overlays.export({ scope: 'Consumers', endpoint: '/admin/consumers', columns: ['Name', 'Mobile Number', 'Email Address', 'Created at', 'Orders', 'Rescue score', 'Status'], filters: filters.values() }));
    },
  });

  App.route('admin-consumer-detail', {
    nav: 'Consumers', title: 'Consumer details', subtitle: 'Profile, orders and account controls.',
    render(el, ctx) {
      const id = ctx.params.id;
      if (!id) { el.innerHTML = UI.card({ body: UI.empty({ icon: 'users', title: 'No consumer selected', text: 'Choose a consumer from the list.', action: UI.btn('Back to Consumers', { variant: 'primary', go: 'admin-consumers' }) }) }); return; }
      el.innerHTML = UI.skeleton('cards', 3);
      el.addEventListener('ui:retry', () => load());
      const load = async () => {
        let c;
        try { c = (await api('GET', '/admin/consumers/' + id)).data; } catch (e) {
          el.innerHTML = e.status === 404 ? UI.card({ body: UI.empty({ icon: 'users', title: 'Consumer not found', text: 'This account may have been deleted.', action: UI.btn('Back to Consumers', { variant: 'primary', go: 'admin-consumers' }) }) }) : UI.card({ body: UI.errorState({ text: D1.err(e) }) });
          return;
        }
        D1.setTitle(c.name);
        el.innerHTML = `
          ${UI.card({ body: `<div class="d1-mhead">${UI.btn('Back to Consumers', { variant: 'icon', icon: 'chev-l', iconCls: 'flip', go: 'admin-consumers' })}${UI.avatar(c.name, { size: 56 })}
            <div style="min-width:0"><div class="row wrap" style="gap:10px"><h2 class="h-serif" style="margin:0;font-size:24px">${esc(c.name)}</h2>${D1.pill('consumer', c.status)}</div>
            <div class="meta"><span>${fmt.id(c.id)}</span><span>${UI.icon('pin')}${esc(D1.lab(D1.CITY, c.city))}</span><span>${UI.icon('cal')}${t('Joined {d}', { d: fmt.date(c.joinedAt.slice(0, 10)) })}</span><span>${UI.icon('globe')}${esc(t(c.language === 'ar' ? 'Arabic' : 'English'))}</span></div></div>
            <div class="acts">${UI.btn('Delete', { variant: 'ghost', icon: 'trash', attrs: 'data-cact="delete"' })}${UI.btn(c.status === 'blocked' ? 'Unblock' : 'Block', { variant: c.status === 'blocked' ? 'secondary' : 'danger', icon: c.status === 'blocked' ? 'checkc' : 'ban', attrs: 'data-cact="block"' })}${UI.btn('Edit', { variant: 'primary', icon: 'edit', attrs: 'data-cact="edit"' })}</div></div>
            ${c.status === 'blocked' ? `<div class="d1-banner bad" style="margin-block-start:16px">${UI.icon('ban')}<div><b>${esc(t('Account blocked'))}</b><p>${esc(blockLabel(c.blockReason))}${c.blockNote ? ' — ' + esc(c.blockNote) : ''}</p></div></div>` : ''}` })}
          ${UI.kpis([
            { label: 'Orders', icon: 'clipboard', tone: 'rose', value: fmt.number(c.ordersCount), foot: c.lastOrderAt ? t('Last order {d}', { d: fmt.date(c.lastOrderAt.slice(0, 10), 'short') }) : t('No orders yet') },
            { label: 'Total spent', icon: 'coins', tone: 'orange', value: D1.money(c.totalSpent), foot: t('All time') },
            { label: 'Wallet balance', icon: 'wallet', tone: 'mauve', value: D1.money(c.walletBalance), foot: t('Open in Wallet & Vouchers'), go: 'admin-wallet', params: { tab: 'credit' } },
            { label: 'Meals saved', icon: 'leaf', tone: 'lime', value: fmt.number(c.mealsSaved), foot: t('{n} kg CO₂ avoided', { n: fmt.number(c.co2KgAvoided, 1) }) },
          ], 4)}
          <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.6fr)">
            ${UI.card({ title: 'Profile', icon: 'user', body: `<div class="row" style="gap:16px;align-items:center;margin-block-end:16px">${Charts.ring(c.rescueScore, { size: 72, color: c.rescueScore >= 80 ? 'lime' : c.rescueScore >= 50 ? 'orange' : 'rose', text: fmt.text.number(c.rescueScore), label: 'Rescue score' })}<div><b>${esc(t('Rescue score'))}</b><p class="muted" style="margin:2px 0 0;font-size:12.5px">${esc(t('Based on bags collected, on-time pickups and no-shows.'))}</p></div></div>
              ${D1.dl([['Mobile Number', fmt.id(c.phone)], ['Email Address', `<a class="lnk plain" href="mailto:${esc(c.email)}" dir="ltr">${esc(c.email)}</a>`], ['Created at', D1.dt(c.joinedAt)], ['Marketing emails', esc(t(c.marketingOptIn ? 'Subscribed' : 'Not subscribed'))], ['Preferred categories', `<div class="d1-chips">${c.preferences.categories.map((x) => UI.chip(D1.CATEGORY[x] || x)).join('')}</div>`], ['Dietary', `<div class="d1-chips">${c.preferences.dietary.map((x) => UI.chip(D1.DIET[x] || x, { tone: 'green', icon: 'leaf' })).join('')}</div>`]])}` })}
            ${UI.card({ title: 'Recent orders', icon: 'clipboard', tone: 'mauve', actions: UI.link('View All', 'admin-orders', { q: c.name }), flush: true, body: '<div data-orders></div>' })}
          </div>`;
        UI.async(el.querySelector('[data-orders]'), () => api('GET', `/admin/consumers/${id}/orders`), ({ data }) => `<div class="tbl-wrap" style="min-width:0"><table class="tbl"><thead><tr><th>${esc(t('Order'))}</th><th>${esc(t('Restaurants'))}</th><th class="end">${esc(t('Amount'))}</th><th>${esc(t('Status'))}</th><th class="end">${esc(t('Actions'))}</th></tr></thead><tbody>${data.map((o) => `<tr><td>${D1.prod(o.thumb, o.items[0].title, fmt.id(o.id))}</td><td>${esc(o.merchant.name)}<small class="muted" style="display:block;font-size:11.5px">${D1.dt(o.createdAt)}</small></td><td class="end"><b>${D1.money(o.total)}</b></td><td>${D1.pill('order', o.status)}</td><td class="end">${UI.btn('View', { variant: 'icon', icon: 'eye', attrs: `data-order="${esc(o.id)}"` })}</td></tr>`).join('')}</tbody></table></div>`, { skeleton: 'table', n: 3, empty: { icon: 'clipboard', title: 'No orders yet', text: 'Orders placed by this consumer will appear here.' } });
        cur = c;
      };
      let cur = null;
      UI.on(el, 'click', '[data-order]', (e, b) => D1.openOrder(b.dataset.order, load));
      UI.on(el, 'click', '[data-cact]', (e, b) => {
        if (!cur) return; const a = b.dataset.cact;
        if (a === 'edit') editModal(cur, load);
        if (a === 'block') blockToggle(cur, load);
        if (a === 'delete') del(cur, () => App.go('admin-consumers'));
      });
      load();
    },
  });
})();
