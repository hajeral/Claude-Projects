/* Merchant · Orders & Pickups (owner: D4) — route m-orders, order detail modal inside */
(function () {
  'use strict';
  const { L, LE, money, orderState, importDialog } = Ops;
  const STATUS_OPTS = [['active', 'Active (paid, not collected)'], ['ready_for_pickup', 'Ready'], ['confirmed', 'Confirmed'], ['driver_assigned', 'Driver Assigned'], ['unassigned', 'Unassigned'], ['out_for_delivery', 'Out for Delivery'], ['picked_up', 'Picked Up'], ['delivered', 'Delivered'], ['completed', 'Completed'], ['failed', 'Failed'], ['cancelled', 'Cancelled'], ['refunded', 'Refunded']];
  /* (v1.4 F-002) actions come from the shared order state machine (order.allowedActions) */
  const can = (o, a) => (o.allowedActions || []).includes(a);
  const codeMsg = (er) => ({ invalid_code: t('That code doesn’t match this order. Check it with the customer.'), code_used: t('This pickup code was already used.'), code_expired: t('This pickup code has expired.') })[er.code] || er.message || t('Something went wrong');

  const fulfil = (o) => o.fulfillment === 'delivery'
    ? UI.chip(t('Driver Delivery'), { tone: 'rose', icon: 'truck' })
    : UI.chip(t('Self-Pickup'), { tone: 'mauve', icon: 'bag' });
  const driverCell = (o) => o.fulfillment !== 'delivery' ? '<span class="faint">—</span>'
    : o.driver ? LE(o.driver.name) : `<b style="color:var(--accent)">${t('Unassigned')}</b>`;

  async function openOrder(id, onChange) {
    const m = UI.modal({ title: t('Order details'), size: 'md', body: `<div data-od>${UI.skeleton('form', 4)}</div>`, actions: [] });
    const root = m.el.querySelector('[data-od]');
    let o;
    try { o = (await api('GET', '/merchant/orders/' + encodeURIComponent(id))).data; }
    catch (e) { root.innerHTML = UI.errorState({ text: t('Could not load this order.'), retry: true }); UI.on(root, 'ui:retry', '*', () => { m.close(); openOrder(id, onChange); }); return; }
    const drivers = (await api('GET', '/merchant/drivers', { pageSize: 50 }).catch(() => ({ data: [] }))).data || [];
    const st = orderState(o), acts = (o.allowedActions || []).filter((a) => a !== 'refund'), closed = !acts.length;
    const dOpts = drivers.filter((d) => d.status !== 'inactive').map((d) => ({ value: d.id, label: `${L(d.name)} — ${t(Ops.label(Ops.VEH, d.vehicle))}${d.status === 'offline' ? ' (' + t('Offline') + ')' : ''}` }));
    root.innerHTML = `
      <div class="ops-sec" style="margin-block-start:0">${t('Order')} · ${fmt.id(o.id)}</div>
      <h3 class="h-serif" style="font-size:22px;margin:0 0 12px">${LE(o.customer.name)}</h3>
      <dl class="ops-dl">
        <dt>${t('Bag')}</dt><dd>${LE(o.bag)}</dd>
        <dt>${t('Amount')}</dt><dd>${money(o.total)}</dd>
        <dt>${t('Placed at')}</dt><dd>${fmt.clock(o.createdAt)}</dd>
        <dt>${t('Pickup window')}</dt><dd>${fmt.timeRange(o.pickupWindow.start, o.pickupWindow.end)}</dd>
        <dt>${t('Order status')}</dt><dd>${UI.pill(st)}</dd>
      </dl>
      <div class="ops-sec">${o.fulfillment === 'delivery' ? t('Fulfilment — Driver Delivery') : t('Fulfilment — Self-Pickup')}</div>
      <dl class="ops-dl">
        ${o.fulfillment === 'delivery'
          ? `<dt>${t('Delivery address')}</dt><dd>${LE(o.deliveryAddress)}</dd><dt>${t('Status')}</dt><dd>${o.driver ? UI.pill('available', { label: t('Assigned to {name}', { name: LE(o.driver.name) }) }) : UI.pill('unassigned')}</dd>`
          : `<dt>${t('Pickup code')}</dt><dd>${o.pickupCode ? fmt.id(o.pickupCode.slice(0, 2) + '••' + o.pickupCode.slice(-2)) : '—'}</dd><dt>${t('Branch')}</dt><dd>${LE(o.branch && o.branch.name)}</dd>`}
      </dl>
      ${o.status === 'cancelled' && o.cancelReason ? `<p class="muted" style="margin-block-start:12px">${t('Cancellation reason')}: ${UI.esc(o.cancelReason)}</p>` : ''}
      ${can(o, 'verify_pickup') ? `<form data-verify novalidate style="margin-block-start:16px;display:grid;gap:10px">
        ${UI.field({ name: 'code', label: 'Customer’s pickup code', required: true, placeholder: 'ABC234', minlength: 6, maxlength: 6, autocomplete: 'off', hint: 'Ask the customer for the 6-character code shown in their app. Verifying completes the order.' })}
        ${o.pickupCode ? `<p class="faint" data-demo-code style="margin:0;font-size:12px">${t('Demo data')} · ${t('Customer code')}: <b dir="ltr">${UI.esc(o.pickupCode)}</b></p>` : ''}
        ${UI.btn(t('Verify code & complete'), { variant: 'primary', type: 'submit', icon: 'checkc', attrs: 'data-act="verify" style="width:100%;justify-content:center"' })}
      </form>` : ''}
      <form data-assign novalidate style="margin-block-start:16px;display:grid;gap:10px" ${can(o, 'assign_driver') ? '' : 'hidden'}>
        ${UI.field({ type: 'select', name: 'driverId', label: t('Assign a driver'), required: true, value: o.driver ? o.driver.id : '', placeholder: t('Select a driver'), options: dOpts })}
        ${UI.btn(o.driver ? t('Reassign Driver') : t('Assign Driver'), { variant: 'primary', type: 'submit', attrs: 'data-act="assign" style="width:100%;justify-content:center"' })}
      </form>
      <div class="ops-grid2" style="margin-block-start:12px" ${closed ? 'hidden' : ''}>
        ${can(o, 'mark_delivered') ? UI.btn(t('Mark delivered'), { variant: 'secondary', attrs: 'data-act="complete" style="justify-content:center"' }) : ''}
        ${can(o, 'complete') ? UI.btn(t('Mark order completed'), { variant: 'secondary', attrs: 'data-act="complete" style="justify-content:center"' }) : ''}
        ${can(o, 'cancel') ? UI.btn(t('Cancel order'), { variant: 'danger', attrs: 'data-act="cancel" style="justify-content:center"' }) : ''}
      </div>
      ${closed ? `<p class="muted" style="margin-block-start:14px">${t('This order is closed. No further actions are available.')}</p>` : ''}`;
    const done = (msg) => { UI.toast(msg, { tone: 'success', html: true }); m.close(); onChange && onChange(); };
    UI.on(root, 'submit', '[data-assign]', async (e, f) => {
      e.preventDefault(); const r = UI.validate(f); if (!r.ok) return;
      try { await api('POST', `/merchant/orders/${o.id}/assign-driver`, { driverId: r.values.driverId }); done(t('Driver assigned to {id}', { id: fmt.id(o.id) })); }
      catch (er) { UI.toast(er.message || t('Something went wrong'), { tone: 'error', html: true }); }
    });
    UI.on(root, 'submit', '[data-verify]', async (e, f) => {
      e.preventDefault(); const r = UI.validate(f); if (!r.ok) return;
      try { await api('POST', '/merchant/pickups/verify', { code: String(r.values.code).trim().toUpperCase(), orderId: o.id }); done(t('Pickup verified — order {id} completed', { id: fmt.id(o.id) })); }
      catch (er) { UI.fieldError(f, 'code', codeMsg(er)); }
    });
    UI.on(root, 'click', '[data-act="complete"]', async () => {
      if (!(await UI.confirm({ html: true, title: can(o, 'mark_delivered') ? t('Mark order delivered?') : t('Mark order completed?'), text: t('The customer will be notified that the order is complete.'), confirm: can(o, 'mark_delivered') ? t('Mark delivered') : t('Mark completed') }))) return;
      try { await api('POST', `/merchant/orders/${o.id}/complete`, {}); done(t('Order {id} marked as completed', { id: fmt.id(o.id) })); } catch (er) { UI.toast(er.message, { tone: 'error', html: true }); }
    });
    UI.on(root, 'click', '[data-act="cancel"]', () => cancelOrder(o, () => { m.close(); onChange && onChange(); }));
  }

  function cancelOrder(o, after) {
    const reasons = ['Item no longer available', 'Store closing early', 'Customer requested cancellation', 'Other'];
    UI.modal({
      title: t('Cancel order {id}?', { id: o.id }), size: 'sm',
      body: `<form data-cf class="ops-form" novalidate>
        <p class="muted" style="margin:0">${t('The customer will be refunded in full and notified.')}</p>
        ${UI.field({ type: 'select', name: 'reason', label: t('Reason'), required: true, placeholder: t('Select a reason'), options: reasons.map((r) => ({ value: r, label: t(r) })) })}
        ${UI.field({ type: 'textarea', name: 'note', label: t('Note (optional)'), rows: 3, maxlength: 300 })}</form>`,
      actions: [{ label: t('Keep order'), variant: 'secondary', close: true },
        { label: t('Cancel order'), variant: 'danger', run: async (mm) => {
          const r = UI.validate(mm.el.querySelector('[data-cf]')); if (!r.ok) return;
          try { await api('POST', `/merchant/orders/${o.id}/cancel`, { reason: r.values.reason + (r.values.note ? ' — ' + r.values.note : '') }); mm.close(); UI.toast(t('Order {id} cancelled', { id: fmt.id(o.id) }), { tone: 'success', html: true }); after && after(); }
          catch (er) { UI.toast(er.message, { tone: 'error', html: true }); }
        } }],
    });
  }

  App.route('m-orders', {
    nav: 'Orders & Pickups', title: 'Orders & Pickups', subtitle: 'Track and fulfil incoming orders.',
    render(el, ctx) {
      el.innerHTML = `<div data-kpis>${UI.skeleton('kpis', 4)}</div><div data-filters></div>
        ${UI.card({ title: t('Orders & Pickups'), icon: 'package', tone: 'mauve', flush: true, actions: '<span data-count class="muted" style="font-size:12.5px"></span>', body: '<div data-table></div>' })}`;
      const loadKpis = () => UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/merchant/orders', { ...api.ctx(), pageSize: 1 }), (res) => {
        const s = Ops.summaryOf(res);
        return UI.kpis([
          { label: t('Ready for Pickup'), icon: 'bag', tone: 'orange', value: fmt.number(s.readyForPickup), foot: t('Awaiting collection'), go: null },
          { label: t('Awaiting Driver'), icon: 'alert', tone: 'rose', value: fmt.number(s.awaitingDriver), foot: t('Delivery orders without a driver') },
          { label: t('Out for Delivery'), icon: 'truck', tone: 'mauve', value: fmt.number(s.outForDelivery), foot: t('On the way to customers') },
          { label: t('Active Drivers'), icon: 'users', tone: 'lime', value: fmt.number(s.activeDrivers), foot: t('Available or on delivery'), go: 'm-drivers' },
        ], 4);
      }, { skeleton: 'kpis' });
      loadKpis();
      const filters = UI.mountFilters(el.querySelector('[data-filters]'), {
        search: { name: 'q', placeholder: t('Search by order, customer or bag') },
        selects: [{ name: 'status', label: t('All Status'), options: STATUS_OPTS.map(([value, l]) => ({ value, label: t(l) })) }],
        actions: UI.btn(t('Import'), { variant: 'green', icon: 'download', attrs: 'data-act="import"' }) + UI.btn(t('Export'), { variant: 'green', icon: 'upload', attrs: 'data-act="export"' }),
        clear: true,
      }, () => table.setQuery({ page: 1 }));
      const table = UI.dataTable(el.querySelector('[data-table]'), {
        pageSize: 10, sort: '-createdAt',
        columns: [
          { key: 'id', label: t('Order'), sortable: true, render: (o) => `<b>${fmt.id(o.id)}</b>` },
          { key: 'customer', label: t('Customer'), cls: 'wrap', render: (o) => LE(o.customer.name) },
          { key: 'bag', label: t('Bag'), cls: 'wrap', render: (o) => `<span class="muted">${LE(o.bag)}</span>` },
          { key: 'total', label: t('Amount'), render: (o) => money(o.total) },
          { key: 'fulfillment', label: t('Fulfilment'), render: fulfil },
          { key: 'driver', label: t('Driver'), render: driverCell },
          { key: 'window', label: t('Window'), render: (o) => fmt.timeRange(o.pickupWindow.start, o.pickupWindow.end) },
          { key: 'status', label: t('Status'), render: (o) => UI.pill(orderState(o)) },
        ],
        fetch: async (q) => { const r = await api('GET', '/merchant/orders', { ...api.ctx(), ...filters.values(), ...q }); const c = el.querySelector('[data-count]'); if (c) c.innerHTML = t('{n} orders', { n: fmt.number(r.meta ? r.meta.total : r.data.length) }); return r; },
        rowClick: (o) => openOrder(o.id, reload),
        rowActions: (o) => {
          const progress = async () => { try { await api('POST', `/merchant/orders/${o.id}/complete`, {}); UI.toast(t('Order {id} updated', { id: fmt.id(o.id) }), { tone: 'success', html: true }); } catch (er) { UI.toast(er.message, { tone: 'error', html: true }); } reload(); };
          return [
            { icon: 'eye', label: t('View details'), run: () => openOrder(o.id, reload) },
            ...(can(o, 'verify_pickup') ? [{ icon: 'checkc', label: t('Verify pickup code'), run: () => openOrder(o.id, reload) }] : []),
            ...(can(o, 'assign_driver') ? [{ icon: 'truck', label: o.driver ? t('Reassign driver') : t('Assign driver'), run: () => openOrder(o.id, reload) }] : []),
            ...(can(o, 'mark_delivered') ? [{ icon: 'checkc', label: t('Mark delivered'), run: progress }] : []),
            ...(can(o, 'complete') ? [{ icon: 'checkc', label: t('Mark completed'), run: progress }] : []),
            ...(can(o, 'cancel') ? [{ icon: 'x', label: t('Cancel order'), danger: true, run: () => cancelOrder(o, reload) }] : []),
          ];
        },
        empty: { icon: 'package', title: t('No orders found'), text: t('Try changing the filters or the date range.') },
      });
      function reload() { table.reload(); loadKpis(); }
      UI.on(el, 'click', '[data-act="import"]', () => importDialog({ resource: 'orders', title: 'Import orders', columns: ['Order', 'Customer', 'Bag', 'Amount', 'Fulfilment', 'Window'], onDone: reload }));
      UI.on(el, 'click', '[data-act="export"]', () => Overlays.export({ scope: t('Orders & Pickups'), endpoint: '/merchant/orders', columns: ['Order', 'Customer', 'Bag', 'Amount', 'Fulfilment', 'Driver', 'Window', 'Status'].map((c) => t(c)) }));
      if (ctx.params && ctx.params.id) openOrder(ctx.params.id, reload);
    },
  });
  window.Ops.openOrder = openOrder;
})();
