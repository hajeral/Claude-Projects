/* (v1.4 dates) seeded dates rebased onto api.DEMO_TODAY = 2026-11-19 by qa/rebase_dates.py */
/* =====================================================================
   Admin · Wallet Credit & Vouchers (owner: D2)
   Routes: admin-wallet {tab:'credit'|'vouchers'} · admin-wallet-detail {id} · admin-voucher-new {id?} · admin-voucher-detail {id}
   API: GET /admin/wallets (+summary) · GET /admin/wallets/{id} · POST /admin/wallets/credits
        POST /admin/wallets/{id}/adjust|freeze|unfreeze
        GET|POST /admin/vouchers · GET|PATCH|DELETE /admin/vouchers/{id} · POST /admin/vouchers/{id}/freeze|unfreeze
        GET /admin/consumers (Issue Credit recipient picker)
   ===================================================================== */
(function () {
  'use strict';
  const esc = UI.esc, ic = UI.icon;
  const TODAY = api.DEMO_TODAY; // (v1.4) single demo anchor
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  let TAB = 'credit';

  const vValue = (v) => (v.type === 'percentage' ? fmt.pct(v.value, { dec: 0 }) : v.type === 'fixed' ? D2.money(v.valueMoney || { amount: v.value, currency: App.currency() }) : esc(t('Free bag')));
  const usage = (v) => `<div class="wal-use"><span>${fmt.number(v.used)}<span class="faint">/${fmt.number(v.usageLimit)}</span></span>${Charts.progress(v.used, { max: v.usageLimit, height: 5, tone: v.used >= v.usageLimit ? 'o' : '', label: 'Usage' })}</div>`;

  const K = (label, icon, tone, value, foot, o = {}) => D2.kpi({ key: label, label, delta: null }, { icon, tone, value, foot, ...o });
  function kpisHTML(s) {
    return `<div class="grid d2-kg" style="grid-template-columns:repeat(5,minmax(0,1fr))">${[
      K('Total Wallet Balance', 'wallet', 'rose', D2.money(s.totalWalletBalance), esc(t('Across all users'))),
      K('Active Vouchers', 'tag', 'lime', fmt.number(s.activeVouchers), esc(t('Live promo codes')), { go: 'admin-wallet', params: { tab: 'vouchers' } }),
      K('Voucher Redemptions', 'receipt', 'orange', fmt.number(s.voucherRedemptions), esc(t('All time'))),
      K('Avg Balance / User', 'coins', 'mauve', D2.money(s.avgBalancePerUser, 1), `<b class="neg">${esc(t('Among credited users'))}</b>`),
      K('Wallet Users', 'users', 'rose', fmt.number(s.walletUsers), esc(t('Have received credit'))),
    ].join('')}</div>`;
  }

  App.route('admin-wallet', {
    nav: 'Wallet & Vouchers', title: 'Wallet Credit & Vouchers', subtitle: 'Manage closed-loop wallet balances and promo voucher codes.',
    exportResource: 'admin.wallets', exportColumns: ['Name', 'Wallet ID', 'Balance', 'Last Transaction', 'Source', 'Status'],
    render(el, ctx) {
      el.classList.add('d2-page');
      if (ctx.params && ctx.params.tab) TAB = ctx.params.tab;
      el.innerHTML = `<div class="wal-note" role="note">${ic('info')}<p>${t('<b>Wallet Credit</b> is a closed-loop balance used only within WonderBites — for refunds, promotional credit, customer compensation and referral rewards. It cannot be withdrawn, transferred, or redeemed for cash.')}<br>${t('<b>Vouchers</b> are one-time promo codes for discounts and campaigns. Both live here since they’re both forms of customer value.')}</p></div>
        <div data-kpis>${UI.skeleton('kpis', 5)}</div><div data-tabs></div><div data-panel></div>`;
      const loadKpis = () => D2.async(el.querySelector('[data-kpis]'), () => api('GET', '/admin/wallets', { pageSize: 1 }), (r) => kpisHTML(r.summary), { skeleton: 'kpis', n: 5 });
      loadKpis();
      const draw = () => {
        el.querySelector('[data-tabs]').innerHTML = UI.tabs({ name: 'wtab', label: 'Wallet sections', variant: 'wal-tabs', active: TAB, tabs: [{ id: 'credit', label: 'Wallet Credit' }, { id: 'vouchers', label: 'Vouchers' }] });
        const p = el.querySelector('[data-panel]'); p.innerHTML = '<div class="grid" style="gap:var(--gap)"><div data-f></div><div data-c></div></div>';
        (TAB === 'credit' ? creditPanel : voucherPanel)(p.firstChild, loadKpis);
      };
      draw();
      el.addEventListener('ui:tab', (e) => { if (e.detail.name !== 'wtab') return; TAB = e.detail.value; App.state.params['admin-wallet'] = { tab: TAB }; draw(); });
    },
  });

  /* ------------------------------------------------------------ wallet credit tab */
  function creditPanel(box, reloadKpis) {
    const f = UI.mountFilters(box.querySelector('[data-f]'), {
      search: { name: 'q', placeholder: 'Search by name or wallet ID' },
      selects: [{ name: 'status', label: 'All Status', options: D2.statusOpts('wallet') }, { name: 'source', label: 'All Sources', options: D2.opts(D2.SOURCE) }],
      actions: UI.btn('Issue Credit', { variant: 'primary', icon: 'plus', attrs: 'data-act="issue"' }),
    }, () => tbl.setQuery({ page: 1 }));
    box.querySelector('[data-c]').innerHTML = UI.card({ title: 'Wallet Balances', icon: 'wallet', tone: 'rose', flush: true, body: '<div data-t></div>' });
    const reload = () => { tbl.reload(); reloadKpis(); };
    const tbl = UI.dataTable(box.querySelector('[data-t]'), {
      pageSize: 10, sort: '-lastTransactionAt', caption: 'Wallet Balances',
      columns: [
        { key: 'name', label: 'Name', render: (r) => `<div class="prod">${UI.avatar(App.loc(r.consumer.name), { size: 30 })}<div><b>${D2.loc(r.consumer.name)}</b><small>${fmt.id(r.id)}</small></div></div>` },
        { key: 'balance', label: 'Balance', sortable: true, render: (r) => `<b>${D2.money(r.balance)}</b>` },
        { key: 'lastTransactionAt', label: 'Last Transaction', sortable: true, render: (r) => D2.date(r.lastTransactionAt) },
        { key: 'source', label: 'Source', render: (r) => `<b>${esc(D2.lab(D2.SOURCE, r.source))}</b>` },
        { key: 'status', label: 'Status', render: (r) => D2.pill('wallet', r.status) },
      ],
      fetch: (q) => api('GET', '/admin/wallets', { ...api.ctx(), ...f.values(), ...q }),
      rowClick: (r) => walletDrawer(r.id, reload),
      rowActions: (r) => [{ icon: 'eye', label: 'View wallet', run: () => walletDrawer(r.id, reload) }],
      empty: { icon: 'wallet', title: 'No wallets found', text: 'Try changing the filters, or issue credit to a consumer.' },
    });
    UI.on(box, 'click', '[data-act="issue"]', () => issueCredit(reload));
  }

  async function issueCredit(after) {
    let people = [];
    try { people = (await api('GET', '/admin/consumers', { pageSize: 50 })).data.map((c) => ({ value: c.id, label: App.loc(c.nameI18n || c.name) })); }
    catch (e) { try { people = (await api('GET', '/admin/wallets', { pageSize: 100 })).data.map((w) => ({ value: w.consumerId, label: App.loc(w.consumer.name) })); } catch (x) { people = []; } }
    const m = UI.modal({ title: 'Issue Credit', icon: 'gift', tone: 'lime', size: 'md',
      body: `<form class="form-grid" novalidate>
        <div class="full wal-pick">${people.length ? `<label class="inp">${ic('search')}<span class="sr-only">${esc(t('Search consumers'))}</span><input type="search" data-pick-q placeholder="${esc(t('Search consumers'))}"></label>` : ''}
        ${UI.field({ type: 'multiselect', name: 'consumerIds', label: 'Recipients', required: true, options: people, hint: 'Frozen or blocked wallets are skipped.' })}</div>
        ${UI.field({ type: 'money', name: 'amount', label: 'Amount', required: true, min: 1, max: 1000, placeholder: '0.00', hint: t('Up to {amt} per consumer.', { amt: fmt.text.money(1000, App.currency()) }) })}
        ${UI.field({ type: 'select', name: 'source', label: 'Source', required: true, placeholder: 'Choose a source', options: D2.opts(D2.SOURCE) })}
        ${UI.field({ type: 'textarea', name: 'reason', label: 'Reason', required: true, minlength: 5, rows: 3, full: true, placeholder: 'e.g. Compensation for a late pickup on order MO-5188' })}
        ${UI.field({ type: 'date', name: 'expiresAt', label: 'Credit expires on', min: addDays(TODAY, 1), hint: 'Optional. Leave empty for no expiry.' })}
        ${UI.field({ type: 'checkbox', name: 'notify', label: 'Notify consumers by push and email', checked: true })}
      </form>`,
      actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Issue Credit', variant: 'primary', icon: 'gift', run: async (dlg) => {
        const form = dlg.el.querySelector('form'); const v = UI.validate(form); if (!v.ok) return false;
        if (v.values.expiresAt && v.values.expiresAt <= TODAY) { D2.fieldErr(form, 'expiresAt', 'Expiry date must be in the future.'); return false; }
        try {
          const { data } = await api('POST', '/admin/wallets/credits', { consumerIds: v.values.consumerIds, amount: { amount: v.values.amount, currency: App.currency() }, source: v.values.source, reason: v.values.reason, expiresAt: v.values.expiresAt || null, notify: v.values.notify });
          dlg.close(); UI.toast(t(data.issued === 1 ? 'Credit issued to 1 wallet' : 'Credit issued to {n} wallets', { n: data.issued }) + (data.skipped ? ' · ' + t('{n} skipped (frozen or blocked)', { n: data.skipped }) : ''), { tone: 'success' }); after && after();
        } catch (e) { D2.fail(e, form); return false; }
      } }],
      onOpen: (dlg) => { const qi = dlg.el.querySelector('[data-pick-q]'); if (qi) qi.addEventListener('input', () => { const s = qi.value.trim().toLowerCase(); dlg.el.querySelectorAll('.ms label').forEach((l) => (l.hidden = s && !l.textContent.toLowerCase().includes(s))); }); },
    });
    return m;
  }

  /* ------------------------------------------------------------ wallet detail */
  function walletHTML(d) {
    const w = d.wallet;
    return `<div class="perf-dh">${UI.avatar(App.loc(w.consumer.name), { size: 44 })}<div><b>${D2.loc(w.consumer.name)}</b><small>${fmt.id(w.id)} · ${fmt.id(w.consumer.id)}</small></div>${D2.pill('wallet', w.status)}</div>
      <div class="wal-bal mt-16"><div><span class="d2-sub">${esc(t('Current balance'))}</span><div class="d2-big">${D2.money(w.balance, 2)}</div></div><div><span class="d2-sub">${esc(t('Lifetime credit'))}</span><b>${D2.money(w.lifetimeCredit, 2)}</b></div></div>
      ${w.frozenReason ? `<div class="fin-alert">${ic(w.status === 'blocked' ? 'ban' : 'pause')}<span>${esc(D2.tx(w.frozenReason))}</span></div>` : ''}
      <div class="mt-16">${D2.dl([['Main source', esc(D2.lab(D2.SOURCE, w.source))], ['Last transaction', D2.dt(w.lastTransactionAt)]])}</div>
      <div class="d2-sect mt-16"><h4>${esc(t('Transactions'))}</h4>${d.transactions.length ? `<div class="tbl-wrap wal-tx"><table class="tbl compact"><caption class="sr-only">${esc(t('Transactions'))}</caption><thead><tr><th>${esc(t('Date'))}</th><th>${esc(t('Type'))}</th><th>${esc(t('Details'))}</th><th class="end">${esc(t('Amount'))}</th><th class="end">${esc(t('Balance'))}</th></tr></thead><tbody>${d.transactions.map((x) => `<tr><td class="mut">${D2.date(x.createdAt, 'short')}</td><td>${UI.chip(D2.TXN[x.type] || x.type, { tone: x.amount.amount < 0 ? 'r' : x.type === 'adjustment' ? 'm' : 'g' })}</td><td><span class="wal-why">${esc(D2.tx(x.reason))}${x.orderId ? ` · ${fmt.id(x.orderId)}` : ''}</span></td><td class="end b">${D2.signed({ ...x.amount, amount: x.amount.amount }, 2)}</td><td class="end mut">${D2.money(x.balanceAfter, 2)}</td></tr>`).join('')}</tbody></table></div>` : UI.empty({ icon: 'receipt', title: 'No transactions yet' })}</div>`;
  }
  function walletActions(w, refresh, close) {
    const a = [];
    if (w.status !== 'blocked') a.push({ label: 'Adjust balance', variant: 'secondary', icon: 'coins', run: () => adjust(w, refresh) });
    if (w.status === 'active') a.push({ label: 'Freeze wallet', variant: 'danger', icon: 'pause', run: () => freeze(w, refresh) });
    if (w.status === 'frozen') a.push({ label: 'Unfreeze wallet', variant: 'primary', icon: 'play', run: () => unfreeze(w, refresh) });
    a.push({ label: 'View consumer', variant: 'secondary', icon: 'user', run: () => { close && close(); App.go('admin-consumer-detail', { id: w.consumer.id }); } });
    return a;
  }
  function walletDrawer(id, after) {
    const dr = UI.drawer({ title: 'Wallet details', width: 560, body: UI.skeleton('form', 5) });
    const fill = async () => {
      try {
        const { data } = await api('GET', '/admin/wallets/' + id); if (dr.closed) return;
        dr.body.innerHTML = walletHTML(data);
        const refresh = () => { after && after(); fill(); };
        D2.setFooter(dr, [...walletActions(data.wallet, refresh, () => dr.close()), { label: 'Open full page', variant: 'secondary', icon: 'external', run: () => { dr.close(); App.go('admin-wallet-detail', { id }); } }]);
      } catch (e) { dr.body.innerHTML = UI.errorState({ text: e.message }); dr.body.addEventListener('ui:retry', fill, { once: true }); }
    };
    fill();
  }
  function adjust(w, after) {
    return new Promise((res) => UI.modal({ title: 'Adjust balance', icon: 'coins', tone: 'mauve', size: 'sm',
      body: `<form class="form-grid" novalidate><div class="fld full"><span class="lbl">${esc(t('Direction'))}</span>${UI.segmented({ name: 'direction', label: 'Direction', value: 'credit', options: [{ value: 'credit', label: 'Add credit', icon: 'plus' }, { value: 'debit', label: 'Remove credit', icon: 'minus' }] })}</div>
        ${UI.field({ type: 'money', name: 'amount', label: 'Amount', required: true, min: 0.01, max: 1000, full: true, hint: t('Current balance: {b}', { b: fmt.text.money(w.balance.amount, w.balance.currency, 2) }) })}
        ${UI.field({ type: 'textarea', name: 'reason', label: 'Reason', required: true, minlength: 5, rows: 3, full: true, placeholder: 'Why is this balance being changed?' })}</form>`,
      actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Save adjustment', variant: 'primary', run: async (m) => {
        const form = m.el.querySelector('form'); const v = UI.validate(form); if (!v.ok) return false;
        if (v.values.direction === 'debit' && v.values.amount > w.balance.amount) { D2.fieldErr(form, 'amount', 'Debit can’t exceed the current balance.'); return false; }
        try { await api('POST', `/admin/wallets/${w.id}/adjust`, { direction: v.values.direction, amount: { amount: v.values.amount, currency: w.balance.currency }, reason: v.values.reason }); m.close(); UI.toast(t('Balance adjusted'), { tone: 'success' }); after && after(); }
        catch (e) { D2.fail(e, form); return false; }
      } }], onClose: () => res() }));
  }
  function freeze(w, after) {
    return new Promise((res) => UI.modal({ title: 'Freeze wallet?', icon: 'pause', tone: 'berry', size: 'sm',
      body: `<form novalidate><p class="muted" style="font-size:13px;margin-block-end:12px">${esc(t('The consumer can’t spend or receive credit until the wallet is unfrozen. The balance is kept.'))}</p>${UI.field({ type: 'textarea', name: 'reason', label: 'Reason', required: true, minlength: 5, rows: 3, placeholder: 'e.g. Suspicious redemption pattern' })}</form>`,
      actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Freeze wallet', variant: 'danger', run: async (m) => {
        const form = m.el.querySelector('form'); const v = UI.validate(form); if (!v.ok) return false;
        try { await api('POST', `/admin/wallets/${w.id}/freeze`, { reason: v.values.reason }); m.close(); UI.toast(t('Wallet frozen'), { tone: 'success' }); after && after(); } catch (e) { D2.fail(e, form); return false; }
      } }], onClose: () => res() }));
  }
  async function unfreeze(w, after) {
    if (!(await UI.confirm({ title: t('Unfreeze wallet?'), text: t('The consumer can use their balance again.'), confirm: t('Unfreeze wallet') }))) return;
    try { await api('POST', `/admin/wallets/${w.id}/unfreeze`, {}); UI.toast(t('Wallet unfrozen'), { tone: 'success' }); after && after(); } catch (e) { D2.fail(e); }
  }
  App.route('admin-wallet-detail', {
    nav: 'Wallet & Vouchers', title: 'Wallet details', subtitle: 'Balance, transactions and wallet controls.',
    render(el, ctx) {
      el.classList.add('d2-page');
      const id = ctx.params && ctx.params.id;
      if (!id) { el.innerHTML = UI.card({ body: UI.empty({ icon: 'wallet', title: 'No wallet selected', action: UI.btn('Back to Wallet Credit', { variant: 'primary', go: 'admin-wallet', params: { tab: 'credit' } }) }) }); return; }
      const draw = () => D2.async(el, () => api('GET', '/admin/wallets/' + id), ({ data }) => `<div class="d2-pagehead">${D2.back('Back to Wallet Credit', 'admin-wallet', { tab: 'credit' })}<span class="sp"></span><span data-acts></span></div>${UI.card({ title: 'Wallet', icon: 'wallet', tone: 'rose', body: walletHTML(data) })}`, { skeleton: 'cards', n: 2, after: (root, res) => {
        const acts = walletActions(res.data.wallet, draw);
        root.querySelector('[data-acts]').innerHTML = acts.map((a, i) => UI.btn(a.label, { variant: a.variant, icon: a.icon, attrs: `data-wa="${i}"` })).join(' ');
        UI.on(root, 'click', '[data-wa]', (e, b) => acts[+b.dataset.wa].run());
      } });
      draw();
    },
  });

  /* ------------------------------------------------------------ vouchers tab */
  function voucherPanel(box, reloadKpis) {
    const f = UI.mountFilters(box.querySelector('[data-f]'), {
      search: { name: 'q', placeholder: 'Search by voucher code' },
      selects: [{ name: 'status', label: 'All Status', options: D2.statusOpts('voucher') }],
      actions: UI.btn('Create Voucher', { variant: 'primary', icon: 'plus', go: 'admin-voucher-new', params: {} }),
    }, () => tbl.setQuery({ page: 1 }));
    box.querySelector('[data-c]').innerHTML = UI.card({ title: 'Voucher Codes', icon: 'tag', tone: 'lime', flush: true, body: '<div data-t></div>' });
    const tbl = UI.dataTable(box.querySelector('[data-t]'), {
      pageSize: 10, sort: '-createdAt', caption: 'Voucher Codes',
      columns: [
        { key: 'code', label: 'Code', sortable: true, render: (r) => `<div class="prod"><div><b class="num">${esc(r.code)}</b><small>${r.name ? D2.loc(r.name) : ''}</small></div></div>` },
        { key: 'type', label: 'Type', render: (r) => esc(D2.lab(D2.VTYPE, r.type)) },
        { key: 'value', label: 'Value', render: (r) => vValue(r) },
        { key: 'usage', label: 'Usage', sortable: true, render: usage },
        { key: 'expiresAt', label: 'Expires', sortable: true, render: (r) => `<b>${D2.date(r.expiresAt)}</b>` },
        { key: 'status', label: 'Status', render: (r) => D2.pill('voucher', r.status) },
      ],
      fetch: (q) => api('GET', '/admin/vouchers', { ...api.ctx(), ...f.values(), ...q }),
      rowClick: (r) => App.go('admin-voucher-detail', { id: r.id }),
      rowActions: (r) => [{ icon: 'eye', label: 'View voucher', go: 'admin-voucher-detail', params: { id: r.id } }, { icon: 'trash', label: 'Delete voucher', danger: true, run: () => delVoucher(r, () => { tbl.reload(); reloadKpis(); }) }],
      empty: { icon: 'tag', title: 'No vouchers found', text: 'Try changing the filters, or create a new voucher.' },
    });
  }
  async function delVoucher(v, after) {
    if (!(await UI.confirm({ title: t('Delete voucher {code}?', { code: v.code }), text: v.used ? t('It has been redeemed {n} times. Past orders keep their discount, but the code stops working immediately.', { n: fmt.text.number(v.used) }) : t('The code stops working immediately. This cannot be undone.'), confirm: t('Delete'), danger: true }))) return false;
    try { await api('DELETE', '/admin/vouchers/' + v.id); UI.toast(t('Voucher deleted'), { tone: 'success' }); after && after(); return true; } catch (e) { D2.fail(e); return false; }
  }

  /* ------------------------------------------------------------ create / edit voucher */
  App.route('admin-voucher-new', {
    nav: 'Wallet & Vouchers', title: (ctx) => esc(t(ctx.params && ctx.params.id ? 'Edit Voucher' : 'Create Voucher')), subtitle: 'Set the code, discount, usage limits, audience and validity.',
    async render(el, ctx) {
      el.classList.add('d2-page');
      const id = ctx.params && ctx.params.id; let v = null;
      if (id) { el.innerHTML = UI.skeleton('form', 6); try { v = (await api('GET', '/admin/vouchers/' + id)).data.voucher; } catch (e) { el.innerHTML = UI.errorState({ text: e.message }); el.addEventListener('ui:retry', () => ctx.refresh(), { once: true }); return; } if (!el.isConnected) return; }
      const val = (k, d) => (v && v[k] != null ? v[k] : d);
      const type = val('type', 'percentage');
      el.innerHTML = `${D2.back(id ? 'Back to voucher' : 'Back to Vouchers', id ? 'admin-voucher-detail' : 'admin-wallet', id ? { id } : { tab: 'vouchers' })}
        <div class="grid wal-form">
          <section class="cd"><form novalidate data-vf>
            <div class="form-sec"><div><h4>${esc(t('Code & name'))}</h4><p>${esc(t('Customers type the code at checkout. Use 3–20 letters, numbers, - or _.'))}</p></div><div class="form-grid">
              <div class="full wal-code">${UI.field({ type: 'text', name: 'code', label: 'Voucher code', required: true, value: val('code', ''), pattern: '[A-Za-z0-9_\\-]{3,20}', maxlength: 20, placeholder: 'e.g. SUMMER15' })}${UI.btn('Generate', { variant: 'secondary', icon: 'refresh', attrs: 'data-act="gen"' })}</div>
              ${UI.field({ type: 'text', name: 'nameEn', label: 'Campaign name (English)', value: v && v.name ? v.name.en : '', maxlength: 60 })}
              ${UI.field({ type: 'text', name: 'nameAr', label: 'Campaign name (Arabic)', value: v && v.name ? v.name.ar : '', maxlength: 60 })}
            </div></div>
            <div class="form-sec"><div><h4>${esc(t('Discount'))}</h4><p>${esc(t('Percentage off the bag price, or a fixed amount.'))}</p></div><div class="form-grid">
              <div class="fld full"><span class="lbl">${esc(t('Type'))} <em aria-hidden="true">*</em></span>${UI.segmented({ name: 'type', label: 'Type', value: type, options: [{ value: 'percentage', label: 'Percentage', icon: 'percent' }, { value: 'fixed', label: 'Fixed amount', icon: 'coins' }] })}</div>
              ${UI.field({ type: 'number', name: 'value', label: 'Discount value', required: true, min: 1, max: type === 'percentage' ? 100 : 500, value: val('value', ''), suffix: type === 'percentage' ? '%' : fmt.text.currency() })}
              ${UI.field({ type: 'money', name: 'maxDiscount', label: 'Maximum discount', value: v && v.maxDiscount ? v.maxDiscount.amount : '', hint: 'Optional cap for percentage vouchers.' })}
              ${UI.field({ type: 'money', name: 'minOrder', label: 'Minimum order', value: v && v.minOrder ? v.minOrder.amount : '', hint: 'Optional.' })}
            </div></div>
            <div class="form-sec"><div><h4>${esc(t('Usage & audience'))}</h4><p>${esc(t('Limit total and per-customer redemptions, and choose who can use it.'))}</p></div><div class="form-grid">
              ${UI.field({ type: 'number', name: 'usageLimit', label: 'Usage limit', required: true, min: Math.max(1, val('used', 0)), value: val('usageLimit', 1000) })}
              ${UI.field({ type: 'number', name: 'perUserLimit', label: 'Uses per customer', required: true, min: 1, max: 20, value: val('perUserLimit', 1) })}
              ${UI.field({ type: 'select', name: 'audience', label: 'Audience', required: true, value: val('audience', 'all_users'), options: D2.opts(D2.AUDIENCE), full: true })}
            </div></div>
            <div class="form-sec"><div><h4>${esc(t('Validity'))}</h4><p>${esc(t('Vouchers with a future start date are scheduled automatically.'))}</p></div><div class="form-grid">
              ${UI.field({ type: 'date', name: 'startsAt', label: 'Starts on', value: v ? String(v.startsAt).slice(0, 10) : TODAY })}
              ${UI.field({ type: 'date', name: 'expiresAt', label: 'Expires on', required: true, min: addDays(TODAY, 1), value: v ? String(v.expiresAt).slice(0, 10) : '' })}
              ${v ? '' : UI.field({ type: 'radio', name: 'status', label: 'Save as', value: 'active', options: [{ value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }] })}
            </div></div>
            <div class="form-actions">${UI.btn('Cancel', { variant: 'secondary', go: id ? 'admin-voucher-detail' : 'admin-wallet', params: id ? { id } : { tab: 'vouchers' } })}${UI.btn(id ? 'Save changes' : 'Create Voucher', { variant: 'primary', type: 'submit', icon: 'check' })}</div>
          </form></section>
          <aside class="grid" style="align-content:start">${UI.card({ title: 'Preview', icon: 'eye', tone: 'mauve', body: '<div data-prev></div>' })}</aside>
        </div>`;
      const form = el.querySelector('[data-vf]');
      const cur = () => UI.formValues(form);
      const preview = () => {
        const x = cur(); const pct = x.type === 'percentage';
        el.querySelector('[data-prev]').innerHTML = `<div class="wal-ticket"><span class="wal-ticket-c num">${esc((x.code || 'CODE').toUpperCase())}</span><b>${x.value ? (pct ? fmt.pct(x.value, { dec: 0 }) + ' ' + esc(t('off')) : fmt.money(x.value) + ' ' + esc(t('off'))) : esc(t('Set a discount'))}</b><small>${esc(App.state.lang === 'ar' ? x.nameAr || x.nameEn || '' : x.nameEn || '')}</small></div>
          ${D2.dl([['Audience', esc(D2.lab(D2.AUDIENCE, x.audience))], ['Minimum order', x.minOrder ? fmt.money(x.minOrder) : ''], ['Maximum discount', pct && x.maxDiscount ? fmt.money(x.maxDiscount) : ''], ['Usage limit', x.usageLimit ? t('{n} uses · {p} per customer', { n: fmt.number(x.usageLimit), p: fmt.number(x.perUserLimit || 1) }) : ''], ['Valid', x.expiresAt ? `${D2.date(x.startsAt || TODAY)} – ${D2.date(x.expiresAt)}` : '']])}`;
      };
      const syncType = () => {
        const pct = cur().type === 'percentage'; const vi = form.querySelector('[name="value"]'); vi.max = pct ? 100 : 500;
        const suf = vi.parentElement.querySelector('.suf'); if (suf) suf.textContent = pct ? '%' : fmt.text.currency();
        const md = form.querySelector('[name="maxDiscount"]').closest('.fld'); md.hidden = !pct;
      };
      syncType(); preview();
      form.addEventListener('input', (e) => { if (e.target.name === 'code') { const p = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); e.target.setSelectionRange(p, p); } preview(); });
      form.addEventListener('change', preview);
      form.addEventListener('ui:seg', () => { syncType(); preview(); });
      UI.on(form, 'click', '[data-act="gen"]', () => { const c = form.querySelector('[name="code"]'); const w = ['RESCUE', 'SAVE', 'FRESH', 'GOOD', 'BITES']; c.value = w[Math.floor(Math.random() * w.length)] + (10 + Math.floor(Math.random() * 40)); preview(); c.focus(); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const r = UI.validate(form); if (!r.ok) return; const x = r.values;
        if (x.startsAt && x.expiresAt <= x.startsAt) return D2.fieldErr(form, 'expiresAt', 'Expiry must be after the start date.');
        if (x.expiresAt <= TODAY) return D2.fieldErr(form, 'expiresAt', 'Expiry date must be in the future.');
        if (x.type === 'percentage' && x.value > 100) return D2.fieldErr(form, 'value', 'A percentage can’t be more than 100.');
        const body = { code: x.code.toUpperCase(), name: x.nameEn || x.nameAr ? { en: x.nameEn || x.nameAr, ar: x.nameAr || x.nameEn } : null, type: x.type, value: x.value, minOrder: x.minOrder ? { amount: x.minOrder, currency: App.currency() } : null, maxDiscount: x.type === 'percentage' && x.maxDiscount ? { amount: x.maxDiscount, currency: App.currency() } : null, usageLimit: x.usageLimit, perUserLimit: x.perUserLimit, audience: x.audience, startsAt: x.startsAt || TODAY, expiresAt: x.expiresAt, status: x.status || undefined };
        const btn = form.querySelector('[type="submit"]'); btn.disabled = true;
        try {
          const { data } = await api(id ? 'PATCH' : 'POST', id ? '/admin/vouchers/' + id : '/admin/vouchers', body);
          UI.toast(t(id ? 'Voucher {code} updated' : 'Voucher {code} created', { code: data.code }), { tone: 'success' });
          App.go('admin-voucher-detail', { id: data.id });
        } catch (err) { D2.fail(err, form); } finally { if (btn.isConnected) btn.disabled = false; }
      });
    },
  });

  /* ------------------------------------------------------------ voucher detail */
  App.route('admin-voucher-detail', {
    nav: 'Wallet & Vouchers', title: 'Voucher details', subtitle: 'Discount, usage and redemptions.',
    exportResource: 'admin.vouchers', exportColumns: ['Order', 'Consumer', 'Discount', 'Redeemed At'],
    render(el, ctx) {
      el.classList.add('d2-page');
      const id = ctx.params && ctx.params.id;
      if (!id) { el.innerHTML = UI.card({ body: UI.empty({ icon: 'tag', title: 'No voucher selected', action: UI.btn('Back to Vouchers', { variant: 'primary', go: 'admin-wallet', params: { tab: 'vouchers' } }) }) }); return; }
      const draw = () => D2.async(el, () => api('GET', '/admin/vouchers/' + id), ({ data }) => {
        const v = data.voucher; const pct = Math.round((v.used / v.usageLimit) * 100);
        D2.setTitle(`${esc(t('Voucher'))} <span class="num">${esc(v.code)}</span>`);
        const acts = [UI.btn('Edit', { variant: 'secondary', icon: 'edit', go: 'admin-voucher-new', params: { id: v.id } }),
          ['active', 'scheduled'].includes(v.status) ? UI.btn('Freeze', { variant: 'secondary', icon: 'pause', attrs: 'data-act="freeze"' }) : v.status === 'frozen' ? UI.btn('Unfreeze', { variant: 'primary', icon: 'play', attrs: 'data-act="unfreeze"' }) : '',
          UI.btn('Delete', { variant: 'danger', icon: 'trash', attrs: 'data-act="delete"' })].join('');
        return `<div class="d2-pagehead">${D2.back('Back to Vouchers', 'admin-wallet', { tab: 'vouchers' })}<span class="sp"></span>${acts}</div>
          <div class="grid" style="grid-template-columns:minmax(0,1fr) 340px">
            ${UI.card({ title: 'Details', icon: 'tag', tone: 'lime', body: `<div class="fin-po-h"><div><span class="wal-ticket-c num">${esc(v.code)}</span><div class="d2-big mt-16">${vValue(v)} <span class="d2-sub">${esc(t('off'))}</span></div><span class="d2-sub">${v.name ? D2.loc(v.name) : ''}</span></div>${D2.pill('voucher', v.status)}</div>
              <div class="mt-16">${D2.dl([['Type', esc(D2.lab(D2.VTYPE, v.type))], ['Audience', esc(D2.lab(D2.AUDIENCE, v.audience))], ['Minimum order', v.minOrder ? D2.money(v.minOrder) : ''], ['Maximum discount', v.maxDiscount ? D2.money(v.maxDiscount) : ''], ['Uses per customer', fmt.number(v.perUserLimit || 1)], ['Starts', D2.date(v.startsAt)], ['Expires', D2.date(v.expiresAt)], ['Created', D2.date(v.createdAt)]])}</div>` })}
            ${UI.card({ title: 'Usage', icon: 'activity', tone: 'mauve', body: `<div class="wal-ring">${Charts.ring(pct, { size: 120, thickness: 11, color: pct >= 100 ? 'orange' : 'lime', label: 'Usage', text: fmt.pct(pct, { dec: 0 }) })}<div><b>${fmt.number(v.used)} / ${fmt.number(v.usageLimit)}</b><span class="d2-sub">${esc(t('redemptions'))}</span><span class="d2-sub">${t('{n} remaining', { n: fmt.number(Math.max(0, v.usageLimit - v.used)) })}</span></div></div>` })}
          </div>
          ${UI.card({ title: 'Recent redemptions', icon: 'receipt', tone: 'orange', flush: true, body: data.redemptions.length ? `<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">${esc(t('Recent redemptions'))}</caption><thead><tr><th>${esc(t('Order'))}</th><th>${esc(t('Consumer'))}</th><th class="end">${esc(t('Discount'))}</th><th class="end">${esc(t('Redeemed'))}</th></tr></thead><tbody>${data.redemptions.map((r) => `<tr class="click" tabindex="0" data-go="admin-orders" data-params="${UI.attrJSON({ id: r.orderId })}"><td class="b">${fmt.id(r.orderId)}</td><td><div class="prod">${UI.avatar(App.loc(r.consumer.name), { size: 28 })}<b>${D2.loc(r.consumer.name)}</b></div></td><td class="end b">${D2.money(r.discount, 2)}</td><td class="end mut">${D2.dt(r.at)}</td></tr>`).join('')}</tbody></table></div>` : UI.empty({ icon: 'receipt', title: 'No redemptions yet', text: 'Redemptions appear here once customers use the code.' }) })}`;
      }, { skeleton: 'cards', n: 3, after: (root, res) => {
        const v = res.data.voucher;
        UI.on(root, 'click', '[data-act="delete"]', async () => { if (await delVoucher(v)) App.go('admin-wallet', { tab: 'vouchers' }); });
        UI.on(root, 'click', '[data-act="unfreeze"]', async () => { try { await api('POST', `/admin/vouchers/${v.id}/unfreeze`, {}); UI.toast(t('Voucher unfrozen'), { tone: 'success' }); draw(); } catch (e) { D2.fail(e); } });
        UI.on(root, 'click', '[data-act="freeze"]', () => UI.modal({ title: 'Freeze voucher?', icon: 'pause', tone: 'berry', size: 'sm', body: `<form novalidate><p class="muted" style="font-size:13px;margin-block-end:12px">${esc(t('Customers can’t redeem the code while it’s frozen.'))}</p>${UI.field({ type: 'textarea', name: 'reason', label: 'Reason', required: true, minlength: 5, rows: 3 })}</form>`,
          actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Freeze', variant: 'danger', run: async (m) => { const form = m.el.querySelector('form'); const r = UI.validate(form); if (!r.ok) return false; try { await api('POST', `/admin/vouchers/${v.id}/freeze`, { reason: r.values.reason }); m.close(); UI.toast(t('Voucher frozen'), { tone: 'success' }); draw(); } catch (e) { D2.fail(e, form); return false; } } }] }));
        root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('tr[data-go]')) e.target.click(); });
      } });
      draw();
    },
  });

  UI.css('d2-wal', `
    .wal-note{display:flex;gap:10px;align-items:flex-start;padding:12px 16px;border-radius:14px;border:1px solid rgba(17,168,73,.45);background:var(--tint-green);font-size:12.5px;line-height:1.6;color:var(--text)}
    .wal-note svg.i{width:18px;height:18px;flex:none;color:var(--pos);margin-top:2px}
    .wal-note b{font-weight:700}
    .tabs.wal-tabs{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);border-radius:14px;padding:4px;gap:4px;background:var(--card)}
    .tabs.wal-tabs [role="tab"]{justify-content:center;height:40px;border:0;border-radius:10px;margin:0;font-size:13.5px}
    .tabs.wal-tabs [role="tab"][aria-selected="true"]{background:linear-gradient(var(--g-act),#C65C75,#A9466A);color:#fff;box-shadow:0 6px 16px -6px rgba(198,92,117,.75)}
    .wal-use{display:grid;gap:4px;min-width:110px}
    .wal-use>span{font-weight:600}
    .wal-bal{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;padding:14px 16px;border-radius:14px;background:var(--card-2);border:1px solid var(--line)}
    .wal-bal>div:last-child{text-align:end}
    .wal-bal b{display:block;font-size:15px}
    .wal-tx{max-height:340px;overflow:auto;border:1px solid var(--line-soft);border-radius:12px}
    .wal-why{display:inline-block;max-width:170px;white-space:normal;line-height:1.35;font-size:12px}
    .wal-pick{display:grid;gap:10px}
    .wal-pick .inp{max-width:none}
    .wal-pick .ms{max-height:190px;overflow:auto;grid-template-columns:repeat(2,minmax(0,1fr))}
    .wal-form{grid-template-columns:minmax(0,1fr) 320px}
    .wal-form .form-sec{grid-template-columns:200px minmax(0,1fr)}
    .wal-code{display:flex;gap:8px;align-items:flex-start}
    .wal-code>.fld{flex:1}
    .wal-code>.btn{height:42px;margin-block-start:23px}
    .wal-ticket{display:grid;gap:4px;justify-items:start;padding:16px;border-radius:14px;border:1px dashed var(--line-2);background:var(--tint-rose);margin-block-end:16px}
    .wal-ticket b{font-size:22px;font-family:var(--font-num)}
    .wal-ticket small{color:var(--muted)}
    .wal-ticket-c{display:inline-block;padding:4px 10px;border-radius:8px;background:var(--card);border:1px solid var(--line-2);font-weight:700;letter-spacing:.06em;font-size:13px}
    .wal-ring{display:flex;align-items:center;gap:18px}
    .wal-ring b{display:block;font-size:18px}
    .wal-ring .d2-sub{display:block}
  `);
})();
