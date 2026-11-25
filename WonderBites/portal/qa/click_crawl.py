"""Click-through crawler.

For every route (+ sampled params) it clicks every visible interactive element in isolation
(the route is re-rendered and overlays closed before each click), and asserts that *something happens*:
route change, overlay (modal/drawer/popover/menu) opened or closed, toast, DOM/state change, API call,
download, file chooser or aria state change — and that no console/page error is raised.
When a click opens an overlay, every element inside that overlay is clicked too (depth 2).
Native <select>s outside forms are exercised by picking another option.

  python3 qa/click_crawl.py                 # all routes, EN night 1440
  python3 qa/click_crawl.py --lang ar       # Arabic
  python3 qa/click_crawl.py --shard 0/2     # run half of the routes (parallel workers)
  python3 qa/click_crawl.py admin-drops m-orders   # only these routes
"""
import sys, json, time, re
from playwright.sync_api import sync_playwright
from lib import boot, goto, idle, restore_env, sample_params, save, INSTRUMENT, OUT

SEL = 'button, a[href], [role=tab], [role=menuitem], [role=option], [role=switch], [role=link], [role=checkbox], [data-go], [data-act], [data-ov], summary, input[type=checkbox], input[type=radio], [tabindex="0"]'

MARK_JS = r"""
([scopeSel, SEL]) => {
  document.querySelectorAll('[data-qx]').forEach((x) => x.removeAttribute('data-qx'));
  let scopes;
  if (scopeSel === '@overlay') { const o = [...document.querySelectorAll('.modal, .drawer, .pop')]; scopes = o.length ? [o[o.length - 1]] : []; }
  else scopes = [...document.querySelectorAll(scopeSel)];
  const out = []; const seen = new Set();
  const vis = (el) => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false; return !el.closest('[hidden],.sr-only,[aria-hidden="true"]'); };
  const txt = (el) => (el.getAttribute('aria-label') || el.innerText || el.value || el.title || '').trim().replace(/\s+/g, ' ');
  let i = 0;
  scopes.forEach((scope) => scope.querySelectorAll(SEL).forEach((el) => {
    if (!vis(el)) return;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('fieldset[disabled]')) return;
    if (el.matches('input[type=checkbox],input[type=radio]') && el.closest('label') && !vis(el)) return;
    const tr = el.closest('tbody tr'); if (tr && tr.parentElement.firstElementChild !== tr) return;   // first row only
    // inner element of another candidate that is not itself an actionable control → skip (the outer one is tested)
    if (!el.matches('button,a,[role=tab],[role=menuitem],[role=option],input') && el.parentElement && el.parentElement.closest(SEL) && scope.contains(el.parentElement.closest(SEL))) return;
    const href = el.getAttribute('href') || '';
    const t = txt(el).replace(/\d+([.,:]\d+)*/g, '#').slice(0, 48);
    const sig = [el.tagName.toLowerCase(), el.getAttribute('role') || '', el.getAttribute('data-act') || '', el.getAttribute('data-go') || '', el.getAttribute('data-ov') || '', el.name || '', href.startsWith('#') ? '' : href.slice(0, 30), tr ? 'row' : '', t].join('|');
    if (seen.has(sig)) return; seen.add(sig);
    el.setAttribute('data-qx', String(i));
    const pressed = el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-current') === 'page' || el.getAttribute('aria-checked') === 'true' && el.type === 'radio' || (el.type === 'radio' && el.checked);
    out.push({ i: i++, sig, desc: `${el.tagName.toLowerCase()}${el.getAttribute('role') ? '[' + el.getAttribute('role') + ']' : ''} "${txt(el).slice(0, 60)}"`, href, active: !!pressed, inTr: !!tr });
  }));
  return out;
}
"""

