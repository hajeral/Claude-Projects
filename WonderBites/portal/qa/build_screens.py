"""Build docs/screens.html — the screen & route inventory.

Inputs: the live route registry (App.routes / App.NAV, read in a headless browser), the API calls each route
made during the render crawl (qa/results/render.json), the api(...) calls found in each screen's source file,
and docs/api.html (operation anchors).   Run after render_crawl.py:  python3 qa/build_screens.py
"""
import json, re, html
from collections import defaultdict
from pathlib import Path
from playwright.sync_api import sync_playwright
from lib import APP, boot, OUT

ROOT = APP / 'assets' / 'js'
DESC = {  # routes without a subtitle (or a function subtitle) — short description for the inventory
    'launcher': 'Portal launcher: choose Admin or Merchant, language and theme; links to this inventory and the API reference.',
    'admin-login': 'Admin sign-in (email + password) → two-step verification.', 'm-login': 'Merchant sign-in with link to sign-up and password recovery.',
    'otp': 'Two-step verification: 6-digit code, resend timer, trust device.', 'm-signup': 'Merchant self sign-up form → email verification (OTP) → Overview.',
    'forgot-password': 'Request a password reset link (admin or merchant).', 'reset-password': 'Set a new password from the reset link.',
    'not-found': 'Branded 404 for unknown routes.', 'admin-command-center': 'Admin home: KPIs, priority alerts, recent orders, passport status, issues, drop accuracy, quality, sustainability.',
    'm-overview': 'Merchant home: greeting, KPIs, sales overview, top bags, recent orders, inventory, operational state, reviews, alerts, template banner.',
    'm-sustainability': 'Merchant “This month’s impact” detail: meals, CO₂, water, impact by bag.',
    'admin-drop-edit': 'Edit a drop (pickup window, quantity, price, status).', 'admin-merchant-detail': 'Merchant profile with tabs: overview, branches, listings, payouts, compliance, activity; verify / suspend / reject.',
    'admin-merchant-new': 'Add Merchant multi-step form (basics, branches, compliance, review).', 'admin-consumer-detail': 'Consumer profile: orders, wallet, preferences; edit, block/unblock, delete.',
    'admin-ticket-detail': 'Support ticket: conversation, reply, assign, status.', 'admin-payout-detail': 'Payout detail with daily lines and actions (hold, retry, mark paid).',
    'admin-performance-merchants': 'All merchants performance ranking with drill-down drawer.', 'admin-performance-report': 'Performance report (print/export).',
    'admin-sustainability-report': 'Sustainability report / full breakdown.', 'admin-wallet-detail': 'Wallet detail: transactions, adjust balance, freeze.',
    'admin-voucher-new': 'Create / edit voucher form.', 'admin-voucher-detail': 'Voucher detail: redemptions, freeze, delete.',
    'admin-compliance-detail': 'Merchant compliance: certificates upload/expiry, hygiene score, indicators, actions.',
    'admin-template-new': 'New template builder with field chips (also “duplicate from”).', 'admin-template-edit': 'Edit template; publish / draft / duplicate.',
    'admin-templates': 'Templates gallery (target of the admin “Create from Template” banner).', 'admin-cms-page': 'CMS page editor (rich text, publishing).',
    'admin-cms-banner': 'CMS banner editor (image upload, audience, schedule, publish).', 'admin-cms-faq': 'CMS FAQ editor.',
    'admin-notifications': 'All notifications (tabs All / Unread / Downloads) — “View all” from the panel.', 'm-notifications': 'All notifications (tabs All / Unread / Downloads).',
    'm-report-detail': 'Dispute detail: thread, reply, close.', 'm-inventory-new': 'Add / edit listing: full form, live preview, settings toggles, images.',
    'm-inventory-detail': 'Listing detail: overview, images, preview, activity, settings; edit, duplicate, pause, delete.',
    'm-create-product': 'Create product (optionally prefilled from a template; “save as template”).', 'm-driver-detail': 'Driver detail: profile, compliance, assigned orders.',
    'm-analytics-days': 'All day records of the sales period.', 'm-customer-new': 'Add / edit customer form.', 'm-customer-detail': 'Customer profile with orders.',
    'm-branch-edit': 'Add / edit branch: details, hours, map placeholder, open/closed.', 'm-vendor-new': 'Add new sub vendor.', 'm-vendor-detail': 'Sub vendor detail.',
    'm-help': 'Help: request form, FAQ, contact options, my tickets.', 'm-vendors': 'Sub vendors list with status tabs (linked from Branches).',
    'admin-settings-markets': 'Markets: enable/disable countries (Qatar launch; UAE, KSA), currency, phone code, time zone, VAT, cities; reporting currency + manual FX rates.',
    'admin-moderation': 'Moderation queue: approve / reject, case detail (from Issues & Alerts → Moderation).',
}
PARAMS = {
    'admin-wallet': "tab: 'credit' | 'vouchers'", 'admin-issues': "tab: 'all' | 'issues' | 'alerts' | 'moderation'", 'admin-cms': "tab: 'all' | 'pages' | 'banners' | 'faq'",
    'admin-listings': "tab (category)", 'm-settings': "tab: 'profile' | 'store' | 'security' | 'hours' | 'language'", 'm-create-product': 'templateId?',
    'm-inventory-new': 'id? (edit mode)', 'm-customer-new': 'id? (edit mode)', 'm-branch-edit': 'id? (omit = add branch)', 'admin-voucher-new': 'id? (edit mode)',
    'admin-template-new': 'fromId? (duplicate)', 'admin-merchant-detail': "id, tab?", 'admin-orders': 'open? / q? (deep link opens the order drawer)',
    'admin-pickups': 'open? / q?', 'admin-moderation': 'open? (case id)', 'forgot-password': "portal: 'admin' | 'merchant'", 'reset-password': "portal, token",
    'otp': 'portal, challengeId, destination, signup?', 'admin-notifications': 'tab?', 'm-notifications': 'tab?',
}
for r in ('admin-drop-edit', 'admin-consumer-detail', 'admin-ticket-detail', 'admin-payout-detail', 'admin-wallet-detail', 'admin-voucher-detail', 'admin-compliance-detail',
          'admin-template-edit', 'admin-cms-page', 'admin-cms-banner', 'admin-cms-faq', 'm-inventory-detail', 'm-driver-detail', 'm-customer-detail', 'm-report-detail', 'm-vendor-detail'):
    PARAMS.setdefault(r, 'id')
