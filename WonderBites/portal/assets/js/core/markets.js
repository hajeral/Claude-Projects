/* =====================================================================
   Markets — country registry (currency, phone code, time zone, cities, VAT)   [CORE v1.3]
   Loaded from GET /shared/markets at boot (App.onBoot) and re-loaded whenever
   Admin → Settings → Markets changes. Nothing market-specific is hard-coded in screens:
   read it from here (or from the amount's own Money.currency).
   ===================================================================== */
(function (W) {
  'use strict';
  let list = [];            // every market (enabled or not), as returned by the API
  let fx = { reportingCurrency: 'QAR', rates: [{ currency: 'QAR', rate: 1 }], updatedAt: null };
  const FALLBACK = { code: 'QA', name: { en: 'Qatar', ar: 'قطر' }, currency: 'QAR', currencyLabel: { en: 'QAR', ar: 'ر.ق' }, phoneCode: '+974', phonePlaceholder: '5512 3456', timeZone: 'Asia/Qatar', vatRate: 0, enabled: true, cities: [{ id: 'doha', name: { en: 'Doha', ar: 'الدوحة' }, enabled: true }] };
  const lang = () => (W.App && W.App.state && W.App.state.lang) || 'en';
  const loc = (x) => (x == null ? '' : typeof x === 'object' ? x[lang()] || x.en || '' : String(x));

  const Markets = {
    /** all markets, or only enabled ones */
    list: (enabledOnly) => (list.length ? list : [FALLBACK]).filter((m) => !enabledOnly || m.enabled),
    enabled: () => Markets.list(true),
    get: (code) => Markets.list().find((m) => m.code === String(code || '').toUpperCase()) || null,
    /** the launch / default market (first enabled) */
    primary: () => Markets.enabled()[0] || FALLBACK,
    byCurrency: (cur) => Markets.list().find((m) => m.currency === cur) || null,
    /** "QAR" / "ر.ق" — the display label of a currency in the current language */
    currencyLabel: (cur) => { const m = Markets.byCurrency(cur); return m ? loc(m.currencyLabel) || cur : cur || ''; },
    currencies: (enabledOnly) => [...new Set(Markets.list(enabledOnly).map((m) => m.currency))],
    name: (code) => { const m = Markets.get(code); return m ? loc(m.name) : code || ''; },
    /** city label from any market (ids are unique across markets); falls back to the raw value */
    cityName: (id, code) => { if (id && typeof id === 'object') return loc(id); if (code === 'all') code = null; const ms = code ? [Markets.get(code)].filter(Boolean) : Markets.list(); for (const m of ms) { const c = (m.cities || []).find((x) => x.id === id || loc(x.name) === id || x.name.en === id); if (c) return loc(c.name); } return id ? String(id) : ''; },
    cityMarket: (id) => (Markets.list().find((m) => (m.cities || []).some((c) => c.id === id)) || {}).code || null,
    /** <select> options */
    options: (enabledOnly = true) => Markets.list(enabledOnly).map((m) => ({ value: m.code, label: loc(m.name) })),
    cityOptions: (code, enabledOnly = true) => { if (code === 'all') code = null; const ms = code ? [Markets.get(code)].filter(Boolean) : Markets.list(enabledOnly); return ms.flatMap((m) => (m.cities || []).filter((c) => c.enabled !== false).map((c) => ({ value: c.id, label: loc(c.name), market: m.code }))); },
    phoneOptions: (enabledOnly = true) => Markets.list(enabledOnly).map((m) => ({ value: m.phoneCode, label: `${m.phoneCode} ${loc(m.name)}`, market: m.code })),
    timeZoneOptions: () => [...new Map(Markets.list().map((m) => [m.timeZone, { value: m.timeZone, label: `${loc(m.name)} — ${m.timeZone} (UTC${m.utcOffset || ''})` }])).values()],
    currencyOptions: (enabledOnly) => Markets.list(enabledOnly).map((m) => ({ value: m.currency, label: `${loc(m.currencyName) || m.currency} (${m.currency})` })),
    /** markets in the current context: admin → selected market or every enabled one; merchant → the active branch's market */
    scope: () => { const c = W.App && W.App.market ? W.App.market() : 'all'; return c && c !== 'all' && Markets.get(c) ? [Markets.get(c)] : Markets.enabled(); },
    /** { cityId: localized name } for the context's markets */
    cityMap: () => { const o = {}; Markets.scope().forEach((m) => (m.cities || []).filter((c) => c.enabled !== false).forEach((c) => { o[c.id] = loc(c.name); })); return o; },
    /** a live map object (keys = context cities, any city id resolves to its name) — drop-in for old static CITY maps */
    cityProxy: () => new Proxy({}, {
      get: (_, k) => (typeof k !== 'string' ? undefined : Markets.cityMap()[k] || (Markets.cityMarket(k) ? Markets.cityName(k) : undefined)),
      has: (_, k) => k in Markets.cityMap(),
      ownKeys: () => Object.keys(Markets.cityMap()),
      getOwnPropertyDescriptor: (_, k) => { const v = Markets.cityMap()[k]; return v === undefined ? undefined : { enumerable: true, configurable: true, value: v }; },
    }),
    /** { code: localized name } of enabled markets — for country filters */
    countryMap: () => { const o = {}; Markets.enabled().forEach((m) => { o[m.code] = loc(m.name); }); return o; },
    /* ---- FX (manual rates, 1 unit of currency = rate units of the reporting currency) ---- */
    fx: () => fx,
    reportingCurrency: () => fx.reportingCurrency || Markets.primary().currency,
    rate: (cur) => (fx.rates.find((r) => r.currency === cur) || { rate: 1 }).rate,
    convert: (amount, from, to = Markets.reportingCurrency()) => (from === to ? amount : amount * Markets.rate(from) / Markets.rate(to)),
    /** load / reload the registry (emits App 'markets') */
    async load() {
      try {
        const r = await W.api('GET', '/shared/markets');
        list = r.data || []; if (r.meta && r.meta.fx) fx = { reportingCurrency: r.meta.reportingCurrency, ...r.meta.fx };
      } catch (e) { console.warn('[Markets] using fallback', e && e.message); list = list.length ? list : [FALLBACK]; }
      if (W.App) { W.App.emit('markets', list); W.App.marketsChanged && W.App.marketsChanged(); }
      return list;
    },
    _set(l, f) { list = l; if (f) fx = f; },
  };
  W.Markets = Markets;
  if (W.App && W.App.onBoot) W.App.onBoot(() => Markets.load());
})(window);