SNAP_JS = r"""
() => {
  const h = (s) => { let x = 0; for (let k = 0; k < s.length; k++) x = (x * 31 + s.charCodeAt(k)) | 0; return x; };
  const app = document.getElementById('app');
  const ov = [...document.querySelectorAll('.modal, .drawer, .pop')];
  const strip = (s) => s.replace(/ data-qx="\d+"/g, '');
  const form = h([...document.querySelectorAll('#app input, #app select, #app textarea, .modal input, .modal select, .modal textarea, .drawer input, .drawer select, .drawer textarea, .pop input')].map((i) => (i.type === 'checkbox' || i.type === 'radio') ? (i.checked ? 1 : 0) : i.value).join('|'));
  return { route: App.state.route, params: JSON.stringify(App.paramsFor(App.state.route)), hash: location.hash,
    dom: h(strip(app.innerHTML)), ov: ov.length, ovDom: h(ov.map((o) => strip(o.innerHTML)).join('')), toasts: document.querySelectorAll('.toasts .toast').length,
    calls: window.__qa.calls.length, form, lang: App.state.lang, theme: App.state.theme, unread: App.state.unread,
    dr: JSON.stringify(App.state.dateRange), branch: App.state.branch.id,
    ph: !!document.querySelector('#page .ph-screen') && !document.querySelector('.launch'), nf: App.state.route === 'not-found' || !!document.querySelector('.launch .ph-screen'),
    reg: !!App.routes[App.state.route], err: !!document.querySelector('#page .errst') };
}
"""


def effects(a, b, extra):
    e = []
    if a['route'] != b['route'] or a['params'] != b['params']:
        e.append('route:' + b['route'])
    if b['ov'] > a['ov']: e.append('overlay-open')
    elif b['ov'] < a['ov']: e.append('overlay-close')
    elif b['ov'] and a['ovDom'] != b['ovDom']: e.append('overlay-change')
    if b['toasts'] > a['toasts']: e.append('toast')
    if b['calls'] > a['calls']: e.append('api')
    for k in ('lang', 'theme', 'unread', 'dr', 'branch'):
        if a[k] != b[k]: e.append('state:' + k)
    if a['dom'] != b['dom'] and 'route' not in ''.join(e): e.append('dom')
    if a['form'] != b['form']: e.append('input-state')
    e += extra
    return e


