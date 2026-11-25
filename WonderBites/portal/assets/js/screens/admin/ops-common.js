/* =====================================================================
   Admin operations — shared helpers for D1 screens (owner: D1)
   Kind-specific status pills (avoids clobbering other modules' global
   status registry), option lists, small renderers, reason pickers.
   ===================================================================== */
(function () {
  'use strict';
  const esc = (s) => UI.esc(s);

  /* ---------- status maps per entity kind: enum → [English label, tone, icon] ---------- */
  const ST = {
    drop: { live: ['Active', 'g', 'checkc'], scheduled: ['Scheduled', 'm', 'cal'], sold_out: ['Sold Out', 'o', 'alert'], expired: ['Expired', 'n', 'clock'], completed: ['Completed', 'g', 'checkc'], flagged: ['Flagged', 'r', 'flag'], paused: ['Paused', 'n', 'clock'], draft: ['Draft', 'n', 'edit'], removed: ['Removed', 'n', 'x'] },
    pickup: { upcoming: ['Upcoming', 'm', 'clock'], ready: ['Ready for Pickup', 'g', 'bag'], flagged: ['Flagged', 'r', 'flag'], missed: ['Missed', 'r', 'x'], verified: ['Verified', 'g', 'checkc'], picked_up: ['Picked Up', 'g', 'checkc'], cancelled: ['Cancelled', 'n', 'x'] },
    order: { reserved: ['Placed', 'm', 'clock'], confirmed: ['Confirmed', 'm', 'check'], ready_for_pickup: ['Ready', 'o', 'bag'], out_for_delivery: ['Out for Delivery', 'm', 'truck'], picked_up: ['Picked Up', 'g', 'checkc'], completed: ['Completed', 'g', 'checkc'], cancelled: ['Cancelled', 'r', 'x'], no_show: ['No-show', 'r', 'alert'], refunded: ['Refunded', 'r', 'refresh'], partially_refunded: ['Partially Refunded', 'o', 'refresh'], driver_assigned: ['Driver Assigned', 'm', 'truck'], delivered: ['Delivered', 'g', 'checkc'], failed: ['Failed', 'r', 'x'] },
    payment: { paid: ['Paid', 'g', 'checkc'], pending: ['Pending', 'o', 'clock'], failed: ['Failed', 'r', 'x'], refunded: ['Refunded', 'r', 'refresh'], partially_refunded: ['Partially Refunded', 'o', 'refresh'] },
    merchant: { pending: ['Pending', 'o', 'clock'], verified: ['Verified', 'g', 'checkc'], active: ['Active', 'g', 'checkc'], suspended: ['Suspended', 'r', 'x'], rejected: ['Rejected', 'r', 'x'], inactive: ['Inactive', 'n', 'clock'] },
    consumer: { active: ['Active', 'g', 'checkc'], inactive: ['Inactive', 'n', 'clock'], blocked: ['Blocked', 'r', 'x'], deleted: ['Deleted', 'n', 'trash'] },
    case: { open: ['Open', 'o', 'alert'], in_progress: ['In Progress', 'm', 'clock'], escalated: ['Escalated', 'r', 'flag'], resolved: ['Resolved', 'g', 'checkc'], closed: ['Closed', 'n', 'check'] },
    moderation: { pending: ['Open', 'o', 'alert'], in_review: ['In Progress', 'm', 'clock'], approved: ['Approved', 'g', 'checkc'], rejected: ['Rejected', 'r', 'x'], escalated: ['Escalated', 'r', 'flag'] },
    ticket: { open: ['Open', 'o', 'alert'], pending: ['Pending', 'o', 'clock'], in_progress: ['In Progress', 'm', 'clock'], escalated: ['Escalated', 'r', 'flag'], resolved: ['Resolved', 'g', 'checkc'], closed: ['Closed', 'n', 'check'] },
    branch: { open: ['Open', 'g', 'checkc'], closed: ['Closed', 'n', 'x'], temporarily_closed: ['Temporarily Closed', 'o', 'clock'] },
    payout: { scheduled: ['Scheduled', 'm', 'cal'], processing: ['Processing', 'o', 'clock'], paid: ['Paid', 'g', 'checkc'], failed: ['Failed', 'r', 'x'], on_hold: ['On Hold', 'o', 'clock'] },
    compliance: { compliant: ['Compliant', 'g', 'checkc'], expiring_soon: ['Expiring Soon', 'o', 'clock'], expired: ['Expired', 'r', 'alert'], non_compliant: ['Non-compliant', 'r', 'x'], under_review: ['Under Review', 'm', 'clock'] },
    cert: { valid: ['Valid', 'g', 'checkc'], expiring_soon: ['Expiring Soon', 'o', 'clock'], expired: ['Expired', 'r', 'alert'], pending_review: ['Pending Review', 'm', 'clock'], rejected: ['Rejected', 'r', 'x'] },
  };
  function pill(kind, status) {
    const m = (ST[kind] || {})[status];
    if (!m) return UI.pill(status);
    return UI.pill(status, { label: m[0], tone: m[1], icon: m[2] });
  }

  /* ---------- labels ---------- */
  const SEV = { critical: ['Critical', 'r'], high: ['Warning', 'o'], medium: ['Information', 'm'], low: ['Low', 'g'] };
  const PRIO = { urgent: ['Urgent', 'r'], high: ['High', 'o'], medium: ['Normal', 'n'], low: ['Low', 'g'] };
  const KIND = { issue: ['Issue', 'r'], alert: ['Alert', 'o'], moderation: ['Moderation', 'm'] };
  const MODTYPE = { listing: ['Listing', 'r'], review: ['Review', 'o'], user: ['User', 'm'], merchant_profile: ['Merchant', 'n'], image: ['Image', 'm'] };
  const CHANNEL = { in_app: 'In-app', email: 'Email', chat: 'Chat', phone: 'Phone', social: 'Social' };
  const CITY = Markets.cityProxy(); // (v1.3) cities of the selected market(s), from the registry
  const CATEGORY = { bakery: 'Bakery', restaurant: 'Restaurant', grocery: 'Grocery', cafe: 'Café', desserts: 'Desserts', meals: 'Meals', produce: 'Produce', other: 'Other' };
  const DIET = { vegetarian: 'Vegetarian', vegan: 'Vegan', halal: 'Halal', gluten_free: 'Gluten-free', dairy_free: 'Dairy-free', nut_free: 'Nut-free' };
  const ALLERGEN = { gluten: 'Gluten', dairy: 'Dairy', nuts: 'Nuts', eggs: 'Eggs', soy: 'Soy', sesame: 'Sesame' };
  const REPORTER = { automated_filter: 'Automated filter', consumer_report: 'Consumer report', system_pattern: 'System pattern', onboarding_team: 'Onboarding team', merchant_report: 'Merchant report', compliance_check: 'Compliance check' };
  const CARD = { visa: 'Visa', mastercard: 'Mastercard', apple_pay: 'Apple Pay', amex: 'Amex' };
  const CERT = { trade_license: 'Trade License', food_safety_certificate: 'Food Safety Certificate', vat_certificate: 'VAT Certificate', bank_letter: 'Bank Letter', document: 'Document' };
  const TICKET_CAT = { refunds: 'Refunds', pickups: 'Pickups', account: 'Account', listings: 'Listings', technical: 'Technical', feedback: 'Feedback', payments: 'Payments' };
  const SEVERITY_COLOR = { critical: 'var(--neg)', high: 'var(--warn)', medium: 'var(--mauve, #B783A7)', low: 'var(--pos)' };

  const lab = (map, k) => t((map[k] && (Array.isArray(map[k]) ? map[k][0] : map[k])) || String(k || '—').replace(/_/g, ' '));
  const chip = (map, k) => { const m = map[k] || [k, 'n']; return UI.chip(m[0], { tone: m[1] }); };
  const sevDot = (sev) => `<span class="d1-sev" style="--sev:${SEVERITY_COLOR[sev] || 'var(--faint)'}"><i aria-hidden="true"></i>${esc(lab(SEV, sev))}</span>`;
  const opts = (map) => Object.keys(map).map((k) => ({ value: k, label: Array.isArray(map[k]) ? map[k][0] : map[k] }));

  /* ---------- money / misc formatting from contract shapes ---------- */
  const money = (m, dec) => (m == null ? '—' : typeof m === 'number' ? fmt.money(m, undefined, dec) : fmt.money(m.amount, m.currency || undefined, dec != null ? dec : (m.amount % 1 ? 2 : 0)));
  const ago = (iso) => fmt.ago(Math.max(1, Math.round((api.demoNow() - Date.parse(iso)) / 60000)));
  const dt = (iso) => (iso ? `${fmt.date(iso)}${App.state.lang === 'ar' ? '،' : ','} ${fmt.clock(iso)}` : '—');
  const win = (w) => (w ? fmt.timeRange(w.start, w.end) : '—');
  const card = (pm) => (pm ? `${esc(t(CARD[pm.brand] || pm.brand))} <span class="num">•••• ${esc(pm.last4)}</span>` : '—');
  const prod = (thumb, title, sub) => `<div class="prod">${UI.thumb(thumb || 'ph1')}<div style="min-width:0"><b class="ellipsis">${esc(title)}</b>${sub ? `<small>${sub}</small>` : ''}</div></div>`;
  const dl = (rows) => `<dl class="d1-dl">${rows.filter(Boolean).map(([k, v, raw]) => `<dt>${raw ? esc(k) : esc(t(k))}</dt><dd>${v == null || v === '' ? '<span class="faint">—</span>' : v}</dd>`).join('')}</dl>`;
  const section = (title, body, extra) => `<section class="d1-sec"><header><h3>${esc(t(title))}</h3>${extra || ''}</header>${body}</section>`;
  /** Read a one-shot route param (e.g. a KPI deep-link filter) and consume it. */
  const take = (ctx, key) => { const v = ctx.params[key]; if (v !== undefined) delete ctx.params[key]; return v; };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabel = (iso) => `${MON[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}`;
  /** Set the glass top-bar title to data text (names/IDs) without passing it through t(). */
  const setTitle = (text) => { const h = document.querySelector('.top h1'); if (h) h.textContent = text; document.title = text + ' · WonderBites Admin'; };
  const err = (e) => (e && e.message ? t(e.message) : t('Something went wrong. Please try again.'));
  function toastErr(e) { UI.toast(err(e), { tone: 'error' }); }
  async function run(fn, okMsg) {
    try { const r = await fn(); if (okMsg) UI.toast(t(okMsg), { tone: 'success' }); return r || true; } catch (e) { toastErr(e); return null; }
  }
  /** Show server validation errors next to fields: details = { field: rule } */
  function showFieldErrors(form, e) {
    if (!form || !e || !e.details) return;
    Object.keys(e.details).forEach((k) => {
      const el = form.querySelector(`[name="${k}"]`); if (!el) return;
      el.setAttribute('aria-invalid', 'true');
      const f = el.closest('.fld'); if (!f) return;
      f.classList.add('invalid'); const box = f.querySelector('.err'); if (box) box.textContent = err(e);
    });
  }

  /** Reason-picker modal → resolves { reason, note, ...extraValues } or null */
  function reasonModal({ title, text, reasons, confirm = 'Confirm', danger = false, noteLabel = 'Note (optional)', noteRequired = false, extra = '', icon, onSubmit }) {
    return new Promise((resolve) => {
      let done = false;
      const body = `<form class="d1-form" novalidate>
        ${text ? `<p class="muted" style="margin:0">${text}</p>` : ''}
        <div class="fld" data-field="reason"><span class="lbl" id="d1-rsn">${esc(t('Reason'))} <em aria-hidden="true">*</em></span>
          <div class="d1-reasons" role="radiogroup" aria-labelledby="d1-rsn">${reasons.map((r, i) => `<label class="check"><input type="radio" name="reason" value="${esc(r[0])}"${i === 0 && reasons.length === 1 ? ' checked' : ''}>${esc(t(r[1]))}</label>`).join('')}</div>
          <span class="err" aria-live="polite"></span></div>
        ${UI.field({ type: 'textarea', name: 'note', label: noteLabel, rows: 3, required: noteRequired, maxlength: 500 })}
        ${extra}
      </form>`;
      UI.modal({
        title, body, size: 'md', icon, tone: danger ? 'berry' : 'mauve',
        actions: [
          { label: 'Cancel', variant: 'secondary', close: true },
          { label: confirm, variant: danger ? 'danger' : 'primary', run: async (mm) => {
            const form = mm.el.querySelector('form'); const v = UI.validate(form);
            const vals = UI.formValues(form);
            const rf = form.querySelector('[data-field="reason"]');
            if (!vals.reason) { rf.classList.add('invalid'); rf.querySelector('.err').textContent = t('Please choose a reason.'); rf.querySelector('input').focus(); return false; }
            rf.classList.remove('invalid'); rf.querySelector('.err').textContent = '';
            if (!v.ok) return false;
            if (onSubmit) { try { await onSubmit(vals); } catch (e) { showFieldErrors(form, e); toastErr(e); return false; } }
            done = true; mm.close(true); resolve(vals);
          } },
        ],
        onClose: () => { if (!done) resolve(null); },
      });
    });
  }

  UI.css('d1-ops', `
    .d1-dl{display:grid;grid-template-columns:minmax(120px,38%) 1fr;gap:10px 16px;margin:0}
    .d1-dl dt{color:var(--muted);font-size:12.5px}
    .d1-dl dd{margin:0;font-weight:500;min-width:0;overflow-wrap:anywhere}
    .d1-sec{border-block-start:1px solid var(--line);padding-block:16px}
    .d1-sec:first-child{border-block-start:0;padding-block-start:0}
    .d1-sec>header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-block-end:12px}
    .d1-sec h3{font-size:13.5px;font-weight:600;margin:0}
    .d1-sev{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:var(--sev);white-space:nowrap}
    .d1-sev i{width:7px;height:7px;border-radius:50%;background:var(--sev);box-shadow:0 0 6px var(--sev)}
    .d1-rail{border-inline-start:3px solid var(--sev);}
    .d1-timeline{list-style:none;margin:0;padding:0;display:grid;gap:12px}
    .d1-timeline li{display:grid;grid-template-columns:14px 1fr;gap:10px;align-items:start}
    .d1-timeline li>i{width:10px;height:10px;border-radius:50%;margin-block-start:5px;background:var(--accent);box-shadow:0 0 0 3px var(--tint-rose)}
    .d1-timeline b{font-weight:600;font-size:13px}
    .d1-timeline small{display:block;color:var(--faint);font-size:11.5px}
    .d1-timeline p{margin:4px 0 0;font-size:12.5px;color:var(--muted)}
    .d1-form{display:grid;gap:14px}
    .avail{min-width:112px;display:grid;gap:6px}.avail .t{font-size:12px}
    .lnk.plain{font-size:13px;font-weight:500;color:var(--text)}.lnk.plain:hover{color:var(--accent)}
    .d1-amt{font-weight:700;white-space:nowrap}
    .d1-reasons{display:grid;gap:8px;grid-template-columns:1fr 1fr}
    .d1-reasons-pol{grid-template-columns:1fr;gap:6px}.d1-reasons-pol .check{display:flex;align-items:center;gap:10px}.d1-reasons-pol .rr-l{flex:1;min-width:0}.d1-reasons-pol .chip{flex:none}
    .check input[type="radio"]:indeterminate{background:transparent;border-color:var(--line-2)}
    .check input[type="radio"]:indeterminate::after{content:none}
    .d1-ferr{color:var(--neg);font-size:11.5px;display:block;margin-block-start:4px}
    .d1-banner{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--card-2)}
    .d1-banner.ok{border-color:color-mix(in srgb,var(--pos) 40%,transparent);background:var(--tint-green)}
    .d1-banner.warn{border-color:color-mix(in srgb,var(--warn) 40%,transparent);background:var(--tint-orange)}
    .d1-banner.bad{border-color:color-mix(in srgb,var(--neg) 40%,transparent);background:var(--tint-rose)}
    .d1-banner b{display:block;font-size:13px}
    .d1-banner p{margin:2px 0 0;font-size:12.5px;color:var(--muted)}
    .d1-head{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
    .d1-head .sp{flex:1}
    .d1-code{font-family:ui-monospace,Menlo,monospace;font-weight:700;letter-spacing:.12em;padding:3px 8px;border-radius:7px;background:var(--card-2);border:1px solid var(--line);direction:ltr;unicode-bidi:isolate;font-size:12px}
    .d1-chips{display:flex;flex-wrap:wrap;gap:6px}
    .d1-stat{display:grid;gap:2px}
    .d1-stat small{color:var(--muted);font-size:12px}
    .d1-stat b{font-family:var(--font-num);font-size:20px;font-weight:700}
    .d1-tabbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .d1-tabbar .sp{flex:1}
  `);

  window.D1 = { setTitle, take, dayLabel, ST, pill, SEV, PRIO, KIND, MODTYPE, CHANNEL, CITY, CATEGORY, DIET, ALLERGEN, REPORTER, CARD, CERT, TICKET_CAT, lab, chip, sevDot, opts, money, ago, dt, win, card, prod, dl, section, err, toastErr, run, showFieldErrors, reasonModal, esc };
})();
