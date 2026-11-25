/* =====================================================================
   API client — api(method, path, payload, opts)   [LEAD]
   Mock adapter (default) ↔ real fetch (api.config({mock:false, BASE_URL})).
   Response: { data, meta }   Error: ApiError { status, code, message, details }
   ===================================================================== */
(function (W) {
  'use strict';
  const cfg = { mock: true, BASE_URL: '/api/v1', latency: [180, 450], timeout: 15000, log: false };
  const routes = []; // {method, re, keys, handler, pattern}
  const sims = new Map(); // 'GET /admin/drops' -> 'error' | 'empty' | 'slow'

  class ApiError extends Error {
    constructor(status, code, message, details) { super(message || code); this.status = status; this.code = code || 'ERROR'; this.details = details; }
  }

  function compile(pattern) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/\/+$/, '').replace(/[.+*?^$()[\]{}|\\]/g, '\\$&').replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    return { re, keys };
  }
  function qs(obj) {
    if (!obj) return '';
    const p = [];
    for (const k in obj) {
      const v = obj[k];
      if (v == null || v === '' ) continue;
      if (Array.isArray(v)) v.forEach((x) => p.push(encodeURIComponent(k) + '=' + encodeURIComponent(x)));
      else p.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
    return p.length ? '?' + p.join('&') : '';
  }
  function parseQuery(s) {
    const q = {};
    if (!s) return q;
    s.split('&').forEach((pair) => {
      if (!pair) return;
      const [k, v = ''] = pair.split('=').map(decodeURIComponent);
      if (k in q) q[k] = [].concat(q[k], v); else q[k] = v;
    });
    return q;
  }
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function headers() {
    const s = W.App && W.App.state;
    const h = { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Language': (s && s.lang) || 'en' };
    const tok = s && s.session && s.session.token;
    if (tok) h.Authorization = 'Bearer ' + tok;
    return h;
  }

  async function api(method, path, payload, opts = {}) {
    method = String(method || 'GET').toUpperCase();
    const isRead = method === 'GET' || method === 'DELETE' || method === 'HEAD';
    let fullPath = path;
    /* (v1.3) market convention: every admin-portal read carries `market` (= selected market code or 'all') unless the caller set one */
    const st = W.App && W.App.state;
    if (method === 'GET' && st && st.portal === 'admin' && /^\/(admin|shared\/search)/.test(path) && !/[?&]market=/.test(path) && !(payload && payload.market)) payload = { ...(payload || {}), market: st.market || 'all' };
    if (isRead && payload && typeof payload === 'object') fullPath += (path.includes('?') ? '&' + qs(payload).slice(1) : qs(payload));
    const body = isRead ? undefined : payload;
    if (cfg.log) console.debug('[api]', method, fullPath, body || '');
    return cfg.mock ? mockFetch(method, fullPath, body, opts) : realFetch(method, fullPath, body, opts);
  }

  async function realFetch(method, path, body, opts) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), opts.timeout || cfg.timeout);
    try {
      const res = await fetch(cfg.BASE_URL.replace(/\/$/, '') + path, { method, headers: { ...headers(), ...(opts.headers || {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal, credentials: 'include' });
      const txt = await res.text();
      const json = txt ? JSON.parse(txt) : {};
      if (!res.ok) { const e = json.error && typeof json.error === 'object' ? json.error : json; throw new ApiError(res.status, e.code || 'ERROR', e.message || res.statusText, e.details); }
      return normalize(json && typeof json === 'object' && !Array.isArray(json) && 'data' in json ? json : { data: json });
    } catch (e) {
      if (e instanceof ApiError) { if (e.status === 401 && W.App) W.App.logout(true); throw e; }
      throw new ApiError(0, e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK', e.message);
    } finally { clearTimeout(to); }
  }

  async function mockFetch(method, fullPath, body, opts) {
    const [p, q = ''] = fullPath.split('?');
    const path = p.replace(/\/+$/, '') || '/';
    const query = parseQuery(q);
    const sim = query.__sim || sims.get(method + ' ' + path) || [...sims.entries()].find(([k]) => (method + ' ' + path).startsWith(k))?.[1];
    delete query.__sim;
    const [a, b] = cfg.latency;
    await sleep(sim === 'slow' ? 2500 : opts.latency != null ? opts.latency : a + Math.random() * (b - a));
    if (sim === 'error') throw new ApiError(500, 'SIMULATED', W.t ? W.t('Something went wrong. Please try again.') : 'Something went wrong.');
    const route = routes.find((r) => r.method === method && r.re.test(path));
    if (!route) {
      console.warn('[api mock] no handler for', method, path);
      throw new ApiError(404, 'NO_MOCK', 'No mock handler for ' + method + ' ' + path);
    }
    const m = path.match(route.re);
    const params = {};
    route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
    const req = { method, path, params, query, body: clone(body), headers: headers() };
    let out;
    /* (v1.3) market scope: mocks read api.scope() (codes in scope) / api.scoped(array) while this handler runs */
    const prevScope = scope; scope = api.scopeFor ? api.scopeFor(query.market) : null;
    req.markets = scope;
    try { out = route.handler(req); if (out && typeof out.then === 'function') out = await out; if (method === 'GET' && lenses.some((l) => l.re.test(path))) { out = clone(out); out = lenses.reduce((o, l) => (l.re.test(path) ? l.fn(o, req) : o), out); } } catch (e) {
      scope = prevScope;
      if (e instanceof ApiError) throw e;
      console.warn('[api mock] handler crashed', method, path, e);
      throw new ApiError(500, 'MOCK_CRASH', e.message);
    }
    scope = prevScope;
    out = clone(out);
    const res = out && typeof out === 'object' && !Array.isArray(out) && ('data' in out) ? out : { data: out };
    if (sim === 'empty') { if (Array.isArray(res.data)) { res.data = []; if (res.meta) res.meta.total = 0; if ('total' in res) res.total = 0; } }
    return normalize(res);
  }
  /* Contract lists are { data, page, pageSize, total, summary }; older mocks use { data, meta }. Expose both. */
  function normalize(res) {
    if (!res || typeof res !== 'object') return res;
    if (res.meta && typeof res.meta === 'object') { ['page', 'pageSize', 'total', 'summary'].forEach((k) => { if (res.meta[k] !== undefined && res[k] === undefined) res[k] = res.meta[k]; }); }
    else if ('total' in res || 'page' in res || 'summary' in res) res.meta = { page: res.page, pageSize: res.pageSize, total: res.total, summary: res.summary };
    return res;
  }

  api.mock = function (method, pattern, handler) {
    const { re, keys } = compile(pattern);
    // later registrations win (allows overrides); keep most specific first by inserting at front
    routes.unshift({ method: method.toUpperCase(), re, keys, handler, pattern });
  };
  /* ---------------- (v1.3) market scope helpers for mock modules ---------------- */
  let scope = null; const lenses = [];
  /** codes of the markets the current mock request may see (null = not market-scoped) */
  api.scope = () => scope;
  /** row → is it visible in the current scope? (rows carry `market` or `country`; rows without one are global) */
  api.inScope = (row) => !scope || !row || !(row.market || row.country) || scope.includes(row.market || row.country);
  /** a live, market-filtered view of a mutable seed array: reads/iteration see in-scope rows only, while
      find/findIndex/indexOf/push/splice/unshift and index reads/writes act on the full array (detail lookups and mutations keep working). */
  api.scoped = (arr) => new Proxy(arr, {
    get(t, k) {
      if (!scope || (typeof k === 'string' && /^\d+$/.test(k)) || ['find', 'findIndex', 'indexOf', 'includes', 'push', 'unshift', 'splice', 'pop', 'shift'].includes(k)) { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; }
      const view = t.filter(api.inScope); const v = view[k]; return typeof v === 'function' ? v.bind(view) : v;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  /** api.lens(/^\/admin\/financials/, (out, req) => out) — post-process GET responses for paths (market conversion of aggregates) */
  api.lens = (re, fn) => lenses.push({ re, fn });
  api.config = (o) => Object.assign(cfg, o || {});
  api.simulate = (key, mode) => (mode ? sims.set(key, mode) : sims.delete(key));
  api.error = (status, code, message, details) => new ApiError(status, code, message, details);
  api.notFound = (what) => { throw new ApiError(404, 'NOT_FOUND', (what || 'Resource') + ' not found'); };
  api.qs = qs;
  api.ApiError = ApiError;
  api.routes = () => routes.map((r) => r.method + ' ' + r.pattern);
  /** Context params every list call should carry: date range + merchant branch */
  api.ctx = () => {
    const s = (W.App && W.App.state) || {};
    const o = {};
    if (s.dateRange) { o.from = s.dateRange.from; o.to = s.dateRange.to; }
    if (s.portal === 'merchant' && s.branch && s.branch.id) o.branchId = s.branch.id;
    return o;
  };

  /* ---------------- tiny in-memory DB for mocks ---------------- */
  const tables = {};
  api.db = {
    table(name, seed = [], opts = {}) {
      if (tables[name]) return tables[name];
      const key = opts.key || 'id';
      let rows = clone(seed);
      const searchable = opts.searchable || null;
      const tbl = {
        name,
        all: () => rows,
        get: (id) => rows.find((r) => String(r[key]) === String(id)) || null,
        insert(row) { const r = { ...row }; if (r[key] == null) r[key] = (opts.prefix || name.slice(0, 3).toUpperCase() + '-') + (1000 + rows.length + 1); rows.unshift(r); return r; },
        update(id, patch) { const r = tbl.get(id); if (!r) throw new ApiError(404, 'NOT_FOUND', name + ' ' + id + ' not found'); Object.assign(r, patch || {}); return r; },
        remove(id) { const n = rows.length; rows = rows.filter((r) => String(r[key]) !== String(id)); return rows.length < n; },
        set(next) { rows = clone(next); },
        list(query = {}, o = {}) {
          const { q, sort, page = 1, pageSize = 10, from, to, branchId, ...filters } = query;
          delete filters.market; let out = rows.filter(api.inScope);
          if (q) {
            const needle = String(q).toLowerCase();
            out = out.filter((r) => (searchable || Object.keys(r)).some((k) => r[k] != null && String(r[k]).toLowerCase().includes(needle)));
          }
          for (const k in filters) {
            const v = filters[k];
            if (v === '' || v === 'all' || v == null || k.startsWith('_')) continue;
            if (o.filter && o.filter(null, k, v) === 'skip') continue;
            out = out.filter((r) => (Array.isArray(r[k]) ? r[k].map(String).includes(String(v)) : r[k] == null ? true : String(r[k]) === String(v)));
          }
          if (o.filter) out = out.filter((r) => o.filter(r, query) !== false);
          if (sort) {
            const desc = sort[0] === '-'; const f = desc ? sort.slice(1) : sort;
            out.sort((a, b) => { const x = a[f], y = b[f]; const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)); return desc ? -c : c; });
          }
          const total = out.length; const ps = Math.max(1, +pageSize || 10); const pg = Math.max(1, +page || 1);
          const sum = o.summary ? o.summary(rows.filter(api.inScope), out, query) : undefined;
          return { data: out.slice((pg - 1) * ps, pg * ps), page: pg, pageSize: ps, total, summary: sum, meta: { page: pg, pageSize: ps, total, summary: sum } };
        },
      };
      tables[name] = tbl;
      return tbl;
    },
    get: (name) => tables[name],
  };

  W.api = api;
})(window);
