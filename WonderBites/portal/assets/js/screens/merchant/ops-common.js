/* =====================================================================
   Merchant operations — shared helpers for D4 screens (owner: D4)
   Statuses, option lists, small renderers, CSV download, import dialog.
   ===================================================================== */
(function () {
  'use strict';
  UI.status.register({
    // orders
    ready_for_pickup: { label: 'Ready', tone: 'o', icon: 'clock' },
    out_for_delivery: { label: 'Out for Delivery', tone: 'm', icon: 'truck' },
    unassigned: { label: 'Unassigned', tone: 'r', icon: 'alert' },
    confirmed: { label: 'Confirmed', tone: 'm', icon: 'check' },
    reserved: { label: 'Reserved', tone: 'm', icon: 'clock' },
    completed: { label: 'Completed', tone: 'g', icon: 'checkc' },
    delivered: { label: 'Delivered', tone: 'g', icon: 'checkc' },
    failed: { label: 'Failed', tone: 'r', icon: 'x' },
    picked_up: { label: 'Picked Up', tone: 'o', icon: 'bag' },
    cancelled: { label: 'Cancelled', tone: 'r', icon: 'x' },
    driver_assigned: { label: 'Driver Assigned', tone: 'm', icon: 'truck' },
    no_show: { label: 'No-show', tone: 'r', icon: 'alert' },
    refunded: { label: 'Refunded', tone: 'm', icon: 'refund' },
    partially_refunded: { label: 'Partially Refunded', tone: 'm', icon: 'refund' },
    // listings
    active: { label: 'Active', tone: 'g', icon: 'checkc' },
    sold_out: { label: 'Sold Out', tone: 'o', icon: 'alert' },
    disabled: { label: 'Disabled', tone: 'r', icon: 'x' },
    paused: { label: 'Paused', tone: 'n', icon: 'clock' },
    draft: { label: 'Draft', tone: 'n', icon: 'edit' },
    expired: { label: 'Expired', tone: 'n', icon: 'clock' },
    // drivers
    available: { label: 'Available', tone: 'g', icon: 'checkc' },
    on_delivery: { label: 'On Delivery', tone: 'm', icon: 'truck' },
    offline: { label: 'Offline', tone: 'n', icon: 'x' },
    // customers / vendors / branches / payouts
    inactive: { label: 'Inactive', tone: 'n', icon: 'clock' },
    blocked: { label: 'Blocked', tone: 'r', icon: 'x' },
    pending: { label: 'Pending', tone: 'o', icon: 'clock' },
    suspended: { label: 'Suspended', tone: 'r', icon: 'x' },
    open: { label: 'Open', tone: 'g', icon: 'checkc' },
    closed: { label: 'Closed', tone: 'n', icon: 'x' },
    temporarily_closed: { label: 'Temporarily Closed', tone: 'o', icon: 'clock' },
    paid: { label: 'Paid', tone: 'g', icon: 'checkc' },
    compliant: { label: 'Compliant', tone: 'g', icon: 'checkc' },
    expiring_soon: { label: 'Expiring Soon', tone: 'o', icon: 'clock' },
    under_review: { label: 'Under Review', tone: 'm', icon: 'clock' },
    valid: { label: 'Valid', tone: 'g', icon: 'checkc' },
    pending_review: { label: 'Pending Review', tone: 'm', icon: 'clock' },
  });

  const CATS = [['bakery', 'Bakery'], ['restaurant', 'Restaurant'], ['grocery', 'Grocery'], ['cafe', 'Cafe'], ['desserts', 'Desserts'], ['meals', 'Meals'], ['produce', 'Produce'], ['other', 'Other']];
  const DIET = [['vegetarian', 'Vegetarian'], ['vegan', 'Vegan'], ['halal', 'Halal'], ['gluten_free', 'Gluten-free'], ['dairy_free', 'Dairy-free'], ['nut_free', 'Nut-free']];
  const VEH = [['bicycle', 'Bicycle'], ['motorbike', 'Motorbike'], ['car', 'Car'], ['van', 'Van']];
  const opts = (pairs) => pairs.map(([value, label]) => ({ value, label: t(label) }));
  const label = (pairs, v) => { const p = pairs.find((x) => x[0] === v); return p ? t(p[1]) : UI.esc(v || '—'); };

  /* bilingual text from mock (LocalizedText or string) */
  const L = (v) => (v && typeof v === 'object' ? (App.state.lang === 'ar' ? v.ar || v.en : v.en || v.ar) : (v == null ? '' : String(v)));
  const LE = (v) => UI.esc(L(v));
  const money = (m, dec) => (m == null ? '—' : fmt.money(typeof m === 'object' ? m.amount : m, (m && m.currency) || undefined, dec));
  const ph = (tone) => 'ph' + (((Number(tone) || 1) - 1) % 6 + 1);
  const summaryOf = (res) => (res && ((res.meta && res.meta.summary) || res.summary)) || {};

  /* the reference shows "Unassigned" for delivery orders without a driver */
  const orderState = (o) => (o.fulfillment === 'delivery' && !o.driver && ['reserved', 'confirmed', 'ready_for_pickup'].includes(o.status) ? 'unassigned' : o.status);

  function downloadCSV(fileName, header, rows) {
    const esc = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    try {
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { /* ignore in sandboxed previews */ }
    UI.toast(t('{file} downloaded', { file: UI.esc(fileName) }), { tone: 'success', html: true });
  }

  /* Import dialog (orders / customers / listings): upload → validate preview → import */
  function importDialog({ resource, title, columns, onDone }) {
    let step = 1;
    const body = () => step === 1
      ? `<p class="muted" style="margin-block-end:12px">${t('Upload a CSV or XLSX file. The first row must contain the column names.')}</p>
         ${UI.dropzone({ name: 'file', accept: '.csv,.xlsx', multiple: false, hint: t('CSV or XLSX, up to 5 MB') })}
         <div style="margin-block-start:14px"><div class="muted" style="font-size:12px;margin-block-end:6px">${t('Expected columns')}</div>
         <div style="display:flex;flex-wrap:wrap;gap:6px">${columns.map((c) => UI.chip(t(c))).join('')}</div></div>
         <p style="margin-block-start:14px"><button type="button" class="lnk" data-act="tpl">${UI.icon('download')} ${t('Download sample file')}</button></p>`
      : `<div data-preview>${UI.skeleton('list', 3)}</div>`;
    const m = UI.modal({
      title: t(title), size: 'md', body: `<div data-imp>${body()}</div>`,
      actions: [{ label: t('Cancel'), variant: 'secondary', close: true },
        { label: t('Validate file'), variant: 'primary', run: async (mm) => {
          const root = mm.el.querySelector('[data-imp]');
          if (step === 1) {
            const v = UI.formValues(root); const files = v.file || [];
            if (!files.length) { UI.toast(t('Choose a file to import'), { tone: 'error', html: true }); return; }
            step = 2; root.innerHTML = body();
            const btn = mm.el.querySelector('[data-act-primary], .modal-actions .btn-primary, footer .btn-primary'); if (btn) btn.textContent = t('Import');
            const { data } = await api('POST', '/merchant/imports/preview', { resource, rows: 12 });
            root.querySelector('[data-preview]').innerHTML = `
              <div class="grid g-3" style="gap:12px">
                ${[['Rows found', data.rows, ''], ['Ready to import', data.valid, 'up'], ['Rows with errors', data.errors.length, 'dn']].map(([l, v, c]) => `<div class="cd ops-pad" style="padding:14px"><div class="muted" style="font-size:12px">${t(l)}</div><b class="${c}" style="font-size:22px;font-family:var(--font-num)">${fmt.number(v)}</b></div>`).join('')}
              </div>
              <div style="margin-block-start:12px" class="muted">${data.errors.map((e) => t('Row {row}: invalid {field} — it will be skipped.', { row: fmt.number(e.row), field: t(e.field) })).join('<br>')}</div>`;
            return;
          }
          const { data } = await api('POST', '/imports', { resource, fileId: 'file-' + Date.now() }).catch(() => ({ data: { processed: 11 } }));
          mm.close(); UI.toast(t('{n} rows imported', { n: fmt.number((data && data.processed) || 11) }), { tone: 'success', html: true }); onDone && onDone();
        } }],
      onOpen: (mm) => UI.on(mm.el, 'click', '[data-act="tpl"]', () => downloadCSV(resource + '-sample.csv', columns, [])),
    });
    return m;
  }

  /* placeholder "photo" for branches */
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = (iso) => { const d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); return `${t(WD[d.getDay()])}${App.state.lang === "ar" ? "،" : ","} ${fmt.date(iso, "short")}`; };
  const branchPhoto = (n) => `<div class="ops-photo ops-photo-${((n - 1) % 3) + 1}" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`;

  UI.css('ops-common', `
    .ops-pad{padding:var(--pad)}
    .ops-lines>span,.ops-il{display:flex;gap:6px;align-items:center}
    .cd-b:not(.flush)>.cd-b{padding:0}
    .cd-b.flush>.cd-b{padding:12px var(--pad) var(--pad)}
    .ops-split .cd,.ops-side .cd{align-self:start}
    .ops-row{display:flex;align-items:center;gap:12px;min-width:0}
    .ops-row b{font-weight:600}
    .ops-row small{display:block;color:var(--faint);font-size:12px}
    .ops-dl{display:grid;grid-template-columns:auto 1fr;gap:10px 18px;margin:0}
    .ops-dl dt{color:var(--muted);font-size:13px}
    .ops-dl dd{margin:0;text-align:end;font-weight:600}
    .ops-sec{font-size:11.5px;font-weight:600;color:var(--accent);margin-block:16px 8px}
    .ops-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .ops-form{display:grid;gap:16px}
    .ops-form .ops-grid2{gap:16px}
    .ops-split{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:var(--gap);align-items:start}
    .ops-side{display:grid;gap:var(--gap)}
    .ops-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .ops-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
    .ops-head h2{font-family:var(--font-display);font-size:26px;font-weight:600;margin:0;display:flex;gap:10px;align-items:center;line-height:1.3}
    .ops-head p{color:var(--muted);margin:4px 0 0}
    .ops-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 28px}
    .ops-meta>div{display:flex;align-items:center;gap:12px;min-width:0}
    .ops-meta .ic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--tint-mauve);color:var(--ic-mauve);flex:none}
    .ops-meta small{display:block;color:var(--faint);font-size:12px}
    .ops-meta b{font-weight:600}
    .ops-imgs{display:flex;flex-wrap:wrap;gap:12px}
    .ops-imgs .ops-img{width:112px;height:84px;border-radius:12px;overflow:hidden;position:relative}
    .ops-imgs .ops-img>.ph{display:block;width:100%!important;height:100%!important;border-radius:12px}
    .ops-imgs .ops-img button{position:absolute;inset-block-start:6px;inset-inline-end:6px;width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:rgba(26,15,30,.7);color:#fff;border:0;cursor:pointer}
    .ops-add{width:112px;height:84px;border-radius:12px;border:1.5px dashed var(--line-2);display:grid;place-items:center;color:var(--muted);background:transparent;cursor:pointer;font:inherit;font-size:12px}
    .ops-timeline{list-style:none;margin:0;padding:0;display:grid;gap:14px}
    .ops-timeline li{position:relative;padding-inline-start:20px}
    .ops-timeline li::before{content:"";position:absolute;inset-inline-start:2px;inset-block-start:6px;width:8px;height:8px;border-radius:50%;background:var(--accent)}
    .ops-timeline li::after{content:"";position:absolute;inset-inline-start:5.5px;inset-block-start:16px;inset-block-end:-14px;width:1px;background:var(--line-2)}
    .ops-timeline li:last-child::after{display:none}
    .ops-timeline small{display:block;color:var(--faint);font-size:12px}
    .ops-preview .ops-hero{height:170px;border-radius:12px;overflow:hidden;position:relative}
    .ops-preview .ops-hero>*:first-child{display:block;width:100%!important;height:100%!important;border-radius:12px}
    .ops-preview .pm{display:flex;gap:6px 14px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-block-start:8px}
    .ops-preview .pm span{display:inline-flex;gap:5px;align-items:center}
    .ops-cnt{display:block;text-align:end;font-size:12px;color:var(--faint);margin-block-start:-8px}
    .ops-preview h3{font-size:17px;font-weight:600;margin:12px 0 6px}
    .ops-price{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
    .ops-price b{color:var(--accent);font-size:18px}
    .ops-price s{color:var(--faint)}
    .ops-settings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 32px}
    .ops-tag{position:absolute;inset-block-start:10px;inset-inline-end:10px}
    .ops-photo{position:relative;height:150px;overflow:hidden;background:linear-gradient(180deg,#4A2E24,#2A1A16)}
    .ops-photo i{position:absolute;inset-block-end:18%;width:22%;height:46%;border-radius:50% 50% 8px 8px;background:radial-gradient(circle at 50% 30%,#E9C48E,#8C5A2E);opacity:.85}
    .ops-photo i:nth-child(1){inset-inline-start:6%} .ops-photo i:nth-child(2){inset-inline-start:30%;height:38%}
    .ops-photo i:nth-child(3){inset-inline-start:54%} .ops-photo i:nth-child(4){inset-inline-start:78%;height:34%}
    .ops-photo::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(26,15,30,.55),transparent 60%)}
    .ops-photo-2{background:linear-gradient(180deg,#2E4A3A,#16261E)} .ops-photo-2 i{background:radial-gradient(circle at 50% 30%,#CFE7A4,#3F6E3A)}
    .ops-photo-3{background:linear-gradient(180deg,#4A2A3E,#24141E)} .ops-photo-3 i{background:radial-gradient(circle at 50% 30%,#F2B8C6,#8E3A5C)}
    .ops-map{height:180px;border-radius:12px;border:1px solid var(--line);position:relative;overflow:hidden;
      background:repeating-linear-gradient(0deg,transparent 0 23px,var(--grid) 23px 24px),repeating-linear-gradient(90deg,transparent 0 23px,var(--grid) 23px 24px),var(--card-2)}
    .ops-map::before{content:"";position:absolute;inset-inline-start:-10%;inset-block-start:55%;width:120%;height:14px;background:color-mix(in srgb,var(--accent) 22%,transparent);transform:rotate(-8deg)}
    .ops-map .pin{position:absolute;inset-inline-start:calc(50% - 14px);inset-block-start:calc(50% - 30px);color:var(--accent)}
    .ops-map .pin svg{width:28px;height:28px}
    .ops-hours{display:grid;grid-template-columns:110px 1fr 1fr auto;gap:10px 14px;align-items:center}
    .ops-tpl{display:flex;flex-direction:column;gap:10px;padding:18px;height:100%}
    .ops-tpl .ic{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:var(--tint-rose);color:var(--ic-rose)}
    .ops-tpl h3{font-size:15.5px;font-weight:600;margin:4px 0 0}
    .ops-tpl p{color:var(--muted);font-size:13px;margin:0;flex:1}
    .ops-tpl .ft{display:flex;justify-content:space-between;font-size:12.5px;font-weight:600;gap:8px}
    .ops-tpl .row{display:flex;gap:8px;align-items:center}
    .ops-tpl .row .btn:first-child{flex:1;justify-content:center}
    .ops-stat{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center}
    .ops-stat>div{border:1px solid var(--line);border-radius:12px;padding:12px 8px;background:var(--card-2)}
    .ops-stat .ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;margin:0 auto 6px;background:var(--tint-mauve);color:var(--ic-mauve)}
    .ops-stat small{display:block;color:var(--muted);font-size:12px;line-height:1.3;min-height:2.6em}
    .ops-stat b{font-size:20px;font-family:var(--font-num)}
    .ops-list>div{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-block-start:1px solid var(--line)}
    .ops-list>div:first-child{border-block-start:0}
    .ops-list>div>span{color:var(--muted);display:flex;align-items:center;gap:8px}
    .ops-list b{font-weight:600;white-space:nowrap}
    .ops-list .hl{background:var(--tint-green);border-radius:10px;padding-inline:10px;border:0;margin-block:4px}
    .ops-list .hl>span,.ops-list .hl b{color:var(--pos)}
    .ops-filters-inline{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
    @media (max-width:1360px){.ops-split{grid-template-columns:minmax(0,1fr) 320px}}
  `);

  window.Ops = { CATS, DIET, VEH, opts, label, L, LE, money, ph, summaryOf, orderState, day, downloadCSV, importDialog, branchPhoto };
})();