PARAMS['admin-cms-page'] = PARAMS['admin-cms-banner'] = PARAMS['admin-cms-faq'] = 'id? (omit = new)'

API_RE = re.compile(r"""api\(\s*'(GET|POST|PUT|PATCH|DELETE)'\s*,\s*(['`])([^'`]+)\2""")


def norm(path):
    path = re.sub(r'\$\{[^}]+\}', '{id}', path.split('?')[0])
    return re.sub(r"'\s*\+\s*.*$", '/{id}', path).rstrip('/')


def source_calls():
    """file → [(method, path)] and route → file"""
    files = list((ROOT / 'screens').rglob('*.js')) + [ROOT / 'core' / 'overlays.js']
    calls, owner = {}, {}
    for f in files:
        s = f.read_text()
        cs = set()
        for m in re.finditer(r"""api\(\s*'(GET|POST|PUT|PATCH|DELETE)'\s*,\s*([^,)]+)""", s):
            raw = m.group(2).strip()
            mm = re.match(r"""(['`])([^'`]+)\1(.*)""", raw)
            if not mm: continue
            p = mm.group(2); tail = mm.group(3)
            if tail.strip().startswith('+'):
                p = p.rstrip('/') + '/{id}'
                lit = re.match(r"\s*\+\s*[\w.]+\s*\+\s*'(/[a-z0-9/_-]+)'", tail)
                if lit: p += lit.group(1)
            p = norm(p)
            if not p.startswith('/'): continue  # dynamic base path (generic helper) — the concrete calls are listed by the crawl
            p = re.sub(r'(\{id\})/\{id\}$', r'\1/{action}', p)
            cs.add((m.group(1), p))
        calls[str(f.relative_to(APP))] = sorted(cs)
        for m in re.finditer(r"""['"]((?:admin|m)-[a-z0-9-]+|launcher|otp|forgot-password|reset-password|not-found)['"]""", s):
            pass
        for m in re.finditer(r"""(?:App\.route|tab)\(\s*['"]([a-z0-9-]+)['"]""", s):
            owner.setdefault(m.group(1), str(f.relative_to(APP)))
    return calls, owner


