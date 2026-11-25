/* D3 shared helpers (owner: D3) — loaded first by modules/d3.js
   Localized-text accessor, date-time formatting, status registry, settings sub-nav, small form helpers. */
(function () {
  const D3 = (window.D3 = window.D3 || {});

  /* LocalizedText {en, ar} → current language (falls back to EN) */
  D3.lt = (o) => (o == null ? '' : typeof o === 'string' ? o : (o[App.state.lang] || o.en || ''));
  D3.esc = (s) => UI.esc(s == null ? '' : String(s));
  D3.ltx = (o) => D3.esc(D3.lt(o)); // escaped localized text

  /* ISO → "Jul 23, 8:00 AM" (EN) / "23 يوليو، 8:00 ص" (AR) — uses the UTC clock of the stamp for stable mocks */
  D3.dateTime = (iso) => {
    if (!iso) return '—';
    /* (v1.3) shown in the context time zone (branch / market) */
    return `${fmt.date(iso, 'short')}${App.state.lang === 'ar' ? '،' : ','} ${fmt.clock(iso)}`;
  };
  D3.date = (iso) => (iso ? fmt.date(iso) : '—');
  D3.dateShort = (iso) => (iso ? fmt.date(iso, 'short') : '—');
  /* minutes since an ISO stamp, against a fixed "now" so mocks read naturally */
  D3.agoFrom = (iso) => { const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000)); return fmt.ago(m); };

  /* statuses used by D3 screens (enum → label/tone/icon) */
  UI.status.register({
    published: { label: 'Published', tone: 'g', icon: 'checkc' },
    draft: { label: 'Draft', tone: 'n', icon: 'edit' },
    scheduled: { label: 'Scheduled', tone: 'o', icon: 'clock' },
    archived: { label: 'Archived', tone: 'n', icon: 'box' },
    active: { label: 'Active', tone: 'g', icon: 'checkc' },
    invited: { label: 'Invited', tone: 'm', icon: 'mail' },
    suspended: { label: 'Suspended', tone: 'r', icon: 'pause' },
    open: { label: 'Open', tone: 'm', icon: 'info' },
    in_review: { label: 'In progress', tone: 'o', icon: 'clock' },
    awaiting_merchant: { label: 'Awaiting you', tone: 'o', icon: 'alert' },
    in_progress: { label: 'In progress', tone: 'o', icon: 'clock' },
    resolved: { label: 'Resolved', tone: 'g', icon: 'checkc' },
    closed: { label: 'Closed', tone: 'n', icon: 'xc' },
    replied: { label: 'Replied', tone: 'g', icon: 'checkc' },
    reported: { label: 'Reported', tone: 'r', icon: 'flag' },
  });

  /* categories (contract enum → English label) */
  D3.CATEGORIES = [
    { value: 'bakery', label: 'Bakery' }, { value: 'grocery', label: 'Grocery' },
    { value: 'meals', label: 'Prepared Foods' }, { value: 'restaurant', label: 'Restaurant' },
    { value: 'cafe', label: 'Café' }, { value: 'desserts', label: 'Desserts' },
    { value: 'produce', label: 'Produce' }, { value: 'other', label: 'Other' },
  ];
  D3.catLabel = (v) => t((D3.CATEGORIES.find((c) => c.value === v) || { label: v }).label);
  D3.opts = (arr) => arr.map((o) => ({ value: o.value, label: t(o.label) }));

  /* Core overlays escape their text unless told otherwise. D3 always passes text that is already
     translated with t() and has user values escaped with D3.esc, so these wrappers switch to HTML mode. */
  D3.toast = (text, o = {}) => UI.toast(text, { ...o, html: true });
  D3.confirm = (o) => UI.confirm({ ...o, html: true });
  D3.modal = (o) => UI.modal({ ...o, titleHtml: true });
  D3.card = (o) => UI.card({ ...o, titleHtml: true, subHtml: true });
  /* async block that always renders through renderFn (we draw our own empty states) */
  /* … and ignores stale responses when the same block is reloaded quickly (e.g. two filters changed in a row) */
  D3.async = (el, fetcher, renderFn, o = {}) => {
    const seq = (el.__d3seq = (el.__d3seq || 0) + 1);
    const fresh = () => seq === el.__d3seq;
    return UI.async(el, fetcher, (res) => (fresh() ? renderFn(res) : el.innerHTML), { isEmpty: () => false, ...o, after: o.after ? (e, r) => fresh() && o.after(e, r) : undefined });
  };
  /* set a core toggle (button.tog[role=switch]) programmatically, e.g. to roll back after an error */
  D3.setToggle = (btn, v) => { if (!btn) return; btn.setAttribute('aria-checked', String(!!v)); const st = btn.parentElement && btn.parentElement.querySelector('.st'); if (st) { st.textContent = t(v ? 'On' : 'Off'); st.classList.toggle('on', !!v); } };

  /* API error → toast + inline field errors (core field markup: .fld > .err) */
  D3.fail = (err, form) => {
    const msg = (err && err.message) || 'Something went wrong. Please try again.';
    if (form && err && err.details) {
      let first = null;
      Object.keys(err.details).forEach((k) => {
        const c = form.querySelector(`[name="${k}"], [data-drop="${k}"]`); const f = c && c.closest('.fld');
        if (!f) return; f.classList.add('invalid'); const e = f.querySelector('.err'); if (e) e.textContent = t(msg); c.setAttribute('aria-invalid', 'true'); first = first || c;
      });
      if (first && first.focus) first.focus();
    }
    D3.toast(D3.esc(t(msg)), { tone: 'error' });
  };
  D3.clearErr = (form) => { form.querySelectorAll('.fld.invalid').forEach((f) => { f.classList.remove('invalid'); const e = f.querySelector('.err'); if (e) e.textContent = ''; }); form.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid')); };

  /* busy state on a button while a promise runs */
  D3.busy = async (btn, fn) => {
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    try { return await fn(); } finally { if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); } }
  };

  /* EN/AR language switch for bilingual content editors */
  D3.langSwitch = (name, value = 'en') => UI.segmented({ name, value, label: 'Content language', options: [{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }] });

  /* ---------- Admin settings sub-navigation (left card) ---------- */
  D3.ADMIN_SETTINGS_NAV = [
    { route: 'admin-settings-profile', label: 'Profile', icon: 'user' },
    { route: 'admin-settings', label: 'General', icon: 'gear' },
    { route: 'admin-settings-markets', label: 'Markets', icon: 'globe' }, // (v1.3, core-owned screen)
    { route: 'admin-settings-notifications', label: 'Notifications', icon: 'bell' },
    { route: 'admin-settings-security', label: 'Security', icon: 'shield' },
    { route: 'admin-settings-policies', label: 'Policies', icon: 'file' },
  ];
  D3.adminSettingsLayout = (active, contentHtml) => `
    <div class="d3-set">
      <nav class="cd d3-subnav" aria-label="${t('Settings')}">
        ${D3.ADMIN_SETTINGS_NAV.map((n) => `<a href="#${n.route}" data-go="${n.route}" data-params='{}' class="${n.route === active ? 'on' : ''}" ${n.route === active ? 'aria-current="page"' : ''}>${UI.icon(n.icon)}<span>${t(n.label)}</span></a>`).join('')}
      </nav>
      <div class="d3-set-main">${contentHtml}</div>
    </div>`;

  /* setting rows (label + hint on the start side, control at the end) */
  D3.row = (label, hint, control, opts = {}) => `<div class="d3-row ${opts.cls || ''}"><div class="d3-row-l"><b>${t(label)}</b>${hint ? `<small>${t(hint)}</small>` : ''}</div><div class="d3-row-c">${control}</div></div>`;

  /* Arabic-content inputs stay RTL even when the UI is English (and vice versa for *_en) */
  D3.arDir = (root) => { root.querySelectorAll('[name$="_ar"]').forEach((i) => { i.dir = 'rtl'; i.lang = 'ar'; }); root.querySelectorAll('[name$="_en"]').forEach((i) => { i.dir = 'ltr'; i.lang = 'en'; }); };

  /* tiny star renderer (decorative, with an accessible label) */
  D3.stars = (n, size = 16) => `<span class="d3-stars" role="img" aria-label="${t('{n} out of 5 stars', { n: fmt.text ? fmt.text.number(n) : n })}">${[1, 2, 3, 4, 5].map((i) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="${i <= Math.round(n) ? '#F0A43A' : 'var(--line-2, rgba(183,131,167,.3))'}"/></svg>`).join('')}</span>`;

  /* phone country codes */
  /* (v1.3) phone codes come from the markets registry (enabled markets) */
  Object.defineProperty(D3, 'PHONE_CODES', { get: () => Markets.phoneOptions(true), configurable: true });

  /* screen CSS shared by D3 screens (logical properties only, no transitions) */
  UI.css('d3-common', `
    .d3-cpad{padding:var(--pad,20px)}
    .d3-set{display:grid;grid-template-columns:240px minmax(0,1fr);gap:var(--gap,24px);align-items:start}
    .d3-subnav{padding:8px;display:flex;flex-direction:column;gap:2px}
    .d3-subnav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--r-ctl,11px);color:var(--muted);font-weight:500;text-decoration:none}
    .d3-subnav a:hover{background:var(--tint-mauve);color:var(--text)}
    .d3-subnav a.on{background:var(--tint-rose);color:var(--accent);font-weight:600}
    .d3-set-main{display:grid;gap:var(--gap,24px);min-width:0}
    .d3-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:14px 0;border-bottom:1px solid var(--line)}
    .d3-row:last-child{border-bottom:0}
    .d3-row-l{min-width:0} .d3-row-l b{display:block;font-weight:600;font-size:14px} .d3-row-l small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
    .d3-row-c{flex:none;min-width:220px;display:flex;justify-content:flex-end}
    .d3-row-c>*{width:100%} .d3-row-c>.tog-row{width:auto}
    .d3-row-c .fld>label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
    .d3-row.wide .d3-row-c{min-width:0;flex:1;max-width:620px}
    .d3-form{display:grid;gap:0}
    .d3-frow{display:grid;grid-template-columns:minmax(180px,1fr) minmax(0,2fr);gap:24px;padding:18px 0;border-bottom:1px dashed var(--line-2);align-items:start}
    .d3-frow:last-of-type{border-bottom:0}
    .d3-frow>.d3-fl b{display:block;font-weight:600}
    .d3-frow .d3-fc>.fld:only-child>label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
    .d3-pos{color:var(--pos);font-weight:500} .d3-neg{color:var(--neg);font-weight:500} .d3-frow>.d3-fl small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
    .d3-fc{display:grid;gap:12px} .d3-fc.c2{grid-template-columns:1fr 1fr} .d3-fc.d3-phone{grid-template-columns:140px 1fr}
    .d3-actions{display:flex;justify-content:flex-end;gap:10px;padding-top:18px}
        .d3-stars{display:inline-flex;gap:2px;vertical-align:middle}
    .d3-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
    .d3-backic{transform:scaleX(-1)} [dir="rtl"] .d3-backic{transform:none}
    .d3-back{display:inline-flex;align-items:center;gap:6px;color:var(--accent);font-weight:600;font-size:13px;text-decoration:none;background:none;border:0;cursor:pointer;padding:0}
    .d3-muted{color:var(--muted)} .d3-faint{color:var(--faint)}
    .d3-chips{display:flex;flex-wrap:wrap;gap:6px}
    .d3-langtabs{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
    .d3-pane[hidden]{display:none}
    @media (max-width:1100px){.d3-set{grid-template-columns:1fr}}
  `);
})();
