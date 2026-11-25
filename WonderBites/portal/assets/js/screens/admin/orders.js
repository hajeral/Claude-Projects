/* (v1.4 dates) seeded dates rebased onto api.DEMO_TODAY = 2026-11-19 by qa/rebase_dates.py */
/* =====================================================================
   Admin · Orders & Reservations  (owner: D1)
   Route: admin-orders {status?, q?, open?}
   API: GET /admin/orders, /admin/orders/summary, GET /admin/orders/:id,
        GET /admin/orders/:id/refund-eligibility, POST /admin/orders/:id/refund|cancel,
        GET /admin/settings/policies/refund (refund reasons → outcome, free-cancellation hours)
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc;
  const STATUS_OPTS = ['reserved', 'confirmed', 'ready_for_pickup', 'driver_assigned', 'out_for_delivery', 'picked_up', 'delivered', 'completed', 'failed', 'no_show', 'cancelled', 'refunded', 'partially_refunded'].map((k) => ({ value: k, label: D1.ST.order[k][0] }));
  const SORTS = [{ value: '-createdAt', label: 'Newest First' }, { value: 'createdAt', label: 'Oldest First' }, { value: '-total', label: 'Amount: High to Low' }, { value: 'total', label: 'Amount: Low to High' }];
    const CANCEL_REASONS = [['consumer_request', 'Consumer request'], ['merchant_unavailable', 'Merchant unavailable'], ['payment_issue', 'Payment issue'], ['fraud_suspected', 'Suspected fraud'], ['other', 'Other']];
  const ELIG = {
    already_refunded: 'This order has already been refunded.',
    order_cancelled: 'Cancelled orders can’t be refunded.',
    not_confirmed_use_cancel: 'The restaurant hasn’t confirmed this order yet — cancel it instead.',
  };
  const EVENT = { reserved: 'Order placed', confirmed: 'Confirmed by restaurant', ready_for_pickup: 'Ready for pickup', picked_up: 'Picked up', completed: 'Completed', cancelled: 'Cancelled', no_show: 'Marked as no-show', refunded: 'Refunded', partially_refunded: 'Partially refunded', driver_assigned: 'Driver assigned', out_for_delivery: 'Out for delivery', delivered: 'Delivered', failed: 'Delivery failed' };
  const BY = { consumer: 'Consumer', customer: 'Consumer', merchant: 'Restaurant', system: 'System', admin: 'Admin' };
  /* (v1.4 F-002) the shared order state machine decides which actions exist (order.allowedActions) */
  const cancellable = (o) => (o.allowedActions ? o.allowedActions.includes('cancel') : ['reserved', 'confirmed', 'ready_for_pickup'].includes(o.status));
  const refundable = (o) => (o.allowedActions ? o.allowedActions.includes('refund') : !['refunded', 'partially_refunded', 'cancelled'].includes(o.status));
  const placed = (iso) => (iso.slice(0, 10) === api.DEMO_TODAY ? fmt.clock(iso) : `${fmt.date(iso, 'short')}, ${fmt.clock(iso)}`);

  function timeline(o) {
    return `<ol class="d1-timeline">${o.timeline.slice().reverse().map((e) => `<li><i aria-hidden="true"></i><div><b>${esc(t(EVENT[e.status] || e.status))}${e.event === 'pickup_verified' ? ' · ' + esc(t('pickup code verified')) : ''}</b><small>${D1.dt(e.at)} · ${esc(t(BY[e.by] || e.by))}</small></div></li>`).join('')}</ol>`;
  }

  /* Refund flow — eligibility from GET /admin/orders/:id/refund-eligibility, per-reason outcome from the
     Refund & Cancellation policy (GET /admin/settings/policies/refund, owned by Platform settings). */
  const OUTCOME = {
    full_refund: ['Full refund', 'lime', 'checkc', 'The full order total is refunded.'],
    partial_refund: ['Partial refund', 'orange', 'percent', 'Enter an amount below the order total.'],
    wallet_credit: ['Wallet credit', 'mauve', 'wallet', 'Refunded as WonderBites Wallet credit.'],
    manual_review: ['Manual review', 'orange', 'eye', 'Needs manager approval before the refund is issued.'],
    no_refund: ['No refund', 'berry', 'ban', 'The policy doesn’t allow a refund for this reason.'],
  };
  const policyLabel = (l) => (l && typeof l === 'object' ? (App.state.lang === 'ar' ? l.ar || l.en : l.en) : t(l || ''));

  async function refundFlow(o, done) {
    let el, cfg, polErr = false;
    try {
      const [er, pr] = await Promise.all([
        api('GET', `/admin/orders/${o.id}/refund-eligibility`),
        api('GET', '/admin/settings/policies/refund').catch(() => null),
      ]);
      el = er.data; cfg = pr && pr.data && pr.data.config;
    } catch (e) { D1.toastErr(e); return; }
    if (!cfg) { polErr = true; cfg = { freeCancellationHours: el.policy.freeCancellationHours, refundDestinationDefault: el.policy.refundDestinationDefault, reasons: el.outcomes }; }
    const H = +cfg.freeCancellationHours;
    const policyLink = `<a class="lnk" href="#admin-policy-refund" data-go="admin-policy-refund">${esc(t('View policy'))}</a>`;
    if (!el.eligible) {
      const why = el.reasons.map((r) => `<li>${esc(t(ELIG[r] || r))}</li>`).join('');
      const canCancel = el.reasons.includes('not_confirmed_use_cancel');
      UI.modal({
        title: 'Refund not available', icon: 'refund', tone: 'berry', size: 'sm',
        body: `<div class="d1-banner bad">${UI.icon('alert')}<div><b>${esc(t('This refund isn’t allowed by the Refund & Cancellation policy.'))}</b><ul style="margin:6px 0 0;padding-inline-start:18px;font-size:12.5px;color:var(--muted)">${why}</ul></div></div>
          <p class="muted" style="font-size:12.5px;margin:14px 0 0">${esc(t('Free cancellation up to {h}h before the collection window.', { h: fmt.text.number(H) }))} ${policyLink}</p>`,
        actions: [{ label: 'Close', variant: 'secondary', close: true }].concat(canCancel ? [{ label: 'Cancel order instead', variant: 'danger', run: (m) => { m.close(); cancelFlow(o, done); } }] : []),
      });
      return;
    }
    const cur = o.total.currency, total = el.maxAmount.amount;
    const late = el.insideCancellationDeadline;
    const timing = el.hoursToWindow > 0
      ? t('Collection window starts in {x}h — {state} the {h}-hour free-cancellation deadline.', { x: fmt.text.number(el.hoursToWindow), h: fmt.text.number(H), state: t(late ? 'inside' : 'before') })
      : t('The collection window has started — the {h}-hour free-cancellation deadline has passed.', { h: fmt.text.number(H) });
    const reasons = cfg.reasons || [];
    const defDest = cfg.refundDestinationDefault === 'wallet_credit' || cfg.refundDestinationDefault === 'wallet' ? 'wallet' : 'original';
    const m = UI.modal({
      title: 'Issue refund', icon: 'refund', tone: 'mauve', size: 'md',
      body: `<form class="d1-form" novalidate>
        <div class="d1-banner ${el.collected ? 'warn' : 'ok'}">${UI.icon(el.collected ? 'alert' : 'checkc')}<div><b>${esc(t(el.collected ? 'Eligible with manager approval' : 'Eligible for refund'))}</b><p>${esc(el.collected ? t('This order was already collected, so the policy requires manager approval.') : timing)}</p></div></div>
        ${polErr ? `<div class="d1-banner warn">${UI.icon('info')}<div><p>${esc(t('Couldn’t load the latest refund policy — showing the rules returned with this order.'))}</p></div></div>` : ''}
        ${D1.dl([['Order', fmt.id(o.id)], ['Consumer', esc(o.consumer.name)], ['Order total', `<b>${D1.money(o.total)}</b>`], ['Paid with', D1.card(o.paymentMethod)]])}
        <div class="fld" data-field="reason"><span class="lbl" id="rf-r">${esc(t('Reason'))} <em aria-hidden="true">*</em></span>
          <div class="d1-reasons d1-reasons-pol" role="radiogroup" aria-labelledby="rf-r">${reasons.map((r) => { const oc = OUTCOME[r.outcome] || OUTCOME.manual_review; return `<label class="check"><input type="radio" name="reason" value="${esc(r.key)}" data-outcome="${esc(r.outcome)}"><span class="rr-l">${esc(policyLabel(r.label))}</span>${UI.chip(oc[0], { tone: oc[1] })}</label>`; }).join('')}</div>
          <span class="err" aria-live="polite"></span></div>
        <div data-outcome-note aria-live="polite"></div>
        <div class="form-grid" data-amount-row>
          ${UI.field({ type: 'money', name: 'amount', label: 'Refund amount', value: total, required: true, min: 0.01, max: total, currency: cur, hint: 'Up to the order total.' })}
          <div class="fld"><span class="lbl">${esc(t('Refund to'))}</span>${UI.segmented({ name: 'dest', label: 'Refund to', options: [{ value: 'original', label: 'Original payment' }, { value: 'wallet', label: 'Wallet credit' }], value: defDest })}</div>
        </div>
        ${UI.field({ type: 'textarea', name: 'note', label: 'Note to consumer (optional)', rows: 2, maxlength: 300 })}
        <div data-approval hidden>${UI.field({ type: 'checkbox', name: 'approved', label: 'I confirm a manager approved this refund' })}</div>
        <p class="muted" style="font-size:12.5px;margin:0">${esc(t('Outcomes follow the Refund & Cancellation policy.'))} ${policyLink}</p>
      </form>`,
      actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Issue refund', variant: 'primary', run: async (mm) => {
        const form = mm.el.querySelector('form'); const x = UI.formValues(form);
        const rf = form.querySelector('[data-field="reason"]');
        const setErr = (msg) => { rf.classList.toggle('invalid', !!msg); rf.querySelector('.err').textContent = msg || ''; };
        if (!x.reason) { setErr(t('Please choose a reason.')); return false; }
        const outcome = form.querySelector('input[name="reason"]:checked').dataset.outcome;
        if (outcome === 'no_refund') { setErr(t('The policy doesn’t allow a refund for this reason.')); return false; }
        setErr('');
        const amt = form.querySelector('[name="amount"]');
        amt.max = outcome === 'partial_refund' ? String(+(total - 0.01).toFixed(2)) : String(total);
        const ap = form.querySelector('[name="approved"]'); ap.required = !form.querySelector('[data-approval]').hidden;
        const v = UI.validate(form); if (!v.ok) return false;
        const toWallet = outcome === 'wallet_credit' || x.dest === 'wallet';
        try {
          const { data } = await api('POST', `/admin/orders/${o.id}/refund`, { amount: { amount: +x.amount, currency: cur }, reason: x.reason, outcome, note: x.note, toWallet, approved: x.approved === true });
          mm.close(true);
          UI.toast(t('{amt} refunded to {dest}', { amt: fmt.text.money(data.refund ? data.refund.amount.amount : +x.amount, cur, +x.amount % 1 ? 2 : 0), dest: t(toWallet ? 'wallet credit' : 'original payment') }), { tone: 'success' });
          if (done) done(data);
        } catch (e) { D1.showFieldErrors(form, e); D1.toastErr(e); return false; }
      } }],
    });
    const form = m.el.querySelector('form');
    const amt = form.querySelector('[name="amount"]'), seg = form.querySelector('[data-seg="dest"]');
    const note = form.querySelector('[data-outcome-note]'), apWrap = form.querySelector('[data-approval]');
    const primary = m.el.querySelector('.ov-f .btn.primary');
    const setDest = (val, lock) => seg.querySelectorAll('button').forEach((b) => { if (val) b.setAttribute('aria-pressed', String(b.dataset.value === val)); b.disabled = !!lock; });
    const apply = () => {
      const r = form.querySelector('input[name="reason"]:checked'); const oc = r ? r.dataset.outcome : '';
      const meta = OUTCOME[oc];
      note.innerHTML = meta ? `<div class="d1-banner ${oc === 'no_refund' ? 'bad' : oc === 'manual_review' || oc === 'partial_refund' ? 'warn' : 'ok'}">${UI.icon(meta[2])}<div><b>${esc(t('Policy outcome: {o}', { o: t(meta[0]) }))}</b><p>${esc(t(meta[3]))}</p></div></div>` : '';
      const blocked = oc === 'no_refund';
      form.querySelector('[data-amount-row]').hidden = blocked;
      if (primary) primary.disabled = blocked;
      amt.readOnly = oc === 'full_refund' || oc === 'wallet_credit';
      if (amt.readOnly) amt.value = total;
      if (oc === 'partial_refund' && +amt.value >= total) amt.value = (Math.round(total * 50) / 100).toFixed(2);
      if (oc === 'wallet_credit') setDest('wallet', true); else setDest(null, false);
      apWrap.hidden = !(oc === 'manual_review' || el.collected) || blocked;
    };
    form.addEventListener('change', (e) => { if (e.target.name === 'reason') apply(); });
    apply();
  }

  async function cancelFlow(o, done) {
    if (!cancellable(o)) { UI.toast(t('This order can no longer be cancelled.'), { tone: 'info' }); return; }
    const v = await D1.reasonModal({
      title: 'Cancel order?', icon: 'alert', danger: true, confirm: 'Cancel order',
      text: esc(t('The consumer and restaurant are notified and the pickup is released.')),
      reasons: CANCEL_REASONS,
      extra: UI.field({ type: 'checkbox', name: 'refund', label: 'Refund the full amount', checked: true }),
      onSubmit: (vals) => api('POST', `/admin/orders/${o.id}/cancel`, { reason: vals.reason, note: vals.note, refund: vals.refund }),
    });
    if (v) { UI.toast(t(v.refund ? 'Order cancelled · refund issued' : 'Order cancelled'), { tone: 'success' }); if (done) done(); }
  }

  function openOrder(id, after) {
    const d = UI.drawer({ title: 'Order details', width: 540, body: UI.skeleton('form', 7) });
    const paint = async () => {
      try {
        const { data: o } = await api('GET', '/admin/orders/' + id);
        if (d.closed) return;
        const it = o.items[0];
        d.body.innerHTML = `
          <div class="d1-head" style="margin-block-end:16px">${UI.thumb(o.thumb, 'lg')}<div style="min-width:0"><h3 class="h-serif" style="margin:0 0 4px">${esc(it.title)}</h3><div class="row wrap" style="gap:8px">${fmt.id(o.id)}${D1.pill('order', o.status)}${D1.pill('payment', o.paymentStatus)}</div></div></div>
          ${o.refund ? `<div class="d1-banner warn" style="margin-block-end:16px">${UI.icon('refund')}<div><b>${esc(t('Refunded {amt}', { amt: fmt.text.money(o.refund.amount.amount, o.refund.amount.currency) }))}</b><p>${esc(o.refund.reasonLabel || o.refund.reason)} · ${esc(t(o.refund.toWallet ? 'Wallet credit' : 'Original payment'))} · ${D1.dt(o.refund.at)}</p></div></div>` : ''}
          ${D1.section('Reservation', D1.dl([
            ['Consumer', `<a class="lnk plain" href="#admin-consumer-detail" data-go="admin-consumer-detail" data-params='${UI.attrJSON({ id: o.consumer.id })}'>${esc(o.consumer.name)}</a>`],
            ['Restaurant', `<a class="lnk plain" href="#admin-merchant-detail" data-go="admin-merchant-detail" data-params='${UI.attrJSON({ id: o.merchant.id })}'>${esc(o.merchant.name)}</a>`],
            ['Branch', esc(o.branch.name)], ['City', esc(D1.lab(D1.CITY, o.city))], ['Placed', D1.dt(o.createdAt)], ['Pickup window', D1.win(o.pickupWindow)],
            ['Pickup code', `<span class="d1-code">${esc(o.pickupCode)}</span>`], ['Fulfilment', esc(t(o.fulfillment === 'delivery' ? 'Driver Delivery' : 'Self-Pickup'))],
          ]))}
          ${D1.section('Payment', D1.dl([
            ['Items', `${fmt.number(it.qty)} × ${D1.money(it.unitPrice)}`], ['Service fee', D1.money(o.fees)], ['Total', `<b>${D1.money(o.total)}</b>`], ['Paid with', D1.card(o.paymentMethod)],
          ]))}
          ${D1.section('Timeline', timeline(o))}`;
        let f = d.el.querySelector('.ov-f'); if (!f) { f = document.createElement('div'); f.className = 'ov-f'; d.el.appendChild(f); }
        f.innerHTML = `${cancellable(o) ? UI.btn('Cancel order', { variant: 'danger', icon: 'x', attrs: 'data-dact="cancel"' }) : ''}<span style="flex:1"></span>${UI.btn('View pickup', { variant: 'secondary', icon: 'package', attrs: 'data-dact="pickup"' })}${refundable(o) ? UI.btn('Issue refund', { variant: 'primary', icon: 'refund', attrs: 'data-dact="refund"' }) : ''}`;
        f.onclick = (e) => {
          const b = e.target.closest('[data-dact]'); if (!b) return; const a = b.dataset.dact;
          const again = () => { paint(); if (after) after(); };
          if (a === 'refund') refundFlow(o, again);
          if (a === 'cancel') cancelFlow(o, again);
          if (a === 'pickup') { d.close(); App.go('admin-pickups', { q: o.pickupId, open: o.pickupId }); }
        };
      } catch (e) { d.body.innerHTML = UI.errorState({ text: D1.err(e) }); d.body.addEventListener('ui:retry', paint, { once: true }); }
    };
    paint();
    return d;
  }

  App.route('admin-orders', {
    nav: 'Orders & Reservations', title: 'Orders & Reservations',
    subtitle: 'Review consumer orders and reservation activity.',
    render(el, ctx) {
      el.innerHTML = `<div data-kpis></div><div data-filters></div>
        ${UI.card({ title: 'All Orders & Reservations', sub: 'Summary of all orders', icon: 'clipboard', flush: true, body: '<div data-table></div>' })}`;
      const loadKpis = () => UI.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/orders/summary', api.ctx()), ({ data: k }) => UI.kpis([
        { label: 'Total Orders', icon: 'clipboard', tone: 'rose', value: fmt.number(k.totalOrders), foot: t('Today') },
        { label: 'Revenue', icon: 'coins', tone: 'lime', value: D1.money(k.revenue), foot: t('From completed orders') },
        { label: 'Avg Order Value', icon: 'bars', tone: 'orange', value: D1.money(k.avgOrderValue, 1), foot: t('Per reservation') },
        { label: 'Refunded / Cancelled', icon: 'refund', tone: 'mauve', value: fmt.number(k.refundedCancelled), foot: t('Needs attention'), go: 'admin-orders', params: { status: 'refunded' } },
        { label: 'Pending Confirmation', icon: 'clock', tone: 'berry', value: fmt.number(k.pendingConfirmation), foot: t('Awaiting restaurant'), go: 'admin-orders', params: { status: 'reserved' } },
      ]), { skeleton: 'kpis', n: 5 });
      loadKpis();

      const filters = UI.mountFilters(el.querySelector('[data-filters]'), {
        search: { name: 'q', placeholder: 'Search by order ID, user or restaurant' },
        selects: [
          { name: 'status', label: 'All Status', options: STATUS_OPTS },
          { name: 'category', label: 'All Categories', options: D1.opts(D1.CATEGORY).filter((o) => !['produce', 'other'].includes(o.value)) },
          { name: 'city', label: 'All Cities', options: D1.opts(D1.CITY) },
          { name: 'dietary', label: 'All Dietary tags', options: D1.opts(D1.DIET) },
        ],
        sort: { name: 'sort', label: 'Sort', options: SORTS, value: '-createdAt' },
        values: { status: D1.take(ctx, 'status') || '', q: D1.take(ctx, 'q') || '' },
        actions: UI.btn('Export', { variant: 'secondary', icon: 'upload', attrs: 'data-act="export"' }),
      }, () => table.setQuery({ page: 1 }));

      const refreshAll = () => { table.reload(); loadKpis(); };
      const table = UI.dataTable(el.querySelector('[data-table]'), {
        select: true, pageSize: 10, caption: 'All Orders & Reservations',
        columns: [
          { key: 'order', label: 'Order', render: (r) => D1.prod(r.thumb, r.items[0].title, fmt.id(r.id)) },
          { key: 'user', label: 'User', cls: 'wrap', render: (r) => esc(r.consumer.name) },
          { key: 'merchant', label: 'Restaurants', cls: 'wrap', render: (r) => esc(r.merchant.name) },
          { key: 'total', label: 'Amount', sortable: true, render: (r) => `<span class="d1-amt">${D1.money(r.total)}</span>` },
          { key: 'payment', label: 'Payment', render: (r) => D1.card(r.paymentMethod) },
          { key: 'city', label: 'City', render: (r) => esc(D1.lab(D1.CITY, r.city)) },
          { key: 'createdAt', label: 'Placed', sortable: true, render: (r) => placed(r.createdAt) },
          { key: 'status', label: 'Status', render: (r) => D1.pill('order', r.status) },
        ],
        fetch: (q) => { const f = filters.values(); return api('GET', '/admin/orders', { ...api.ctx(), ...f, ...q, sort: q.sort || f.sort }); },
        rowClick: (r) => openOrder(r.id, refreshAll),
        rowActions: (r) => [{ icon: 'eye', label: 'View', run: () => openOrder(r.id, refreshAll) }],
        bulkActions: [{ label: 'Export selected', icon: 'upload', run: (ids) => { Overlays.export({ scope: 'Orders & Reservations', endpoint: '/admin/orders', filters: { ids } }); return false; } }],
        empty: { icon: 'clipboard', title: 'No orders found', text: 'Try changing the filters or search.' },
      });
      UI.on(el, 'click', '[data-act="export"]', () => Overlays.export({ scope: 'Orders & Reservations', endpoint: '/admin/orders', columns: ['Order', 'User', 'Restaurants', 'Amount', 'Payment', 'City', 'Placed', 'Status'], filters: filters.values() }));
      { const o = D1.take(ctx, 'open') || D1.take(ctx, 'id'); if (o) openOrder(o, refreshAll); }
    },
  });
  window.D1.openOrder = openOrder;
})();
