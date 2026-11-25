/* =====================================================================
   UI helpers — HTML builders + stateful mounts + overlays primitives   [LEAD]
   See CONVENTIONS.md §7 for signatures. Labels passed as English keys are
   translated here (t() is idempotent on Arabic text).
   ===================================================================== */
(function (W, D) {
  'use strict';
  const t = (k, v) => W.t(k, v);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const attrJSON = (o) => esc(JSON.stringify(o || {}));
  let uid = 0; const nid = (p = 'u') => p + (++uid);

  /* ------------------------------ icons ------------------------------ */
  const P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    bag: '<path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    package: '<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
    store: '<path d="M3 9l2-5h14l2 5M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    bars: '<path d="M3 21h18M6 17v-5M11 17V7M16 17v-3M20 17V4"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2M3 10h18M6 6V4h11v2"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    alert: '<path d="M12 3.5l9.5 17h-19L12 3.5z"/><path d="M12 10v4.5M12 17.5v.3"/>',
    headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    gauge: '<path d="M4 18a9 9 0 1 1 16 0"/><path d="M12 14l4-4"/><circle cx="12" cy="14" r="1.3"/>',
    leaf: '<path d="M5 20c0-9 5-15 15-15 0 10-6 15-14 15"/><path d="M5 20c3-4 6-7 10-9"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    file: '<path d="M14 3H6v18h12V7l-4-4z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    upload: '<path d="M12 15V4M7 9l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>',
    chev: '<path d="M6 9l6 6 6-6"/>', 'chev-up': '<path d="M6 15l6-6 6 6"/>',
    'chev-r': '<path d="M9 6l6 6-6 6"/>', 'chev-l': '<path d="M15 6l-6 6 6 6"/>',
    'arrow-r': '<path d="M5 12h14M13 6l6 6-6 6"/>', 'arrow-l': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    checkc: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 9.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    truck: '<path d="M2 6h12v10H2zM14 9h4l4 4v3h-8"/><circle cx="6.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/>',
    walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2.2-6 2.8 3v3M8 12l3-4 3 1 2 3h3M11 8l-1 5"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    branch: '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/>',
    basket: '<path d="M3 10h18l-2 10H5L3 10zM8 10l4-6 4 6M9 14v3M15 14v3"/>',
    pin: '<path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    radio: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    xc: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    loader: '<path d="M12 3a9 9 0 1 0 9 9"/>',
    water: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
    recycle: '<path d="M7 19H3.5l3-5M17 19h3.5l-3-5M9 7.5L12 3l3 4.5M10 19h4"/>',
    co2: '<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>', 'trend-down': '<path d="M3 7l6 6 4-4 8 8M15 17h6v-6"/>',
    coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17v.3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    chat: '<path d="M4 5h16v11H8l-4 4V5z"/><path d="M8 10h8M8 13h5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>',
    pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z"/>',
    dots: '<circle cx="12" cy="5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="19" r="1.3" fill="currentColor"/>',
    'dots-h': '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
    filter: '<path d="M4 5h16l-6 8v6l-4-2v-4L4 5z"/>', sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    cloud: '<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8"/><path d="M12 12v8M9 15l3-3 3 3"/>',
    send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z"/>',
    flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>', tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    bold: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>', italic: '<path d="M10 5h8M6 19h8M14 5l-4 14"/>',
    underline: '<path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14"/>', list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    olist: '<path d="M10 6h10M10 12h10M10 18h10M4 5h1v4M4 9h2M4 15h2l-2 3h2"/>', quote: '<path d="M7 7h4v4H8v3H5v-4zM15 7h4v4h-3v3h-3v-4z"/>',
    undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>', heading: '<path d="M6 4v16M18 4v16M6 12h12"/>',
    percent: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    refund: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>', receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
    gift: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M7.5 8a2.5 2.5 0 1 1 4.5-1.5V8M16.5 8A2.5 2.5 0 1 0 12 6.5V8"/>',
    qr: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
    fire: '<path d="M12 21c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 13.5L7 21l5-3 5 3-1.5-7.5"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6zM3 13h5l1 3h6l1-3h5"/>',
  };
  const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[n] || P.info}</svg>`;

  /* ------------------------------ status registry ------------------------------ */
  const STATUS = {};
  const norm = (s) => String(s || '').trim().toLowerCase().replace(/[\s/-]+/g, '_');
  const status = {
    register(map) { for (const k in map) STATUS[norm(k)] = map[k]; },
    ensure(map) { for (const k in map) if (!STATUS[norm(k)]) STATUS[norm(k)] = map[k]; },
    get(s) { return STATUS[norm(s)] || null; },
    label(s) { const x = STATUS[norm(s)]; return x ? t(x.label) : t(String(s)); },
    all: () => STATUS,
  };
  status.register({
    live: { label: 'Live', tone: 'g', icon: 'radio' }, active: { label: 'Active', tone: 'g', icon: 'checkc' }, verified: { label: 'Verified', tone: 'g', icon: 'checkc' },
    completed: { label: 'Completed', tone: 'g', icon: 'checkc' }, delivered: { label: 'Delivered', tone: 'g', icon: 'checkc' }, picked_up: { label: 'Picked Up', tone: 'g', icon: 'checkc' },
    excellent: { label: 'Excellent', tone: 'g', icon: 'checkc' }, open: { label: 'Open', tone: 'g', icon: 'checkc' }, in_stock: { label: 'In Stock', tone: 'g', icon: 'checkc' },
    approved: { label: 'Approved', tone: 'g', icon: 'checkc' }, resolved: { label: 'Resolved', tone: 'g', icon: 'checkc' }, paid: { label: 'Paid', tone: 'g', icon: 'checkc' }, published: { label: 'Published', tone: 'g', icon: 'checkc' },
    ready: { label: 'Ready', tone: 'o', icon: 'clock' }, pending: { label: 'Pending', tone: 'o', icon: 'clock' }, sold_out: { label: 'Sold Out', tone: 'o', icon: 'minus' },
    watch: { label: 'Watch', tone: 'o', icon: 'alert' }, low_stock: { label: 'Low Stock', tone: 'o', icon: 'alert' }, in_progress: { label: 'In Progress', tone: 'o', icon: 'clock' },
    investigating: { label: 'Investigating', tone: 'o', icon: 'clock' }, scheduled: { label: 'Scheduled', tone: 'o', icon: 'cal' }, held: { label: 'Held', tone: 'o', icon: 'pause' }, invited: { label: 'Invited', tone: 'o', icon: 'mail' },
    blocked: { label: 'Blocked', tone: 'r', icon: 'ban' }, cancelled: { label: 'Cancelled', tone: 'r', icon: 'xc' }, rejected: { label: 'Rejected', tone: 'r', icon: 'xc' },
    disabled: { label: 'Disabled', tone: 'r', icon: 'ban' }, failed: { label: 'Failed', tone: 'r', icon: 'xc' }, unassigned: { label: 'Unassigned', tone: 'r', icon: 'alert' },
    suspended: { label: 'Suspended', tone: 'r', icon: 'pause' }, escalated: { label: 'Escalated', tone: 'r', icon: 'alert' }, critical: { label: 'Critical', tone: 'r', icon: 'alert' }, frozen: { label: 'Frozen', tone: 'r', icon: 'pause' },
    refunded: { label: 'Refunded', tone: 'm', icon: 'refund' }, processing: { label: 'Processing', tone: 'm', icon: 'loader' }, out_for_delivery: { label: 'Out for Delivery', tone: 'm', icon: 'truck' }, new: { label: 'New', tone: 'm', icon: 'info' },
    expired: { label: 'Expired', tone: 'n', icon: 'clock' }, inactive: { label: 'Inactive', tone: 'n', icon: 'minus' }, draft: { label: 'Draft', tone: 'n', icon: 'edit' }, paused: { label: 'Paused', tone: 'n', icon: 'pause' }, closed: { label: 'Closed', tone: 'n', icon: 'checkc' },
  });
  function pill(s, o = {}) {
    const x = status.get(s) || { label: s, tone: o.tone || 'n', icon: 'minus' };
    const tone = o.tone || x.tone; const ic = o.icon || x.icon;
    return `<span class="pl ${tone}${o.dotted ? ' dotted' : ''}"><span class="dot"></span>${icon(ic)}${esc(t(o.label || x.label))}</span>`;
  }
  const chip = (label, o = {}) => `<span class="chip ${o.tone || ''}">${o.icon ? icon(o.icon) : ''}${esc(t(label))}</span>`;

  /* ------------------------------ basics ------------------------------ */
  function btn(label, o = {}) {
    const v = o.variant || 'secondary';
    const cls = `btn ${v} ${o.size || ''} ${o.cls || ''}`;
    const go = o.go ? ` data-go="${esc(o.go)}"${o.params ? ` data-params="${attrJSON(o.params)}"` : ''}` : '';
    const inner = (o.icon ? icon(o.icon, o.iconCls || '') : '') + (v === 'icon' ? `<span class="sr-only">${esc(t(label))}</span>` : esc(t(label))) + (o.iconEnd ? icon(o.iconEnd, 'flip') : '');
    const ttl = v === 'icon' ? ` title="${esc(t(label))}" aria-label="${esc(t(label))}"` : '';
    if (o.href) return `<a class="${cls}" href="${esc(o.href)}"${ttl}${go} ${o.attrs || ''}>${inner}</a>`;
    return `<button type="${o.type || 'button'}" class="${cls}"${ttl}${go}${o.disabled ? ' disabled' : ''} ${o.attrs || ''}>${inner}</button>`;
  }
  const link = (label = 'View All', route, params) => `<a class="lnk" href="#${esc(route || '')}" data-go="${esc(route || '')}"${params ? ` data-params="${attrJSON(params)}"` : ''}>${esc(t(label))}${icon('chev-r', 'flip')}</a>`;
  const TONE = { rose: 't-rose', lime: 't-green', green: 't-green', orange: 't-orange', mauve: 't-mauve', berry: 't-berry' };
  function card(o = {}) {
    const tone = o.tone || 'rose';
    const hero = o.hero ? ` hero hero-${o.hero}` : '';
    const head = o.title != null || o.actions ? `<header class="cd-h"><div class="cd-t">${o.icon ? `<span class="cd-ic ${TONE[tone] || 't-rose'}">${icon(o.icon)}</span>` : ''}${o.title != null ? `<h3>${o.titleHtml ? o.title : esc(t(o.title))}</h3>` : ''}${o.count != null ? `<span class="cnt">${o.count}</span>` : ''}${o.sub ? `<span class="cd-sub">${o.subHtml ? o.sub : esc(t(o.sub))}</span>` : ''}${o.badge || ''}</div>${o.actions ? `<div class="cd-a">${o.actions}</div>` : ''}</header>` : '';
    return `<section class="cd tone-${tone}${hero} ${o.cls || ''}"${o.id ? ` id="${esc(o.id)}"` : ''}${o.attrs ? ' ' + o.attrs : ''}>${head}<div class="cd-b${o.flush ? ' flush' : ''}">${o.body || ''}</div>${o.footer ? `<div class="cd-f">${o.footer}</div>` : ''}</section>`;
  }
  function kpi(o = {}) {
    const tone = o.tone || 'rose';
    const d = o.delta ? `<span class="dl ${o.delta.dir === 'down' ? 'dn' : o.delta.dir === 'flat' ? 'flat' : 'up'}">${o.delta.dir === 'flat' ? '' : icon(o.delta.dir === 'down' ? 'down' : 'up')}${fmt.num(o.delta.value)}</span>` : '';
    const sp = o.spark ? W.Charts.spark(o.spark, { color: o.sparkColor || ((o.delta && o.delta.good === false) || (o.delta && o.delta.dir === 'down' && o.delta.good !== true) ? 'rose' : 'lime'), cls: 'k-sp' }) : '';
    const go = o.go ? ` data-go="${esc(o.go)}" role="link" tabindex="0"${o.params ? ` data-params="${attrJSON(o.params)}"` : ''}` : '';
    return `<section class="cd kpi tone-${tone}${o.spark ? '' : ' nospark'}"${go}><div class="cd-b"><div class="k-top"><span class="cd-ic ${TONE[tone]}">${icon(o.icon || 'activity')}</span><span class="lb">${esc(t(o.label))}</span></div><div class="k-v">${o.value}${o.badge ? ' ' + o.badge : ''}</div><div class="k-f">${d}<span>${o.foot || ''}</span></div>${sp}</div></section>`;
  }
  /** Map a contract Kpi {key,label,value,format,delta,deltaUnit,trend,comparison,caption,sparkline,badge} to UI.kpi */
  function kpiData(k, o = {}) {
    const dir = k.trend || (k.delta > 0 ? 'up' : k.delta < 0 ? 'down' : 'flat');
    const good = o.goodWhen ? o.goodWhen === dir : dir !== 'down';
    const foot = o.foot != null ? o.foot : k.caption ? `<b class="${o.captionTone || ''}">${esc(t(k.caption))}</b>` : esc(t(k.comparison || ''));
    return kpi({ label: o.label || k.label, icon: o.icon, tone: o.tone, value: o.value || fmt.kpi(k), delta: k.delta != null ? { value: fmt.delta(k), dir, good } : null, foot,
      spark: k.sparkline, sparkColor: good ? 'lime' : 'rose', badge: k.badge ? `<span class="crit">${fmt.iso(esc(t(k.badge)))}</span>` : o.badge || '', go: o.go, params: o.params });
  }
  const kpis = (items, cols) => `<div class="grid g-${cols || items.length}">${items.map((x) => (typeof x === 'string' ? x : kpi(x))).join('')}</div>`;
  /** Compact dropdown (e.g. period "This Week ▾"); emits 'ui:select' {name, value} on the button */
  const select = (o) => { const cur = (o.options || []).find((x) => String(x.value) === String(o.value)) || o.options[0]; return `<button type="button" class="msel" data-select="${esc(o.name)}" data-value="${esc(cur.value)}" data-options="${attrJSON(o.options)}" aria-haspopup="menu"${o.label ? ` aria-label="${esc(t(o.label))}: ${esc(t(cur.label))}"` : ''}><span>${esc(t(cur.label))}</span>${icon('chev')}</button>`; };
  const avatar = (name, o = {}) => { const ini = String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase(); const s = o.size ? `width:${o.size}px;height:${o.size}px;` : ''; return o.img ? `<span class="ph ${o.img}" style="${s}"></span>` : `<span class="avt ${o.square ? 'sq' : ''}" style="${s}" aria-hidden="true">${esc(ini)}</span>`; };
  const thumb = (v = 'ph1', size) => `<span class="ph ${v} ${size || ''}" aria-hidden="true"></span>`;
  const empty = (o = {}) => `<div class="empty" role="status"><span class="ei">${icon(o.icon || 'inbox')}</span><h4>${esc(t(o.title || 'Nothing here yet'))}</h4>${o.text ? `<p>${esc(t(o.text))}</p>` : ''}${o.action || ''}</div>`;
  const errorState = (o = {}) => `<div class="errst" role="alert"><span class="ei">${icon('alert')}</span><h4>${esc(t(o.title || 'Something went wrong'))}</h4><p>${esc(t(o.text || 'We couldn’t load this data. Please try again.'))}</p>${o.retry !== false ? `<button class="btn secondary sm" data-retry>${icon('refresh')}${esc(t('Retry'))}</button>` : ''}</div>`;
  function skeleton(kind = 'table', n = 5) {
    const bar = (w, h = 12) => `<span class="sk" style="width:${w};height:${h}px"></span>`;
    if (kind === 'kpis') return `<div class="grid g-${n}" aria-busy="true">${Array.from({ length: n }, () => '<div class="sk-kpi"></div>').join('')}</div>`;
    if (kind === 'cards') return `<div class="grid g-${Math.min(n, 3)}" aria-busy="true">${Array.from({ length: n }, () => '<div class="sk-card"></div>').join('')}</div>`;
    if (kind === 'card') return `<div class="sk-card" aria-busy="true"></div>`;
    if (kind === 'form') return `<div aria-busy="true" style="display:grid;gap:14px;padding:var(--pad)">${Array.from({ length: n }, () => `<div style="display:grid;gap:6px">${bar('120px', 10)}${bar('100%', 40)}</div>`).join('')}</div>`;
    if (kind === 'list') return `<div aria-busy="true">${Array.from({ length: n }, () => `<div class="sk-row"><span class="sk" style="width:32px;height:32px;border-radius:10px"></span><span style="flex:1;display:grid;gap:6px">${bar('60%')}${bar('35%', 10)}</span></div>`).join('')}</div>`;
    return `<div aria-busy="true">${Array.from({ length: n }, () => `<div class="sk-row"><span class="sk" style="width:34px;height:34px"></span>${bar('22%')}${bar('14%')}${bar('12%')}<span class="sp"></span>${bar('70px', 22)}</div>`).join('')}</div>`;
  }
  function pagination({ page = 1, pageSize = 10, total = 0 }) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const from = total ? (page - 1) * pageSize + 1 : 0, to = Math.min(total, page * pageSize);
    const nums = []; for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
    return `<nav class="pager" aria-label="${esc(t('Pagination'))}"><span>${t('Showing {a}–{b} of {n}', { a: fmt.number(from), b: fmt.number(to), n: fmt.number(total) })}</span><span class="pages">
      <button data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="${esc(t('Previous page'))}">${icon('chev-l', 'flip')}</button>
      ${nums.map((n) => (n === '…' ? '<span class="faint" style="padding:0 4px">…</span>' : `<button data-page="${n}" ${n === page ? 'aria-current="page"' : ''}><span class="num">${n}</span></button>`)).join('')}
      <button data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="${esc(t('Next page'))}">${icon('chev-r', 'flip')}</button></span></nav>`;
  }
  const tabs = (o) => `<div class="tabs ${o.variant || ''}" role="tablist" data-tabs="${esc(o.name || '')}"${o.label ? ` aria-label="${esc(t(o.label))}"` : ''}>${o.tabs.map((x) => `<button role="tab" type="button" data-value="${esc(x.id)}" aria-selected="${x.id === o.active}" tabindex="${x.id === o.active ? 0 : -1}">${x.icon ? icon(x.icon) : ''}${esc(t(x.label))}${x.count != null ? `<span class="cnt">${fmt.number(x.count)}</span>` : ''}</button>`).join('')}</div>`;
  const segmented = (o) => `<div class="seg" role="group" data-seg="${esc(o.name || '')}"${o.label ? ` aria-label="${esc(t(o.label))}"` : ''}>${o.options.map((x) => `<button type="button" data-value="${esc(x.value)}" aria-pressed="${String(x.value) === String(o.value)}">${x.icon ? icon(x.icon) : ''}${esc(t(x.label))}</button>`).join('')}</div>`;
  const toggle = (o) => { const id = o.id || nid('tg'); const b = `<button type="button" class="tog" role="switch" id="${id}" data-name="${esc(o.name || '')}" aria-checked="${!!o.checked}"${o.disabled ? ' disabled' : ''}${o.label ? ` aria-label="${esc(t(o.label))}"` : o.labelledby ? ` aria-labelledby="${esc(o.labelledby)}"` : ''}></button>`; return o.withState === false ? b : `<span class="tog-row"><span class="st ${o.checked ? 'on' : ''}" aria-hidden="true">${esc(t(o.checked ? 'On' : 'Off'))}</span>${b}</span>`; };
  const stepper = (o) => `<ol class="stepper" aria-label="${esc(t('Progress'))}">${o.steps.map((s, i) => `<li class="${i < o.current ? 'done' : ''}"${i === o.current ? ' aria-current="step"' : ''}><span class="n">${i < o.current ? icon('check') : `<span class="num">${i + 1}</span>`}</span><span class="ellipsis">${esc(t(s))}</span></li>`).join('')}</ol>`;

  /* ------------------------------ form fields ------------------------------ */
  function opts(list, value) { return (list || []).map((o) => { const v = typeof o === 'object' ? o.value : o; const l = typeof o === 'object' ? o.label : o; return `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(t(l))}</option>`; }).join(''); }
  function field(o = {}) {
    const id = o.id || nid('f'); const type = o.type || 'text';
    const req = o.required ? ' required aria-required="true"' : '';
    const common = `id="${id}" name="${esc(o.name || '')}"${req}${o.disabled ? ' disabled' : ''}${o.placeholder ? ` placeholder="${esc(t(o.placeholder))}"` : ''}${o.min != null ? ` min="${o.min}"` : ''}${o.max != null ? ` max="${o.max}"` : ''}${o.minlength ? ` minlength="${o.minlength}"` : ''}${o.maxlength ? ` maxlength="${o.maxlength}"` : ''}${o.pattern ? ` pattern="${esc(o.pattern)}"` : ''}${o.step ? ` step="${o.step}"` : ''}${o.autocomplete ? ` autocomplete="${o.autocomplete}"` : ''}${o.match ? ` data-match="${esc(o.match)}"` : ''} aria-describedby="${id}-e"`;
    const lbl = o.label ? `<label for="${id}">${esc(t(o.label))}${o.required ? ' <em aria-hidden="true">*</em>' : ''}</label>` : '';
    let ctl;
    if (type === 'textarea') ctl = `<div class="inp area"><textarea ${common} rows="${o.rows || 4}">${esc(o.value || '')}</textarea></div>`;
    else if (type === 'select') ctl = `<div class="inp sel">${o.icon ? icon(o.icon) : ''}<select ${common}>${o.placeholder ? `<option value="">${esc(t(o.placeholder))}</option>` : ''}${opts(o.options, o.value)}</select><span class="chev">${icon('chev')}</span></div>`;
    else if (type === 'multiselect') return `<div class="fld${o.cols === 2 ? ' full' : ''}" data-field="${esc(o.name)}" data-type="multiselect"${o.required ? ' data-required' : ''}><span class="lbl" id="${id}">${esc(t(o.label || ''))}${o.required ? ' <em>*</em>' : ''}</span><div class="ms" role="group" aria-labelledby="${id}">${(o.options || []).map((x) => { const v = typeof x === 'object' ? x.value : x; const l = typeof x === 'object' ? x.label : x; return `<label><input type="checkbox" name="${esc(o.name)}" value="${esc(v)}"${(o.value || []).map(String).includes(String(v)) ? ' checked' : ''}><span>${esc(t(l))}</span></label>`; }).join('')}</div>${o.hint ? `<span class="hint">${esc(t(o.hint))}</span>` : ''}<span class="err" id="${id}-e"></span></div>`;
    else if (type === 'checkbox' || type === 'radio') {
      if (o.options) return `<div class="fld" data-field="${esc(o.name)}"><span class="lbl">${esc(t(o.label || ''))}</span><div class="row wrap" role="${type === 'radio' ? 'radiogroup' : 'group'}"${o.required && type === 'radio' ? ' aria-required="true"' : ''}>${o.options.map((x) => `<label class="check"><input type="${type}" name="${esc(o.name)}" value="${esc(x.value)}"${String(x.value) === String(o.value) ? ' checked' : ''}${o.required && type === 'radio' ? ' required' : ''}>${esc(t(x.label))}</label>`).join('')}</div><span class="err" id="${id}-e"></span></div>`;
      return `<div class="fld" data-field="${esc(o.name)}"><label class="check"><input type="checkbox" ${common}${o.checked || o.value === true ? ' checked' : ''}>${esc(t(o.label || ''))}</label><span class="err" id="${id}-e"></span></div>`;
    } else {
      const it = type === 'money' ? 'number' : type === 'search' ? 'search' : type === 'password' ? 'password' : type;
      /* (v1.3) money inputs take their currency from o.currency or the context (branch / market); a prefix that is a currency code is treated the same way */
      const isCur = (x) => !!(x && W.Markets && W.Markets.list().some((m) => m.currency === x || (m.currencyLabel && (m.currencyLabel.en === x || m.currencyLabel.ar === x))));
      const curCode = type === 'money' ? o.currency || null : null;
      const pre = type === 'money' && (!o.prefix || isCur(o.prefix)) ? currencyPrefix(curCode) : o.prefix || '';
      const eyeBtn = type === 'password' ? `<button type="button" class="btn link" data-reveal aria-label="${esc(t('Show password'))}">${icon('eye')}</button>` : '';
      ctl = `<div class="inp">${o.icon ? icon(o.icon) : ''}${pre ? `<span class="pre"${type === 'money' ? ' data-cur' : ''}>${esc(type === 'money' ? pre : t(pre))}</span>` : ''}<input type="${it}" ${common} value="${esc(o.value == null ? '' : o.value)}"${type === 'money' ? ' step="0.01" min="0" inputmode="decimal"' : ''}${['number', 'money', 'tel', 'email', 'url'].includes(type) ? ' dir="ltr"' : ''}>${o.suffix ? `<span class="suf">${esc(t(o.suffix))}</span>` : ''}${eyeBtn}</div>`;
    }
    return `<div class="fld${o.cols === 2 || o.full ? ' full' : ''}" data-field="${esc(o.name || '')}">${lbl}${ctl}${o.hint ? `<span class="hint">${esc(t(o.hint))}</span>` : ''}<span class="err" id="${id}-e" aria-live="polite"></span></div>`;
  }
  const dzFiles = new WeakMap();
  function dropzone(o = {}) {
    const id = nid('dz');
    return `<div class="fld${o.full ? ' full' : ''}" data-field="${esc(o.name || 'files')}" data-type="files"${o.required ? ' data-required' : ''}>${o.label ? `<span class="lbl">${esc(t(o.label))}${o.required ? ' <em>*</em>' : ''}</span>` : ''}
      <div class="drop" role="button" tabindex="0" data-drop="${esc(o.name || 'files')}" aria-describedby="${id}-h"><span class="ei">${icon('cloud')}</span><span><b>${esc(t('Drop or select file'))}</b></span><small id="${id}-h">${esc(t(o.hint || 'PNG or JPG, up to 5 MB'))}</small>
      <input type="file" hidden ${o.accept ? `accept="${esc(o.accept)}"` : 'accept="image/*"'} ${o.multiple === false ? '' : 'multiple'}></div><div class="previews">${(o.files || []).map((f) => `<figure data-seed>${thumb(f)}<button type="button" data-rm aria-label="${esc(t('Remove'))}">${icon('x')}</button></figure>`).join('')}</div><span class="err"></span></div>`;
  }
  function richText(o = {}) {
    const B = (cmd, ic, label) => `<button type="button" data-cmd="${cmd}" aria-label="${esc(t(label))}" title="${esc(t(label))}">${icon(ic)}</button>`;
    return `<div class="fld${o.full === false ? '' : ' full'}" data-field="${esc(o.name || 'content')}" data-type="rte">${o.label ? `<span class="lbl">${esc(t(o.label))}</span>` : ''}<div class="rte"><div class="tb" role="toolbar" aria-label="${esc(t('Formatting'))}">${B('bold', 'bold', 'Bold')}${B('italic', 'italic', 'Italic')}${B('underline', 'underline', 'Underline')}<span class="sep"></span>${B('h2', 'heading', 'Heading')}${B('insertUnorderedList', 'list', 'Bulleted list')}${B('insertOrderedList', 'olist', 'Numbered list')}${B('quote', 'quote', 'Quote')}${B('link', 'link', 'Insert link')}<span class="sep"></span>${B('undo', 'undo', 'Undo').replace('<button ', '<button aria-disabled="true" ')}</div><div class="ed" contenteditable="true" role="textbox" aria-multiline="true" data-name="${esc(o.name || 'content')}" data-placeholder="${esc(t(o.placeholder || 'Start writing…'))}">${o.value || ''}</div></div></div>`;
  }
  function formValues(form) {
    const v = {};
    form.querySelectorAll('input[name],select[name],textarea[name]').forEach((el) => {
      if (el.type === 'file') return;
      const n = el.name;
      if (el.closest('.ms')) { v[n] = v[n] || []; if (el.checked) v[n].push(el.value); return; }
      if (el.type === 'checkbox') { v[n] = el.checked; return; }
      if (el.type === 'radio') { if (el.checked) v[n] = el.value; else if (!(n in v)) v[n] = ''; return; }
      v[n] = el.type === 'number' && el.value !== '' ? Number(el.value) : el.value.trim();
    });
    form.querySelectorAll('.tog[data-name]').forEach((b) => { if (b.dataset.name) v[b.dataset.name] = b.getAttribute('aria-checked') === 'true'; });
    form.querySelectorAll('.ed[data-name]').forEach((e) => (v[e.dataset.name] = e.innerHTML));
    form.querySelectorAll('[data-drop]').forEach((d) => (v[d.dataset.drop] = (dzFiles.get(d) || []).map((f) => ({ name: f.name, size: f.size, type: f.type })).concat([...d.parentElement.querySelectorAll('[data-seed]')].map(() => ({ name: 'existing.jpg' })))));
    form.querySelectorAll('.seg[data-seg]').forEach((s) => { const on = s.querySelector('[aria-pressed="true"]'); if (s.dataset.seg) v[s.dataset.seg] = on ? on.dataset.value : ''; });
    return v;
  }
  /** (v1.4) show a server-side field error inline (e.g. 422 details) — same look as client validation */
  function fieldError(form, name, msg) { const c = form && form.querySelector(`[name="${name}"]`); const f = c && c.closest('.fld'); if (!f) return false; f.classList.add('invalid'); const e = f.querySelector('.err'); if (e) e.textContent = msg; c.setAttribute('aria-invalid', 'true'); c.focus(); return true; }
  function validate(form) {
    const errors = {};
    form.querySelectorAll('.fld').forEach((f) => { f.classList.remove('invalid'); const e = f.querySelector('.err'); if (e) e.textContent = ''; });
    const values = formValues(form);
    const set = (el, msg) => { const f = el.closest('.fld'); if (!f) return; f.classList.add('invalid'); const e = f.querySelector('.err'); if (e) e.textContent = msg; const n = f.dataset.field; if (n) errors[n] = msg; const c = f.querySelector('input,select,textarea,[data-drop]'); if (c) c.setAttribute('aria-invalid', 'true'); };
    form.querySelectorAll('input[name],select[name],textarea[name]').forEach((el) => {
      el.removeAttribute('aria-invalid');
      if (el.disabled || el.type === 'file' || el.closest('.ms')) return;
      if (el.type === 'radio') { if (el.required && !form.querySelector(`input[type="radio"][name="${W.CSS && CSS.escape ? CSS.escape(el.name) : el.name}"]:checked`)) set(el, t('Please choose an option.')); return; } // a radio's value is never empty — validate the group
      const val = el.type === 'checkbox' ? el.checked : el.value.trim();
      if (el.required && (val === '' || val === false)) return set(el, t('This field is required.'));
      if (val === '' || val === false) return;
      if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) return set(el, t('Enter a valid email address.'));
      if (el.type === 'tel' && !/^[+\d][\d\s-]{6,}$/.test(val)) return set(el, t('Enter a valid phone number.'));
      if (el.minLength > 0 && val.length < el.minLength) return set(el, t('Use at least {n} characters.', { n: el.minLength }));
      if (el.pattern && !new RegExp('^(?:' + el.pattern + ')$').test(val)) return set(el, t('Please match the requested format.'));
      if (el.type === 'number') { const n = Number(val); if (el.min !== '' && n < Number(el.min)) return set(el, t('Must be at least {n}.', { n: el.min })); if (el.max !== '' && n > Number(el.max)) return set(el, t('Must be at most {n}.', { n: el.max })); }
      if (el.dataset.match) { const o = form.querySelector(`[name="${el.dataset.match}"]`); if (o && o.value !== el.value) return set(el, t('Passwords do not match.')); }
    });
    form.querySelectorAll('.fld[data-required][data-type="multiselect"]').forEach((f) => { if (!(values[f.dataset.field] || []).length) set(f.querySelector('input'), t('Select at least one option.')); });
    form.querySelectorAll('.fld[data-required][data-type="files"]').forEach((f) => { if (!(values[f.dataset.field] || []).length) set(f.querySelector('[data-drop]'), t('Please upload at least one file.')); });
    const ok = !Object.keys(errors).length;
    if (!ok) { const first = form.querySelector('.fld.invalid input,.fld.invalid select,.fld.invalid textarea,.fld.invalid [data-drop]'); if (first) first.focus(); }
    return { ok, values, errors };
  }

  /* ------------------------------ events ------------------------------ */
  function on(root, type, sel, fn) { root.addEventListener(type, (e) => { const el = e.target.closest(sel); if (el && root.contains(el)) fn(e, el); }); }
  const fire = (el, name, detail) => el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  D.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab && tab.parentElement.matches('[data-tabs]')) { selectTab(tab); return; }
    const sb = e.target.closest('.seg[data-seg] > button');
    if (sb) { sb.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === sb))); fire(sb.parentElement, 'ui:seg', { name: sb.parentElement.dataset.seg, value: sb.dataset.value }); return; }
    const tg = e.target.closest('.tog');
    if (tg && !tg.disabled) { const v = tg.getAttribute('aria-checked') !== 'true'; tg.setAttribute('aria-checked', String(v)); const st = tg.parentElement.querySelector('.st'); if (st) { st.textContent = t(v ? 'On' : 'Off'); st.classList.toggle('on', v); } fire(tg, 'ui:toggle', { name: tg.dataset.name, value: v }); return; }
    const rv = e.target.closest('[data-reveal]');
    if (rv) { const i = rv.parentElement.querySelector('input'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; rv.innerHTML = icon(show ? 'eye-off' : 'eye'); rv.setAttribute('aria-label', t(show ? 'Hide password' : 'Show password')); return; }
    const ms = e.target.closest('[data-select]');
    if (ms) { const optsL = JSON.parse(ms.dataset.options); menu(ms, optsL.map((x) => ({ label: x.label, icon: String(x.value) === ms.dataset.value ? 'check' : undefined, run: () => { ms.dataset.value = x.value; ms.querySelector('span').textContent = t(x.label); fire(ms, 'ui:select', { name: ms.dataset.select, value: x.value }); } })), { align: 'end' }); return; }
    const rt = e.target.closest('[data-retry]');
    if (rt) { fire(rt, 'ui:retry', {}); return; }
    const dz = e.target.closest('[data-drop]');
    if (dz && !e.target.closest('[data-rm]')) { dz.querySelector('input[type=file]').click(); return; }
    const rm = e.target.closest('.previews [data-rm]');
    if (rm) { const fig = rm.closest('figure'); const d = fig.parentElement.parentElement.querySelector('[data-drop]'); const i = [...fig.parentElement.children].indexOf(fig) - fig.parentElement.querySelectorAll('[data-seed]').length; if (!fig.hasAttribute('data-seed')) { const list = dzFiles.get(d) || []; list.splice(i, 1); dzFiles.set(d, list); } fig.remove(); fire(d, 'ui:change', { name: d.dataset.drop }); return; }
    const cmd = e.target.closest('.rte [data-cmd]');
    if (cmd) { e.preventDefault(); rteCmd(cmd); }
  });
  D.addEventListener('keydown', (e) => {
    const tab = e.target.closest && e.target.closest('[data-tabs] [role="tab"]');
    if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      const list = [...tab.parentElement.querySelectorAll('[role="tab"]')]; let i = list.indexOf(tab);
      const rtl = D.documentElement.dir === 'rtl';
      if (e.key === 'Home') i = 0; else if (e.key === 'End') i = list.length - 1; else i = (i + ((e.key === 'ArrowRight') !== rtl ? 1 : -1) + list.length) % list.length;
      list[i].focus(); selectTab(list[i]); e.preventDefault();
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-drop]')) { e.preventDefault(); e.target.querySelector('input[type=file]').click(); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.kpi[data-go]')) { e.preventDefault(); e.target.click(); }
  });
  function selectTab(tab) { const list = tab.parentElement; list.querySelectorAll('[role="tab"]').forEach((b) => { const on = b === tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }); fire(list, 'ui:tab', { name: list.dataset.tabs, value: tab.dataset.value }); }
  D.addEventListener('change', (e) => { const inp = e.target; if (inp.type === 'file' && inp.closest('[data-drop]')) { addFiles(inp.closest('[data-drop]'), inp.files); inp.value = ''; } });
  ['dragover', 'dragenter'].forEach((ev) => D.addEventListener(ev, (e) => { const d = e.target.closest && e.target.closest('[data-drop]'); if (d) { e.preventDefault(); d.classList.add('over'); } }));
  ['dragleave', 'drop'].forEach((ev) => D.addEventListener(ev, (e) => { const d = e.target.closest && e.target.closest('[data-drop]'); if (d) { e.preventDefault(); d.classList.remove('over'); if (ev === 'drop') addFiles(d, e.dataTransfer.files); } }));
  function addFiles(d, files) {
    const inp = d.querySelector('input[type=file]'); const multiple = inp.multiple;
    let list = dzFiles.get(d) || []; const prev = d.parentElement.querySelector('.previews');
    const arr = [...files].filter((f) => f.size <= 5 * 1024 * 1024 || (toast(t('{name} is larger than 5 MB.', { name: f.name }), { tone: 'error' }), false));
    if (!multiple) { list = []; prev.innerHTML = ''; }
    arr.forEach((f) => { list.push(f); const url = /^image\//.test(f.type) ? URL.createObjectURL(f) : ''; prev.insertAdjacentHTML('beforeend', `<figure>${url ? `<img src="${url}" alt="${esc(f.name)}">` : `<span class="ph ph5" title="${esc(f.name)}"></span>`}<button type="button" data-rm aria-label="${esc(t('Remove'))}">${icon('x')}</button></figure>`); });
    dzFiles.set(d, list); d.closest('.fld').classList.remove('invalid'); fire(d, 'ui:change', { name: d.dataset.drop, files: list });
  }
  function rteCmd(b) {
    const ed = b.closest('.rte').querySelector('.ed'); ed.focus(); const c = b.dataset.cmd;
    if (c === 'h2') D.execCommand('formatBlock', false, 'h2');
    else if (c === 'quote') D.execCommand('formatBlock', false, 'blockquote');
    else if (c === 'link') {
      const sel = W.getSelection(); const range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
      modal({ title: t('Insert link'), size: 'sm', body: `<form novalidate>${field({ type: 'url', name: 'url', label: 'Link URL', required: true, placeholder: 'https://' })}</form>`, actions: [{ label: 'Cancel', variant: 'secondary', close: true }, { label: 'Insert', variant: 'primary', run: (m) => { const r = validate(m.el.querySelector('form')); if (!r.ok) return false; ed.focus(); if (range) { sel.removeAllRanges(); sel.addRange(range); } D.execCommand('createLink', false, r.values.url); m.close(); } }] });
    } else D.execCommand(c, false, null);
    rteState(b.closest('.rte'));
  }
  /* reflect bold/italic/underline at the caret on the toolbar (aria-pressed) */
  function rteState(rte) {
    if (!rte) return;
    rte.querySelectorAll('[data-cmd="bold"],[data-cmd="italic"],[data-cmd="underline"]').forEach((x) => { let on = false; try { on = D.queryCommandState(x.dataset.cmd); } catch (e) { /* */ } x.setAttribute('aria-pressed', String(!!on)); });
    const u = rte.querySelector('[data-cmd="undo"]'); if (u) { let can = true; try { can = D.queryCommandEnabled('undo'); } catch (e) { /* */ } u.setAttribute('aria-disabled', String(!can)); }
  }
  D.addEventListener('selectionchange', () => { const s = W.getSelection(); const n = s && s.anchorNode; const ed = n && (n.nodeType === 1 ? n : n.parentElement); const rte = ed && ed.closest && ed.closest('.rte'); if (rte) rteState(rte); });

  /* ------------------------------ overlays: modal / drawer / popover / menu / toast ------------------------------ */
  const stack = [];
  function trap(e, el) {
    if (e.key !== 'Tab') return;
    const f = [...el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]')].filter((x) => x.offsetParent !== null || x === D.activeElement);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && D.activeElement === first) { last.focus(); e.preventDefault(); } else if (!e.shiftKey && D.activeElement === last) { first.focus(); e.preventDefault(); }
  }
  D.addEventListener('keydown', (e) => {
    const top = stack[stack.length - 1]; if (!top) return;
    if (e.key === 'Escape') { e.preventDefault(); top.close(); return; }
    if (top.modal) trap(e, top.el);
  });
  D.addEventListener('mousedown', (e) => { const top = stack[stack.length - 1]; if (top && !top.modal && !top.el.contains(e.target) && !(top.anchor && top.anchor.contains(e.target))) top.close(); });
  function actionsHTML(actions) { return (actions || []).map((a, i) => `<button type="${a.submit ? 'submit' : 'button'}" class="btn ${a.variant || 'secondary'}" data-ai="${i}">${a.icon ? icon(a.icon) : ''}${esc(t(a.label))}</button>`).join(''); }
  function dialog(kind, o) {
    const back = D.createElement('div'); back.className = 'ov-back';
    const el = D.createElement('div'); const hid = nid('dlg');
    el.className = kind === 'drawer' ? 'drawer' : `modal ${o.size || ''}`;
    el.setAttribute('role', o.role || 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', hid); el.tabIndex = -1;
    if (kind === 'drawer' && o.width) el.style.width = `min(${o.width}px,100vw)`;
    el.innerHTML = `<div class="ov-h">${o.icon ? `<span class="cd-ic ${TONE[o.tone || 'rose']}">${icon(o.icon)}</span>` : ''}<h2 id="${hid}">${o.titleHtml ? o.title : esc(t(o.title || ''))}</h2>${o.headerExtra || ''}<button class="x" type="button" data-close aria-label="${esc(t('Close'))}">${icon('x')}</button></div><div class="ov-b">${o.body || ''}</div>${o.actions && o.actions.length ? `<div class="ov-f">${actionsHTML(o.actions)}</div>` : ''}`;
    const opener = D.activeElement;
    D.body.append(back, el);
    const api = { el, body: el.querySelector('.ov-b'), modal: true, closed: false,
      close(v) { if (api.closed) return; api.closed = true; back.remove(); el.remove(); const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1); if (o.onClose) o.onClose(v); if (opener && opener.focus && D.contains(opener)) opener.focus(); },
      setBusy(b) { el.querySelectorAll('.ov-f .btn').forEach((x) => (x.disabled = b)); },
    };
    stack.push(api);
    back.addEventListener('click', () => (o.dismissible === false ? null : api.close()));
    el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-close]')) return api.close();
      const b = e.target.closest('[data-ai]'); if (!b) return;
      const a = o.actions[+b.dataset.ai]; if (a.close) return api.close(false);
      if (a.run) { const old = b.innerHTML; b.innerHTML = `<span class="spin" aria-hidden="true"></span>${esc(t(a.label))}`; api.setBusy(true);
        try { const r = await a.run(api); if (r !== false && a.autoClose) api.close(true); } catch (err) { toast(err && err.message ? err.message : t('Something went wrong. Please try again.'), { tone: 'error' }); }
        finally { if (!api.closed) { b.innerHTML = old; api.setBusy(false); } } }
    });
    const form = el.querySelector('form'); if (form) form.addEventListener('submit', (e) => { e.preventDefault(); const p = o.actions && o.actions.findIndex((a) => a.variant === 'primary' || a.variant === 'danger'); if (p >= 0) el.querySelector(`[data-ai="${p}"]`).click(); });
    if (o.onOpen) o.onOpen(api);
    const fi = el.querySelector('[autofocus]') || el.querySelector('.ov-b input:not([type=hidden]),.ov-b select,.ov-b textarea') || el.querySelector('.ov-f .btn.primary,.ov-f .btn.danger') || el;
    setTimeout(() => fi.focus(), 0);
    return api;
  }
  const modal = (o) => dialog('modal', o);
  const drawer = (o) => dialog('drawer', o);
  function confirm(o = {}) {
    return new Promise((res) => {
      let done = false;
      modal({ title: o.title || 'Are you sure?', size: 'sm', role: 'alertdialog', icon: o.danger ? 'alert' : o.icon || 'info', tone: o.danger ? 'berry' : 'mauve',
        body: `<p class="muted" style="font-size:13.5px">${o.html ? o.text : esc(t(o.text || ''))}</p>`,
        actions: [{ label: o.cancel || 'Cancel', variant: 'secondary', close: true }, { label: o.confirm || 'Confirm', variant: o.danger ? 'danger' : 'primary', run: (m) => { done = true; m.close(true); } }],
        onClose: () => res(done) });
    });
  }
  function popover(anchor, html, o = {}) {
    closePopovers();
    const el = D.createElement('div'); el.className = 'pop ' + (o.cls || ''); el.innerHTML = html;
    el.setAttribute('role', o.role || 'dialog'); if (o.label) el.setAttribute('aria-label', o.label);
    D.body.appendChild(el);
    const place = () => {
      const r = anchor.getBoundingClientRect(); const w = el.offsetWidth, h = el.offsetHeight; const rtl = D.documentElement.dir === 'rtl';
      let x = (o.align === 'start') !== rtl ? r.left : r.right - w; x = Math.max(12, Math.min(x, W.innerWidth - w - 12));
      let y = r.bottom + 8; if (y + h > W.innerHeight - 12 && r.top - h - 8 > 12) y = r.top - h - 8;
      el.style.left = x + 'px'; el.style.top = Math.max(12, y) + 'px';
    };
    place();
    const opener = anchor;
    if (anchor.setAttribute) anchor.setAttribute('aria-expanded', 'true');
    const api = { el, anchor, modal: false, closed: false, place, close() { if (api.closed) return; api.closed = true; el.remove(); const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1); if (anchor.setAttribute) anchor.setAttribute('aria-expanded', 'false'); if (o.onClose) o.onClose(); if (opener && opener.focus && D.contains(opener)) opener.focus(); } };
    stack.push(api);
    const onResize = () => (api.closed ? W.removeEventListener('resize', onResize) : place()); W.addEventListener('resize', onResize);
    if (o.onOpen) o.onOpen(api);
    setTimeout(() => { const f = el.querySelector('[autofocus]') || el.querySelector('input,[role="menuitem"],button'); if (f) f.focus(); }, 0);
    return api;
  }
  function closePopovers() { stack.filter((s) => !s.modal).forEach((s) => s.close()); }
  function closeAll() { stack.slice().reverse().forEach((s) => s.close()); }
  function menu(anchor, items, o = {}) {
    const html = `<div class="menu" role="menu">${items.map((it, i) => (it === '-' ? '<hr>' : it.header ? `<div class="mh">${esc(t(it.header))}</div>` : `<button type="button" role="menuitem" class="${it.danger ? 'danger' : ''}" data-mi="${i}"${it.disabled ? ' disabled' : ''}>${it.icon ? icon(it.icon) : ''}<span>${esc(t(it.label))}</span>${it.hint ? `<span class="sp"></span><span class="faint" style="font-size:11.5px">${it.hint}</span>` : ''}</button>`)).join('')}</div>`;
    const p = popover(anchor, html, { role: 'presentation', cls: o.cls, align: o.align });
    p.el.addEventListener('click', (e) => { const b = e.target.closest('[data-mi]'); if (!b) return; const it = items[+b.dataset.mi]; p.close(); if (it.run) it.run(); else if (it.go) W.App.go(it.go, it.params); });
    p.el.addEventListener('keydown', (e) => { if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return; const l = [...p.el.querySelectorAll('[role="menuitem"]:not([disabled])')]; const i = l.indexOf(D.activeElement); l[(i + (e.key === 'ArrowDown' ? 1 : -1) + l.length) % l.length].focus(); e.preventDefault(); });
    return p;
  }
  function toast(text, o = {}) {
    let box = D.querySelector('.toasts'); if (!box) { box = D.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); D.body.appendChild(box); }
    const tone = o.tone || 'success'; const ic = { success: ['t-green', 'checkc'], error: ['t-berry', 'alert'], info: ['t-mauve', 'info'] }[tone] || ['t-mauve', 'info'];
    const el = D.createElement('div'); el.className = 'toast'; el.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    el.innerHTML = `<span class="ti ${ic[0]}">${icon(ic[1])}</span><span>${o.html ? text : esc(t(text))}</span>${o.action ? `<button class="btn link sm" data-ta>${esc(t(o.action.label))}</button>` : ''}<button class="x" aria-label="${esc(t('Dismiss'))}">${icon('x')}</button>`;
    box.appendChild(el);
    const rm = () => el.remove();
    el.querySelector('.x').onclick = rm; if (o.action) el.querySelector('[data-ta]').onclick = () => { rm(); o.action.run(); };
    setTimeout(rm, o.duration || 4200);
  }

  /* ------------------------------ async / filters / data table ------------------------------ */
  async function asyncBlock(el, fetcher, renderFn, o = {}) {
    el.innerHTML = skeleton(o.skeleton || 'table', o.n || (o.skeleton === 'kpis' ? 5 : 4));
    try {
      const res = await fetcher();
      if (!el.isConnected) return res;
      const isEmpty = o.isEmpty ? o.isEmpty(res) : Array.isArray(res && res.data) && !res.data.length;
      el.innerHTML = isEmpty ? empty(o.empty || {}) : renderFn(res);
      if (!isEmpty && o.after) o.after(el, res);
      return res;
    } catch (e) {
      if (!el.isConnected) return null;
      console.warn('[UI.async]', e);
      el.innerHTML = errorState({ text: o.errorText || (e && e.message) || undefined });
      el.addEventListener('ui:retry', () => asyncBlock(el, fetcher, renderFn, o), { once: true });
      return null;
    }
  }
  function filtersHTML(c, vals = {}) {
    const s = c.search ? `<label class="inp" style="${c.search.width ? 'max-width:' + c.search.width + 'px' : ''}">${icon('search')}<span class="sr-only">${esc(t(c.search.placeholder || 'Search'))}</span><input type="search" name="${esc(c.search.name || 'q')}" value="${esc(vals[c.search.name || 'q'] || '')}" placeholder="${esc(t(c.search.placeholder || 'Search'))}"></label>` : '';
    const sel = (x) => `<label class="inp sel"><span class="sr-only">${esc(t(x.label))}</span><select name="${esc(x.name)}" aria-label="${esc(t(x.label))}">${x.noAll ? '' : `<option value="">${esc(t(x.label))}</option>`}${opts(x.options, vals[x.name] != null ? vals[x.name] : x.value)}</select><span class="chev">${icon('chev')}</span></label>`;
    return `<div class="fbar" role="search"><div class="fr">${s}${(c.selects || []).map(sel).join('')}${c.sort ? sel({ ...c.sort, noAll: true, label: c.sort.label || 'Sort' }) : ''}${c.clear !== false ? `<button type="button" class="clear" data-clear>${esc(t('Clear Filters'))}</button>` : ''}${c.actions ? `<span class="acts">${c.actions}</span>` : ''}</div>${c.chips === false ? '' : '<div class="fchips" data-chips hidden></div>'}</div>`;
  }
  function mountFilters(el, c, onChange) {
    el.innerHTML = filtersHTML(c, c.values || {});
    const read = () => { const v = {}; el.querySelectorAll('.fr input[name], .fr select[name]').forEach((i) => (v[i.name] = i.value.trim())); return v; };
    const chips = () => {
      const box = el.querySelector('[data-chips]'); if (!box) return;
      const v = read(); const items = [];
      if (c.search && v[c.search.name || 'q']) items.push([c.search.name || 'q', `“${esc(v[c.search.name || 'q'])}”`]);
      (c.selects || []).forEach((x) => { if (v[x.name]) { const o = (x.options || []).find((y) => String(typeof y === 'object' ? y.value : y) === v[x.name]); items.push([x.name, esc(t(o ? (typeof o === 'object' ? o.label : o) : v[x.name]))]); } });
      box.hidden = !items.length;
      box.innerHTML = items.length ? `<span>${esc(t('Active filters:'))}</span>${items.map(([n, l]) => `<span class="fchip">${l}<button type="button" data-unset="${esc(n)}" aria-label="${esc(t('Remove filter'))}">${icon('x')}</button></span>`).join('')}` : '';
    };
    let tm;
    const changed = () => { chips(); onChange && onChange(read()); };
    el.addEventListener('input', (e) => { if (e.target.type === 'search') { clearTimeout(tm); tm = setTimeout(changed, 250); } });
    el.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT') changed(); });
    on(el, 'click', '[data-clear]', () => { el.querySelectorAll('.fr input[name]').forEach((i) => (i.value = '')); el.querySelectorAll('.fr select[name]').forEach((s) => { const x = (c.selects || []).find((y) => y.name === s.name); s.value = x ? '' : (c.sort && c.sort.value) || s.options[0].value; }); changed(); });
    on(el, 'click', '[data-unset]', (e, b) => { const i = el.querySelector(`.fr [name="${b.dataset.unset}"]`); if (i) i.value = ''; changed(); });
    chips();
    return { values: read, set(v) { for (const k in v) { const i = el.querySelector(`.fr [name="${k}"]`); if (i) i.value = v[k]; } chips(); }, el };
  }
  function dataTable(el, o) {
    const st = { page: 1, pageSize: o.pageSize || 10, sort: o.sort || '', selected: new Set(), rows: [], meta: { total: 0 }, seq: 0 };
    const cols = o.columns || [];
    const head = () => `<thead><tr>${o.select ? `<th class="cbx"><label class="check"><input type="checkbox" data-all aria-label="${esc(t('Select all rows'))}"></label></th>` : ''}${cols.map((c) => {
      const s = st.sort.replace('-', '') === c.key ? (st.sort[0] === '-' ? 'descending' : 'ascending') : null;
      const lbl = esc(t(c.label || ''));
      return `<th class="${c.align || ''}" ${c.width ? `style="width:${c.width}"` : ''}${s ? ` aria-sort="${s}"` : ''}>${c.sortable ? `<button type="button" class="sort" data-sort="${esc(c.key)}">${lbl}${icon(s === 'ascending' ? 'chev-up' : s === 'descending' ? 'chev' : 'sort')}</button>` : lbl}</th>`;
    }).join('')}${o.rowActions ? `<th class="end">${esc(t(o.actionsLabel || 'Actions'))}</th>` : ''}</tr></thead>`;
    const rowHTML = (r, i) => {
      const id = String(r[o.idKey || 'id']);
      const acts = o.rowActions ? o.rowActions(r).filter(Boolean) : [];
      const vis = acts.length > 3 ? acts.slice(0, 2) : acts; const more = acts.length > 3;
      return `<tr data-i="${i}" class="${st.selected.has(id) ? 'sel' : ''}${o.rowClick ? ' click' : ''}">${o.select ? `<td class="cbx"><label class="check"><input type="checkbox" data-row="${esc(id)}" ${st.selected.has(id) ? 'checked' : ''} aria-label="${esc(t('Select row'))}"></label></td>` : ''}${cols.map((c) => `<td class="${c.align || ''} ${c.cls || ''}">${c.render ? c.render(r, i) : esc(r[c.key] == null ? '—' : r[c.key])}</td>`).join('')}${o.rowActions ? `<td class="end"><div class="acts">${vis.map((a, k) => `<button type="button" class="btn icon ${a.danger ? 'del' : ''}" data-ra="${k}" title="${esc(t(a.label))}" aria-label="${esc(t(a.label))}">${icon(a.icon || 'dots')}</button>`).join('')}${more ? `<button type="button" class="btn icon" data-more aria-haspopup="menu" title="${esc(t('More actions'))}" aria-label="${esc(t('More actions'))}">${icon('dots')}</button>` : ''}</div></td>` : ''}</tr>`;
    };
    const bulkHTML = () => (o.select && st.selected.size && o.bulkActions ? `<div class="bulk" role="region" aria-label="${esc(t('Bulk actions'))}"><span>${t('{n} selected', { n: fmt.number(st.selected.size) })}</span>${o.bulkActions.map((b, i) => `<button type="button" class="btn ${b.danger ? 'danger' : 'secondary'} sm" data-bulk="${i}">${b.icon ? icon(b.icon) : ''}${esc(t(b.label))}</button>`).join('')}<span class="sp"></span><button type="button" class="btn link sm" data-unsel>${esc(t('Clear selection'))}</button></div>` : '');
    function paint() {
      const total = st.meta.total != null ? st.meta.total : st.rows.length;
      if (!st.rows.length) { el.innerHTML = `${bulkHTML()}${empty(o.empty || { icon: 'inbox', title: 'No results found', text: 'Try changing the filters or search.' })}`; return; }
      el.innerHTML = `${bulkHTML()}<div class="tbl-wrap"><table class="tbl ${o.compact ? 'compact' : ''}">${o.caption ? `<caption class="sr-only">${esc(t(o.caption))}</caption>` : ''}${head()}<tbody>${st.rows.map(rowHTML).join('')}</tbody></table></div>${o.pagination === false ? '' : pagination({ page: st.page, pageSize: st.pageSize, total })}`;
      const all = el.querySelector('[data-all]'); if (all) { const ids = st.rows.map((r) => String(r[o.idKey || 'id'])); const n = ids.filter((x) => st.selected.has(x)).length; all.checked = n && n === ids.length; all.indeterminate = n > 0 && n < ids.length; }
      if (o.after) o.after(el, st.rows);
    }
    async function load() {
      const seq = ++st.seq;
      el.innerHTML = skeleton('table', Math.min(st.pageSize, 6));
      try {
        const res = await o.fetch({ page: st.page, pageSize: st.pageSize, sort: st.sort || undefined });
        if (seq !== st.seq || !el.isConnected) return;
        st.rows = (res && res.data) || []; st.meta = (res && res.meta) || { total: st.rows.length };
        paint();
      } catch (e) {
        if (seq !== st.seq || !el.isConnected) return;
        console.warn('[UI.dataTable]', e);
        el.innerHTML = errorState({ text: e && e.message });
      }
    }
    el.addEventListener('ui:retry', load);
    el.addEventListener('click', (e) => {
      const s = e.target.closest('[data-sort]'); if (s) { const k = s.dataset.sort; st.sort = st.sort === k ? '-' + k : st.sort === '-' + k ? '' : k; st.page = 1; return load(); }
      const pg = e.target.closest('[data-page]'); if (pg && !pg.disabled) { st.page = +pg.dataset.page; return load(); }
      const ra = e.target.closest('[data-ra]'); if (ra) { const r = st.rows[+ra.closest('tr').dataset.i]; const a = o.rowActions(r).filter(Boolean); const vis = a.length > 3 ? a.slice(0, 2) : a; const act = vis[+ra.dataset.ra]; return act.run ? act.run(r) : act.go && W.App.go(act.go, act.params); }
      const mo = e.target.closest('[data-more]'); if (mo) { const r = st.rows[+mo.closest('tr').dataset.i]; return menu(mo, o.rowActions(r).filter(Boolean).slice(2).map((a) => ({ ...a, run: () => (a.run ? a.run(r) : a.go && W.App.go(a.go, a.params)) }))); }
      const bk = e.target.closest('[data-bulk]'); if (bk) { const b = o.bulkActions[+bk.dataset.bulk]; return Promise.resolve(b.run([...st.selected])).then((r) => { if (r !== false) { st.selected.clear(); load(); } }); }
      if (e.target.closest('[data-unsel]')) { st.selected.clear(); return paint(); }
      if (e.target.closest('input,button,a,label,select')) return;
      const tr = e.target.closest('tbody tr'); if (tr && o.rowClick) o.rowClick(st.rows[+tr.dataset.i]);
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-all]')) { st.rows.forEach((r) => { const id = String(r[o.idKey || 'id']); if (e.target.checked) st.selected.add(id); else st.selected.delete(id); }); paint(); el.querySelector('[data-all]') && el.querySelector('[data-all]').focus(); }
      else if (e.target.matches('[data-row]')) { const id = e.target.dataset.row; if (e.target.checked) st.selected.add(id); else st.selected.delete(id); paint(); const f = el.querySelector(`[data-row="${CSS.escape(id)}"]`); if (f) f.focus(); }
    });
    load();
    return { reload: load, setQuery(q) { if (q && q.page) st.page = q.page; if (q && q.sort != null) st.sort = q.sort; if (q && q.pageSize) st.pageSize = q.pageSize; return load(); }, selected: () => [...st.selected], rows: () => st.rows, state: st };
  }

  /** Rose "Create more. Rescue more. Impact more." template banner → route (admin-templates / m-templates) */
  const banner = (route, o = {}) => `<section class="banner"><span class="wb" aria-hidden="true">WB</span><div><h3>${esc(t(o.title || 'Create more. Rescue more. Impact more.'))}</h3><p>${esc(t(o.text || 'Save time by using templates to create new bags in one click.'))}</p></div>${btn(o.cta || 'Create from Template', { icon: 'layers', go: route, params: o.params })}<div class="bags" aria-hidden="true"><i></i><i></i><i></i><i></i></div></section>`;
  /** (v1.3) currency label for input prefixes: the given currency, else the context currency (merchant branch / admin market) */
  const currencyPrefix = (cur) => W.fmt.currency(cur);
  /** money input bound to a currency: UI.moneyField({ name, label, value, currency? }) */
  const moneyField = (o = {}) => field({ ...o, type: 'money', prefix: undefined });
  /** (v1.3) phone input with the market phone-code selector from the registry:
      UI.phone({ name:'phone', codeName:'phoneCountry', label, value, code, required, market }) */
  function phone(o = {}) {
    const mk = W.Markets ? (o.market && W.Markets.get(o.market)) || (o.code && W.Markets.list().find((m) => m.phoneCode === o.code)) || W.App.marketInfo() || W.Markets.primary() : null;
    const code = o.code || (mk && mk.phoneCode) || '+974';
    const opts = W.Markets ? W.Markets.phoneOptions(true) : [{ value: code, label: code }];
    if (!opts.some((x) => x.value === code)) opts.unshift({ value: code, label: code });
    return `<div class="phone-f${o.full ? ' full' : ''}">${field({ type: 'select', name: o.codeName || 'phoneCountry', label: o.codeLabel || 'Code', value: code, options: opts, required: true })}${field({ type: 'tel', name: o.name || 'phone', label: o.label || 'Phone number', value: o.value || '', required: o.required, placeholder: (mk && mk.phonePlaceholder) || '', icon: o.icon, hint: o.hint })}</div>`;
  }
  /* keep the phone placeholder in step with the chosen code */
  D.addEventListener('change', (e) => { const sel = e.target; if (!sel.matches || !sel.matches('.phone-f select') || !W.Markets) return; const m = W.Markets.list().find((x) => x.phoneCode === sel.value); const tel = sel.closest('.phone-f').querySelector('input[type=tel]'); if (m && tel) tel.placeholder = m.phonePlaceholder || ''; });
  const css = (id, text) => { if (D.getElementById('css-' + id)) return; const s = D.createElement('style'); s.id = 'css-' + id; s.textContent = text; D.head.appendChild(s); };

  W.UI = {
    esc, icon, icons: Object.keys(P), status, pill, chip, btn, link, card, kpi, kpiData, kpis, avatar, thumb, empty, errorState, skeleton, pagination,
    tabs, segmented, select, toggle, stepper, field, dropzone, richText, formValues, validate, fieldError, filters: filtersHTML, mountFilters, dataTable,
    banner, currencyPrefix, moneyField, phone, async: asyncBlock, on, fire, modal, drawer, confirm, popover, menu, toast, closeAll, closePopovers, css, attrJSON, nid,
  };
})(window, document);
