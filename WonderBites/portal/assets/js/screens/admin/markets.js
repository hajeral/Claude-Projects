/* Admin · Settings → Markets (owner: CORE/QA, v1.3)
   Route: admin-settings-markets
   API: GET /admin/settings/markets · PATCH /admin/settings/markets/{code} · POST /admin/settings/markets/{code}/cities
        PATCH /admin/settings/markets/{code}/cities/{cityId} · GET|PUT /admin/settings/fx
   Enabling a market makes it available immediately in the admin market switcher, country/city filters,
   merchant sign-up and merchant branch creation (Markets.load() refreshes the registry everywhere). */
(function () {
  'use strict';
  const esc = UI.esc, ic = UI.icon;
  const loc = (x) => App.loc(x);
  const pct = (v) => fmt.pct(v, { dec: v % 1 ? 1 : 0 });

  async function refreshRegistry() { await Markets.load(); } // re-renders the current route (App.marketsChanged)
  const fail = (e) => UI.toast(e && e.message ? t(e.message) : t('Something went wrong. Please try again.'), { tone: 'error' });

  function editMarket(m) {
    UI.modal({
      title: t('Edit {m}', { m: loc(m.name) }), icon: 'globe', size: 'sm',
      body: `<form class="form-grid" novalidate>
        ${UI.field({ type: 'select', name: 'timeZone', label: 'Time zone', value: m.timeZone, required: true, full: true, options: [...new Set([m.timeZone, ...Markets.timeZoneOptions().map((x) => x.value)])].map((z) => ({ value: z, label: (Markets.timeZoneOptions().find((x) => x.value === z) || { label: z }).label })) })}
        ${UI.field({ name: 'phoneCode', label: 'Phone code', value: m.phoneCode, required: true, pattern: '\\+\\d{1,4}' })}
        ${UI.field({ type: 'number', name: 'vatRate', label: 'VAT rate', value: m.vatRate, min: 0, max: 30, suffix: '%', required: true })}
        <h4 class="full" style="margin:6px 0 0;font-size:13px">${esc(t('Support contacts'))}</h4>
        ${UI.field({ type: 'email', name: 'supportEmail', label: 'Support email', value: m.supportEmail || '', required: true })}
        ${UI.field({ name: 'supportPhone', label: 'Support phone', value: m.supportPhone ? m.supportPhone.replace(/^(\+\d{3})(\d{4})(\d+)$/, '$1 $2 $3') : '', required: true })}
        ${UI.field({ name: 'supportWhatsApp', label: 'WhatsApp', value: m.supportWhatsApp ? m.supportWhatsApp.replace(/^(\+\d{3})(\d{4})(\d+)$/, '$1 $2 $3') : '' })}
        ${UI.field({ name: 'supportHours', label: 'Support hours', value: m.supportHours ? m.supportHours.en : '' })}
        <p class="faint full" style="font-size:12px">${esc(t('Currency {c} is fixed for the market. Use the FX rates below to report in another currency.', { c: m.currency }))}</p></form>`,
      actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Save changes', variant: 'primary', run: async (dlg) => {
        const r = UI.validate(dlg.el.querySelector('form')); if (!r.ok) return false;
        try { await api('PATCH', '/admin/settings/markets/' + m.code, { timeZone: r.values.timeZone, phoneCode: r.values.phoneCode, vatRate: +r.values.vatRate, supportEmail: r.values.supportEmail, supportPhone: r.values.supportPhone, supportWhatsApp: String(r.values.supportWhatsApp || '').replace(/\s/g, ''), supportHours: r.values.supportHours ? { en: r.values.supportHours, ar: (m.supportHours && m.supportHours.en === r.values.supportHours) ? m.supportHours.ar : r.values.supportHours } : undefined }); dlg.close(); UI.toast(t('{m} updated', { m: loc(m.name) }), { tone: 'success' }); refreshRegistry(); }
        catch (e) { fail(e); return false; }
      } }],
    });
  }

  function cityForm(m, c, after) {
    UI.modal({
      title: c ? t('Edit city') : t('Add city'), icon: 'pin', size: 'sm',
      body: `<form class="form-grid" novalidate>${UI.field({ name: 'en', label: 'City name (English)', value: c ? c.name.en : '', required: true, maxlength: 40, full: true })}${UI.field({ name: 'ar', label: 'City name (Arabic)', value: c ? c.name.ar : '', maxlength: 40, full: true })}
        <p class="faint full" style="font-size:12px">${esc(t('Market: {m}', { m: loc(m.name) }))}</p></form>`,
      actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: c ? 'Save changes' : 'Add city', variant: 'primary', run: async (dlg) => {
        const r = UI.validate(dlg.el.querySelector('form')); if (!r.ok) return false;
        try {
          if (c) await api('PATCH', `/admin/settings/markets/${m.code}/cities/${c.id}`, { name: { en: r.values.en, ar: r.values.ar } });
          else await api('POST', `/admin/settings/markets/${m.code}/cities`, { name: { en: r.values.en, ar: r.values.ar } });
          dlg.close(); UI.toast(c ? t('City updated') : t('City added'), { tone: 'success' }); await Markets.load(); after && after();
        } catch (e) { fail(e); return false; }
      } }],
    });
  }

  function cities(code) {
    const paint = (d) => { const m = Markets.get(code); d.body.innerHTML = `<div class="mk-cities">${(m.cities || []).map((c) => `<div class="mk-city"><span class="cd-ic t-mauve">${ic('pin')}</span><span style="flex:1;min-width:0"><b>${esc(c.name.en)}</b><small lang="ar">${esc(c.name.ar)}</small></span>
        ${UI.toggle({ name: 'city:' + c.id, checked: c.enabled !== false, label: t('Active') })}${UI.btn('', { variant: 'icon', icon: 'edit', attrs: `data-cedit="${esc(c.id)}" aria-label="${esc(t('Edit city'))}"` })}</div>`).join('')}</div>`; };
    const d = UI.drawer({ title: t('Cities — {m}', { m: Markets.name(code) }), icon: 'pin', width: 460, body: '',
      actions: [{ label: 'Close', variant: 'secondary', close: true }, { label: 'Add city', variant: 'primary', icon: 'plus', run: () => { cityForm(Markets.get(code), null, () => paint(d)); return false; } }] });
    paint(d);
    d.el.addEventListener('click', (e) => { const b = e.target.closest('[data-cedit]'); if (b) cityForm(Markets.get(code), Markets.get(code).cities.find((c) => c.id === b.dataset.cedit), () => paint(d)); });
    d.el.addEventListener('ui:toggle', async (e) => {
      const id = String(e.detail.name).slice(5);
      try { await api('PATCH', `/admin/settings/markets/${code}/cities/${id}`, { enabled: !!e.detail.value }); UI.toast(t(e.detail.value ? 'City activated' : 'City hidden'), { tone: 'success' }); await Markets.load(); paint(d); } catch (er) { fail(er); }
    });
  }

  App.route('admin-settings-markets', {
    nav: 'Settings', title: 'Settings', subtitle: 'System configuration and preferences.',
    render(el) {
      el.innerHTML = D3.adminSettingsLayout('admin-settings-markets', `<div data-mk>${UI.skeleton('table', 3)}</div><div data-fx>${UI.skeleton('form', 3)}</div>`);
      const box = el.querySelector('[data-mk]'), fxBox = el.querySelector('[data-fx]');
      UI.async(box, () => api('GET', '/admin/settings/markets'), ({ data }) => UI.card({ title: 'Markets', icon: 'globe', tone: 'mauve', count: fmt.number(data.filter((m) => m.enabled).length) + '/' + fmt.number(data.length),
        sub: 'Countries WonderBites operates in. Enabling a market makes it available everywhere at once.', flush: true,
        body: `<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">${esc(t('Markets'))}</caption><thead><tr><th>${esc(t('Market'))}</th><th>${esc(t('Status'))}</th><th>${esc(t('Currency'))}</th><th>${esc(t('Phone code'))}</th><th>${esc(t('Time zone'))}</th><th class="end">${esc(t('VAT'))}</th><th>${esc(t('Cities'))}</th><th class="end">${esc(t('Actions'))}</th></tr></thead><tbody>
          ${data.map((m) => `<tr data-code="${esc(m.code)}"><td><div class="prod"><span class="mk-flag mk-${esc(m.flag || m.code.toLowerCase())}" aria-hidden="true">${esc(m.code)}</span><div><b>${esc(loc(m.name))}</b><small>${m.enabled ? esc(t('Live since {d}', { d: m.launchedAt ? fmt.text.date(m.launchedAt) : '—' })) : esc(t('Coming soon'))}</small></div></div></td>
            <td>${UI.toggle({ name: 'mk:' + m.code, checked: m.enabled, label: t(m.enabled ? 'Enabled' : 'Disabled') })}</td>
            <td><b class="num">${esc(m.currency)}</b> <span class="faint">${esc(m.currencyLabel.ar)}</span></td><td>${fmt.id(m.phoneCode)}</td><td><span class="num">${esc(m.timeZone)}</span> <small class="faint num">UTC${esc(m.utcOffset || '')}</small></td>
            <td class="end">${pct(m.vatRate)}</td><td>${UI.btn(t('{n} cities', { n: fmt.text.number((m.cities || []).filter((c) => c.enabled !== false).length) }), { variant: 'secondary', size: 'sm', icon: 'pin', attrs: `data-cities="${esc(m.code)}"` })}</td>
            <td class="end">${UI.btn('', { variant: 'icon', icon: 'edit', attrs: `data-edit="${esc(m.code)}" aria-label="${esc(t('Edit {m}', { m: loc(m.name) }))}"` })}</td></tr>`).join('')}</tbody></table></div>` }), { skeleton: 'table' });

      UI.async(fxBox, () => api('GET', '/admin/settings/fx'), ({ data: fx }) => {
        const curs = Markets.list().map((m) => m.currency);
        return UI.card({ title: 'Reporting currency & FX rates', icon: 'refresh', tone: 'lime', sub: 'Used when “All markets” combines amounts in different currencies.',
          body: `<form class="form-grid" data-fxf novalidate>
            ${UI.field({ type: 'select', name: 'reportingCurrency', label: 'Reporting currency', value: fx.reportingCurrency, required: true, options: Markets.currencyOptions(false) })}
            <div class="fld"><span class="lbl">${esc(t('Last updated'))}</span><div class="inp" style="pointer-events:none">${ic('clock')}<span>${fx.updatedAt ? fmt.date(fx.updatedAt) + ' · ' + fmt.clock(fx.updatedAt) : '—'}${fx.updatedBy ? ' · ' + esc(fx.updatedBy) : ''}</span></div></div>
            <div class="full tbl-wrap"><table class="tbl compact"><caption class="sr-only">${esc(t('FX rates'))}</caption><thead><tr><th>${esc(t('Currency'))}</th><th>${esc(t('Rate'))}</th><th>${esc(t('Example'))}</th></tr></thead><tbody>
            ${curs.map((c) => { const r = (fx.rates.find((x) => x.currency === c) || { rate: 1 }).rate; return `<tr><td><b class="num">${esc(c)}</b> <span class="faint">${esc(Markets.currencyLabel(c))}</span></td>
              <td style="width:240px">${UI.field({ type: 'number', name: 'rate_' + c, label: t('1 {c} in {r}', { c, r: fx.reportingCurrency }), value: r, min: 0.0001, required: true, disabled: c === fx.reportingCurrency })}</td>
              <td class="muted">${fmt.money(100, c)} = ${fmt.money(+(100 * r).toFixed(2), fx.reportingCurrency, 2)}</td></tr>`; }).join('')}</tbody></table></div>
            <div class="full row" style="justify-content:flex-end">${UI.btn('Save rates', { variant: 'primary', icon: 'check', type: 'submit' })}</div></form>` });
      }, { skeleton: 'form' });

      el.addEventListener('ui:toggle', async (e) => {
        const n = String(e.detail.name || ''); if (!n.startsWith('mk:')) return;
        const code = n.slice(3), m = Markets.get(code), on = !!e.detail.value;
        const ok = await UI.confirm(on
          ? { title: t('Enable {m}?', { m: loc(m.name) }), text: t('{m} becomes available right away in the market switcher, country filters, merchant sign-up and branch creation. Prices there use {c}.', { m: loc(m.name), c: m.currency }), confirm: t('Enable market') }
          : { title: t('Disable {m}?', { m: loc(m.name) }), text: t('New sign-ups and branches in {m} stop immediately. Existing data is kept and hidden from “All markets”.', { m: loc(m.name) }), confirm: t('Disable market'), danger: true });
        if (!ok) return refreshRegistry(); // re-render resets the toggle
        try { await api('PATCH', '/admin/settings/markets/' + code, { enabled: on }); UI.toast(t(on ? '{m} enabled' : '{m} disabled', { m: loc(m.name) }), { tone: 'success' }); }
        catch (er) { fail(er); }
        refreshRegistry();
      });
      UI.on(el, 'click', '[data-edit]', (e, b) => editMarket(Markets.get(b.dataset.edit)));
      UI.on(el, 'click', '[data-cities]', (e, b) => cities(b.dataset.cities));
      el.addEventListener('submit', async (e) => {
        const f = e.target.closest('[data-fxf]'); if (!f) return; e.preventDefault();
        const r = UI.validate(f); if (!r.ok) return;
        const rc = r.values.reportingCurrency; const rates = Markets.list().map((m) => m.currency).map((c) => ({ currency: c, rate: c === rc ? 1 : +(f.querySelector(`[name="rate_${c}"]`) || {}).value || Markets.convert(1, c, rc) }));
        try { await api('PUT', '/admin/settings/fx', { reportingCurrency: rc, rates }); UI.toast(t('FX rates saved'), { tone: 'success' }); refreshRegistry(); } catch (er) { fail(er); }
      });
    },
  });

  UI.css('mk-settings', `
    .mk-flag{width:34px;height:24px;border-radius:6px;display:grid;place-items:center;font-size:10.5px;font-weight:800;color:#fff;flex:none;letter-spacing:.04em;direction:ltr}
    .mk-qa{background:#8A1538} .mk-ae{background:#00732F} .mk-sa{background:#006C35}
    .mk-cities{display:grid;gap:8px}
    .mk-city{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:12px}
    .mk-city small{display:block;color:var(--muted);font-size:12px}
  `);
})();
