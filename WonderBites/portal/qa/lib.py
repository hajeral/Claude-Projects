"""Shared helpers for the WonderBites QA crawler (Playwright, Python).

Usage: imported by render_crawl.py, click_crawl.py and flows.py.
The app is opened via file:// ; everything runs against the in-browser mock API.
"""
import json, os, re, time
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
INDEX = (APP / 'index.html').as_uri()
OUT = Path(__file__).resolve().parent / 'results'
OUT.mkdir(exist_ok=True)

IGNORE_CONSOLE = re.compile(r'fonts\.(googleapis|gstatic)\.com|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|Failed to load resource', re.I)

# Routes whose params must be sampled from mock data: route -> (list endpoint, query, param name, id field)
SAMPLES = {
    'admin-drop-edit': ('/admin/drops', {}, 'id'),
    'admin-merchant-detail': ('/admin/merchants', {}, 'id'),
    'admin-consumer-detail': ('/admin/consumers', {}, 'id'),
    'admin-ticket-detail': ('/admin/support/tickets', {}, 'id'),
    'admin-payout-detail': ('/admin/financials/payouts', {}, 'id'),
    'admin-wallet-detail': ('/admin/wallets', {}, 'id'),
    'admin-voucher-detail': ('/admin/vouchers', {}, 'id'),
    'admin-compliance-detail': ('/admin/compliance', {}, 'id'),
    'admin-template-edit': ('/admin/templates', {}, 'id'),
    'admin-cms-page': ('/admin/cms', {'type': 'page'}, 'id'),
    'admin-cms-banner': ('/admin/cms', {'type': 'banner'}, 'id'),
    'admin-cms-faq': ('/admin/cms', {'type': 'faq'}, 'id'),
    'm-inventory-detail': ('/merchant/listings', {}, 'id'),
    'm-driver-detail': ('/merchant/drivers', {}, 'id'),
    'm-customer-detail': ('/merchant/customers', {}, 'id'),
    'm-branch-edit': ('/merchant/branches', {}, 'id'),
    'm-report-detail': ('/merchant/disputes', {}, 'id'),
    'm-vendor-detail': ('/merchant/vendors', {}, 'id'),
    'm-create-product': ('/merchant/templates', {}, 'templateId'),
}
# Extra param variants worth rendering (tabs etc.) in addition to the default {} / sampled params
VARIANTS = {
    'admin-wallet': [{'tab': 'vouchers'}],
    'admin-issues': [{'tab': 'alerts'}, {'tab': 'moderation'}],
    'admin-cms': [{'tab': 'banners'}, {'tab': 'faq'}],
    'm-settings': [{'tab': t} for t in ('store', 'security', 'hours', 'language')],
    'forgot-password': [{'portal': 'admin'}],
    'otp': [{'portal': 'admin', 'challengeId': 'chl_qa', 'destination': 's***@wonderbites.ae'}],
    'reset-password': [{'portal': 'admin', 'token': 'rst_qa'}],
}

INSTRUMENT = r"""
(() => {
  if (window.__qa) return;
  const q = window.__qa = { pending: 0, calls: [], errors: [] };
  const orig = window.api;
  const w = function (method, path, payload, opts) {
    const p = String(path).split('?')[0];
    q.calls.push((method || 'GET').toUpperCase() + ' ' + p);
    q.pending++;
    let r; try { r = orig.apply(this, arguments); } catch (e) { q.pending--; throw e; }
    return Promise.resolve(r).finally(() => { q.pending--; });
  };
  Object.assign(w, orig);
  window.api = w;
  api.config({ latency: [5, 15] });
})();
"""


