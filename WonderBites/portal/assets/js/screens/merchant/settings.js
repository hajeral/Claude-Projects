/* Merchant · Settings (owner: D3)
   Route: m-settings {tab:'profile'|'store'|'security'|'hours'|'language'}
   API: GET/PATCH /merchant/settings/{profile|store|security|language} ;
        GET/PUT /merchant/settings/operating-hours?branchId
   The Language tab really switches the app language (App.setLang) after saving. */
(function () {
  const { lt, ltx, esc } = D3;
  const TABS = [{ id: 'profile', label: 'Profile' }, { id: 'store', label: 'Store info' }, { id: 'security', label: 'Security' }, { id: 'hours', label: 'Operating Hours' }, { id: 'language', label: 'Language' }];
  const DAY = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const STORE_CATS = [{ value: 'bakery', label: 'Bakery' }, { value: 'restaurant', label: 'Restaurants' }, { value: 'cafe', label: 'Café' }, { value: 'grocery', label: 'Grocery' }, { value: 'desserts', label: 'Desserts' }, { value: 'other', label: 'Other' }];

  const section = (title, sub, inner) => `<div class="d3-mset"><div class="d3-mset-h"><h3>${t(title)}</h3><small class="d3-muted">${t(sub)}</small></div>${D3.card({ body: `<div >${inner}</div>` })}</div>`;
  const pw = (name, label, ph) => UI.field({ type: 'password', name, label: t(label), placeholder: t(ph), required: true, minlength: name === 'currentPassword' ? undefined : 8, icon: 'key', autocomplete: name === 'currentPassword' ? 'current-password' : 'new-password', match: name === 'confirmPassword' ? 'newPassword' : undefined });

  const PANES = {
    profile: {
      path: '/merchant/settings/profile',
      html: (p) => section('Personal Info', 'Update your photo and personal details here', `<form class="d3-form" novalidate>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Name')}</b></div><div class="d3-fc c2">${UI.field({ type: 'text', name: 'firstName', label: t('First name'), value: p.firstName, placeholder: t('Enter First name'), required: true })}${UI.field({ type: 'text', name: 'lastName', label: t('Last name'), value: p.lastName, placeholder: t('Enter last name') })}</div></div>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Email Address')}</b></div><div class="d3-fc">${UI.field({ type: 'email', name: 'email', label: t('Email Address'), value: p.email, required: true, icon: 'mail', placeholder: t('Email') })}</div></div>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Mobile Number')}</b></div><div class="d3-fc d3-phone">${UI.field({ type: 'select', name: 'phoneCountry', label: t('Code'), value: p.phoneCountry, options: D3.PHONE_CODES })}${UI.field({ type: 'tel', name: 'phone', label: t('Phone number'), value: p.phone, pattern: '[0-9 ]{7,15}' })}</div></div>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Your Photo')}</b><small>${t('This will be displayed on your profile.')}</small></div><div class="d3-photo">${UI.avatar(`${p.firstName} ${p.lastName}`, { size: 56 })}${UI.dropzone({ name: 'avatar', accept: 'image/*', multiple: false, hint: t('PNG or JPG · max 2 MB') })}</div></div>
        <div class="d3-actions">${UI.btn('Cancel', { variant: 'secondary', attrs: 'data-act="cancel"' })}${UI.btn('Save Profile', { variant: 'primary', type: 'submit' })}</div></form>`),
      submit: async (v) => { const { avatar, ...b } = v; await api('PATCH', '/merchant/settings/profile', b); return 'Profile saved'; },
    },
    store: {
      path: '/merchant/settings/store',
      html: (s) => section('Store', 'Update your Store', `<form class="d3-form" novalidate>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Store / Restaurant Name')}</b></div><div class="d3-fc c2">${UI.field({ type: 'text', name: 'name_en', label: t('English'), value: s.name.en, required: true, maxlength: 60 })}${UI.field({ type: 'text', name: 'name_ar', label: t('Arabic'), value: s.name.ar, maxlength: 60 })}</div></div>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Address & Location')}</b></div><div class="d3-fc">${UI.field({ type: 'text', name: 'address', label: t('Address & Location'), value: lt(s.address), icon: 'pin', required: true })}</div></div>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Business Category')}</b></div><div class="d3-fc">${UI.field({ type: 'select', name: 'category', label: t('Business Category'), value: s.category, options: D3.opts(STORE_CATS) })}</div></div>
        <div class="d3-frow"><div class="d3-fl"><b>${t('About / Description')}</b><small>${t('Shown on your store page in the app.')}</small></div><div class="d3-fc">${UI.field({ type: 'textarea', name: 'description', label: t('About / Description'), value: lt(s.description), rows: 4, maxlength: 400 })}</div></div>
        <div class="d3-actions">${UI.btn('Cancel', { variant: 'secondary', attrs: 'data-act="cancel"' })}${UI.btn('Save Store Info', { variant: 'primary', type: 'submit' })}</div></form>`),
      submit: async (v, s) => {
        const L = App.state.lang;
        await api('PATCH', '/merchant/settings/store', { name: { en: v.name_en.trim(), ar: (v.name_ar || v.name_en).trim() }, category: v.category, address: { ...s.address, [L]: v.address }, description: { ...s.description, [L]: v.description } });
        return 'Store info saved';
      },
    },
    security: {
      path: '/merchant/settings/security',
      html: (s) => section('Security', 'Manage your business email and password', `<form class="d3-form" novalidate>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Business Email')}</b></div><div class="d3-fc">${UI.field({ type: 'email', name: 'businessEmail', label: t('Business Email'), value: s.businessEmail, required: true, icon: 'mail' })}</div></div>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Change Password')}</b><small>${t('Last changed {date}', { date: D3.date(s.lastPasswordChangeAt) })}</small></div><div class="d3-fc">
          <div class="d3-fc" style="grid-template-columns:repeat(3,minmax(0,1fr))">${pw('currentPassword', 'Current password', 'Enter password')}${pw('newPassword', 'New password', 'Enter new password')}${pw('confirmPassword', 'Confirm new password', 'Confirm new password')}</div>
          <div class="d3-note">${UI.icon('shield')}<span>${t('For security, password changes are verified via email. You’ll receive a secure link to confirm the change.')}</span></div>
        </div></div>
        <div class="d3-actions">${UI.btn('Cancel', { variant: 'secondary', attrs: 'data-act="cancel"' })}${UI.btn('Update Password', { variant: 'primary', type: 'submit' })}</div></form>`),
      submit: async (v) => {
        if (v.newPassword !== v.confirmPassword) throw Object.assign(new Error('Passwords do not match.'), { details: { confirmPassword: 'mismatch' } });
        const { data } = await api('PATCH', '/merchant/settings/security', v);
        return t('Check {email} to confirm your new password.', { email: `<span class="num">${esc(data.sentTo)}</span>` });
      },
    },
    hours: {
      path: () => ['/merchant/settings/operating-hours', { branchId: (App.state.branch && App.state.branch.id !== 'all' && App.state.branch.id) || '' }],
      html: (h) => section('Operating Hours', 'All Stores manage timing', `<form class="d3-form" novalidate>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Select Branch')}</b></div><div class="d3-fc">${UI.field({ type: 'select', name: 'branchId', label: t('Select Branch'), value: h.branchId, options: h.branches.map((b) => ({ value: b.id, label: lt(b.name) })) })}</div></div>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Operating Hours')}</b><small>${t('Pickup windows must fall inside these hours.')}</small><small data-tz>${t('Local time of the branch: {tz}', { tz: `<span class="num">${UI.esc(((h.branches || []).find((b) => b.id === h.branchId) || {}).timeZone || App.timeZone())}</span>` })}</small></div><div class="d3-days" data-days>${days(h.hours)}</div></div>
        <div class="d3-actions">${UI.btn('Copy Monday to all days', { variant: 'ghost', icon: 'copy', attrs: 'data-act="copy"' })}<span class="d3-sp" style="flex:1"></span>${UI.btn('Cancel', { variant: 'secondary', attrs: 'data-act="cancel"' })}${UI.btn('Save Operating Hours', { variant: 'primary', type: 'submit' })}</div></form>`),
      mount: (main, h, ctx) => {
        main.addEventListener('ui:toggle', (e) => { const row = main.querySelector(`[data-day="${e.detail.name.replace('open_', '')}"]`); if (!row) return; row.classList.toggle('off', !e.detail.value); row.querySelectorAll('input[type="time"]').forEach((i) => { i.disabled = !e.detail.value; }); row.querySelector('[data-closed]').hidden = e.detail.value; });
        main.querySelector('[name="branchId"]').addEventListener('change', async (e) => {
          const { data } = await api('GET', '/merchant/settings/operating-hours', { branchId: e.target.value }); main.querySelector('[data-days]').innerHTML = days(data.hours);
        });
        UI.on(main, 'click', '[data-act="copy"]', () => {
          const o = main.querySelector('[name="o_mon"]').value, c = main.querySelector('[name="c_mon"]').value;
          main.querySelectorAll('[name^="o_"]').forEach((i) => { if (!i.disabled) i.value = o; }); main.querySelectorAll('[name^="c_"]').forEach((i) => { if (!i.disabled) i.value = c; });
          D3.toast(t('Monday’s hours copied to all open days'), { tone: 'info' });
        });
      },
      submit: async (v, h, main) => {
        const hours = Object.keys(DAY).map((d) => ({ day: d, open: v[`o_${d}`] || '08:00', close: v[`c_${d}`] || '22:00', closed: v[`open_${d}`] === false }));
        await api('PUT', '/merchant/settings/operating-hours', { branchId: v.branchId, hours });
        return 'Operating hours saved';
      },
    },
    language: {
      path: '/merchant/settings/language',
      html: (l) => section('Platform Language', 'Switch between English and Arabic', `<form class="d3-form" novalidate>
        <div class="d3-frow" style="border:0"><div class="d3-fl"><b id="lang-lbl">${t('Select Language')}</b></div>
          <div class="d3-langs" role="radiogroup" aria-labelledby="lang-lbl">
            ${[['en', 'English', 'English', 'gb'], ['ar', 'عربي', 'Arabic', 'qa']].map(([v, n, s, f]) => `<label class="d3-lang"><span class="d3-flag ${f}" aria-hidden="true"></span><span lang="${v}"><b>${n}</b><small class="d3-muted">${s}</small></span><input type="radio" name="language" value="${v}" ${(App.state.lang || l.language) === v ? 'checked' : ''}><span class="d3-radio" aria-hidden="true">${UI.icon('check')}</span></label>`).join('')}
          </div></div>
        <div class="d3-actions">${UI.btn('Cancel', { variant: 'secondary', attrs: 'data-act="cancel"' })}${UI.btn('Save Language', { variant: 'primary', type: 'submit' })}</div></form>`),
      submit: async (v) => {
        await api('PATCH', '/merchant/settings/language', { language: v.language });
        if (v.language !== App.state.lang) { App.setLang(v.language); return null; } // router re-renders in the new language
        return 'Language saved';
      },
    },
  };
  function days(hours) {
    return hours.map((h) => `<div class="d3-day ${h.closed ? 'off' : ''}" data-day="${h.day}">
        <b>${t(DAY[h.day])}</b>${UI.toggle({ name: `open_${h.day}`, checked: !h.closed, label: t('Open on {day}', { day: t(DAY[h.day]) }) })}
        ${UI.field({ type: 'time', name: `o_${h.day}`, label: t('Opens'), value: h.open, disabled: h.closed })}<span class="d3-dash" aria-hidden="true">–</span>
        ${UI.field({ type: 'time', name: `c_${h.day}`, label: t('Closes'), value: h.close, disabled: h.closed })}
        <span class="d3-muted" data-closed ${h.closed ? '' : 'hidden'}>${t('Closed')}</span></div>`).join('');
  }

  App.route('m-settings', {
    nav: 'Settings', title: 'Settings', subtitle: 'Manage your account, store, and branches',
    render(el, ctx) {
      let tab = (ctx.params && ctx.params.tab) || 'profile';
      if (!PANES[tab]) tab = 'profile';
      el.innerHTML = `<div>${UI.tabs({ name: 'mset', label: 'Settings sections', active: tab, tabs: TABS.map((x) => ({ id: x.id, label: t(x.label) })) })}</div><div data-pane></div>`;
      const host = el.querySelector('[data-pane]');
      function load() {
        const P = PANES[tab];
        host.innerHTML = UI.skeleton('form', 4);
        const [path, q] = typeof P.path === 'function' ? P.path() : [P.path];
        api('GET', path, q).then(({ data }) => {
          host.innerHTML = P.html(data);
          D3.arDir(host);
          P.mount && P.mount(host, data, ctx);
          const form = host.querySelector('form');
          UI.on(host, 'click', '[data-act="cancel"]', () => { load(); D3.toast(t('Changes discarded'), { tone: 'info' }); });
          form.addEventListener('submit', async (e) => {
            e.preventDefault(); D3.clearErr(form); const r = UI.validate(form); if (!r.ok) return;
            await D3.busy(form.querySelector('[type="submit"]'), async () => {
              try { const msg = await P.submit(r.values, data, host); if (msg) D3.toast(msg.includes('<') ? msg : t(msg), { tone: 'success' }); if (tab === 'security') form.querySelectorAll('[type="password"],[name$="assword"]').forEach((i) => { i.value = ''; }); }
              catch (err) { D3.fail(err, form); }
            });
          });
        }).catch(() => { host.innerHTML = D3.card({ body: `<div >${UI.errorState({ text: t('We couldn’t load these settings.'), retry: true })}</div>` }); host.addEventListener('ui:retry', load, { once: true }); });
      }
      load();
      /* tabs are part of the route params so reloads, deep links and the language switch keep the current tab */
      el.addEventListener('ui:tab', (e) => { if (e.detail.name !== 'mset') return; App.go('m-settings', { tab: e.detail.value }); });
    },
  });

  UI.css('d3-msettings', `
    .d3-mset{display:grid;gap:12px}.d3-mset-h h3{font-size:16px;font-weight:600}.d3-mset-h small{font-size:12.5px}
    .d3-note{display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:var(--r-ctl,11px);background:var(--tint-mauve);font-size:12.5px;color:var(--text)}
    .d3-note svg{flex:none;color:var(--accent)}
    .d3-days{display:grid;gap:8px}
    .d3-day{display:grid;grid-template-columns:110px auto minmax(0,1fr) 14px minmax(0,1fr) 60px;gap:12px;align-items:center}
    .d3-day .fld>label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
    .d3-day .tog-row .st{display:none}
    .d3-day.off b{color:var(--faint)}
    .d3-dash{color:var(--faint);text-align:center}
    .d3-langs{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .d3-lang{display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--line);border-radius:var(--r-card,16px);cursor:pointer;position:relative}
    .d3-lang:has(input:checked){border-color:var(--accent);background:var(--tint-rose)}
    .d3-lang:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
    .d3-lang input{position:absolute;opacity:0;pointer-events:none}
    .d3-lang b{display:block;font-size:16px}.d3-lang small{font-size:12px}
    .d3-radio{margin-inline-start:auto;width:24px;height:24px;border-radius:50%;border:2px solid var(--line-2);display:grid;place-items:center;color:transparent}
    .d3-radio svg{width:14px;height:14px}
    .d3-lang:has(input:checked) .d3-radio{background:#2D6F3F;border-color:#2D6F3F;color:#fff}
    .d3-flag{width:36px;height:36px;border-radius:50%;flex:none;box-shadow:0 0 0 1px var(--line)}
    .d3-flag.gb{background:linear-gradient(90deg,transparent 42%,#C8102E 42% 58%,transparent 58%),linear-gradient(0deg,transparent 40%,#C8102E 40% 60%,transparent 60%),linear-gradient(90deg,transparent 36%,#fff 36% 64%,transparent 64%),linear-gradient(0deg,transparent 34%,#fff 34% 66%,transparent 66%),#012169}
    .d3-flag.qa{background:linear-gradient(90deg,#fff 0 34%,#8A1538 34%)}
  `);
})();
