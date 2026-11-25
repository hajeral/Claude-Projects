"""Runtime probe: opens index.html in headless Chrome (Playwright), lists every mock route registered with api.mock(),
calls every GET (ids harvested from list responses), unwraps the client {data, meta} envelope and saves response
shapes to $WB_PROBE_JSON (default /tmp/wb_probe.json). Needed by check_shapes.py."""
import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))  # app/
SPEC = os.path.join(ROOT, "docs", "openapi.yaml")
PROBE = os.environ.get("WB_PROBE_JSON", "/tmp/wb_probe.json")
import json
from playwright.sync_api import sync_playwright
JS = r"""
async () => {
  const api = window.api; api.config({ latency: [0, 0] });
  const routes = api.routes();
  const out = { routes, shapes: {} };
  const ids = {};
  const shape = (v, d=0) => {
    if (v === null || v === undefined) return null;
    if (Array.isArray(v)) return v.length ? [shape(v[0], d+1)] : [];
    if (typeof v === 'object') { if (d > 3) return '{…}'; const o = {}; for (const k of Object.keys(v)) o[k] = shape(v[k], d+1); return o; }
    return typeof v;
  };
  const call = async (m, p, q) => { try { let r = await api(m, p, q || {}); if (r && typeof r === 'object') { if (r.page === undefined && r.total === undefined && 'data' in r) r = r.data; else if (r && 'meta' in r) { r = Object.assign({}, r); delete r.meta; } } return r; } catch (e) { return { __err: (e && (e.code || e.message)) || String(e) }; } };
  // list endpoints first to harvest ids
  const gets = routes.filter(r => r.startsWith('GET ')).map(r => r.slice(4));
  const noParam = gets.filter(p => !p.includes(':') && !p.includes('{'));
  for (const p of noParam) {
    const q = p.includes('operating-hours') ? { branchId: 'BR-01' } : p.includes('/shared/search') ? { q: 'a' } : p.includes('policies/') ? {} : {};
    const r = await call('GET', p, q);
    out.shapes['GET ' + p] = shape(r);
    const first = r && Array.isArray(r.data) && r.data[0];
    if (first && first.id) ids[p] = first.id;
  }
  for (const p of gets.filter(p => p.includes(':') || p.includes('{'))) {
    const base = p.replace(/\/[:{][^/]+.*$/, '');
    let id = ids[base];
    const parts = p.split('/'); let filled = []; let ok = true;
    for (let i = 0; i < parts.length; i++) {
      const s = parts[i];
      if (s.startsWith(':') || s.startsWith('{')) {
        const b = parts.slice(0, i).join('/');
        let v = ids[b];
        if (!v && /policies$/.test(b)) v = 'refund';
        if (!v && /cms$/.test(b)) v = 'pages';
        if (!v && /cms\/(pages|banners|faqs)$/.test(b)) v = ids['/admin/cms/' + b.split('/').pop()];
        if (!v && /imports\/templates$/.test(b)) v = 'merchant.orders';
        if (!v && /operations$/.test(b)) v = 'fulfilment-funnel';
        if (!v) { ok = false; break; }
        filled.push(v);
      } else filled.push(s);
    }
    if (!ok) { out.shapes['GET ' + p] = '__noid'; continue; }
    const r = await call('GET', filled.join('/'), {});
    out.shapes['GET ' + p] = shape(r);
  }
  return out;
}
"""
with sync_playwright() as pw:
    chrome = os.environ.get('CHROME', '/usr/bin/google-chrome')
    b = pw.chromium.launch(executable_path=chrome if os.path.exists(chrome) else None, args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.join(ROOT, 'index.html') + '#admin-command-center')
    pg.wait_for_function('window.api && window.api.routes && window.api.routes().length > 100', timeout=30000)
    pg.wait_for_timeout(2500)
    res = pg.evaluate(JS)
    res['pageErrors'] = errs
    json.dump(res, open(PROBE, 'w'), indent=1)
    print(len(res['routes']), 'routes;', len(res['shapes']), 'GET probed;', 'errors', errs[:3])
    b.close()
