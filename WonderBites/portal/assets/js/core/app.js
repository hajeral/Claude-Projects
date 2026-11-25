/* =====================================================================
   App core — state, router (plain hash names), guards, shell, loader   [LEAD]
   ===================================================================== */
(function (W, D) {
  'use strict';
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } },
  };
  const SS = {
    get(k, d) { try { const v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } },
  };
  const mem = {}; // in-memory mirror for when storage is unavailable

  const state = {
    lang: LS.get('wb.lang', 'en') === 'ar' ? 'ar' : 'en',
    theme: LS.get('wb.theme', 'dark') === 'light' ? 'light' : 'dark',
    portal: null,
    sessions: { admin: LS.get('wb.session.admin', null), merchant: LS.get('wb.session.merchant', null) },
    session: null,
    user: null,
    route: null,
    params: {},
    dateRange: LS.get('wb.dateRange.v2', null), // (v1.4) default = last 30 days ending api.DEMO_TODAY (set at boot)
    branch: LS.get('wb.branch.v2', { id: 'BR-01', name: { en: 'West Bay Branch', ar: 'فرع الخليج الغربي' }, country: 'QA', city: 'doha', currency: 'QAR', timeZone: 'Asia/Qatar' }),
    market: LS.get('wb.market', 'all'), // (v1.3) admin market switcher: 'all' | market code
    unread: 4,
  };

  /* ---------------- events ---------------- */
  const listeners = {};
  const on = (ev, fn) => ((listeners[ev] = listeners[ev] || []).push(fn), () => (listeners[ev] = listeners[ev].filter((f) => f !== fn)));
  const emit = (ev, data) => (listeners[ev] || []).slice().forEach((f) => { try { f(data); } catch (e) { console.error(e); } });

  /* ---------------- registry ---------------- */
  const routes = {};
  function route(name, opts) {
    if (typeof opts === 'function') opts = { render: opts };
    const portal = opts.portal || (name.startsWith('admin-') ? 'admin' : name.startsWith('m-') ? 'merchant' : 'public');
    routes[name] = { name, chrome: portal !== 'public', ...opts, portal };
    if (booted && state.route === name) render();
  }

  /* ---------------- navigation ---------------- */
  const LOGIN = { admin: 'admin-login', merchant: 'm-login' };
  function go(name, params) {
    if (params !== undefined) { state.params[name] = params || {}; SS.set('wb.params.' + name, params || {}); mem[name] = params; }
    if (location.hash.slice(1) === name) render(); else location.hash = name;
  }
  function paramsFor(name) { return state.params[name] || SS.get('wb.params.' + name, null) || mem[name] || {}; }
  function parseHash() {
    let h = decodeURIComponent(location.hash.slice(1) || '');
    const m = h.match(/^(.*?)-(ar|en)$/);
    if (m && (routes[m[1]] || isKnown(m[1]) || m[1] === '')) { h = m[1]; if (state.lang !== m[2]) setLang(m[2], true); try { history.replaceState(null, '', '#' + h); } catch (e) { /* */ } }
    else if (h === 'ar' || h === 'en') { setLang(h, true); h = ''; }
    return h;
  }

  /* ---------------- nav model (canonical route names, see CONVENTIONS §2) ---------------- */
  const NAV = {
    admin: [
      ['Command Center', 'grid', 'admin-command-center'], ['Drops', 'bag', 'admin-drops'], ['Pickups', 'package', 'admin-pickups'],
      ['Orders & Reservations', 'clipboard', 'admin-orders'], ['Merchants', 'store', 'admin-merchants'], ['Consumers', 'users', 'admin-consumers'],
      ['Financials', 'bars', 'admin-financials'], ['Operations Analytics', 'activity', 'admin-operations'], ['Wallet & Vouchers', 'wallet', 'admin-wallet'],
      ['Quality & Safety', 'shield', 'admin-quality'], ['Issues & Alerts', 'alert', 'admin-issues', 'issues'], ['Support', 'headset', 'admin-support'],
      ['Performance', 'gauge', 'admin-performance'], ['Sustainability & Impact', 'leaf', 'admin-sustainability'], ['Listings & Templates', 'layers', 'admin-listings'],
      ['CMS', 'file', 'admin-cms'], ['Users & Access', 'key', 'admin-users'], ['Settings', 'gear', 'admin-settings'],
    ],
    merchant: [
      ['Overview', 'grid', 'm-overview'], ['Orders & Pickups', 'package', 'm-orders', 'orders'], ['Listings (Bags)', 'bag', 'm-listings'],
      ['Inventory', 'clipboard', 'm-inventory'], ['Driver', 'truck', 'm-drivers'], ['Analytics', 'bars', 'm-analytics'],
      ['Customers', 'users', 'm-customers'], ['Branches', 'branch', 'm-branches'], ['Reviews', 'star', 'm-reviews'],
      ['Reports / Dispute', 'file', 'm-reports'], ['Templates', 'layers', 'm-templates'], ['Settings', 'gear', 'm-settings'],
    ],
  };
  // Known routes that are not sidebar items (placeholder until their owner registers them)
  const EXTRA = {
    'admin-moderation': ['Moderation', 'Issues & Alerts'], 'admin-templates': ['Templates', 'Listings & Templates'],
    'admin-settings-profile': ['Settings', 'Settings'], 'admin-settings-notifications': ['Settings', 'Settings'], 'admin-settings-security': ['Settings', 'Settings'],
    'admin-settings-policies': ['Settings', 'Settings'], 'admin-policy-refund': ['Refund & Cancellation', 'Settings'], 'admin-policy-about': ['About Us', 'Settings'],
    'admin-policy-privacy': ['Privacy Policy', 'Settings'], 'admin-policy-terms': ['Terms & Conditions', 'Settings'],
    'admin-merchant-new': ['Add Merchant', 'Merchants'], 'admin-merchant-detail': ['Merchants', 'Merchants'], 'admin-consumer-detail': ['Consumers', 'Consumers'],
    'admin-ticket-detail': ['Support', 'Support'], 'admin-payout-detail': ['Financials', 'Financials'], 'admin-performance-report': ['Performance', 'Performance'],
    'admin-sustainability-report': ['Sustainability & Impact', 'Sustainability & Impact'], 'admin-voucher-new': ['Wallet & Vouchers', 'Wallet & Vouchers'],
    'admin-wallet-detail': ['Wallet & Vouchers', 'Wallet & Vouchers'], 'admin-voucher-detail': ['Wallet & Vouchers', 'Wallet & Vouchers'], 'admin-compliance-detail': ['Quality & Safety', 'Quality & Safety'],
    'admin-template-new': ['Listings & Templates', 'Listings & Templates'], 'admin-template-edit': ['Listings & Templates', 'Listings & Templates'],
    'admin-cms-page': ['CMS', 'CMS'], 'admin-cms-banner': ['CMS', 'CMS'], 'admin-cms-faq': ['CMS', 'CMS'],
    'm-help': ['Help', null], 'm-vendors': ['Vendors', 'Branches'], 'm-vendor-new': ['Vendors', 'Branches'], 'm-vendor-detail': ['Vendors', 'Branches'],
    'm-sustainability': ["This month's impact", null], 'm-inventory-new': ['Inventory', 'Inventory'], 'm-inventory-detail': ['Inventory', 'Inventory'],
    'm-create-product': ['Create Product', 'Inventory'], 'm-driver-detail': ['Driver', 'Driver'], 'm-analytics-days': ['Analytics', 'Analytics'],
    'm-customer-new': ['Customers', 'Customers'], 'm-customer-detail': ['Customers', 'Customers'], 'm-branch-edit': ['Branches', 'Branches'], 'm-report-detail': ['Reports / Dispute', 'Reports / Dispute'],
  };
  const navEntry = (name) => { for (const p in NAV) { const e = NAV[p].find((x) => x[2] === name); if (e) return { label: e[0], nav: e[0], portal: p }; } if (EXTRA[name]) return { label: EXTRA[name][0], nav: EXTRA[name][1], portal: name.startsWith('admin-') ? 'admin' : 'merchant' }; return null; };
  const isKnown = (name) => !!(routes[name] || navEntry(name));

  /* ---------------- sessions ---------------- */
  function syncSession() {
    state.session = state.portal ? state.sessions[state.portal] : null;
    state.user = state.session ? state.session.user : null;
  }
  function login(portal, user, token, refreshToken) {
    const s = { token: token || 'mock.' + portal + '.' + Date.now().toString(36), refreshToken: refreshToken || null, user: { portal, ...user } };
    unreadLoaded[portal] = false;
    state.sessions[portal] = s; LS.set('wb.session.' + portal, s); syncSession(); emit('login', s);
    /* (v1.3) a merchant whose branches don't include the stored branch starts on its default branch (with its market fields) */
    const mb = portal === 'merchant' && s.user.merchant && s.user.merchant.branches;
    if (mb && mb.length && !mb.some((b) => b.id === state.branch.id && b.country)) { state.branch = mb.find((b) => b.id === s.user.merchant.defaultBranchId) || mb[0]; LS.set('wb.branch.v2', state.branch); }
  }
  function logout(expired) {
    const p = state.portal || 'admin';
    state.sessions[p] = null; LS.del('wb.session.' + p); syncSession(); emit('logout', p);
    if (expired && W.UI) W.UI.toast(t('Your session has expired. Please sign in again.'), { tone: 'info' });
    go(LOGIN[p]);
  }
  /* demo users follow the contract `User` schema */
  const DEMO = {
    admin: { country: 'QA', timeZone: 'Asia/Qatar', id: 'USR-001', firstName: 'Sarah', lastName: 'Al Manasoori', name: 'Sarah Al Manasoori', email: 'sarah@wonderbites.qa', role: 'super_admin', portal: 'admin', language: 'en', theme: 'night', twoFactorEnabled: true, merchant: null, permissions: ['*'] },
    merchant: { id: 'MU-210', firstName: 'Sara', lastName: 'Al Hashimi', name: 'Sara Al Hashimi', email: 'sara@figandbloom.example.com', role: 'merchant_owner', portal: 'merchant', language: 'en', theme: 'night', twoFactorEnabled: false,
      country: 'QA', timeZone: 'Asia/Qatar',
      merchant: { merchantId: 'MER-066', name: 'Fig & Bloom Bakery', logoUrl: null, verified: true, defaultBranchId: 'BR-01', country: 'QA', currency: 'QAR', timeZone: 'Asia/Qatar',
        branches: [{ id: 'BR-01', name: { en: 'West Bay Branch', ar: 'فرع الخليج الغربي' }, country: 'QA', city: 'doha', currency: 'QAR', timeZone: 'Asia/Qatar' }, { id: 'BR-02', name: { en: 'The Pearl Branch', ar: 'فرع اللؤلؤة' }, country: 'QA', city: 'doha', currency: 'QAR', timeZone: 'Asia/Qatar' }, { id: 'BR-03', name: { en: 'Al Sadd Branch', ar: 'فرع السد' }, country: 'QA', city: 'doha', currency: 'QAR', timeZone: 'Asia/Qatar' }] }, permissions: ['*'] },
  };
  const ROLE = { super_admin: 'Super administrator', operations_admin: 'Operations admin', support_agent: 'Support agent', read_only: 'Read only', merchant_owner: 'Owner', merchant_staff: 'Staff' };
  const roleLabel = (u) => ROLE[u && u.role] || '';
  const impactCache = {};
  function devLogin(portal = 'admin') { login(portal, DEMO[portal]); go(portal === 'admin' ? 'admin-command-center' : 'm-overview'); }

  /* ---------------- settings ---------------- */
  function applyDoc() {
    const h = D.documentElement;
    h.lang = state.lang; h.dir = state.lang === 'ar' ? 'rtl' : 'ltr'; h.dataset.theme = state.theme;
  }
  function setLang(l, silent) { l = l === 'ar' ? 'ar' : 'en'; if (state.lang === l && !silent) return; state.lang = l; LS.set('wb.lang', l); applyDoc(); emit('lang', l); if (!silent && booted) render(); }
  function setTheme(th) { th = th === 'light' ? 'light' : 'dark'; state.theme = th; LS.set('wb.theme', th); applyDoc(); emit('theme', th); if (booted) refreshChrome(); }
  function setDateRange(r) { state.dateRange = { ...state.dateRange, ...r }; LS.set('wb.dateRange.v2', state.dateRange); emit('dateRange', state.dateRange); if (booted) render(); }
  function setBranch(b) { state.branch = b; LS.set('wb.branch.v2', b); delete impactCache.merchant; emit('branch', b); if (booted) render(); }
  /* ---------------- (v1.3) markets: active market, currency and time zone come from context ---------------- */
  const MK = () => W.Markets;
  function setMarket(code) { state.market = code && code !== 'all' && MK() && MK().get(code) ? String(code).toUpperCase() : 'all'; LS.set('wb.market', state.market); emit('market', state.market); if (booted) render(); }
  /** active market code: admin → switcher ('all' | code); merchant → active branch's country (all branches → merchant country) */
  function market() {
    if (state.portal === 'admin') return state.market || 'all';
    if (state.portal === 'merchant') { const b = state.branch || {}; const u = state.user || DEMO.merchant; return (b.id !== 'all' && b.country) || (u.merchant && u.merchant.country) || (MK() ? MK().primary().code : 'QA'); }
    return MK() ? MK().primary().code : 'QA';
  }
  const marketInfo = () => { const c = market(); return (MK() && c !== 'all' && MK().get(c)) || (MK() ? MK().primary() : null); };
  /** currency of the current context: merchant branch/merchant, admin selected market, or the reporting currency for "All markets" */
  function currency() {
    if (state.portal === 'merchant') { const b = state.branch || {}; const u = state.user || DEMO.merchant; return (b.id !== 'all' && b.currency) || (u.merchant && u.merchant.currency) || (marketInfo() || {}).currency || 'QAR'; }
    if (state.portal === 'admin' && market() === 'all') return MK() ? MK().reportingCurrency() : 'QAR';
    return (marketInfo() || {}).currency || 'QAR';
  }
  function timeZone() {
    if (state.portal === 'merchant') { const b = state.branch || {}; if (b.id !== 'all' && b.timeZone) return b.timeZone; }
    return (marketInfo() || {}).timeZone || 'Asia/Qatar';
  }
  /** called by Markets.load(): drop a selection that is no longer enabled, refresh the screen */
  function marketsChanged() {
    if (state.market !== 'all' && MK() && !(MK().get(state.market) || {}).enabled) { state.market = 'all'; LS.set('wb.market', 'all'); }
    if (booted) render();
  }
  const bootTasks = [];
  const onBoot = (fn) => bootTasks.push(fn);
  function setUnread(n) { state.unread = Math.max(0, n | 0); D.querySelectorAll('[data-unread]').forEach((el) => { el.textContent = state.unread; el.hidden = !state.unread; }); }

  /* ---------------- shell ---------------- */
  const ic = (n, c) => (W.UI ? W.UI.icon(n, c) : '');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function sidebar(portal, navKey) {
    const items = NAV[portal].map(([label, icon, name, badge]) => {
      const cur = label === navKey ? ' aria-current="page"' : '';
      const b = badge === 'issues' ? `<span class="bd num">4</span>` : badge === 'orders' ? `<span class="bd num" data-nav-badge="orders" hidden></span>` : '';
      return `<a href="#${name}" data-go="${name}"${cur}>${ic(icon)}<span>${esc(t(label))}</span>${b}</a>`;
    }).join('');
    const u = state.user || DEMO[portal];
    const mc = u.merchant || DEMO.merchant.merchant;
    const ini = String(mc.name || 'FB').split(/\s+/).filter((w) => /[A-Za-z]/.test(w[0])).map((w) => w[0]).slice(0, 2).join('');
    const ident = portal === 'admin'
      ? ''
      : `<button class="mid" data-go="m-settings" data-params='{"tab":"store"}' aria-label="${esc(t('Store info'))}"><span class="mlogo">${esc(ini)}</span><span style="min-width:0"><span class="nm">${esc(t(mc.name))} ${mc.verified === false ? '' : `<span class="vt" title="${esc(t('Verified'))}">${ic('check')}</span>`}</span><span class="br">${esc(state.branch.id === 'all' ? t('All branches') : t('{b}, {city}', { b: W.t.loc(state.branch.name), city: MK() ? MK().cityName(state.branch.city, state.branch.country) : '' }))}</span></span></button>`;
    const imp = impactCache[portal] || (portal === 'admin' ? { mealsSaved: 52400, co2Tonnes: 24.1, waterLitres: 11800 } : { mealsSaved: 412, co2Tonnes: 1.03, waterLitres: 9800 });
    const impact = `<button class="impact" data-go="${portal === 'admin' ? 'admin-sustainability' : 'm-sustainability'}"><h5>${ic('leaf')}${esc(t("This month's impact"))}<span class="lk">${ic('chev-r', 'flip')}</span></h5><span class="rw" data-impact>${impactHTML(imp)}</span></button>`;
    const foot = portal === 'admin'
      ? `<button class="ucard" data-ov="profile" aria-haspopup="menu"><span class="av on"></span><span style="min-width:0"><b>${esc(t(u.name))}</b><small><i></i>${esc(t(roleLabel(u)))}</small></span><span class="chev">${ic('chev')}</span></button>`
      : `<button class="ucard" data-ov="help">${ic('headset')}<b>${esc(t('Need Help?'))}</b><span class="chev">${ic('chev-r', 'flip')}</span></button>`;
    return `<aside class="side" aria-label="${esc(t('Main navigation'))}">
      <a class="logo" href="#${portal === 'admin' ? 'admin-command-center' : 'm-overview'}" data-go="${portal === 'admin' ? 'admin-command-center' : 'm-overview'}" aria-label="WonderBites"><span class="wm">WonderBites</span><div class="tag">${esc(t('GOOD FINDS. CLOSE BY.'))}</div>${portal === 'admin' ? `<span class="panel">${esc(t('Admin Panel'))}</span>` : ''}</a>
      ${ident}
      <nav class="nav">${items}</nav>
      <div class="side-foot">${impact}${foot}</div>
    </aside>`;
  }
  function impactHTML(m) { return `<span><b>${fmt.compact(m.mealsSaved)}</b><small>${esc(t('meals'))}</small></span><span><b><span class="num">${fmt.text.number(m.co2Tonnes, 1)}t</span></b><small>CO₂</small></span><span><b><span class="num">${fmt.text.compact(m.waterLitres)} L</span></b><small>${esc(t('water'))}</small></span>`; }
  function loadImpact(portal) {
    if (impactCache[portal] || !W.api) return;
    W.api('GET', '/shared/impact', { portal, branchId: portal === 'merchant' ? state.branch.id : undefined }).then(({ data }) => { impactCache[portal] = data; const el = D.querySelector('[data-impact]'); if (el && state.portal === portal) el.innerHTML = impactHTML(data); }).catch(() => {});
  }
  let unreadLoaded = {};
  /* (v1.4) the Orders nav badge = active orders (paid, not yet collected) of the shared store */
  function loadNavBadges(portal) {
    const el = document.querySelector('[data-nav-badge="orders"]'); if (!el || portal !== 'merchant' || !W.api) return;
    W.api('GET', '/merchant/orders', { pageSize: 1, branchId: state.branch && state.branch.id !== 'all' ? state.branch.id : undefined }).then((r) => { const n = ((r.meta || {}).summary || {}).active; if (n) { el.textContent = n; el.hidden = false; } }).catch(() => {});
  }
  function loadUnread(portal) {
    if (unreadLoaded[portal] || !W.api) return; unreadLoaded[portal] = true;
    W.api('GET', '/shared/notifications', { portal, tab: 'unread', pageSize: 1 }).then((r) => { if (state.portal === portal) setUnread((r.summary && r.summary.unreadCount) || r.total || 0); }).catch(() => {});
  }
  function topbar(portal, r, title, sub) {
    const dr = state.dateRange;
    const date = `<button class="tb-ctl" data-ov="date" aria-haspopup="dialog">${ic('cal')}<span>${fmt.range(dr.from, dr.to)}</span>${ic('chev')}</button>`;
    const bell = `<button class="tb-ctl ico" data-ov="notifications" aria-haspopup="dialog" aria-label="${esc(t('Notifications'))}">${ic('bell')}<span class="badge num" data-unread ${state.unread ? '' : 'hidden'}>${state.unread}</span></button>`;
    const lang = `<button class="tb-ctl ico" data-act="lang" aria-label="${esc(state.lang === 'ar' ? 'English' : 'العربية')}" title="${esc(state.lang === 'ar' ? 'English' : 'العربية')}"><span style="font-weight:700;font-size:12px;${state.lang === 'ar' ? 'font-family:Inter,sans-serif' : "font-family:'IBM Plex Sans Arabic',sans-serif"}">${state.lang === 'ar' ? 'EN' : 'ع'}</span></button>`;
    const av = `<button class="tb-av" data-ov="profile" aria-haspopup="menu" aria-label="${esc(t('Profile menu'))}"><span class="av on"></span>${ic('chev')}</button>`;
    const ctl = portal === 'admin'
      ? `${marketBtn()}<button class="tb-ctl search" data-ov="search" aria-haspopup="dialog">${ic('search')}<span class="ellipsis">${esc(t('Search drops, merchants, issues…'))}</span><kbd>/</kbd></button>${date}<button class="tb-ctl" data-ov="export">${ic('upload')}${esc(t('Export'))}</button>${bell}${lang}${av}`
      : `<button class="tb-ctl" data-ov="branch" aria-haspopup="menu" style="min-width:200px">${ic('store')}<span>${esc(state.branch.id === 'all' ? t('All branches') : W.t.loc(state.branch.name))}</span><span class="sp"></span>${ic('chev')}</button>${date}${bell}${lang}${av}`;
    /* (v1.4) every mock figure is demo data: a persistent badge in both portals' top bars */
    const demo = `<span class="demo-badge" role="note" data-demo-badge title="${esc(t('Demo data — not real customers, payments or bank details'))}">${ic('info')}<span>${esc(t('Demo data'))}</span></span>`;
    return `<header class="top"><div class="tt"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><span class="sp"></span>${demo}${ctl}</header>`;
  }
  function marketBtn() {
    const m = state.market || 'all'; const mk = m !== 'all' && MK() ? MK().get(m) : null;
    return `<button class="tb-ctl mkt" data-ov="market" aria-haspopup="menu" aria-label="${esc(t('Market'))}: ${esc(mk ? W.t.loc(mk.name) : t('All markets'))}">${ic('globe')}<span>${esc(mk ? W.t.loc(mk.name) : t('All markets'))}</span>${ic('chev')}</button>`;
  }
  /** "All markets" with more than one currency → amounts in KPIs/charts are converted to the reporting currency */
  function fxNote() {
    if (!MK() || (state.market || 'all') !== 'all') return '';
    const curs = MK().currencies(true); if (curs.length < 2) return '';
    const rc = MK().reportingCurrency(); const f = MK().fx();
    return `<div class="fxbar"><p class="fxn" data-fxnote role="note">${ic('refresh')}<span>${esc(t('Totals converted to {cur} from multiple currencies ({list})', { cur: rc, list: curs.join(', ') }))}${f.updatedAt ? ` · ${esc(t('rates of {d}', { d: fmt.text.date(f.updatedAt, 'short') }))}` : ''}</span></p></div>`;
  }
  function refreshChrome() { /* theme only changes CSS vars; nothing to rebuild */ }

  /* ---------------- render ---------------- */
  let booted = false, cleanups = [], renderSeq = 0;
  function runCleanups() { cleanups.splice(0).forEach((f) => { try { f(); } catch (e) { console.error(e); } }); }
  function render() {
    const seq = ++renderSeq;
    let name = parseHash();
    if (!name) {
      name = state.sessions.admin ? 'admin-command-center' : state.sessions.merchant ? 'm-overview' : 'launcher';
      try { history.replaceState(null, '', '#' + name); } catch (e) { /* */ }
    }
    let r = routes[name];
    const ne = navEntry(name);
    if (!r && ne) r = { name, portal: ne.portal, chrome: true, nav: ne.nav, title: ne.label, placeholder: true };
    if (!r) r = { ...routes['not-found'], name: 'not-found', requested: name };
    const portal = r.portal === 'public' ? null : r.portal;
    if (portal && !state.sessions[portal]) {
      SS.set('wb.after.' + portal, { name, params: paramsFor(name) });
      state.portal = portal;
      return go(LOGIN[portal]);
    }
    if (W.Overlays) W.Overlays.closeAll();
    runCleanups();
    state.portal = portal || (r.portalHint || state.portal);
    syncSession();
    const prev = state.route; state.route = name;
    const params = paramsFor(name);
    const root = D.getElementById('app');
    const ctx = {
      name, params, state, go,
      refresh: () => { if (state.route === name) render(); },
      onCleanup: (fn) => cleanups.push(fn),
      /* setTitle(en, subEn?, {raw}) — raw:true shows data text (e.g. a merchant name) without t(), so it never lands in missing() */
      setTitle: (en, subEn, o) => { if (subEn && typeof subEn === 'object') { o = subEn; subEn = null; } const raw = o && o.raw; const tr = (x) => (raw ? String(x) : t(x)); const h = root.querySelector('.top h1'); if (h) h.innerHTML = esc(tr(en)); const p = root.querySelector('.top p'); if (p && subEn != null) p.textContent = tr(subEn); },
    };
    let page;
    const title = typeof r.title === 'function' ? r.title(ctx) : esc(t(r.title || ''));
    const sub = typeof r.subtitle === 'function' ? r.subtitle(ctx) : r.subtitle ? esc(t(r.subtitle)) : '';
    if (r.chrome && portal) {
      root.innerHTML = `<div class="shell" data-portal="${portal}">${sidebar(portal, r.nav || (ne && ne.nav) || '')}<div class="main">${topbar(portal, r, title, sub)}${portal === 'admin' ? fxNote() : ''}<main class="page anim" id="page" tabindex="-1"></main></div></div>`;
      page = root.querySelector('#page');
      loadImpact(portal); loadUnread(portal); loadNavBadges(portal);
    } else {
      root.innerHTML = `<main class="anim" id="page" tabindex="-1"></main>`;
      page = root.querySelector('#page');
    }
    const h1 = root.querySelector('.top h1');
    D.title = (typeof r.title === 'string' && r.title ? t(r.title) + ' · ' : h1 ? h1.textContent.trim() + ' · ' : '') + 'WonderBites' + (portal ? ' ' + t(portal === 'admin' ? 'Admin' : 'Merchant') : '');
    if (prev !== name) W.scrollTo(0, 0);
    try {
      const fn = r.placeholder ? placeholder : r.render;
      const out = fn ? fn(page, ctx) : null;
      if (out && typeof out.then === 'function') out.catch((e) => { if (seq === renderSeq) fail(page, e); });
    } catch (e) { fail(page, e); }
    emit('route', { name, params });
  }
  function fail(page, e) {
    console.error('[route]', state.route, e);
    page.innerHTML = W.UI ? W.UI.errorState({ text: t('This screen could not be displayed.'), retry: true }) : 'Error';
    page.addEventListener('ui:retry', () => render(), { once: true });
  }
  function placeholder(el, ctx) {
    const ne = navEntry(ctx.name) || {};
    el.innerHTML = `<section class="cd"><div class="cd-b ph-screen"><div><div class="ill">${ic(ctx.state.portal === 'admin' ? 'layers' : 'bag')}</div>
      <h2>${esc(t(ne.label || ctx.name))}</h2><p>${esc(t('This screen is being built by the module team. The route is reserved so every link keeps working.'))}</p>
      <div class="row" style="justify-content:center">${W.UI.btn(ctx.state.portal === 'admin' ? 'Back to Command Center' : 'Back to Overview', { variant: 'primary', icon: 'grid', go: ctx.state.portal === 'admin' ? 'admin-command-center' : 'm-overview' })}</div>
      <p class="faint" style="margin-block-start:14px;font-size:11.5px"><span class="num">#${esc(ctx.name)}</span></p></div></div></section>`;
  }

  /* ---------------- global delegation ---------------- */
  D.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g && !g.hasAttribute('disabled')) {
      e.preventDefault();
      let p = {}; const raw = g.getAttribute('data-params'); if (raw) { try { p = JSON.parse(raw); } catch (x) { p = {}; } }
      go(g.getAttribute('data-go'), p); /* links always set params explicitly so a plain link never reuses stale edit params */
      return;
    }
    const ov = e.target.closest('[data-ov]');
    if (ov && W.Overlays) { e.preventDefault(); W.Overlays.open(ov.getAttribute('data-ov'), ov); return; }
    const a = e.target.closest('[data-act="lang"]');
    if (a) { setLang(state.lang === 'ar' ? 'en' : 'ar'); }
  });
  D.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || '')) && !e.target.isContentEditable && state.portal === 'admin' && W.Overlays && !D.querySelector('.ov-back,.pop')) {
      e.preventDefault(); const b = D.querySelector('[data-ov="search"]'); if (b) W.Overlays.open('search', b);
    }
  });
  W.addEventListener('hashchange', () => render());

  /* ---------------- loader & boot ---------------- */
  const queue = [];
  function load(list) { (list || []).forEach((p) => queue.push(p)); }
  function loadScript(src) {
    return new Promise((res) => {
      const s = D.createElement('script'); s.src = 'assets/js/' + src; s.async = false;
      s.onload = () => res(true);
      s.onerror = () => { console.warn('[App.load] missing module file (skipped):', src); res(false); };
      D.head.appendChild(s);
    });
  }
  async function boot() {
    applyDoc();
    for (let i = 0; i < queue.length; i++) await loadScript(queue[i]); // queue can grow while loading
    for (const fn of bootTasks) { try { await fn(); } catch (e) { console.error('[boot task]', e); } } // (v1.3) e.g. Markets.load()
    if (!state.dateRange || !state.dateRange.from) { const to = (W.api && W.api.DEMO_TODAY) || new Date().toISOString().slice(0, 10); const f = new Date(to + 'T00:00:00Z'); f.setUTCDate(f.getUTCDate() - 30); state.dateRange = { from: f.toISOString().slice(0, 10), to, preset: '30d' }; }
    booted = true;
    render();
  }

  const t = (k, v) => W.t(k, v);
  W.App = {
    state, route, routes, go, on, emit, load, boot, render, login, logout, devLogin, DEMO, NAV, roleLabel,
    setLang, setTheme, setDateRange, setBranch, setUnread, setMarket, market, marketInfo, currency, timeZone, marketsChanged, onBoot, paramsFor, navEntry, store: LS,
    i18n: { add: (d, o) => W.I18N.add(d, o), missing: () => W.I18N.missing(), conflicts: () => W.I18N.conflicts() },
    loc: (x) => W.t.loc(x),
    afterLogin(portal) {
      const nxt = SS.get('wb.after.' + portal, null); SS.set('wb.after.' + portal, null);
      if (nxt && nxt.name && !/login|signup|password|otp/.test(nxt.name)) go(nxt.name, nxt.params);
      else go(portal === 'admin' ? 'admin-command-center' : 'm-overview');
    },
  };
  applyDoc();
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0)); else setTimeout(boot, 0);
})(window, document);