class Crawler:
    def __init__(self, browser, lang, theme, width):
        self.b = browser; self.env = (lang, theme, width)
        self.ctx, self.page = boot(browser, width, lang, theme)
        self.samples = sample_params(self.page)
        self._markets()
        self.extra = []
        self._wire()

    def _wire(self):
        p = self.page
        p.on('download', lambda d: self.extra.append('download'))
        p.on('filechooser', lambda f: self.extra.append('filechooser'))
        p.on('dialog', lambda d: (self.extra.append('native-dialog'), d.dismiss()))
        p.on('popup', lambda pp: (self.extra.append('popup'), pp.close()))

    def _markets(self):
        if '--all-markets' in sys.argv:  # (v1.3) UAE + KSA enabled
            self.page.evaluate("async () => { for (const c of ['AE', 'SA']) await api('PATCH', '/admin/settings/markets/' + c, { enabled: true }); await Markets.load(); }")

    def reboot(self):
        try: self.ctx.close()
        except Exception: pass
        self.ctx, self.page = boot(self.b, self.env[2], self.env[0], self.env[1])
        self._wire(); self._markets()

    def reset(self, route, params):
        goto(self.page, route, params)
        s = self.page.evaluate(SNAP_JS)
        if s['route'] != route and route not in ('otp',):
            return s
        return s

    def click(self, qa_index):
        loc = self.page.locator(f'[data-qx="{qa_index}"]').first
        try:
            loc.scroll_into_view_if_needed(timeout=1500)
            loc.click(timeout=2500)
            return None
        except Exception as ex:  # covered / detached
            msg = str(ex).split('\n')[0][:160]
            try:
                loc.click(timeout=1500, force=True)
                return 'forced: ' + msg
            except Exception as ex2:
                return 'unclickable: ' + str(ex2).split('\n')[0][:160]

    def one(self, route, params, scope, item, parent=None):
        """reset → (open parent) → click item → classify"""
        p = self.page
        self.reset(route, params)
        if parent is not None:
            items = p.evaluate(MARK_JS, [scope, SEL])
            pm = next((x for x in items if x['sig'] == parent['sig']), None)
            if not pm:
                return {'verdict': 'skip', 'why': 'parent not found after reset'}
            self.click(pm['i']); idle(p, 120)
            if not p.evaluate("document.querySelectorAll('.modal, .drawer, .pop').length"):
                return {'verdict': 'skip', 'why': 'overlay did not reopen'}
            items = p.evaluate(MARK_JS, ['@overlay', SEL])
        else:
            items = p.evaluate(MARK_JS, [scope, SEL])
        me = next((x for x in items if x['sig'] == item['sig']), None)
        if not me:
            return {'verdict': 'skip', 'why': 'element not present after reset'}
        if me['href'] and re.match(r'^(tel:|mailto:|https?:)', me['href']):
            return {'verdict': 'ok', 'effects': ['external-link:' + me['href'][:40]]}
        if me['href'] and not me['href'].startswith('#') and not me['href'].startswith('javascript'):
            from lib import APP
            f = APP / me['href'].split('#')[0]
            return {'verdict': 'ok' if f.exists() else 'bad-route', 'effects': ['doc-link:' + me['href']], 'why': '' if f.exists() else 'missing file ' + me['href']}
        p.qa_console.clear(); self.extra = []
        p.evaluate('I18N.clearMissing()')
        before = p.evaluate(SNAP_JS)
        cl = self.click(me['i'])
        idle(p, 150)
        p.wait_for_timeout(60)
        after = p.evaluate(SNAP_JS)
        eff = effects(before, after, list(self.extra))
        errs = list(p.qa_console)
        miss = p.evaluate('I18N.missing()') if self.env[0] == 'ar' else []
        res = {'effects': eff, 'errors': errs}
        if miss: res['missing'] = miss
        if cl: res['click'] = cl
        if errs: res['verdict'] = 'error'
        elif cl and cl.startswith('unclickable'): res['verdict'] = 'unclickable'
        elif after['ph'] or after['nf'] or not after['reg']: res['verdict'] = 'bad-route'; res['why'] = after['route']
        elif not eff: res['verdict'] = 'already-active' if me['active'] else 'dead'
        else: res['verdict'] = 'ok'
        if miss and res['verdict'] == 'ok': res['verdict'] = 'i18n'; res['why'] = 'missing AR: ' + ', '.join(miss[:8])
        res['overlayOpened'] = after['ov'] > before['ov']
        return res

    def selects(self, route, params):
        """native selects outside forms: choose a different option → expect refetch/DOM change"""
        out = []
        self.reset(route, params)
        n = self.page.evaluate("[...document.querySelectorAll('#page select')].filter(s => !s.closest('form') && s.offsetParent && !s.disabled).length")
        for k in range(n):
            self.reset(route, params)
            p = self.page
            info = p.evaluate("""(k) => { const s = [...document.querySelectorAll('#page select')].filter(s => !s.closest('form') && s.offsetParent && !s.disabled)[k]; if (!s) return null; s.setAttribute('data-qsel','1');
                const o = [...s.options].find(o => o.value !== s.value && !o.disabled); return { name: s.name || s.getAttribute('aria-label') || '', to: o ? o.value : null }; }""", k)
            if not info or info['to'] is None: continue
            p.qa_console.clear(); before = p.evaluate(SNAP_JS)
            p.select_option('[data-qsel="1"]', info['to']); idle(p, 300)
            after = p.evaluate(SNAP_JS); eff = effects(before, after, [])
            out.append({'desc': f'select[name={info["name"]}] → {info["to"]}', 'depth': 1, 'effects': eff, 'errors': list(p.qa_console),
                        'verdict': 'error' if p.qa_console else ('ok' if eff else 'dead')})
        return out

    def route(self, route, params, scope='#page', depth2=True, max_items=70):
        t0 = time.time()
        self.reset(route, params)
        if self.page.evaluate('App.state.route') != route:
            return {'route': route, 'params': params, 'skipped': 'redirected to ' + self.page.evaluate('App.state.route'), 'items': []}
        base_err = self.page.evaluate("!!document.querySelector('#page .errst')")
        items = self.page.evaluate(MARK_JS, [scope, SEL])[:max_items]
        results = []
        for it in items:
            r = self.one(route, params, scope, it)
            if r.get('verdict') == 'skip':  # state consumed by an earlier click (e.g. order completed) → fresh app, retry
                self.reboot(); r = self.one(route, params, scope, it)
            r.update(desc=it['desc'], sig=it['sig'], depth=1)
            results.append(r)
            if r.get('overlayOpened') and depth2:
                kids = self.page.evaluate(MARK_JS, ['@overlay', SEL])[:30]
                for kid in kids:
                    rk = self.one(route, params, scope, kid, parent=it)
                    if rk.get('verdict') == 'skip':
                        self.reboot(); rk = self.one(route, params, scope, kid, parent=it)
                    rk.update(desc=it['desc'] + ' › ' + kid['desc'], sig=kid['sig'], depth=2)
                    results.append(rk)
                    self._health(route, params, base_err)
            self._health(route, params, base_err)
        res = {'route': route, 'params': params, 'scope': scope, 'items': results, 'secs': round(time.time() - t0, 1)}
        if scope == '#page':
            res['items'] += self.selects(route, params)
        return res

    def _health(self, route, params, base_err):
        """if a destructive click removed the entity this detail page shows, reboot the app (fresh mock DB)"""
        try:
            self.reset(route, params)
            bad = self.page.evaluate("!!document.querySelector('#page .errst')") and not base_err
            if bad or self.page.evaluate('App.state.route') != route:
                self.reboot()
        except Exception:
            self.reboot()


