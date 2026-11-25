/* Merchant · Branch Management (owner: D4) — routes m-branches, m-branch-edit {id?}; view = drawer */
(function () {
  'use strict';
  const { L, LE, opts } = Ops;
  const STATES = [['open', 'Open'], ['closed', 'Closed'], ['temporarily_closed', 'Temporarily Closed']];
  const DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
  /* (v1.3) country, cities, phone code, currency and time zone come from the markets registry (enabled markets only) */
  const cityName = (b) => Markets.cityName(b.city, b.country);
  const mkLine = (b) => (Markets.list(true).length > 1 || b.country !== Markets.primary().code ? ` · ${UI.esc(Markets.name(b.country))} · ${UI.esc(b.currency || '')}` : '');

  function viewDrawer(b) {
    UI.drawer({
      title: L(b.name), width: 460,
      body: `${Ops.branchPhoto(b.photo)}<div style="padding-block:16px;display:grid;gap:16px">
        <div>${UI.pill(b.state)}</div>
        <dl class="ops-dl"><dt>${t('Address')}</dt><dd>${LE(b.address)}</dd><dt>${t('City')}</dt><dd>${UI.esc(cityName(b))}${mkLine(b)}</dd><dt>${t('Phone')}</dt><dd><span class="num">${UI.esc(b.phone)}</span></dd><dt>${t('Branch manager')}</dt><dd>${LE(b.manager) || '—'}</dd>
          <dt>${t('Time zone')}</dt><dd><span class="num">${UI.esc(b.timeZone || '')}</span></dd><dt>${t('Pickup today')}</dt><dd>${fmt.timeRange(b.pickupToday.start, b.pickupToday.end)}</dd></dl>
        <div><div class="ops-sec">${t('Operating hours')}</div><dl class="ops-dl">${b.hours.map((h) => `<dt>${t(DAYS.find((d) => d[0] === h.day)[1])}</dt><dd>${h.closed ? `<span class="faint">${t('Closed')}</span>` : fmt.timeRange(h.open, h.close)}</dd>`).join('')}</dl></div>
        <div class="ops-map"><span class="pin">${UI.icon('pin')}</span></div></div>`,
      actions: [{ label: t('Close'), variant: 'secondary', close: true }, { label: t('Edit Branch'), variant: 'primary', run: (d) => { d.close(); App.go('m-branch-edit', { id: b.id }); } }],
    });
  }
  async function del(b, after) {
    if (!(await UI.confirm({ html: true, title: t('Delete branch?'), text: t('{name} and its operating hours will be removed. Listings at this branch will be unpublished.', { name: LE(b.name) }), confirm: t('Delete'), danger: true }))) return;
    try { await api('DELETE', '/merchant/branches/' + b.id); UI.toast(t('Branch deleted'), { tone: 'success', html: true }); after && after(); }
    catch (er) { UI.toast(er.status === 409 ? t('You need at least one branch.') : er.message, { tone: 'error', html: true }); }
  }

  App.route('m-branches', {
    nav: 'Branches', title: 'Branch Management', subtitle: 'Manage your locations and operating hours',
    render(el, ctx) {
      el.innerHTML = `<div class="ops-head" style="align-items:center"><div class="muted" data-sum></div><div class="ops-actions">${UI.btn(t('Vendors'), { variant: 'secondary', icon: 'store', go: 'm-vendors' })}${UI.btn(t('Add Branch'), { variant: 'primary', icon: 'plus', go: 'm-branch-edit', params: {} })}</div></div><div data-grid></div>`;
      UI.async(el.querySelector('[data-grid]'), () => api('GET', '/merchant/branches', { pageSize: 50 }), (res) => {
        const list = res.data, s = Ops.summaryOf(res);
        el.querySelector('[data-sum]').innerHTML = t('{open} of {total} branches open now', { open: fmt.number(s.open), total: fmt.number(s.total) });
        if (!list.length) return UI.empty({ icon: 'store', title: t('No branches yet'), text: t('Add your first branch to start listing bags.'), action: UI.btn(t('Add Branch'), { variant: 'primary', icon: 'plus', go: 'm-branch-edit', params: {} }) });
        const cur = App.state.branch && App.state.branch.id;
        return `<div class="grid g-2">${list.map((b) => `<article class="cd" style="overflow:hidden;padding:0;${b.id === cur ? 'outline:1.5px solid var(--accent);outline-offset:-1.5px' : ''}">
          <div style="position:relative">${Ops.branchPhoto(b.photo)}<span style="position:absolute;inset-block-start:12px;inset-inline-start:12px">${UI.pill(b.state)}</span>
            <div style="position:absolute;inset-block-start:10px;inset-inline-end:10px;display:flex;gap:6px">
              ${UI.btn('', { variant: 'icon', icon: 'eye', attrs: `data-view="${b.id}" aria-label="${t('View')}"` })}${UI.btn('', { variant: 'icon', icon: 'edit', go: 'm-branch-edit', params: { id: b.id }, attrs: `` })}${UI.btn('', { variant: 'icon', icon: 'trash', attrs: `data-del="${b.id}" aria-label="${t('Delete')}"` })}</div></div>
          <div class="cd-b" style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start">
            <div style="min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 8px"><h3 class="h-serif" style="font-size:20px;margin:0">${LE(b.name)}</h3>${b.id === cur ? UI.chip(t('Current branch'), { tone: 'rose' }) : ''}</div>
              <div class="muted ops-lines" style="display:grid;gap:4px;font-size:13px"><span>${UI.icon('pin')} ${LE(b.address)}, ${UI.esc(cityName(b))}${mkLine(b)}</span><span>${UI.icon('phone')} <span class="num">${UI.esc(b.phone)}</span></span><span>${UI.icon('clock')} ${t('Pickup Today')} ${fmt.timeRange(b.pickupToday.start, b.pickupToday.end)}</span></div></div>
            <div style="min-width:170px">${UI.field({ type: 'select', name: 'state-' + b.id, label: t('Branch state'), value: b.state, options: opts(STATES) })}</div></div></article>`).join('')}</div>`;
      }, { skeleton: 'cards' });
      let cache = null;
      const get = async (id) => { cache = cache || (await api('GET', '/merchant/branches', { pageSize: 50 })).data; return cache.find((b) => b.id === id); };
      UI.on(el, 'click', '[data-view]', async (e, b) => viewDrawer(await get(b.dataset.view)));
      UI.on(el, 'click', '[data-del]', async (e, b) => del(await get(b.dataset.del), () => ctx.refresh()));
      UI.on(el, 'change', 'select[name^="state-"]', async (e, s) => {
        const id = s.name.slice(6);
        await api('PATCH', `/merchant/branches/${id}/state`, { state: s.value });
        UI.toast(t('Branch is now {state}', { state: t(STATES.find((x) => x[0] === s.value)[1]) }), { tone: 'success', html: true }); ctx.refresh();
      });
    },
  });

  App.route('m-branch-edit', {
    nav: 'Branches', title: 'Branch Management', subtitle: 'Manage your locations and operating hours',
    async render(el, ctx) {
      const id = ctx.params && ctx.params.id;
      let b = null;
      if (id) { el.innerHTML = UI.skeleton('form', 6); try { b = (await api('GET', '/merchant/branches/' + id)).data; } catch (e) { el.innerHTML = UI.errorState({ text: t('Could not load this branch.'), retry: true }); UI.on(el, 'ui:retry', '*', () => ctx.refresh()); return; } }
      const mk0 = (b && Markets.get(b.country)) || (App.market() && Markets.get(App.market()) && Markets.get(App.market()).enabled ? Markets.get(App.market()) : Markets.primary());
      const cityField = (code, val) => UI.field({ type: 'select', name: 'city', label: t('City'), required: true, value: val || '', placeholder: t('Select city'), options: Markets.cityOptions(code) });
      const ph = (() => { const raw = (b && b.phone) || ''; const m = raw.match(/^(\+\d{1,4})\s*(.*)$/); return m ? { code: m[1], number: m[2] } : { code: mk0.phoneCode, number: raw }; })();
      const hours = b ? b.hours : DAYS.map(([d]) => ({ day: d, open: '08:00', close: '22:00', closed: false }));
      el.innerHTML = `<form data-bf novalidate class="cd" style="padding:24px;display:grid;gap:20px">
        <div class="ops-head"><div><h2>${b ? t('Edit Branch') : t('Add Branch')}</h2><p>${b ? LE(b.name) : t('Add a new location customers can collect from.')}</p></div>
          <div class="ops-actions">${UI.btn(t('Cancel'), { variant: 'secondary', go: 'm-branches' })}${UI.btn(b ? t('Save changes') : t('Add Branch'), { variant: 'primary', icon: 'check', type: 'submit' })}</div></div>
        <div class="ops-split" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
          <div class="ops-form">
            <div class="ops-sec" style="font-size:14px;color:var(--text);margin:0">${t('Branch details')}</div>
            ${UI.field({ name: 'name', label: t('Branch name'), required: true, value: b ? L(b.name) : '', placeholder: t('e.g. The Pearl Branch') })}
            ${UI.field({ name: 'address', label: t('Address'), required: true, value: b ? L(b.address) : '', placeholder: t('Street, building, area') })}
            <div class="ops-grid2">${UI.field({ type: 'select', name: 'country', label: t('Country'), required: true, value: mk0.code, options: Markets.options(true), hint: t('Prices at this branch use {cur} · {tz}', { cur: mk0.currency, tz: mk0.timeZone }) })}
            <div data-cityf>${cityField(mk0.code, b && b.city)}</div></div>
            ${UI.phone({ name: 'phone', codeName: 'phoneCode', label: t('Phone'), required: true, value: ph.number, code: ph.code, market: mk0.code })}
            <div class="ops-grid2">${UI.field({ name: 'manager', label: t('Branch manager'), value: b ? L(b.manager) : '', placeholder: t('Full name') })}
            ${UI.field({ type: 'select', name: 'state', label: t('Branch state'), value: b ? b.state : 'open', options: opts(STATES) })}</div>
            <div><div class="ops-sec" style="font-size:14px;color:var(--text)">${t('Location on map')}</div><div class="ops-map" role="img" aria-label="${t('Map preview')}"><span class="pin">${UI.icon('pin')}</span></div>
              <p class="faint" style="font-size:12px;margin:6px 0 0">${t('Drag the pin to the exact entrance customers should use.')}</p></div>
          </div>
          <div><div class="ops-sec" style="font-size:14px;color:var(--text);margin:0 0 12px">${t('Operating hours')}</div>
            <div class="ops-hours" data-hours>
              ${hours.map((h) => { const dn = DAYS.find((d) => d[0] === h.day)[1]; return `<b style="font-size:13px">${t(dn)}</b>
                ${UI.field({ type: 'time', name: 'open-' + h.day, label: t('Opens'), value: h.open, disabled: h.closed })}${UI.field({ type: 'time', name: 'close-' + h.day, label: t('Closes'), value: h.close, disabled: h.closed })}
                <label style="display:flex;gap:6px;align-items:center;font-size:12.5px;white-space:nowrap"><input type="checkbox" name="closed-${h.day}" ${h.closed ? 'checked' : ''}> ${t('Closed')}</label>`; }).join('')}
            </div>${UI.btn(t('Copy Monday to all days'), { variant: 'ghost', size: 'sm', icon: 'copy', attrs: 'data-act="copy" style="margin-block-start:12px"' })}</div>
        </div></form>`;
      const form = el.querySelector('[data-bf]');
      form.querySelector('[name=country]').addEventListener('change', (e) => {
        const m = Markets.get(e.target.value); form.querySelector('[data-cityf]').innerHTML = cityField(m.code);
        const pc = form.querySelector('[name=phoneCode]'); pc.value = m.phoneCode; pc.dispatchEvent(new Event('change', { bubbles: true }));
        const hint = e.target.closest('.fld').querySelector('.hint'); if (hint) hint.textContent = t('Prices at this branch use {cur} · {tz}', { cur: m.currency, tz: m.timeZone });
      });
      UI.on(form, 'change', 'input[name^="closed-"]', (e, c) => { const d = c.name.slice(7); ['open-', 'close-'].forEach((p) => { const i = form.querySelector(`[name="${p}${d}"]`); if (i) i.disabled = c.checked; }); });
      UI.on(form, 'click', '[data-act="copy"]', () => { const o = form.querySelector('[name="open-mon"]').value, c = form.querySelector('[name="close-mon"]').value; DAYS.forEach(([d]) => { form.querySelector(`[name="open-${d}"]`).value = o; form.querySelector(`[name="close-${d}"]`).value = c; }); UI.toast(t('Monday hours copied to all days'), { tone: 'info', html: true }); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); const r = UI.validate(form); if (!r.ok) return;
        const v = r.values;
        const hrs = DAYS.map(([d]) => ({ day: d, open: form.querySelector(`[name="open-${d}"]`).value, close: form.querySelector(`[name="close-${d}"]`).value, closed: form.querySelector(`[name="closed-${d}"]`).checked }));
        const bad = hrs.find((h) => !h.closed && h.close <= h.open);
        if (bad) { UI.toast(t('Closing time must be after opening time ({day}).', { day: t(DAYS.find((d) => d[0] === bad.day)[1]) }), { tone: 'error', html: true }); return; }
        const body = { name: v.name, address: v.address, country: v.country, city: v.city, phone: `${v.phoneCode} ${v.phone}`.trim(), manager: v.manager, state: v.state, hours: hrs };
        try {
          if (b) { await api('PATCH', '/merchant/branches/' + b.id, body); await api('PUT', `/merchant/branches/${b.id}/hours`, { hours: hrs }); } else await api('POST', '/merchant/branches', body);
          UI.toast(b ? t('Branch updated') : t('Branch added'), { tone: 'success', html: true }); App.go('m-branches');
        } catch (er) { UI.toast(er.message, { tone: 'error', html: true }); }
      });
    },
  });
})();
