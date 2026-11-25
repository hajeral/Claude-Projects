/* =====================================================================
   i18n — t(), dictionary merge, locale-aware formatting   [LEAD]
   EN keys = English UI text. Arabic added with App.i18n.add({...}).
   ===================================================================== */
(function (W) {
  'use strict';
  const AR = Object.create(null);
  const missing = new Set();
  const lang = () => (W.App && W.App.state && W.App.state.lang) || 'en';

  /* Keys may carry a context prefix for ambiguous words: t('theme|Day') → EN "Day", AR lookup of the full key. */
  function t(key, vars) {
    if (key == null) return '';
    let s = String(key);
    const bar = s.indexOf('|'); const ctxKey = bar > 0 && bar < 24 && !/\s/.test(s.slice(0, bar)) ? s : null;
    if (ctxKey) s = s.slice(bar + 1);
    if (lang() === 'ar' && !/[\u0600-\u06FF]/.test(s)) {
      if (ctxKey && ctxKey in AR) s = AR[ctxKey];
      else if (s in AR) s = AR[s];
      else if (s.trim() && !/^[\d\s.,:%+\-–—/#()]*$/.test(s)) missing.add(ctxKey || s);
    }
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k] == null ? '' : vars[k]);
    return s;
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const AR_WD = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  MONTHS.forEach((m, i) => { AR[m] = AR_MONTHS[i]; AR[MONTHS_LONG[i]] = AR_MONTHS[i]; });
  WD.forEach((d, i) => { AR[d] = AR_WD[i]; });

  /* (v1.3) currency labels come from the markets registry (Markets.currencyLabel); this map is only the boot fallback */
  const CUR = { QAR: { en: 'QAR', ar: 'ر.ق' }, AED: { en: 'AED', ar: 'د.إ' }, SAR: { en: 'SAR', ar: 'ر.س' }, USD: { en: 'USD', ar: '$' } };
  const curLabel = (cur) => { const m = W.Markets && W.Markets.byCurrency(cur); if (m && m.currencyLabel) return m.currencyLabel[lang()] || m.currencyLabel.en || cur; return (CUR[cur] || { en: cur, ar: cur })[lang()]; };
  /** default currency = the context's (merchant branch / admin market / reporting currency) — never a hard-coded one */
  const ctxCur = () => (W.App && W.App.currency ? W.App.currency() : 'QAR');
  /** ISO timestamps are shown in the context time zone (branch / market); plain dates and HH:mm stay as they are */
  const tzParts = (x) => {
    const tz = W.App && W.App.timeZone ? W.App.timeZone() : null; if (!tz) return null;
    try { const p = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(x).forEach((q) => { p[q.type] = +q.value; }); return p; } catch (e) { return null; }
  };
  const N = (v) => `<span class="num">${v}</span>`;
  const group = (v, dec) => {
    const n = Number(v);
    if (!isFinite(n)) return String(v);
    return n.toLocaleString('en-US', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec == null ? 2 : dec });
  };
  const toDate = (d) => (d instanceof Date ? d : new Date(String(d).length <= 10 ? d + 'T00:00:00' : d));

  const text = {
    number: (v, dec) => group(v, dec),
    compact: (v) => { const n = Number(v); const a = Math.abs(n); return a >= 1e6 ? +(n / 1e6).toFixed(1) + 'M' : a >= 1e3 ? +(n / 1e3).toFixed(1) + 'k' : group(n, 0); },
    money: (v, cur, dec) => { if (v && typeof v === 'object') { cur = v.currency || cur; v = v.amount; } cur = cur || ctxCur(); const c = curLabel(cur); const s = group(v, dec); return lang() === 'ar' ? `${s} ${c}` : `${c} ${s}`; },
    pct: (v, o = {}) => { const n = Number(v); const s = (o.sign && n > 0 ? '+' : '') + group(n, o.dec == null ? 1 : o.dec).replace(/\.0$/, ''); return s + (o.pp ? 'pp' : '%'); },
    date: (d, style = 'medium') => {
      const x = toDate(d); if (isNaN(x)) return String(d);
      let m = x.getMonth(), day = x.getDate(), y = x.getFullYear();
      if (typeof d === 'string' && d.length > 10) { const p = tzParts(x); if (p) { m = p.month - 1; day = p.day; y = p.year; } }
      if (lang() === 'ar') return style === 'short' ? `${day} ${AR_MONTHS[m]}` : `${day} ${AR_MONTHS[m]} ${y}`;
      return style === 'short' ? `${MONTHS[m]} ${day}` : style === 'long' ? `${MONTHS_LONG[m]} ${day}, ${y}` : `${MONTHS[m]} ${day}, ${y}`;
    },
    time: (hhmm) => {
      const [h, mi] = String(hhmm).split(':').map(Number); if (isNaN(h)) return String(hhmm);
      const h12 = ((h + 11) % 12) + 1, am = h < 12;
      return `${h12}:${String(mi || 0).padStart(2, '0')} ${lang() === 'ar' ? (am ? 'ص' : 'م') : (am ? 'AM' : 'PM')}`;
    },
    timeRange: (a, b) => {
      const ta = text.time(a), tb = text.time(b);
      const sa = ta.split(' '), sb = tb.split(' ');
      return sa[1] === sb[1] ? `${sa[0]}–${sb[0]} ${sb[1]}` : `${ta} – ${tb}`;
    },
    ago: (min) => {
      if (typeof min === 'string' && isNaN(+min)) { min = Math.max(0, (Date.now() - toDate(min)) / 60000); }
      min = Math.round(Number(min));
      const ar = lang() === 'ar';
      if (min < 60) return ar ? `${min} د` : `${min}m`;
      if (min < 1440) return ar ? `${Math.round(min / 60)} س` : `${Math.round(min / 60)}h`;
      return ar ? `${Math.round(min / 1440)} ي` : `${Math.round(min / 1440)}d`;
    },
    month: (m) => (lang() === 'ar' ? (AR[m] || m) : m),
    /** ISO timestamp → 'HH:mm' in the context time zone (branch / market) */
    clock: (iso) => { const x = toDate(iso); if (isNaN(x)) return ''; const p = tzParts(x); const h = p ? p.hour : x.getHours(), mi = p ? p.minute : x.getMinutes(); return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0'); },
    currency: (cur) => curLabel(cur || ctxCur()),
    range: (from, to) => `${text.date(from, 'short')} – ${text.date(to, 'short')}`,
  };

  // HTML versions: numeric runs isolated LTR so they render correctly inside RTL text.
  const iso = (s) => String(s).replace(/[+\-−]?[#]?[\d][\d,.:%–\-/]*(?:pp)?/g, (m) => N(m));
  const fmt = {
    text,
    num: N,
    number: (v, dec) => N(text.number(v, dec)),
    compact: (v) => N(text.compact(v)),
    money: (v, cur, dec) => { if (v && typeof v === 'object') { cur = v.currency || cur; v = v.amount; } cur = cur || ctxCur(); const c = curLabel(cur); const s = N(group(v, dec)); return lang() === 'ar' ? `${s} ${c}` : `${c} ${s}`; },
    /** Format a contract Kpi value by its `format` (number|money|percent|duration_minutes|duration_hours|days|rating|weight_kg|tonnes|litres|gallons) */
    kpi: (k) => {
      const v = k.value, f = k.format || 'number';
      if (f === 'money') return fmt.money(v, k.currency || ctxCur());
      if (f === 'percent') return N(text.pct(v));
      if (f === 'rating') return N(group(v, 1));
      const unit = { duration_minutes: 'min', duration_hours: 'h', days: 'days', weight_kg: 'kg', tonnes: 't', litres: 'L', gallons: 'gal' }[f];
      const num = Math.abs(v) >= (unit ? 1000 : 10000) ? text.compact(v) : group(v, Math.abs(v) < 100 && v % 1 ? 1 : 0);
      return unit ? `${N(num)} ${t(unit)}` : N(num);
    },
    /** Kpi delta → '+16.4%' / '+3' / '+4.1pp' / '−0.6 days' */
    delta: (k) => { if (k.delta == null) return ''; const d = Number(k.delta); const sign = d > 0 ? '+' : d < 0 ? '−' : ''; const a = Math.abs(d); const u = k.deltaUnit || 'pct'; return sign + (u === 'pct' ? group(a, 1).replace(/\.0$/, '') + '%' : u === 'pp' ? group(a, 1) + 'pp' : u === 'abs' ? group(a, a % 1 ? 1 : 0) : group(a, 1) + ' ' + t(u)); },
    pct: (v, o) => N(text.pct(v, o)),
    date: (d, s) => iso(text.date(d, s)),
    time: (x) => iso(text.time(x)),
    timeRange: (a, b) => iso(text.timeRange(a, b)),
    ago: (m) => iso(text.ago(m)),
    month: (m) => text.month(m),
    clock: (x) => iso(text.time(text.clock(x))),
    /** currency label of the context (or of `cur`) — e.g. input prefixes */
    currency: (cur) => curLabel(cur || ctxCur()),
    range: (a, b) => iso(text.range(a, b)),
    id: (s) => N(s),
    iso,
  };

  /** LocalizedText {en, ar} → string in the current language (strings pass through t()) */
  const loc = (x) => (x == null ? '' : typeof x === 'object' ? (x[lang()] || x.en || x.ar || '') : t(String(x)));
  t.loc = loc;
  W.t = t;
  W.fmt = fmt;
  const CORE = new Set(); const conflicts = [];
  W.I18N = {
    /** add(dict, {core:true}) — core (shell) keys can't be overridden by module dictionaries; conflicts are listed by I18N.conflicts() */
    add(dict, o = {}) { for (const k in dict) { if (CORE.has(k) && !o.core && AR[k] !== dict[k]) { conflicts.push({ key: k, kept: AR[k], ignored: dict[k] }); continue; } AR[k] = dict[k]; if (o.core) CORE.add(k); } },
    conflicts: () => conflicts.slice(),
    /** release(keys) — let modules override these core keys (context-dependent words) */
    release(keys) { (keys || []).forEach((k) => CORE.delete(k)); },
    has: (k) => k in AR,
    missing: () => [...missing],
    clearMissing: () => missing.clear(),
    months: MONTHS, weekdays: WD,
    dict: AR,
  };
})(window);
