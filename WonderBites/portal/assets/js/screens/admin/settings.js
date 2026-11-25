/* Admin · Settings (owner: D3)
   Routes: admin-settings (General), admin-settings-profile, admin-settings-notifications, admin-settings-security,
           admin-settings-policies, admin-policy-refund, admin-policy-about, admin-policy-privacy, admin-policy-terms
   API: GET/PATCH /admin/settings/{profile|general|notifications|security} ; GET /admin/settings/policies ;
        GET/PUT /admin/settings/policies/{key} ; POST /admin/audit-log/export */
(function () {
  const { lt, ltx, esc } = D3;
  const SUB = 'System configuration and preferences.';
  /* (v1.3) time zones and currencies come from the markets registry (Admin → Settings → Markets) */
  const TIMEZONES = () => Markets.timeZoneOptions();
  const CURRENCIES = () => Markets.currencyOptions(true);
  const TIMEOUTS = [15, 30, 60, 120].map((m) => ({ value: String(m), label: m < 60 ? `${m} minutes` : m === 60 ? '1 hour' : '2 hours' }));
  const AUDIT_RANGES = [{ value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: '90d', label: 'Last 90 days' }, { value: '12m', label: 'Last 12 months' }];

  /* generic loader for a settings tab */
  function tab(route, opts) {
    App.route(route, {
      nav: 'Settings', title: 'Settings', subtitle: SUB,
      render(el, ctx) {
        el.innerHTML = D3.adminSettingsLayout(opts.active || route, `<div data-main>${UI.skeleton('form', 4)}</div>`);
        const main = el.querySelector('[data-main]');
        const load = () => (opts.path ? api('GET', opts.path) : Promise.resolve({ data: null })).then(({ data }) => { main.innerHTML = opts.html(data, ctx); opts.mount && opts.mount(main, data, ctx); })
          .catch(() => { main.innerHTML = D3.card({ body: `<div >${UI.errorState({ text: t('We couldn’t load these settings.'), retry: true })}</div>` }); main.addEventListener('ui:retry', load, { once: true }); });
        load();
      },
    });
  }
  /* auto-save a patch with toast + rollback of the control on error */
  async function autosave(path, patch, control) {
    try { await api('PATCH', path, patch); D3.toast(t('Saved'), { tone: 'success' }); }
    catch (err) { D3.fail(err); if (control && control.classList && control.classList.contains('tog')) D3.setToggle(control, control.getAttribute('aria-checked') !== 'true'); else if (control && 'checked' in control) control.checked = !control.checked; }
  }

  /* ---------------- Profile ---------------- */
  tab('admin-settings-profile', {
    path: '/admin/settings/profile',
    html: (p) => D3.card({ title: t('Personal Info'), sub: t('Update your photo and personal details here'), icon: 'user', body: `<form class="d3-form" novalidate>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Name')}</b></div><div class="d3-fc c2">${UI.field({ type: 'text', name: 'firstName', label: t('First name'), value: p.firstName, required: true, maxlength: 40 })}${UI.field({ type: 'text', name: 'lastName', label: t('Last name'), value: p.lastName, maxlength: 40 })}</div></div>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Email Address')}</b></div><div class="d3-fc">${UI.field({ type: 'email', name: 'email', label: t('Email Address'), value: p.email, required: true, icon: 'mail' })}</div></div>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Mobile Number')}</b></div><div class="d3-fc d3-phone">${UI.field({ type: 'select', name: 'phoneCountry', label: t('Code'), value: p.phoneCountry, options: D3.PHONE_CODES })}${UI.field({ type: 'tel', name: 'phone', label: t('Phone number'), value: p.phone, pattern: '[0-9 ]{7,15}', placeholder: '5550 4567' })}</div></div>
        <div class="d3-frow"><div class="d3-fl"><b>${t('Your Photo')}</b><small>${t('This will be displayed on your profile.')}</small></div><div class="d3-fc"><div class="d3-photo">${UI.avatar(`${p.firstName} ${p.lastName}`, { size: 56 })}${UI.dropzone({ name: 'avatar', accept: 'image/*', multiple: false, hint: t('PNG or JPG · max 2 MB') })}</div></div></div>
        <div class="d3-actions">${UI.btn('Cancel', { variant: 'secondary', attrs: 'data-act="cancel"' })}${UI.btn('Save Profile', { variant: 'primary', type: 'submit' })}</div>
      </form>` }),
    mount: (main, p, ctx) => {
      const form = main.querySelector('form');
      UI.on(main, 'click', '[data-act="cancel"]', () => { ctx.refresh(); D3.toast(t('Changes discarded'), { tone: 'info' }); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); D3.clearErr(form); const r = UI.validate(form); if (!r.ok) return;
        const { avatar, ...body } = r.values;
        await D3.busy(form.querySelector('[type="submit"]'), async () => {
          try { await api('PATCH', '/admin/settings/profile', body); D3.toast(t('Profile saved'), { tone: 'success' }); } catch (err) { D3.fail(err, form); }
        });
      });
    },
  });

  /* ---------------- General ---------------- */
  tab('admin-settings', {
    path: '/admin/settings/general',
    html: (g) => `
      ${D3.card({ title: `<span class="h-serif">${t('Platform Basics')}</span>`, body: `<div  data-basics>
        ${D3.row('Platform Name', 'Shown in emails, receipts, and the public-facing app.', UI.field({ type: 'text', name: 'platformName', label: t('Platform Name'), value: g.platformName, required: true, maxlength: 40 }))}
        ${D3.row('Default Time Zone', 'Used for scheduling drops and generating reports.', UI.field({ type: 'select', name: 'timezone', label: t('Default Time Zone'), value: g.timezone, options: TIMEZONES() }))}
        ${D3.row('Default Currency', 'Applied to new merchant accounts.', UI.field({ type: 'select', name: 'defaultCurrency', label: t('Default Currency'), value: g.defaultCurrency, options: CURRENCIES() }))}
      </div>` })}
      ${D3.card({ title: `<span class="h-serif">${t('Operational Defaults')}</span>`, body: `<div >
        ${D3.row('Auto-cancel unclaimed drops', 'Automatically cancel a drop if no reservations by pickup window.', UI.toggle({ name: 'autoCancelUnclaimed', checked: g.autoCancelUnclaimed, label: t('Auto-cancel unclaimed drops') }))}
        ${D3.row('Require pickup passport verification', 'Consumers must scan a passport code before pickup is marked complete.', UI.toggle({ name: 'requirePickupPassport', checked: g.requirePickupPassport, label: t('Require pickup passport verification') }))}
        ${D3.row('Allow merchant self-onboarding', 'New merchants can sign up themselves; WonderBites approves them before their first sign-in.', UI.toggle({ name: 'allowMerchantSelfOnboarding', checked: g.allowMerchantSelfOnboarding, label: t('Allow merchant self-onboarding') }))}
      </div>` })}
      ${D3.card({ title: `<span class="h-serif">${t('Commercial')}</span>`, attrs: 'data-commercial-card', body: `<div data-commercial>${UI.skeleton('form', 2)}</div>` })}`,
    mount: (main) => {
      /* (v1.4) platform commission: one effective-dated default (19 %), merchant contracts can override it (Merchants → detail) */
      const box = main.querySelector('[data-commercial]');
      const drawCommercial = () => api('GET', '/admin/settings/commercial').then(({ data: c }) => {
        box.innerHTML = `<form class="d3-form" data-commercial-form novalidate>
          ${D3.row('Default commission rate', 'Applied to the gross value of every completed order unless a merchant contract sets its own rate. All payouts and revenue figures use it.', `<div class="d3-fc c2">${UI.field({ type: 'number', name: 'defaultCommissionRate', label: t('Rate (%)'), value: c.defaultCommissionRate, min: 0, max: 50, step: '0.5', required: true })}${UI.field({ type: 'date', name: 'effectiveFrom', label: t('Effective from'), value: '', required: true })}</div>`)}
          <div class="d3-actions">${UI.btn('Schedule new rate', { variant: 'primary', type: 'submit', icon: 'check' })}</div>
        </form>
        <div class="tbl-wrap" style="margin-block-start:14px"><table class="tbl" data-commercial-history><thead><tr><th>${t('Rate')}</th><th>${t('Effective from')}</th><th>${t('Until')}</th><th>${t('Note')}</th></tr></thead><tbody>
          ${c.history.slice().reverse().map((h) => `<tr><td class="num"><b>${fmt.number(h.rate)}%</b></td><td>${fmt.date(h.from)}</td><td>${h.to ? fmt.date(h.to) : `<span class="pl g"><span class="dot"></span>${t('Current')}</span>`}</td><td class="muted">${UI.esc(t(h.note || ''))}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="faint" style="margin:10px 0 0;font-size:12px">${t('Merchant contracts with their own rate: {n}', { n: fmt.number(Object.keys(c.contracts || {}).length) })}</p>`;
        const f = box.querySelector('form'); const d = f.querySelector('[name=effectiveFrom]'); if (d) d.value = api.demoDate ? api.demoDate(1) : '';
        f.addEventListener('submit', async (e) => {
          e.preventDefault(); D3.clearErr(f); const r = UI.validate(f); if (!r.ok) return;
          await D3.busy(f.querySelector('[type="submit"]'), async () => {
            try { await api('PUT', '/admin/settings/commercial', { defaultCommissionRate: Number(r.values.defaultCommissionRate), effectiveFrom: r.values.effectiveFrom }); D3.toast(t('Commission rate saved'), { tone: 'success' }); drawCommercial(); }
            catch (err) { D3.fail(err, f); }
          });
        });
      }).catch(() => { box.innerHTML = UI.errorState({ text: t('We couldn’t load these settings.'), retry: false }); });
      drawCommercial();
      main.addEventListener('ui:toggle', (e) => autosave('/admin/settings/general', { [e.detail.name]: e.detail.value }, e.target));
      main.querySelector('[data-basics]').addEventListener('change', (e) => {
        const f = e.target; if (!f.name) return;
        if (f.name === 'platformName' && !f.value.trim()) { D3.toast(t('Platform name is required.'), { tone: 'error' }); f.focus(); return; }
        autosave('/admin/settings/general', { [f.name]: f.value.trim() });
      });
    },
  });

  /* ---------------- Notifications ---------------- */
  tab('admin-settings-notifications', {
    path: '/admin/settings/notifications',
    html: (n) => D3.card({ title: `<span class="h-serif">${t('Admin Alerts')}</span>`, body: `<div >
        ${n.alerts.map((a) => `<div class="d3-row"><div class="d3-row-l"><b>${ltx(a.label)}</b><small>${ltx(a.description)}</small>
          <div class="d3-chans" ${a.enabled ? '' : 'hidden'} data-chans="${a.key}">${['email', 'push', 'sms'].map((c) => `<label><input type="checkbox" data-chan="${a.key}:${c}" ${a[c] ? 'checked' : ''}> ${t({ email: 'Email', push: 'Push', sms: 'SMS' }[c])}</label>`).join('')}</div></div>
          <div class="d3-row-c">${UI.toggle({ name: a.key, checked: a.enabled, label: lt(a.label) })}</div></div>`).join('')}
      </div>` }),
    mount: (main) => {
      main.addEventListener('ui:toggle', (e) => { const c = main.querySelector(`[data-chans="${e.detail.name}"]`); if (c) c.hidden = !e.detail.value; autosave('/admin/settings/notifications', { alerts: [{ key: e.detail.name, enabled: e.detail.value }] }, e.target); });
      main.addEventListener('change', (e) => { const d = e.target.dataset.chan; if (!d) return; const [key, ch] = d.split(':'); autosave('/admin/settings/notifications', { alerts: [{ key, [ch]: e.target.checked }] }, e.target); });
    },
  });

  /* ---------------- Security ---------------- */
  tab('admin-settings-security', {
    path: '/admin/settings/security',
    html: (s) => `
      ${D3.card({ title: `<span class="h-serif">${t('Authentication')}</span>`, body: `<div >
        ${D3.row('Require two-factor authentication', 'Enforced for all admin accounts with Operations Admin role or higher.', UI.toggle({ name: 'require2fa', checked: s.require2fa, label: t('Require two-factor authentication') }))}
        ${D3.row('Single sign-on (SSO)', 'Allow login via company Google Workspace.', UI.toggle({ name: 'sso', checked: s.sso, label: t('Single sign-on (SSO)') }))}
        ${D3.row('Session timeout', 'Automatically sign out inactive admin sessions.', UI.field({ type: 'select', name: 'sessionTimeoutMinutes', label: t('Session timeout'), value: String(s.sessionTimeoutMinutes), options: D3.opts(TIMEOUTS) }))}
      </div>` })}
      ${D3.card({ title: `<span class="h-serif">${t('Audit & Compliance')}</span>`, body: `<div >
        ${D3.row('Admin action audit log', 'Record every change made by an admin user for 12 months.', UI.toggle({ name: 'auditLog', checked: s.auditLog, label: t('Admin action audit log') }))}
        ${D3.row('Export audit log', 'Download the full admin activity history as a CSV.', `<div class="d3-exp">${UI.field({ type: 'select', name: 'auditExportRange', label: t('Period'), value: s.auditExportRange, options: D3.opts(AUDIT_RANGES) })}${UI.btn('Export', { variant: 'secondary', icon: 'download', attrs: 'data-act="export"' })}</div>`)}
      </div>` })}`,
    mount: (main) => {
      main.addEventListener('ui:toggle', async (e) => {
        if (e.detail.name === 'require2fa' && !e.detail.value && !(await D3.confirm({ title: t('Turn off two-factor authentication?'), text: t('Admin accounts will be able to sign in with a password only. This lowers account security.'), confirm: t('Turn off'), danger: true }))) {
          D3.setToggle(e.target, true); return;
        }
        if (e.detail.name === 'auditLog' && !e.detail.value && !(await D3.confirm({ title: t('Stop recording admin actions?'), text: t('Changes made while the audit log is off can’t be recovered later.'), confirm: t('Stop recording'), danger: true }))) {
          D3.setToggle(e.target, true); return;
        }
        autosave('/admin/settings/security', { [e.detail.name]: e.detail.value }, e.target);
      });
      main.addEventListener('change', (e) => {
        if (e.target.name === 'sessionTimeoutMinutes') autosave('/admin/settings/security', { sessionTimeoutMinutes: +e.target.value });
        if (e.target.name === 'auditExportRange') autosave('/admin/settings/security', { auditExportRange: e.target.value });
      });
      UI.on(main, 'click', '[data-act="export"]', async (e, b) => {
        const range = main.querySelector('[name="auditExportRange"]').value;
        await D3.busy(b, async () => {
          try { const { data } = await api('POST', '/admin/audit-log/export', { format: 'csv', range }); D3.toast(t('Export started — {file} will appear in your notifications when ready.', { file: `<span class="num">${esc(data.fileName)}</span>` }), { tone: 'success' }); if (window.App && App.emit) App.emit('export', data); }
          catch (err) { D3.fail(err); }
        });
      });
    },
  });

  /* ---------------- Policies list ---------------- */
  const POLICY_ROUTE = { refund: 'admin-policy-refund', about: 'admin-policy-about', privacy: 'admin-policy-privacy', terms: 'admin-policy-terms' };
  tab('admin-settings-policies', {
    path: '/admin/settings/policies',
    html: (list) => D3.card({ title: t('Policies'), sub: t('Content shown to users and merchants across the platform.'), icon: 'file', body: `<div class="d3-plist">
        ${list.map((p) => `<a class="d3-pitem" href="#${POLICY_ROUTE[p.key]}" data-go="${POLICY_ROUTE[p.key]}"><span><b>${ltx(p.title)}</b><small class="d3-muted">${t('Updated {date}', { date: D3.date(p.updatedAt) })}${p.hasContent ? '' : ' · ' + t('Not drafted yet')}</small></span>${UI.icon('chev-r', 'flip')}</a>`).join('')}
      </div>` }),
  });

  /* ---------------- Policy editors ---------------- */
  const OUTCOME_LABEL = { full_refund: 'Full refund', partial_refund: 'Partial refund', wallet_credit: 'Wallet credit', manual_review: 'Manual review', no_refund: 'No refund' };
  const back = `<button type="button" class="d3-back" data-go="admin-settings-policies">${UI.icon('arrow-r', 'd3-backic')} ${t('Back to Policies')}</button>`;
  const editorPanes = (p, ph) => `<div class="d3-langtabs"><span class="d3-faint" style="font-size:12px">${t('Content language')}</span>${D3.langSwitch('plang', 'en')}</div>
      <div class="d3-pane" data-pane="plang:en">${UI.richText({ name: 'content_en', value: p.content.en, placeholder: t(ph) })}</div>
      <div class="d3-pane" data-pane="plang:ar" dir="rtl" lang="ar" hidden>${UI.richText({ name: 'content_ar', value: p.content.ar, placeholder: t(ph) })}</div>`;
  const mountPanes = (el) => el.addEventListener('ui:seg', (e) => { if (e.detail.name === 'plang') el.querySelectorAll('[data-pane^="plang:"]').forEach((x) => { x.hidden = x.dataset.pane !== `plang:${e.detail.value}`; }); });

  ['about', 'privacy', 'terms'].forEach((key) => {
    const ph = { about: 'Write About us content Here', privacy: 'Write Privacy Policy content Here', terms: 'Write Terms & Conditions content Here' }[key];
    tab(POLICY_ROUTE[key], {
      active: 'admin-settings-policies', path: `/admin/settings/policies/${key}`,
      html: (p) => D3.card({ body: `<form class="d3-fc" novalidate>${back}
          <div><h2 class="h-serif" style="font-size:20px">${ltx(p.title)}</h2><small class="d3-muted">${t('Updated {date}', { date: D3.date(p.updatedAt) })}</small></div>
          ${p.content.en || p.content.ar ? '' : `<p class="d3-muted" style="margin:0;font-size:13px">${t('Content for this page hasn’t been drafted yet. Use the editor below once ready.')}</p>`}
          ${editorPanes(p, ph)}
          <div>${UI.btn('Save', { variant: 'primary', type: 'submit' })}</div></form>` }),
      mount: (main, p, ctx) => {
        mountPanes(main);
        const form = main.querySelector('form');
        form.addEventListener('submit', async (e) => {
          e.preventDefault(); const v = UI.formValues(form);
          const strip = (h) => String(h || '').replace(/<[^>]*>/g, '').trim();
          if (!strip(v.content_en) && !strip(v.content_ar)) { D3.toast(t('Write some content before saving.'), { tone: 'error' }); return; }
          await D3.busy(form.querySelector('[type="submit"]'), async () => {
            try { await api('PUT', `/admin/settings/policies/${key}`, { content: { en: v.content_en, ar: v.content_ar } }); D3.toast(t('{name} saved', { name: ltx(p.title) }), { tone: 'success' }); ctx.refresh(); } catch (err) { D3.fail(err, form); }
          });
        });
      },
    });
  });

  tab('admin-policy-refund', {
    active: 'admin-settings-policies', path: '/admin/settings/policies/refund',
    html: (p) => D3.card({ body: `<form class="d3-fc" novalidate>${back}
        <div class="d3-head"><div><h2 class="h-serif" style="font-size:20px">${ltx(p.title)}</h2><small class="d3-muted">${t('Live on the platform · drives eligibility in the Orders & Reservations refund flow')}</small></div>
          ${UI.btn('Edit content', { variant: 'secondary', icon: 'edit', attrs: 'data-act="editc" aria-expanded="false"' })}</div>
        <div class="d3-prose d3-policy" data-read>${lt(p.content)}</div>
        <div data-edit hidden>${editorPanes(p, 'Write the policy content')}</div>
        <h3 class="d3-cfg-h">${t('Configuration')}</h3>
        <div class="d3-cfg">
          ${D3.row('Free cancellation period (hours before collection)', '', UI.field({ type: 'number', name: 'freeCancellationHours', label: t('Hours'), value: p.config.freeCancellationHours, min: 0, max: 48, required: true }), { cls: 'tight' })}
          ${p.config.reasons.map((r) => D3.row(lt(r.label), '', UI.field({ type: 'select', name: `reason_${r.key}`, label: lt(r.label), value: r.outcome, options: p.config.outcomes.map((o) => ({ value: o, label: t(OUTCOME_LABEL[o]) })) }), { cls: 'tight' })).join('')}
        </div>
        <div>${UI.btn('Save Configuration', { variant: 'primary', type: 'submit' })}</div></form>` }),
    mount: (main, p, ctx) => {
      mountPanes(main);
      const form = main.querySelector('form');
      UI.on(main, 'click', '[data-act="editc"]', (e, b) => { const ed = main.querySelector('[data-edit]'), rd = main.querySelector('[data-read]'); const open = ed.hidden; ed.hidden = !open; rd.hidden = open; b.setAttribute('aria-expanded', String(open)); });
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); D3.clearErr(form); const r = UI.validate(form); if (!r.ok) return;
        const v = r.values;
        const body = { config: { freeCancellationHours: +v.freeCancellationHours, reasons: p.config.reasons.map((x) => ({ ...x, outcome: v[`reason_${x.key}`] })) } };
        if (!main.querySelector('[data-edit]').hidden) body.content = { en: v.content_en, ar: v.content_ar };
        await D3.busy(form.querySelector('[type="submit"]'), async () => {
          try { await api('PUT', '/admin/settings/policies/refund', body); D3.toast(t('Refund configuration saved. The Orders & Reservations refund check uses it right away.'), { tone: 'success' }); ctx.refresh(); } catch (err) { D3.fail(err, form); }
        });
      });
    },
  });

  UI.css('d3-settings', `
    .d3-chans{display:flex;gap:14px;margin-top:8px;font-size:12.5px;color:var(--muted)} .d3-chans[hidden]{display:none}
    .d3-chans input{accent-color:var(--accent)}
    .d3-exp{display:flex;gap:8px;align-items:flex-end} .d3-exp>:first-child{flex:1}
    .d3-plist{display:grid;gap:10px}
    .d3-pitem{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border:1px solid var(--line);border-radius:var(--r-ctl,11px);color:var(--text);text-decoration:none}
    .d3-pitem:hover{background:var(--tint-mauve)} .d3-pitem b{display:block;font-weight:600} .d3-pitem small{font-size:12px}
    .d3-policy{color:var(--muted);font-size:13.5px;max-width:860px} .d3-policy h3{color:var(--text);font-size:14px} .d3-policy[hidden]{display:none}
    .d3-cfg-h{font-size:11.5px;letter-spacing:.06em;color:var(--faint);margin-top:8px}
    :lang(ar) .d3-cfg-h{letter-spacing:0}
    .d3-cfg .d3-row{padding:8px 0}
    .d3-cfg .d3-row-c{min-width:280px}
    .d3-photo{display:flex;gap:14px;align-items:center}.d3-photo>:last-child{flex:1}
    [data-edit][hidden]{display:none}
  `);
})();
