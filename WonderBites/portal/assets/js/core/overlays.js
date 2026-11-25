/* =====================================================================
   Global overlays — notifications, date range, profile, search, export,
   branch switcher, Need Help drawer, logout confirm   [LEAD]
   ===================================================================== */
(function (W, D) {
  'use strict';
  const t = (k, v) => W.t(k, v);
  const UI = () => W.UI;
  const esc = (s) => W.UI.esc(s);
  const ic = (n, c) => W.UI.icon(n, c);
  const S = () => W.App.state;
  const today = () => (W.api && W.api.DEMO_TODAY) || new Date().toISOString().slice(0, 10); // (v1.4) single demo anchor
  let current = null;

  function open(name, anchor) {
    if (current && current.name === name && !current.api.closed) { current.api.close(); current = null; return; }
    const fn = { notifications, date: dateRange, profile, search, export: () => exportDialog(defaultExport()), branch, market, help, logout }[name];
    if (!fn) return console.warn('[Overlays] unknown', name);
    const a = fn(anchor);
    if (a) current = { name, api: a };
  }
  const closeAll = () => W.UI && W.UI.closeAll();

  /* ---------------- notifications ---------------- */
  function notifications(anchor) {
    let tab = 'all';
    const p = UI().popover(anchor, `<div class="np" role="dialog" aria-label="${esc(t('Notifications'))}"><div class="ov-h"><h2 style="font-size:17px">${esc(t('Notifications'))}</h2><button class="btn link sm" data-readall>${ic('check')}${esc(t('Mark all as read'))}</button></div>
      ${UI().tabs({ name: 'np', tabs: [{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'downloads', label: 'Downloads' }], active: 'all' })}
      <div class="items" data-items>${UI().skeleton('list', 4)}</div>
      <div class="ft">${UI().link('Notification settings', S().portal === 'admin' ? 'admin-settings-notifications' : 'm-settings', S().portal === 'admin' ? undefined : { tab: 'profile' })}${UI().link('View all', S().portal === 'admin' ? 'admin-notifications' : 'm-notifications')}</div></div>`, { label: t('Notifications'), cls: '' });
    const box = p.el.querySelector('[data-items]');
    const load = () => UI().async(box, () => api('GET', '/shared/notifications', { portal: S().portal, tab }), ({ data }) => itemsHTML(data), { skeleton: 'list', n: 4, empty: { icon: 'bell', title: tab === 'downloads' ? 'No downloads yet' : 'You’re all caught up', text: tab === 'downloads' ? 'Exports you start will appear here.' : 'New alerts will appear here.' } });
    load();
    p.el.addEventListener('ui:tab', (e) => { tab = e.detail.value; load(); });
    p.el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-readall]')) { await api('POST', '/shared/notifications/read-all', { portal: S().portal }); W.App.setUnread(0); UI().toast('All notifications marked as read'); load(); return; }
      const it = e.target.closest('[data-nid]'); if (!it) return;
      const n = JSON.parse(it.dataset.n);
      api('PATCH', '/shared/notifications/' + n.id, { read: true }).then(() => { if (!n.read) W.App.setUnread(S().unread - 1); }).catch(() => {});
      p.close();
      if (n.type === 'export') return download(n);
      open_(n.link);
    });
    return p;
  }
  /* Notification (contract): { id, type, title, body, severity, link:{route,id,params}, read, createdAt } */
  const NTYPE = { order: ['clipboard', 'rose'], pickup: ['package', 'orange'], alert: ['bars', 'green'], issue: ['alert', 'rose'], ticket: ['headset', 'mauve'], payout: ['wallet', 'green'], export: ['download', 'green'], review: ['star', 'orange'], inventory: ['bag', 'rose'], system: ['info', 'mauve'] };
  const nIcon = (n) => NTYPE[n.type] || NTYPE.system;
  const open_ = (link) => { if (link && link.route) W.App.go(link.route, link.params || (link.id ? { id: link.id } : {})); };
  function itemHTML(n, cls = 'it') {
    const [icn, tone] = nIcon(n);
    return `<button type="button" class="${cls} ${n.read ? '' : cls === 'it' ? 'unread' : 'hot'}" data-nid="${esc(n.id)}" data-n="${esc(JSON.stringify(n))}"><span class="ic t-${tone}">${ic(icn)}</span><span ${cls === 'it' ? 'style="min-width:0;flex:1"' : 'class="tx"'}><b ${cls === 'it' ? '' : 'class="tt" style="display:block"'}>${fmt.iso(esc(t(n.title)))}</b><small ${cls === 'it' ? '' : 'class="mm" style="display:block"'}>${fmt.iso(esc(n.type === 'export' ? (n.body || '') : t(n.body || '')))}</small>${cls === 'it' ? `<time>${fmt.ago(n.createdAt)}</time>` : ''}</span>${cls === 'it' ? '' : `<span class="tm">${fmt.ago(n.createdAt)}</span>`}${n.type === 'export' ? `<span class="btn icon" aria-hidden="true">${ic('download')}</span>` : ''}</button>`;
  }
  const itemsHTML = (list) => list.map((n) => itemHTML(n)).join('');
  function download(n) {
    const cols = (n.export && n.export.columns) || ['ID', 'Name', 'Status'];
    const rows = [cols, ...Array.from({ length: 5 }, (_, i) => cols.map((c, j) => (j === 0 ? `ROW-${1001 + i}` : `${c} ${i + 1}`)))];
    n = { ...n, fileName: (n.export && n.export.fileName) || n.body || 'export' };
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = D.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (n.fileName || 'export').replace(/\.(xlsx|pdf)$/i, '') + '.csv'; D.body.appendChild(a); a.click(); a.remove();
    UI().toast(t('Download started: {f}', { f: a.download }), { tone: 'info' });
  }

  /* ---------------- date range ---------------- */
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => new Date(s + 'T00:00:00');
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const PRESETS = [
    ['today', 'Today', () => [today(), today()]], ['7d', 'Last 7 days', () => [addDays(today(), -6), today()]], ['30d', 'Last 30 days', () => [addDays(today(), -30), today()]],
    ['month', 'This month', () => [today().slice(0, 8) + '01', today()]], ['last-month', 'Last month', () => { const d = parse(today().slice(0, 8) + '01'); d.setDate(0); return [iso(d).slice(0, 8) + '01', iso(d)]; }], ['custom', 'Custom', null],
  ];
  function dateRange(anchor) {
    const st = { ...S().dateRange, view: (S().dateRange.from || today()).slice(0, 7) + '-01', picking: null };
    const render = () => {
      const v = parse(st.view); const v2 = new Date(v); v2.setMonth(v.getMonth() + 1);
      p.el.querySelector('[data-body]').innerHTML = `<div class="presets" role="group" aria-label="${esc(t('Presets'))}">${PRESETS.map(([k, l]) => `<button type="button" data-preset="${k}" aria-pressed="${st.preset === k}">${esc(t(l))}</button>`).join('')}</div><div class="cals">${month(v, -1)}${month(v2, 1)}</div>`;
      p.el.querySelector('[data-sum]').innerHTML = `${esc(t('Selected'))}: <b>${fmt.range(st.from, st.picking ? st.picking : st.to)}</b>`;
    };
    const month = (d, nav) => {
      const y = d.getFullYear(), m = d.getMonth(); const first = new Date(y, m, 1).getDay(); const days = new Date(y, m + 1, 0).getDate();
      let cells = ''; for (let i = 0; i < first; i++) cells += '<button type="button" class="out" tabindex="-1" aria-hidden="true"></button>';
      for (let day = 1; day <= days; day++) {
        const s = `${y}-${pad(m + 1)}-${pad(day)}`; const to = st.picking ? null : st.to;
        const edge = s === st.from || s === to; const inr = to && s > st.from && s < to;
        cells += `<button type="button" data-day="${s}" class="${edge ? 'edge' : inr ? 'in' : ''}${s === today() ? ' today' : ''}" aria-pressed="${edge}" aria-label="${esc(fmt.text.date(s, 'long'))}"><span class="num">${day}</span></button>`;
      }
      const mn = t(I18N.months[m]);
      return `<div class="cal"><h6>${nav < 0 ? `<button type="button" data-mv="-1" aria-label="${esc(t('Previous month'))}">${ic('chev-l', 'flip')}</button>` : '<span></span>'}<span>${esc(mn)} <span class="num">${y}</span></span>${nav > 0 ? `<button type="button" data-mv="1" aria-label="${esc(t('Next month'))}">${ic('chev-r', 'flip')}</button>` : '<span></span>'}</h6><div class="wd">${I18N.weekdays.map((w) => `<span>${esc(t(w))}</span>`).join('')}</div><div class="days">${cells}</div></div>`;
    };
    const p = UI().popover(anchor, `<div class="dr" role="dialog" aria-label="${esc(t('Select date range'))}"><div class="ov-h"><h2 style="font-size:17px">${esc(t('Select date range'))}</h2></div><div class="body" data-body></div><div class="ft"><span class="sum" data-sum></span><button type="button" class="btn secondary sm" data-cancel>${esc(t('Cancel'))}</button><button type="button" class="btn primary sm" data-apply>${esc(t('Apply'))}</button></div></div>`, { label: t('Select date range') });
    render(); p.place();
    p.el.addEventListener('click', (e) => {
      const pr = e.target.closest('[data-preset]'); if (pr) { const x = PRESETS.find((q) => q[0] === pr.dataset.preset); st.preset = x[0]; st.picking = null; if (x[2]) { const [a, b] = x[2](); st.from = a; st.to = b; st.view = a.slice(0, 8) + '01'; } render(); return; }
      const mv = e.target.closest('[data-mv]'); if (mv) { const d = parse(st.view); d.setMonth(d.getMonth() + +mv.dataset.mv); st.view = iso(d); render(); return; }
      const dy = e.target.closest('[data-day]'); if (dy) { const s = dy.dataset.day; st.preset = 'custom'; if (!st.picking) { st.from = s; st.picking = s; } else { if (s < st.from) { st.to = st.from; st.from = s; } else st.to = s; st.picking = null; } render(); const f = p.el.querySelector(`[data-day="${s}"]`); if (f) f.focus(); return; }
      if (e.target.closest('[data-cancel]')) return p.close();
      if (e.target.closest('[data-apply]')) { if (st.picking) st.to = st.picking; p.close(); W.App.setDateRange({ from: st.from, to: st.to, preset: st.preset }); UI().toast(t('Date range updated: {r}', { r: fmt.text.range(st.from, st.to) })); }
    });
    return p;
  }

  /* ---------------- profile menu ---------------- */
  function profile(anchor) {
    const u = S().user || W.App.DEMO[S().portal || 'admin'];
    const admin = S().portal === 'admin';
    const p = UI().popover(anchor, `<div class="pm"><div class="who"><span class="av on"></span><div><b>${esc(t(u.fullName || u.name))}</b><small>${esc(u.email || '')}</small><div class="muted" style="font-size:11.5px">${esc(t(u.roleLabel || ''))}</div></div></div>
      <div class="menu" role="menu">
        <button role="menuitem" type="button" data-pm="profile">${ic('user')}<span>${esc(t('Profile settings'))}</span></button>
        ${admin ? '' : `<button role="menuitem" type="button" data-pm="store">${ic('store')}<span>${esc(t('Store info'))}</span></button>`}
        <hr><div class="opt"><span>${esc(t('Language'))}</span>${UI().segmented({ name: 'lang', label: 'Language', value: S().lang, options: [{ value: 'en', label: 'EN' }, { value: 'ar', label: 'العربية' }] })}</div>
        <div class="opt"><span>${esc(t('Theme'))}</span>${UI().segmented({ name: 'theme', label: 'Theme', value: S().theme, options: [{ value: 'dark', label: 'theme|Night', icon: 'moon' }, { value: 'light', label: 'theme|Day', icon: 'sun' }] })}</div><hr>
        <button role="menuitem" type="button" data-pm="help">${ic('help')}<span>${esc(t('Help & support'))}</span></button>
        <button role="menuitem" type="button" data-pm="switch">${ic('layers')}<span>${esc(t('Switch portal'))}</span></button>
        <button role="menuitem" type="button" class="danger" data-pm="logout">${ic('logout')}<span>${esc(t('Log out'))}</span></button>
      </div></div>`, { role: 'dialog', label: t('Profile menu') });
    p.el.addEventListener('ui:seg', (e) => { if (e.detail.name === 'lang') { p.close(); W.App.setLang(e.detail.value); } else { W.App.setTheme(e.detail.value); } });
    p.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pm]'); if (!b) return; const a = b.dataset.pm; p.close();
      if (a === 'profile') W.App.go(admin ? 'admin-settings-profile' : 'm-settings', admin ? {} : { tab: 'profile' });
      if (a === 'store') W.App.go('m-settings', { tab: 'store' });
      if (a === 'help') help();
      if (a === 'switch') W.App.go('launcher');
      if (a === 'logout') logout();
    });
    return p;
  }

  /* ---------------- global search ---------------- */
  function search(anchor) {
    const recent = W.App.store.get('wb.recentSearch', []);
    const p = UI().popover(anchor, `<div class="gs" role="dialog" aria-label="${esc(t('Search'))}"><label class="inp">${ic('search')}<span class="sr-only">${esc(t('Search'))}</span><input type="search" autofocus role="combobox" aria-expanded="true" aria-controls="gs-res" aria-autocomplete="list" placeholder="${esc(t('Search drops, merchants, issues…'))}"></label><div id="gs-res" role="listbox" data-res></div></div>`, { align: 'start', label: t('Search') });
    const res = p.el.querySelector('[data-res]'); const inp = p.el.querySelector('input'); let tm, sel = -1, items = [];
    const paintRecent = () => { res.innerHTML = recent.length ? `<div class="grp"><h6>${esc(t('Recent searches'))}</h6>${recent.map((r) => `<button type="button" class="res" role="option" data-q="${esc(r)}">${ic('clock')}<b>${esc(r)}</b></button>`).join('')}</div>` : `<div class="grp"><h6>${esc(t('Try searching for'))}</h6>${['DR-3391', 'Green Bowl', '#1092', 'Sunrise'].map((r) => `<button type="button" class="res" role="option" data-q="${esc(r)}">${ic('search')}<b><span class="num">${esc(r)}</span></b></button>`).join('')}</div>`; items = [...res.querySelectorAll('.res')]; sel = -1; };
    const run = async (q) => {
      if (!q) return paintRecent();
      res.innerHTML = UI().skeleton('list', 3);
      try {
        const { data } = await api('GET', '/shared/search', { q, portal: S().portal, scope: 'all', limit: 8, branchId: S().portal === 'merchant' ? S().branch.id : undefined });
        const G = { drops: ['bag', 'rose'], merchants: ['store', 'mauve'], cases: ['alert', 'orange'], orders: ['clipboard', 'green'], consumers: ['users', 'mauve'], listings: ['bag', 'green'], customers: ['users', 'mauve'], pickups: ['package', 'orange'], tickets: ['headset', 'mauve'] };
        const groups = data.groups || [];
        res.innerHTML = groups.length ? groups.map((g) => { const [icn, tone] = G[g.type] || ['search', 'rose']; return `<div class="grp"><h6>${esc(t(g.label))} <span class="num faint">${g.total}</span></h6>${g.items.map((i) => `<button type="button" class="res" role="option" data-route="${esc(i.link.route)}" data-params="${esc(JSON.stringify(i.link.params || (i.link.id ? { id: i.link.id } : {})))}" data-q="${esc(q)}"><span class="cd-ic t-${tone}">${ic(icn)}</span><span style="min-width:0"><b>${fmt.iso(esc(t(i.title)))}</b><small>${fmt.iso(esc(t(i.subtitle || '')))}</small></span></button>`).join('')}</div>`; }).join('') : UI().empty({ icon: 'search', title: 'No results', text: 'Try a drop ID, merchant name or issue number.' });
      } catch (e) { res.innerHTML = UI().errorState({}); }
      items = [...res.querySelectorAll('.res')]; sel = -1;
    };
    paintRecent();
    inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => run(inp.value.trim()), 200); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!items.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((x, i) => x.setAttribute('aria-selected', String(i === sel))); items[sel].scrollIntoView({ block: 'nearest' }); }
      if (e.key === 'Enter') { e.preventDefault(); if (sel >= 0) items[sel].click(); else if (items[0]) items[0].click(); }
    });
    res.addEventListener('click', (e) => {
      const b = e.target.closest('.res'); if (!b) return;
      if (!b.dataset.route) { inp.value = b.dataset.q; run(b.dataset.q); inp.focus(); return; }
      const q = b.dataset.q; const next = [q, ...recent.filter((x) => x !== q)].slice(0, 5); W.App.store.set('wb.recentSearch', next);
      p.close(); W.App.go(b.dataset.route, JSON.parse(b.dataset.params || '{}'));
    });
    return p;
  }

  /* ---------------- export dialog ---------------- */
  function defaultExport() {
    const r = W.App.routes[S().route]; const ne = W.App.navEntry(S().route) || {};
    return { scope: (r && r.title) || ne.label || 'Report', resource: (r && r.exportResource) || (S().portal === 'merchant' ? 'merchant.' : 'admin.') + String(S().route || 'report').replace(/^(admin|m)-/, '').replace(/-/g, '_'), columns: (r && r.exportColumns) || null, filters: {} };
  }
  function exportDialog(o = {}) {
    const cols = o.columns || ['ID', 'Name', 'Status', 'Date', 'Amount'];
    const m = UI().modal({ title: 'Export data', icon: 'upload', size: 'md', body: `<form class="form-grid" novalidate>
        <div class="fld full"><span class="lbl">${esc(t('Format'))}</span>${UI().segmented({ name: 'format', label: 'Format', value: 'csv', options: [{ value: 'csv', label: 'CSV' }, { value: 'xlsx', label: 'Excel (XLSX)' }, { value: 'pdf', label: 'PDF' }] })}</div>
        ${UI().field({ type: 'radio', name: 'scope', label: 'Scope', value: 'filtered', options: [{ value: 'filtered', label: 'Current view (filters applied)' }, { value: 'current_page', label: 'Current page only' }, { value: 'all', label: 'All records' }] })}
        <div class="fld"><span class="lbl">${esc(t('Date range'))}</span><div class="inp">${ic('cal')}<span>${fmt.range(S().dateRange.from, S().dateRange.to)}</span></div></div>
        ${UI().field({ type: 'multiselect', name: 'columns', label: 'Columns', required: true, full: true, cols: 2, value: cols, options: cols.map((c) => ({ value: c, label: c })) })}
        <p class="faint full" style="font-size:12px">${esc(t('Section'))}: <b>${esc(t(o.scope || 'Report'))}</b> · ${esc(t('You’ll get a notification when the file is ready.'))}</p></form>`,
      actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Start export', variant: 'primary', icon: 'download', run: async (dlg) => {
        const r = UI().validate(dlg.el.querySelector('form')); if (!r.ok) return false;
        const body = { resource: o.resource || 'admin.report', format: r.values.format, scope: r.values.scope, columns: r.values.columns, filters: { ...(o.filters || {}), ...(S().portal === 'admin' ? { market: S().market || 'all' } : {}) }, from: S().dateRange.from + 'T00:00:00Z', to: S().dateRange.to + 'T23:59:59Z', branchId: S().portal === 'merchant' ? S().branch.id : undefined };
        const { data } = await api('POST', '/shared/exports', body);
        dlg.close();
        UI().toast(t('Export started — {f}', { f: data.fileName }), { tone: 'success', action: { label: 'View downloads', run: () => { const b = D.querySelector('[data-ov="notifications"]'); if (b) notifications(b); } } });
        setTimeout(async () => { await api('POST', '/shared/exports/' + data.id + '/complete', {}); W.App.setUnread(S().unread + 1); }, 1500);
      } }] });
    return m;
  }

  /* ---------------- branch switcher ---------------- */
  function branch(anchor) {
    const p = UI().popover(anchor, `<div class="menu" role="menu" style="min-width:260px" data-list>${UI().skeleton('list', 3)}</div>`, { role: 'presentation' });
    api('GET', '/merchant/me/branches').then(({ data }) => {
      if (p.closed) return;
      const list = [{ id: 'all', name: { en: 'All branches', ar: 'كل الفروع' }, city: '' }, ...data];
      p.el.querySelector('[data-list]').innerHTML = `<div class="mh">${esc(t('Switch branch'))}</div>${list.map((b) => `<button type="button" role="menuitem" data-bid="${esc(b.id)}" data-bname="${esc(JSON.stringify(b.name))}" data-b="${esc(JSON.stringify(b))}">${ic(b.id === 'all' ? 'globe' : 'store')}<span style="flex:1;min-width:0"><span style="display:block">${esc(W.t.loc(b.name))}</span><small class="faint">${b.id === 'all' ? esc(t('Every branch, each in its own currency')) : esc([W.Markets ? W.Markets.cityName(b.city, b.country) : b.city, W.Markets && W.Markets.list(true).length > 1 ? W.Markets.name(b.country) : ''].filter(Boolean).join(', '))}${b.state && b.id !== 'all' ? ' · ' + esc(UI().status.label(b.state)) : ''}${b.currency && b.id !== 'all' ? ' · ' + esc(b.currency) : ''}</small></span>${S().branch.id === b.id ? ic('check') : ''}</button>`).join('')}<hr><button type="button" role="menuitem" data-manage>${ic('gear')}<span>${esc(t('Manage branches'))}</span></button>`;
      p.place(); const f = p.el.querySelector('[role="menuitem"]'); if (f) f.focus();
    }).catch(() => { p.el.querySelector('[data-list]').innerHTML = UI().errorState({ retry: false }); });
    p.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-bid]'); if (b) { const name = JSON.parse(b.dataset.bname); const full = JSON.parse(b.dataset.b); p.close(); W.App.setBranch(b.dataset.bid === 'all' ? { id: 'all', name } : { id: full.id, name, country: full.country, city: full.city, currency: full.currency, timeZone: full.timeZone }); UI().toast(t('Switched to {b}', { b: W.t.loc(name) })); return; }
      if (e.target.closest('[data-manage]')) { p.close(); W.App.go('m-branches'); }
    });
    p.el.addEventListener('keydown', (e) => { if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return; const l = [...p.el.querySelectorAll('[role="menuitem"]')]; const i = l.indexOf(D.activeElement); l[(i + (e.key === 'ArrowDown' ? 1 : -1) + l.length) % l.length].focus(); e.preventDefault(); });
    return p;
  }

  /* ---------------- (v1.3) admin market switcher: All markets + every ENABLED market ---------------- */
  function market(anchor) {
    const cur = S().market || 'all'; const list = W.Markets ? W.Markets.enabled() : [];
    const item = (code, label, sub, icn) => `<button type="button" role="menuitemradio" aria-checked="${cur === code}" data-mk="${esc(code)}">${ic(icn)}<span style="flex:1;min-width:0"><span style="display:block">${esc(label)}</span><small class="faint">${esc(sub)}</small></span>${cur === code ? ic('check') : ''}</button>`;
    const p = UI().popover(anchor, `<div class="menu" role="menu" style="min-width:250px" aria-label="${esc(t('Market'))}"><div class="mh">${esc(t('Market'))}</div>
      ${item('all', t('All markets'), list.length > 1 ? t('Totals in {cur}', { cur: W.Markets.reportingCurrency() }) : W.t.loc((list[0] || {}).name), 'globe')}
      ${list.map((m) => item(m.code, W.t.loc(m.name), `${m.currency} · ${m.phoneCode} · ${m.timeZone}`, 'pin')).join('')}
      <hr><button type="button" role="menuitem" data-mk-manage>${ic('gear')}<span>${esc(t('Manage markets'))}</span></button></div>`, { role: 'presentation', align: 'start' });
    p.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-mk]'); if (b) { p.close(); W.App.setMarket(b.dataset.mk); UI().toast(t('Showing {m}', { m: b.dataset.mk === 'all' ? t('All markets') : W.Markets.name(b.dataset.mk) })); return; }
      if (e.target.closest('[data-mk-manage]')) { p.close(); W.App.go('admin-settings-markets'); }
    });
    return p;
  }

  /* ---------------- Need Help drawer ---------------- */
  function help() {
    const portal = S().portal || 'merchant';
    const d = UI().drawer({ title: 'Need Help?', icon: 'headset', width: 480, body: `<div data-faq>${UI().skeleton('list', 4)}</div>
      <h4 style="margin:18px 0 10px;font-size:14px">${esc(t('Contact us'))}</h4>
      ${(() => { /* (v1.4 F-005) contacts come from the markets registry (Admin → Settings → Markets) */
        const mk = (W.App.marketInfo && W.App.marketInfo()) || {}; const wa = String(mk.supportWhatsApp || '').replace(/\D/g, '');
        const hours = mk.supportHours ? W.t.loc(mk.supportHours) : '';
        return `<div class="contact" data-support-contacts><a href="tel:${esc(mk.supportPhone || '')}" data-contact="phone">${ic('phone')}${esc(t('Call support'))}<small class="faint num" dir="ltr">${esc(mk.supportPhoneLabel || mk.supportPhone || '')}</small></a><a href="mailto:${esc(mk.supportEmail || '')}" data-contact="email">${ic('mail')}${esc(t('Email us'))}<small class="faint">${esc(mk.supportEmail || '')}</small></a>${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener" data-contact="whatsapp">${ic('chat')}${esc(t('WhatsApp'))}<small class="faint num" dir="ltr">${esc(mk.supportWhatsApp)}</small></a>` : ''}<button type="button" data-chat>${ic('chat')}${esc(t('Live chat'))}<small class="faint">${esc(t('Avg. reply 3 min'))}</small></button></div>${hours ? `<p class="faint" data-contact="hours" style="margin:8px 0 0;font-size:12px">${ic('clock')} ${esc(t('Support hours'))}: ${esc(hours)}</p>` : ''}`;
      })()}
      <h4 style="margin:18px 0 10px;font-size:14px">${esc(t('Create a support ticket'))}</h4>
      <form class="form-grid" data-ticket novalidate>
        ${UI().field({ name: 'subject', label: 'Subject', required: true, full: true, placeholder: 'Briefly describe the issue' })}
        ${UI().field({ type: 'select', name: 'category', label: 'Category', required: true, full: true, placeholder: 'Select a category', options: ['Orders & pickups', 'Payouts', 'Listings', 'Account & access', 'Technical issue', 'Other'].map((x) => ({ value: x, label: x })) })}
        ${UI().field({ type: 'textarea', name: 'message', label: 'Message', required: true, full: true, minlength: 10, placeholder: 'Tell us what happened…' })}
      </form>`,
      actions: [{ label: portal === 'admin' ? 'Open Support' : 'View my tickets', variant: 'secondary', run: (dd) => { dd.close(); W.App.go(portal === 'admin' ? 'admin-support' : 'm-help'); } }, { label: 'Submit ticket', variant: 'primary', icon: 'send', run: async (dd) => {
        const r = UI().validate(dd.el.querySelector('[data-ticket]')); if (!r.ok) return false;
        const { data } = await api('POST', '/shared/support/tickets', { subject: r.values.subject, message: r.values.message, category: r.values.category, portal });
        dd.close(); UI().toast(t('Ticket {id} created. We’ll reply within 24 hours.', { id: data.id }), { tone: 'success' });
      } }] });
    UI().async(d.el.querySelector('[data-faq]'), () => api('GET', '/shared/help/faqs', { portal }), ({ data }) => `<div class="faq">${data.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(W.t.loc(f.question))}${ic('chev')}</summary><p>${esc(W.t.loc(f.answer))}</p></details>`).join('')}</div>`, { skeleton: 'list', n: 4 });
    d.el.addEventListener('click', (e) => { if (e.target.closest('[data-chat]')) UI().toast('Connecting you to a support agent…', { tone: 'info' }); });
    return d;
  }

  /* ---------------- logout ---------------- */
  async function logout() {
    const ok = await UI().confirm({ title: 'Log out?', text: 'You will need to sign in again to access the portal.', confirm: 'Log out', danger: true });
    if (!ok) return;
    try { await api('POST', '/auth/logout', { refreshToken: (S().session && S().session.refreshToken) || '', allDevices: false }); } catch (e) { /* ignore */ }
    W.App.logout();
    UI().toast('You have been logged out', { tone: 'info' });
  }

  W.Overlays = { open, closeAll, itemHTML, openLink: open_, notifications, dateRange, profile, search, export: exportDialog, branch, market, help, logout, download, get TODAY() { return today(); } };
})(window, document);