def main():
    args = sys.argv[1:]
    lang = args[args.index('--lang') + 1] if '--lang' in args else 'en'
    theme = args[args.index('--theme') + 1] if '--theme' in args else 'dark'
    shard = args[args.index('--shard') + 1] if '--shard' in args else None
    skipv = {a for i, a in enumerate(args) if i and args[i - 1] in ('--lang', '--theme', '--shard')}
    only = [a for a in args if not a.startswith('--') and a not in skipv]
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        c = Crawler(b, lang, theme, 1440)
        routes = [r for r in c.page.evaluate('Object.keys(App.routes)') if r != 'not-found']
        if only: routes = [r for r in routes if r in only]
        if shard:
            k, n = map(int, shard.split('/')); routes = routes[k::n]
        out = []
        # global chrome once per portal
        if not only or 'chrome' in only:
            for r in ('admin-command-center', 'm-overview'):
                if shard and r not in routes: continue
                res = c.route(r, {}, scope='.side, .top')
                res['route'] = r + ' (chrome)'
                out.append(res); report(res)
        for r in routes:
            params = c.samples.get(r, {})
            if r == 'otp': params = {'portal': 'admin', 'challengeId': 'chl_qa', 'destination': 's***@wonderbites.ae'}
            try:
                res = c.route(r, params)
            except Exception as ex:  # noqa
                res = {'route': r, 'params': params, 'crash': str(ex)[:300], 'items': []}
                c.reboot()
            out.append(res); report(res)
        b.close()
    name = f"clicks-{lang}{'-allmarkets' if '--all-markets' in args else ''}{'-' + shard.replace('/', 'of') if shard else ''}{'-partial' if only else ''}.json"
    save(name, out)


def report(res):
    items = res['items']
    bad = [x for x in items if x.get('verdict') in ('dead', 'error', 'unclickable', 'bad-route', 'i18n')]
    print(f"{res['route']:<34} {len(items):>3} clicks  {len(bad)} bad  {res.get('secs', '')}s {res.get('skipped', '') or res.get('crash', '')}", flush=True)
    for x in bad:
        print(f"    [{x['verdict']}] {x['desc']} {x.get('why', '')} {x.get('errors', '')[:2] if x.get('errors') else ''} {x.get('click', '')}", flush=True)


if __name__ == '__main__':
    main()