def ops_index():
    s = (APP / 'docs' / 'api.html').read_text()
    ops = []
    for m in re.finditer(r'id="(op-[A-Za-z0-9]+)" data-s="(get|post|put|patch|delete) [^"]*">\s*<header><span class="m [A-Z]+">[A-Z]+</span><span class="path">/api/v1(\S+?)</span>', s):
        pat = '^' + re.sub(r'\\\{[^}]+\\\}', '[^/]+', re.escape(m.group(3))) + '$'
        ops.append((m.group(2).upper(), re.compile(pat), m.group(1), m.group(3)))
    return ops


def find_op(ops, method, path):
    p = re.sub(r'\{id\}', 'X', path)
    for mth, rx, oid, doc in ops:
        if mth == method and rx.match(p):
            return oid, doc
    return None, None


def main():
    render = json.loads((OUT / 'render.json').read_text())
    loaded = defaultdict(set); titles = {}
    for r in render:
        if r['lang'] == 'en' and r['theme'] == 'dark' and r['width'] in (1440, 1280):
            for c in r.get('calls', []):
                if not c.startswith('GET /shared/impact') and not c.startswith('GET /shared/notifications'):
                    loaded[r['route']].add(c)
            if r.get('title') and r['route'] not in titles: titles[r['route']] = r['title'].strip()
    src, owner = source_calls()
    ops = ops_index()
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx, pg = boot(b)
        meta = pg.evaluate("""() => Object.values(App.routes).map(r => ({ name: r.name, portal: r.portal, nav: r.nav || (App.navEntry(r.name) || {}).nav || '', title: typeof r.title === 'string' ? r.title : '',
            subtitle: typeof r.subtitle === 'string' ? r.subtitle : '', exportResource: r.exportResource || '' }))""")
        nav = pg.evaluate('App.NAV')
        b.close()
    OWN = {}
    for mf in (ROOT / 'modules').glob('*.js'):
        team = {'lead': 'LEAD', 'd1': 'D1', 'd2': 'D2', 'd3': 'D3', 'd4': 'D4', 'api': 'API'}[mf.stem]
        for f in re.findall(r"'([^']+\.js)'", mf.read_text()):
            OWN['assets/js/' + f] = team
    OWN['assets/js/core/overlays.js'] = 'LEAD'
    # group
    groups = {'admin': defaultdict(list), 'merchant': defaultdict(list), 'public': defaultdict(list)}
    order = {'admin': [x[0] for x in nav['admin']], 'merchant': [x[0] for x in nav['merchant']]}
    for m in meta:
        sec = m['nav'] or ('Public & authentication' if m['portal'] == 'public' else 'Shell & cross-cutting')
        if m['name'] in ('admin-moderation',): sec = 'Issues & Alerts'
        if m['name'] in ('admin-templates',): sec = 'Listings & Templates'
        if m['name'] in ('m-help', 'm-sustainability', 'admin-notifications', 'm-notifications'): sec = 'Shell & cross-cutting'
        groups[m['portal']][sec].append(m)
    total = len(meta)
    nops = 0

    def row(m):
        nonlocal nops
        n = m['name']; f = owner.get(n, '')
        title = m['title'] or titles.get(n, n)
        desc = DESC.get(n) or m['subtitle'] or ''
        ld = sorted(loaded.get(n, []), key=lambda x: (x.split(' ')[1], x))
        lds = set()
        items = []
        for c in ld:
            mth, pth = c.split(' ', 1)
            oid, doc = find_op(ops, mth, pth)
            lds.add((mth, doc or pth))
            items.append((mth, doc or pth, oid, True))
        for mth, pth in src.get(f, []):
            oid, doc = find_op(ops, mth, pth)
            key = (mth, doc or pth)
            if key in lds or any(i[0] == mth and i[1] == (doc or pth) for i in items): continue
            items.append((mth, doc or pth, oid, False))
        nops += len(items)
        api_html = ''.join(
            f'<li class="{"ld" if l else "ac"}"><span class="m m-{mth.lower()}">{mth}</span> ' + (f'<a href="api.html#{oid}">{html.escape(pth)}</a>' if oid else f'<code>{html.escape(pth)}</code>') + '</li>'
            for mth, pth, oid, l in items[:40]) or '<li class="none">— (no API calls)</li>'
        p = PARAMS.get(n, '—')
        links = f'<a class="open" href="../index.html#{n}">Open</a><a href="../index.html#{n}-en">EN</a><a href="../index.html#{n}-ar" lang="ar">ع</a>'
        return f'''<tr id="r-{n}" data-s="{html.escape((n + ' ' + title + ' ' + desc + ' ' + ' '.join(i[1] for i in items)).lower())}">
          <td><b>{html.escape(title)}</b><code class="rn">#{n}</code><small>{html.escape(desc)}</small></td>
          <td class="pa">{html.escape(p)}</td><td><ul class="api">{api_html}</ul></td>
          <td class="ow"><span class="tm">{OWN.get(f, 'LEAD' if 'auth' in f else '')}</span><small>{html.escape(f.replace('assets/js/', ''))}</small></td>
          <td class="lk">{links}</td></tr>'''

    def portal_sec(key, label, sections):
        secs = sections
        keys = [k for k in order.get(key, []) if k in secs] + sorted(k for k in secs if k not in order.get(key, []))
        toc = ''.join(f'<a href="#s-{key}-{re.sub(r"[^a-z0-9]+", "-", k.lower())}">{html.escape(k)} <span>{len(secs[k])}</span></a>' for k in keys)
        body = ''
        for k in keys:
            rs = sorted(secs[k], key=lambda m: (0 if m['name'] in [x[2] for x in nav.get(key, [])] else 1, m['name']))
            body += f'''<section class="sec" id="s-{key}-{re.sub(r"[^a-z0-9]+", "-", k.lower())}"><h3>{html.escape(k)} <span class="cnt">{len(rs)}</span></h3>
              <table><thead><tr><th>Screen / route</th><th>Params (in memory)</th><th>API endpoints <span class="lg"><i class="ld"></i>on load <i class="ac"></i>actions</span></th><th>Owner / file</th><th>Open</th></tr></thead><tbody>{''.join(row(m) for m in rs)}</tbody></table></section>'''
        n = sum(len(v) for v in secs.values())
        return f'<section class="portal" id="p-{key}"><h2>{label} <span class="cnt">{n} routes</span></h2><nav class="toc">{toc}</nav>{body}</section>'

    body = portal_sec('admin', 'Admin portal', groups['admin']) + portal_sec('merchant', 'Merchant portal', groups['merchant']) + portal_sec('public', 'Public & shell', groups['public'])
    page = TEMPLATE.replace('{{BODY}}', body).replace('{{TOTAL}}', str(total)).replace('{{ADMIN}}', str(sum(len(v) for v in groups['admin'].values()))) \
        .replace('{{MERCHANT}}', str(sum(len(v) for v in groups['merchant'].values()))).replace('{{PUBLIC}}', str(sum(len(v) for v in groups['public'].values()))).replace('{{OPS}}', str(nops))
    (APP / 'docs' / 'screens.html').write_text(page)
    print('docs/screens.html written:', total, 'routes,', nops, 'endpoint references')