def boot(browser, width=1440, lang='en', theme='dark', height=900):
    """New context+page, app loaded, both portals logged in, api instrumented."""
    ctx = browser.new_context(viewport={'width': width, 'height': height}, accept_downloads=True)
    ctx.add_init_script(f"try{{localStorage.setItem('wb.lang',JSON.stringify('{lang}'));localStorage.setItem('wb.theme',JSON.stringify('{theme}'));}}catch(e){{}}")
    ctx.route(re.compile(r'https?://fonts\.(googleapis|gstatic)\.com/.*'), lambda r: r.abort())
    page = ctx.new_page()
    page.qa_console = []
    page.on('console', lambda m: m.type in ('error',) and not IGNORE_CONSOLE.search(m.text) and page.qa_console.append('console: ' + m.text[:400]))
    page.on('pageerror', lambda e: page.qa_console.append('pageerror: ' + (getattr(e, 'stack', None) or str(e))[:600]))
    page.goto(INDEX + '#launcher')
    page.wait_for_function('window.App && App.routes && App.routes["m-templates"] && document.querySelector("#page")')
    page.evaluate(INSTRUMENT)
    page.evaluate("App.login('admin', App.DEMO.admin); App.login('merchant', App.DEMO.merchant);")
    page.qa_env = dict(lang=lang, theme=theme, width=width)
    return ctx, page


def idle(page, settle=120, timeout=6000):
    """Wait until no api call is pending for `settle` ms (and no skeleton is busy)."""
    t0 = time.time(); quiet_since = None
    while (time.time() - t0) * 1000 < timeout:
        busy = page.evaluate("(window.__qa?window.__qa.pending:0) + document.querySelectorAll('[aria-busy=\"true\"]').length")
        now = time.time()
        if busy == 0:
            quiet_since = quiet_since or now
            if (now - quiet_since) * 1000 >= settle:
                return True
        else:
            quiet_since = None
        page.wait_for_timeout(30)
    return False


def restore_env(page):
    env = page.qa_env
    page.evaluate("""(env) => {
      if (window.UI && UI.closeAll) UI.closeAll();
      document.querySelectorAll('.toast,.toasts>*').forEach(x => x.remove());
      if (env.relogin !== false && !App.state.sessions.admin) App.login('admin', App.DEMO.admin);
      if (env.relogin !== false && !App.state.sessions.merchant) App.login('merchant', App.DEMO.merchant);
      if (App.state.theme !== env.theme) App.setTheme(env.theme);
      if (!env.keep && App.state.lang !== env.lang) { App.state.lang = env.lang; App.store.set('wb.lang', env.lang); document.documentElement.lang = env.lang; document.documentElement.dir = env.lang==='ar'?'rtl':'ltr'; }
      const dr = { from: api.demoDate(-30), to: api.DEMO_TODAY, preset: '30d' }; // (v1.4) relative to the demo today
      if (!env.keep && App.state.dateRange.from !== dr.from || App.state.dateRange.to !== dr.to) { App.state.dateRange = dr; App.store.set('wb.dateRange.v2', dr); }
      if (!env.keep && App.state.market !== 'all') { App.state.market = 'all'; App.store.set('wb.market', 'all'); }
      if (!env.keep && App.state.branch.id !== 'BR-01') { App.state.branch = { id: 'BR-01', name: 'Al Wasl Branch' }; App.store.set('wb.branch', App.state.branch); }
    }""", env)


def goto(page, name, params=None):
    restore_env(page)
    page.evaluate("([n,p]) => { I18N.clearMissing(); window.__qa.calls = []; if (location.hash.slice(1) === n) { App.go(n, p); } else { App.go(n, p); } }", [name, params or {}])
    page.wait_for_timeout(20)
    idle(page)
    page.evaluate('window.scrollTo(0,0)')


def sample_params(page):
    """Resolve SAMPLES to concrete params using the mock API."""
    out = {}
    for route, (ep, q, key) in SAMPLES.items():
        try:
            ident = page.evaluate("""async ([ep,q]) => { const r = await api('GET', ep, q); const d = Array.isArray(r.data) ? r.data : (r.data && (r.data.items || r.data.data || r.data.rows)) || [];
                const x = d[0]; return x ? (x.id || x.templateId || x.listingId || x.key) : null; }""", [ep, q])
        except Exception as e:  # noqa
            ident = None
        out[route] = {key: ident} if ident else {}
    # cms routes need the kind too in some screens: keep id only (screens read id)
    return out


def save(name, data):
    (OUT / name).write_text(json.dumps(data, indent=1, ensure_ascii=False))
