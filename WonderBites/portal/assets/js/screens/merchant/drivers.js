/* Merchant · Drivers (owner: D4) — routes m-drivers, m-driver-detail {id}; Add/Edit Driver = modal */
(function () {
  'use strict';
  const { L, LE, opts, label, VEH, orderState, money } = Ops;
  const COMPLIANCE = [['compliant', 'Compliant'], ['expiring_soon', 'Expiring Soon'], ['under_review', 'Under Review']];
  const CERT = [['valid', 'Valid'], ['expiring_soon', 'Expiring Soon'], ['pending_review', 'Pending Review']];
  const STATUS = [['available', 'Available'], ['on_delivery', 'On Delivery'], ['offline', 'Offline']];

  async function driverForm(d, after) {
    const br = (await api('GET', '/merchant/branches', { pageSize: 50 }).catch(() => ({ data: [] }))).data || [];
    const bOpts = br.map((b) => ({ value: b.id, label: L(b.name) }));
    UI.modal({
      title: d ? t('Edit driver') : t('Add Driver'), size: 'md',
      body: `<form data-df class="ops-form" novalidate>
        <div class="ops-grid2">${UI.field({ name: 'name', label: t('Full name'), required: true, value: d ? L(d.name) : '', placeholder: t('Enter full name') })}
        ${UI.field({ type: 'tel', name: 'phone', label: t('Mobile Number'), required: true, value: d ? d.phone : '', placeholder: `${App.marketInfo().phoneCode} ${App.marketInfo().phonePlaceholder}`, pattern: '^\\+?[0-9 ]{8,16}$' })}</div>
        <div class="ops-grid2">${UI.field({ type: 'select', name: 'vehicle', label: t('Vehicle'), required: true, value: d ? d.vehicle : '', placeholder: t('Select vehicle'), options: opts(VEH) })}
        ${UI.field({ name: 'plate', label: t('Plate number'), value: d && d.plate !== '—' ? d.plate : '', placeholder: t('e.g. {plate}', { plate: '123456' }) })}</div>
        <div class="ops-grid2">${UI.field({ type: 'select', name: 'branchId', label: t('Branch'), required: true, value: d ? d.branchId : (App.state.branch && App.state.branch.id !== 'all' ? App.state.branch.id : ''), placeholder: t('Select branch'), options: bOpts })}
        ${UI.field({ name: 'licenseNo', label: t('Driving licence number'), required: true, value: d ? d.licenseNo : '', placeholder: 'DXB-00000' })}</div>
        <div class="ops-grid2">${UI.field({ type: 'date', name: 'certificateExpiry', label: t('Food-safety certificate expiry'), value: d ? d.certificateExpiry || '' : '' })}
        ${d ? UI.field({ type: 'select', name: 'status', label: t('Status'), value: d.status, options: opts(STATUS) }) : ''}</div>
        ${d ? '' : UI.dropzone({ name: 'documents', accept: 'image/*,application/pdf', multiple: true, hint: t('Licence and certificate (PDF or image)') })}</form>`,
      actions: [{ label: t('Cancel'), variant: 'secondary', close: true },
        { label: d ? t('Save changes') : t('Add Driver'), variant: 'primary', run: async (m) => {
          const r = UI.validate(m.el.querySelector('[data-df]')); if (!r.ok) return;
          try {
            const res = d ? await api('PATCH', '/merchant/drivers/' + d.id, r.values) : await api('POST', '/merchant/drivers', r.values);
            m.close(); UI.toast(d ? t('Driver updated') : t('{name} added to your drivers', { name: UI.esc(r.values.name) }), { tone: 'success', html: true }); after && after(res.data);
          } catch (er) { UI.toast(er.code === 'conflict' || er.status === 409 ? t('A driver with this phone number already exists.') : er.message, { tone: 'error', html: true }); }
        } }],
    });
  }

  async function assignToOrder(d, after) {
    const res = await api('GET', '/merchant/orders', { ...api.ctx(), status: 'unassigned', pageSize: 50 }).catch(() => ({ data: [] }));
    const list = (res.data || []).filter((o) => orderState(o) === 'unassigned');
    UI.modal({
      title: t('Assign {name} to an order', { name: L(d.name) }), size: 'sm',
      body: list.length ? `<form data-af class="ops-form" novalidate>${UI.field({ type: 'radio', name: 'orderId', label: t('Delivery orders without a driver'), required: true,
        options: list.map((o) => ({ value: o.id, label: `${o.id} · ${L(o.customer.name)} · ${L(o.bag)}` })) })}</form>`
        : UI.empty({ icon: 'truck', title: t('No orders waiting for a driver'), text: t('All delivery orders already have a driver.') }),
      actions: [{ label: t('Close'), variant: 'secondary', close: true }, ...(list.length ? [{ label: t('Assign Driver'), variant: 'primary', run: async (m) => {
        const r = UI.validate(m.el.querySelector('[data-af]')); if (!r.ok) return;
        await api('POST', `/merchant/orders/${r.values.orderId}/assign-driver`, { driverId: d.id }); m.close(); UI.toast(t('Driver assigned to {id}', { id: fmt.id(r.values.orderId) }), { tone: 'success', html: true }); after && after();
      } }] : [])],
    });
  }

  App.route('m-drivers', {
    nav: 'Driver', title: 'Drivers', subtitle: 'Manage your delivery drivers and assign them to orders.',
    render(el, ctx) {
      el.innerHTML = `<div data-kpis>${UI.skeleton('kpis', 5)}</div><div data-filters></div>${UI.card({ title: t('Your Drivers'), icon: 'truck', tone: 'mauve', flush: true, body: '<div data-table></div>' })}`;
      const loadKpis = () => UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/merchant/drivers', { ...api.ctx(), pageSize: 1 }), (res) => {
        const s = Ops.summaryOf(res);
        return UI.kpis([
          { label: t('Total Drivers'), icon: 'users', tone: 'mauve', value: fmt.number(s.total), foot: t('On your roster') },
          { label: t('Available Now'), icon: 'checkc', tone: 'lime', value: fmt.number(s.available), foot: t('Ready for delivery') },
          { label: t('On Delivery'), icon: 'truck', tone: 'rose', value: fmt.number(s.onDelivery), foot: t('Currently out') },
          { label: t('Offline'), icon: 'x', tone: 'orange', value: fmt.number(s.offline), foot: t('Not working now') },
          { label: t('Avg On-time Rate'), icon: 'clock', tone: 'lime', value: fmt.pct(s.avgOnTime), foot: t('Across all drivers') },
        ], 5);
      }, { skeleton: 'kpis' });
      loadKpis();
      const filters = UI.mountFilters(el.querySelector('[data-filters]'), {
        search: { name: 'q', placeholder: t('Search by name, ID or phone') },
        selects: [
          { name: 'compliance', label: t('All compliance statuses'), options: opts(COMPLIANCE) },
          { name: 'certificate', label: t('All certificate statuses'), options: opts(CERT) },
          { name: 'vehicle', label: t('All vehicles'), options: opts(VEH) },
        ],
        sort: { name: 'sort', value: '-joinedAt', options: [{ value: '-joinedAt', label: t('Newest First') }, { value: 'name', label: t('Name A–Z') }, { value: '-deliveries', label: t('Most deliveries') }, { value: '-onTime', label: t('Best on-time rate') }] },
        actions: UI.btn(t('Add Driver'), { variant: 'primary', icon: 'plus', attrs: 'data-act="add"' }), clear: true,
      }, () => table.setQuery({ page: 1 }));
      const table = UI.dataTable(el.querySelector('[data-table]'), {
        pageSize: 10,
        columns: [
          { key: 'name', label: t('Driver'), render: (d) => `<div class="ops-row">${UI.avatar(L(d.name), { size: 34 })}<div><b>${LE(d.name)}</b><small>${fmt.id(d.id)}</small></div></div>` },
          { key: 'phone', label: t('Phone'), render: (d) => `<span class="num">${UI.esc(d.phone)}</span>` },
          { key: 'vehicle', label: t('Vehicle'), render: (d) => label(VEH, d.vehicle) },
          { key: 'deliveries', label: t('Deliveries'), sortable: true, render: (d) => `<b>${fmt.number(d.deliveries)}</b>` },
          { key: 'onTime', label: t('On Time'), sortable: true, render: (d) => fmt.pct(d.onTime) },
          { key: 'rating', label: t('Rating'), render: (d) => d.rating ? `${fmt.number(d.rating)} <span style="color:#F2B04A">★</span>` : '<span class="faint">—</span>' },
          { key: 'status', label: t('Status'), render: (d) => UI.pill(d.status) },
        ],
        fetch: (q) => api('GET', '/merchant/drivers', { ...api.ctx(), ...filters.values(), ...q }),
        rowClick: (d) => App.go('m-driver-detail', { id: d.id }),
        rowActions: (d) => [
          { icon: 'eye', label: t('View'), run: () => App.go('m-driver-detail', { id: d.id }) },
          { icon: 'truck', label: t('Assign to order'), run: () => assignToOrder(d, reload) },
        ],
        empty: { icon: 'truck', title: t('No drivers found'), text: t('Add your first driver to start delivering.'), action: UI.btn(t('Add Driver'), { variant: 'primary', icon: 'plus', attrs: 'data-act="add"' }) },
      });
      function reload() { table.reload(); loadKpis(); }
      UI.on(el, 'click', '[data-act="add"]', () => driverForm(null, (d) => App.go('m-driver-detail', { id: d.id })));
    },
  });

  App.route('m-driver-detail', {
    nav: 'Driver', title: 'Drivers', subtitle: 'Manage your delivery drivers and assign them to orders.',
    async render(el, ctx) {
      const id = ctx.params && ctx.params.id; if (!id) { App.go('m-drivers'); return; }
      el.innerHTML = UI.skeleton('cards', 3);
      let d; try { d = (await api('GET', '/merchant/drivers/' + id)).data; }
      catch (e) { el.innerHTML = UI.errorState({ text: t('Could not load this driver.'), retry: true }); UI.on(el, 'ui:retry', '*', () => ctx.refresh()); return; }
      const ords = d.orders || [];
      el.innerHTML = `
        <div class="ops-head"><div style="display:flex;gap:16px;align-items:center">${UI.avatar(L(d.name), { size: 56 })}<div><h2>${LE(d.name)} ${UI.pill(d.status)}</h2><p>${fmt.id(d.id)} · ${label(VEH, d.vehicle)} · ${LE(d.branch && d.branch.name)}</p></div></div>
          <div class="ops-actions">${UI.btn(t('Back to drivers'), { variant: 'ghost', icon: 'chev-l', go: 'm-drivers' })}
            ${UI.btn(d.status === 'offline' ? t('Set available') : t('Set offline'), { variant: 'secondary', icon: d.status === 'offline' ? 'checkc' : 'x', attrs: 'data-act="status"' })}
            ${UI.btn(t('Edit'), { variant: 'secondary', icon: 'edit', attrs: 'data-act="edit"' })}${UI.btn(t('Assign to order'), { variant: 'primary', icon: 'truck', attrs: 'data-act="assign"' })}</div></div>
        ${UI.kpis([
          { label: t('Deliveries'), icon: 'package', tone: 'mauve', value: fmt.number(d.deliveries), foot: t('All time') },
          { label: t('On Time'), icon: 'clock', tone: 'lime', value: fmt.pct(d.onTime), foot: t('Delivered within the window') },
          { label: t('Rating'), icon: 'star', tone: 'orange', value: d.rating ? fmt.number(d.rating) : '—', foot: t('Customer rating') },
          { label: t('Active orders'), icon: 'truck', tone: 'rose', value: fmt.number(ords.filter((o) => !['delivered', 'completed', 'cancelled', 'failed'].includes(o.status)).length), foot: t('Assigned right now') },
        ], 4)}
        <div class="grid" style="grid-template-columns:360px minmax(0,1fr);align-items:start">
          ${UI.card({ title: t('Driver profile'), icon: 'user', tone: 'mauve', body: `<div class="cd-b"><dl class="ops-dl">
            <dt>${t('Phone')}</dt><dd><span class="num">${UI.esc(d.phone)}</span></dd><dt>${t('Vehicle')}</dt><dd>${label(VEH, d.vehicle)}</dd><dt>${t('Plate number')}</dt><dd><span class="num">${UI.esc(d.plate)}</span></dd>
            <dt>${t('Branch')}</dt><dd>${LE(d.branch && d.branch.name)}</dd><dt>${t('Joined')}</dt><dd>${fmt.date(d.joinedAt)}</dd></dl>
            <div class="ops-sec">${t('Compliance')}</div><dl class="ops-dl">
            <dt>${t('Compliance status')}</dt><dd>${UI.pill(d.compliance)}</dd><dt>${t('Driving licence')}</dt><dd>${fmt.id(d.licenseNo)}</dd>
            <dt>${t('Certificate')}</dt><dd>${UI.pill(d.certificate)}</dd><dt>${t('Certificate expiry')}</dt><dd>${d.certificateExpiry ? fmt.date(d.certificateExpiry) : '—'}</dd></dl>
            <div style="margin-block-start:16px">${UI.btn(t('Remove driver'), { variant: 'danger', icon: 'trash', attrs: 'data-act="remove" style="width:100%;justify-content:center"' })}</div></div>` })}
          ${UI.card({ title: t('Assigned orders'), icon: 'package', tone: 'rose', flush: true, count: fmt.number(ords.length), body: ords.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('Order')}</th><th>${t('Customer')}</th><th>${t('Bag')}</th><th>${t('Amount')}</th><th>${t('Window')}</th><th>${t('Status')}</th></tr></thead><tbody>
            ${ords.map((o) => `<tr data-order="${UI.esc(o.id)}" style="cursor:pointer"><td><b>${fmt.id(o.id)}</b></td><td>${LE(o.customer.name)}</td><td class="muted wrap">${LE(o.bag)}</td><td>${money(o.total)}</td><td>${fmt.timeRange(o.pickupWindow.start, o.pickupWindow.end)}</td><td>${UI.pill(orderState(o))}</td></tr>`).join('')}</tbody></table></div>`
            : `<div class="cd-b">${UI.empty({ icon: 'truck', title: t('No orders assigned'), text: t('Assign this driver to a delivery order.'), action: UI.btn(t('Assign to order'), { variant: 'primary', icon: 'truck', attrs: 'data-act="assign"' }) })}</div>` })}
        </div>`;
      UI.on(el, 'click', '[data-act="edit"]', () => driverForm(d, () => ctx.refresh()));
      UI.on(el, 'click', '[data-act="assign"]', () => assignToOrder(d, () => ctx.refresh()));
      UI.on(el, 'click', '[data-order]', (e, tr) => Ops.openOrder(tr.dataset.order, () => ctx.refresh()));
      UI.on(el, 'click', '[data-act="status"]', async () => { await api('PATCH', '/merchant/drivers/' + d.id, { status: d.status === 'offline' ? 'available' : 'offline' }); UI.toast(t('Driver status updated'), { tone: 'success', html: true }); ctx.refresh(); });
      UI.on(el, 'click', '[data-act="remove"]', async () => {
        if (!(await UI.confirm({ html: true, title: t('Remove driver?'), text: t('{name} will no longer receive delivery orders.', { name: LE(d.name) }), confirm: t('Remove'), danger: true }))) return;
        await api('DELETE', '/merchant/drivers/' + d.id); UI.toast(t('Driver removed'), { tone: 'success', html: true }); App.go('m-drivers');
      });
    },
  });
})();