TEMPLATE = r'''<!DOCTYPE html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WonderBites Portals — Screen &amp; route inventory</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&family=IBM+Plex+Sans+Arabic:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#1A0F1E;--bg2:#21142A;--card:#271830;--card2:#2E1D38;--line:rgba(245,237,227,.10);--line2:rgba(245,237,227,.18);--cream:#F5EDE3;--muted:#C9B9C3;--dim:#A795A3;
--rose:#C65C75;--rose2:#E08A9E;--lime:#B7EF76;--get:#7FC8A0;--post:#E08A9E;--patch:#E8B86A;--put:#B89BE8;--del:#F07A7A;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--cream);font:13.5px/1.55 Inter,system-ui,sans-serif;background-image:radial-gradient(800px 380px at 85% -120px,rgba(198,92,117,.18),transparent 70%),radial-gradient(700px 320px at 10% -100px,rgba(88,61,98,.45),transparent 70%)}
a{color:var(--rose2);text-decoration:none}a:hover{text-decoration:underline;text-underline-offset:3px}
a:focus-visible,input:focus-visible{outline:2px solid var(--rose2);outline-offset:2px;border-radius:4px}
h1,h2,h3{font-family:"Playfair Display",Georgia,serif;font-weight:600}
.wrap{max-width:1380px;margin:0 auto;padding:36px 32px 80px}
header.hd{display:flex;gap:24px;align-items:flex-end;flex-wrap:wrap;margin-block-end:22px}
.wm{font-family:"Playfair Display",Georgia,serif;font-size:30px;line-height:1}.tag{font-size:8px;letter-spacing:.24em;font-weight:700;color:#EC8AA1;margin-top:8px}
h1{font-size:32px;margin-top:18px}.lead{color:var(--muted);max-width:760px;margin-top:6px}
.stats{display:flex;gap:12px;margin-inline-start:auto;flex-wrap:wrap}
.st{background:linear-gradient(180deg,rgba(46,29,56,.9),rgba(39,24,48,.9));border:1px solid var(--line2);border-radius:16px;padding:12px 16px;min-width:120px}
.st b{display:block;font-size:24px;font-variant-numeric:tabular-nums}.st small{color:var(--dim);font-size:11.5px}
.bar{position:sticky;top:0;z-index:5;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 0;background:rgba(26,15,30,.88);backdrop-filter:blur(14px);border-bottom:1px solid var(--line);margin-bottom:8px}
.bar input{flex:1 1 320px;height:38px;border-radius:11px;border:1px solid var(--line2);background:var(--card);color:var(--cream);padding:0 14px;font:inherit}
.bar a.pill{height:34px;display:inline-flex;align-items:center;padding:0 14px;border-radius:999px;border:1px solid var(--line2);background:var(--card);color:var(--cream);font-weight:600;font-size:12.5px}
.bar a.pill.pri{background:linear-gradient(#C65C75,#A9466A);border-color:transparent}
.portal{margin-top:34px}.portal>h2{font-size:26px;padding-top:12px;border-top:1px solid var(--line)}
.cnt{font-family:Inter,sans-serif;font-size:11.5px;font-weight:600;color:var(--muted);background:rgba(183,131,167,.14);border-radius:999px;padding:2px 9px;vertical-align:middle;margin-inline-start:6px}
.toc{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 6px}.toc a{font-size:12px;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:3px 10px}.toc a span{color:var(--dim)}
.sec{margin-top:22px;background:linear-gradient(180deg,rgba(46,29,56,.75),rgba(33,20,42,.75));border:1px solid var(--line2);border-radius:16px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
.sec h3{font-size:18px;padding:14px 18px 10px}
table{width:100%;border-collapse:collapse;table-layout:fixed}th:nth-child(1){width:36%}th:nth-child(2){width:13%}th:nth-child(3){width:26%}th:nth-child(4){width:14%}th:nth-child(5){width:11%}th{font-size:11px;font-weight:600;color:var(--dim);text-align:start;padding:8px 14px;border-top:1px solid var(--line);background:rgba(26,15,30,.35)}
td{padding:12px 14px;border-top:1px solid var(--line);vertical-align:top}tr:hover td{background:rgba(198,92,117,.05)}
td b{font-size:14px}td small{display:block;color:var(--muted);font-size:12px;margin-top:3px;max-width:430px}
code{font-family:var(--mono);font-size:11.5px}.rn{display:inline-block;margin-inline-start:8px;color:var(--rose2);background:rgba(198,92,117,.14);border-radius:6px;padding:1px 6px}
td.pa{color:var(--muted);font-family:var(--mono);font-size:11.5px;overflow-wrap:anywhere}
ul.api{list-style:none;display:grid;gap:3px;font-size:12px}ul.api li{display:flex;gap:6px;align-items:baseline;font-family:var(--mono);font-size:11.5px;word-break:break-all}
ul.api li.ac a,ul.api li.ac code{color:var(--muted)}ul.api li.none{color:var(--dim);font-family:inherit}
.m{flex:none;width:48px;font-weight:700;font-size:10.5px}.m-get{color:var(--get)}.m-post{color:var(--post)}.m-patch{color:var(--patch)}.m-put{color:var(--put)}.m-delete{color:var(--del)}
.lg{font-weight:500;margin-inline-start:8px}.lg i{display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 4px 0 8px}.lg i.ld{background:var(--cream)}.lg i.ac{background:var(--dim)}
td.ow{overflow-wrap:anywhere}.tm{font-size:10.5px;font-weight:700;color:var(--lime);border:1px solid rgba(183,239,118,.3);border-radius:999px;padding:0 7px}
td.lk{white-space:nowrap}td.lk a{display:inline-flex;height:28px;align-items:center;padding:0 10px;border-radius:9px;border:1px solid var(--line2);margin-inline-end:4px;font-weight:600;font-size:12px;color:var(--cream)}
td.lk a.open{background:linear-gradient(#C65C75,#A9466A);border-color:transparent}td.lk a[lang=ar]{font-family:"IBM Plex Sans Arabic",sans-serif}
.note{margin-top:14px;color:var(--dim);font-size:12px;max-width:980px}
tr.hide{display:none}
@media (prefers-color-scheme: light){}
</style></head><body><div class="wrap">
<header class="hd"><div><div class="wm">WonderBites</div><div class="tag">GOOD FINDS. CLOSE BY.</div>
<h1>Screen &amp; route inventory</h1><p class="lead">Every registered route of the Admin and Merchant portals, grouped by portal and sidebar section, with its in-memory params, the API endpoints it calls and a link that opens it (append <code>-en</code> / <code>-ar</code> to switch language). Generated by <code>qa/build_screens.py</code> from the live route registry and the QA crawl.</p></div>
<div class="stats"><div class="st"><b>{{TOTAL}}</b><small>routes</small></div><div class="st"><b>{{ADMIN}}</b><small>admin</small></div><div class="st"><b>{{MERCHANT}}</b><small>merchant</small></div><div class="st"><b>{{PUBLIC}}</b><small>public &amp; shell</small></div><div class="st"><b>{{OPS}}</b><small>endpoint refs</small></div></div></header>
<div class="bar"><input type="search" id="q" placeholder="Filter by route, screen, description or endpoint… (e.g. refund, /merchant/orders)" aria-label="Filter screens"><a class="pill" href="#p-admin">Admin</a><a class="pill" href="#p-merchant">Merchant</a><a class="pill" href="#p-public">Public &amp; shell</a><a class="pill" href="api.html">API reference</a><a class="pill pri" href="../index.html#launcher">Open the app</a></div>
<p class="note">Links use plain hash routes (<code>../index.html#route</code>). Params such as <code>id</code> or <code>tab</code> are passed in memory by the app (<code>App.go(name, params)</code>) and kept in sessionStorage, so a bare link to a detail route opens the most recently viewed record (or its list). Portal routes need a session: the link sends you through that portal's sign-in first (demo: any email/password, any 6-digit code except 000000). “On load” endpoints were recorded by the QA render crawl; “actions” are the other <code>api()</code> calls in the screen's module.</p>
{{BODY}}
<p class="note">Night theme only (documentation page). Regenerate: <code>python3 qa/render_crawl.py --quick &amp;&amp; python3 qa/build_screens.py</code>.</p>
</div>
<script>
(function(){var q=document.getElementById('q');q.addEventListener('input',function(){var v=q.value.trim().toLowerCase();document.querySelectorAll('tbody tr').forEach(function(tr){tr.classList.toggle('hide',!!v&&tr.getAttribute('data-s').indexOf(v)<0);});document.querySelectorAll('.sec').forEach(function(s){s.style.display=s.querySelector('tbody tr:not(.hide)')?'':'none';});});})();
</script></body></html>'''

if __name__ == '__main__':
    main()
