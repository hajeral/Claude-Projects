/* Merchant · Vendors (owner: D4) — routes m-vendors {tab?}, m-vendor-new, m-vendor-detail {id} */
(function () {
  'use strict';
  const { L, LE, opts, label, CATS } = Ops;
  const STATUS = [['active', 'Active'], ['pending', 'Pending'], ['suspended', 'Suspended'], ['inactive', 'Inactive']];

  App.route('m-vendors', {
    nav: 'Branches', title: 'Vendors', subtitle: 'Manage the vendors selling on WonderBites.',
    render(el, ctx) {
      let tab = (ctx.params && ctx.params.tab) || 'all';
      el.innerHTML = `<div data-kpis>${UI.skeleton('kpis', 4)}</div><div data-filters></div>
        ${UI.card({ title: t('Vendors'), icon: 'store', tone: 'mauve', flush: true, body: '<div data-tabs style="padding:0 20px 8px"></div><div data-table></div>' })}`;
      const drawTabs = (s = {}) => { el.querySelector('[data-tabs]').innerHTML = UI.tabs({ name: 'vtab', label: 'Vendor status', active: tab, tabs: [{ id: 'all', label: t('All'), count: s.total }, { id: 'active', label: t('Active'), count: s.active }, { id: 'pending', label: t('Pending'), count: s.pending }, { id: 'suspended', label: t('Suspended'), count: s.suspended }] }); };
      drawTabs();
      const loadKpis = () => UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/merchant/vendors', { pageSize: 1 }), (res) => {
        const s = Ops.summaryOf(res); drawTabs(s);
        return UI.kpis([
          { label: t('Total vendors'), icon: 'store', tone: 'mauve', value: fmt.number(s.total), foot: t('Under your account') },
          { label: t('Active'), icon: 'checkc', tone: 'lime', value: fmt.number(s.active), foot: t('Selling now') },
          { label: t('Pending approval'), icon: 'clock', tone: 'orange', value: fmt.number(s.pending), foot: t('Waiting for review') },
          { label: t('Suspended'), icon: 'x', tone: 'rose', value: fmt.number(s.suspended), foot: t('Not selling') },
        ], 4);
      }, { skeleton: 'kpis' });
      loadKpis();
      const filters = UI.mountFilters(el.querySelector('[data-filters]'), {
        search: { name: 'q', placeholder: t('Search') },
        selects: [{ name: 'status', label: t('All Status'), options: opts(STATUS) }],
        actions: UI.btn(t('Add New Sub Vendor'), { variant: 'primary', icon: 'plus', go: 'm-vendor-new', params: {} }), clear: true,
      }, () => { tab = filters.values().status || 'all'; drawTabs(); table.setQuery({ page: 1 }); loadKpis(); });
      const table = UI.dataTable(el.querySelector('[data-table]'), {
        pageSize: 10,
        columns: [
          { key: 'name', label: t('Vendor'), render: (v) => `<div class="ops-row"><span class="ops-meta"><span class="ic" style="background:var(--tint-rose);color:var(--ic-rose);font-weight:700;font-size:12px" class="num">${UI.esc(v.initials)}</span></span><div><b>${LE(v.name)}</b><small>${fmt.id(v.id)}</small></div></div>` },
          { key: 'category', label: t('Category'), render: (v) => label(CATS, v.category) },
          { key: 'contact', label: t('Contact'), render: (v) => `<span>${UI.esc(v.email)}</span><small class="faint num" style="display:block">${UI.esc(v.phone)}</small>` },
          { key: 'branchesCount', label: t('Branches'), render: (v) => fmt.number(v.branchesCount) },
          { key: 'joinedAt', label: t('Joined'), sortable: true, render: (v) => fmt.date(v.joinedAt) },
          { key: 'status', label: t('Status'), render: (v) => UI.pill(v.status) },
        ],
        fetch: (q) => { const f = filters.values(); return api('GET', '/merchant/vendors', { ...f, status: tab === 'all' ? f.status : tab, ...q }); },
        rowClick: (v) => App.go('m-vendor-detail', { id: v.id }),
        rowActions: (v) => [{ icon: 'eye', label: t('View'), run: () => App.go('m-vendor-detail', { id: v.id }) }],
        empty: { icon: 'store', title: t('No vendors in this tab'), text: t('Add a sub vendor to sell under your account.'), action: UI.btn(t('Add New Sub Vendor'), { variant: 'primary', icon: 'plus', go: 'm-vendor-new', params: {} }) },
      });
      UI.on(el, 'ui:tab', '*', (e) => { if (!e.detail || e.detail.name !== 'vtab') return; tab = e.detail.value; drawTabs(); table.setQuery({ page: 1 }); loadKpis(); });
    },
  });

  App.route('m-vendor-new', {
    nav: 'Branches', title: 'Add New Sub Vendor', subtitle: 'Invite a vendor to sell under your account.',
    render(el) {
      el.innerHTML = `<form data-vf novalidate class="cd" style="padding:24px;display:grid;gap:20px;max-width:980px">
        <div class="ops-split" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
          <div class="ops-form"><div class="ops-sec" style="font-size:14px;color:var(--text);margin:0">${t('Business details')}</div>
            ${UI.field({ name: 'name', label: t('Vendor name'), required: true, placeholder: t('e.g. Golden Crust Bakery') })}
            <div class="ops-grid2">${UI.field({ type: 'select', name: 'category', label: t('Category'), required: true, placeholder: t('Select category'), options: opts(CATS) })}
            ${UI.field({ name: 'tradeLicenseNo', label: t('Trade licence number'), required: true, placeholder: 'DED-000000' })}</div>
            <div class="ops-grid2">${UI.field({ type: 'select', name: 'city', label: t('City'), value: (Markets.cityOptions(App.market())[0] || {}).value, options: Markets.cityOptions(App.market()) })}
            ${UI.field({ type: 'number', name: 'branchesCount', label: t('Branches'), value: 1, min: 1, max: 50 })}</div>
            ${UI.field({ type: 'number', name: 'commissionRate', label: t('Commission rate (%)'), value: 15, min: 0, max: 50, hint: t('Share of each order kept by your account') })}</div>
          <div class="ops-form"><div class="ops-sec" style="font-size:14px;color:var(--text);margin:0">${t('Contact')}</div>
            ${UI.field({ name: 'contactName', label: t('Contact person'), placeholder: t('Full name') })}
            ${UI.field({ type: 'email', name: 'email', label: t('Email'), required: true, placeholder: 'name@business.example.com' })}
            ${UI.field({ type: 'tel', name: 'phone', label: t('Phone'), required: true, placeholder: `${App.marketInfo().phoneCode} ${App.marketInfo().phonePlaceholder}`, pattern: '^\\+?[0-9 ]{8,16}$' })}
            <div><div class="ops-sec" style="margin-block-start:0">${t('Logo')}</div>${UI.dropzone({ name: 'logo', accept: 'image/*', multiple: false, hint: t('PNG or JPG, square') })}</div></div></div>
        <div style="display:flex;justify-content:flex-end;gap:10px">${UI.btn(t('Cancel'), { variant: 'ghost', go: 'm-vendors' })}${UI.btn(t('Send for approval'), { variant: 'primary', icon: 'check', type: 'submit' })}</div></form>`;
      el.querySelector('[data-vf]').addEventListener('submit', async (e) => {
        e.preventDefault(); const r = UI.validate(e.currentTarget); if (!r.ok) return;
        try { const { data } = await api('POST', '/merchant/vendors', r.values); UI.toast(t('Sub vendor added — pending approval'), { tone: 'success', html: true }); App.go('m-vendor-detail', { id: data.id }); }
        catch (er) { UI.toast(er.message, { tone: 'error', html: true }); }
      });
    },
  });

  App.route('m-vendor-detail', {
    nav: 'Branches', title: 'Vendors', subtitle: 'Manage the vendors selling on WonderBites.',
    async render(el, ctx) {
      const id = ctx.params && ctx.params.id; if (!id) { App.go('m-vendors'); return; }
      el.innerHTML = UI.skeleton('cards', 3);
      let v; try { v = (await api('GET', '/merchant/vendors/' + id)).data; }
      catch (e) { el.innerHTML = UI.errorState({ text: t('Could not load this vendor.'), retry: true }); UI.on(el, 'ui:retry', '*', () => ctx.refresh()); return; }
      const acts = { pending: [['active', 'Approve', 'primary', 'checkc'], ['suspended', 'Reject', 'danger', 'x']], active: [['suspended', 'Suspend', 'danger', 'x'], ['inactive', 'Deactivate', 'secondary', 'clock']], suspended: [['active', 'Reactivate', 'primary', 'refresh']], inactive: [['active', 'Reactivate', 'primary', 'refresh']] }[v.status] || [];
      el.innerHTML = `
        <div class="ops-head"><div style="display:flex;gap:16px;align-items:center"><span class="ops-meta"><span class="ic num" style="width:56px;height:56px;border-radius:16px;font-size:18px;font-weight:700;background:var(--tint-rose);color:var(--ic-rose)">${UI.esc(v.initials)}</span></span>
          <div><h2>${LE(v.name)} ${UI.pill(v.status)}</h2><p>${fmt.id(v.id)} · ${label(CATS, v.category)} · ${t('Joined {date}', { date: fmt.date(v.joinedAt) })}</p></div></div>
          <div class="ops-actions">${UI.btn(t('Back to vendors'), { variant: 'ghost', icon: 'chev-l', go: 'm-vendors' })}${acts.map(([s, l, vr, ic]) => UI.btn(t(l), { variant: vr, icon: ic, attrs: `data-status="${s}"` })).join('')}</div></div>
        ${UI.kpis([
          { label: t('Branches'), icon: 'store', tone: 'mauve', value: fmt.number(v.branchesCount), foot: t('Locations') },
          { label: t('Listings'), icon: 'bag', tone: 'rose', value: fmt.number(v.listingsCount), foot: t('Bags listed') },
          { label: t('Orders'), icon: 'file', tone: 'lime', value: fmt.number(v.ordersCount), foot: t('This period') },
          { label: t('Commission'), icon: 'percent', tone: 'orange', value: fmt.pct(v.commissionRate), foot: t('Per order') },
        ], 4)}
        <div class="grid g-2" style="align-items:start">
          ${UI.card({ title: t('Business details'), icon: 'file', tone: 'mauve', body: `<div class="cd-b"><dl class="ops-dl"><dt>${t('Category')}</dt><dd>${label(CATS, v.category)}</dd><dt>${t('Trade licence number')}</dt><dd>${fmt.id(v.tradeLicenseNo)}</dd><dt>${t('City')}</dt><dd>${UI.esc(Markets.cityName(v.city))}</dd><dt>${t('Parent account')}</dt><dd>${t('Fig & Bloom Bakery')}</dd></dl></div>` })}
          ${UI.card({ title: t('Contact'), icon: 'user', tone: 'rose', body: `<div class="cd-b"><dl class="ops-dl"><dt>${t('Email')}</dt><dd>${UI.esc(v.email)}</dd><dt>${t('Phone')}</dt><dd><span class="num">${UI.esc(v.phone)}</span></dd></dl>
            <div class="ops-actions" style="margin-block-start:16px"><a class="btn btn-secondary btn-sm" href="mailto:${UI.esc(v.email)}">${UI.icon('mail')} ${t('Email vendor')}</a><a class="btn btn-secondary btn-sm" href="tel:${UI.esc(v.phone.replace(/\s/g, ''))}">${UI.icon('phone')} ${t('Call')}</a></div></div>` })}
        </div>`;
      UI.on(el, 'click', '[data-status]', async (e, b) => {
        const s = b.dataset.status, danger = s === 'suspended' || s === 'inactive';
        if (danger && !(await UI.confirm({ html: true, title: t('Change vendor status?'), text: t('{name} will stop selling until reactivated.', { name: LE(v.name) }), confirm: b.textContent.trim(), danger: true }))) return;
        await api('PATCH', `/merchant/vendors/${v.id}/status`, { status: s }); UI.toast(t('Vendor status updated'), { tone: 'success', html: true }); ctx.refresh();
      });
    },
  });
})();
