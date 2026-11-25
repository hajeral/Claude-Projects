import json, re, sys, html
import os; HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from model import SCHEMAS, ENUMS
from endpoints import EP, EVENTS, SCREENS
import gen  # builds spec + writes yaml; provides helpers
from gen import spec, ex, type_str, schema_of

OUT = "/home/claude/wb/app/docs/"
H = lambda s: html.escape(str(s), quote=True)

def anchor(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
def opanchor(e): return "op-" + e["_op"]["operationId"]

def jdump(v):
    s = json.dumps(v, ensure_ascii=False, indent=2)
    return s

def param_rows(op):
    rows = []
    for p in op.get("parameters", []):
        if "$ref" in p:
            p = spec["components"]["parameters"][p["$ref"].split("/")[-1]]
        if p["name"] == "Accept-Language": continue
        rows.append((p["name"], p["in"], type_str(p["schema"]), p.get("required", False), p.get("description", "")))
    return rows

def schema_link(t):
    # turn type string into html with links to schemas
    out = H(t)
    for n in sorted(set(re.findall(r"[A-Z][A-Za-z0-9]+", t)), key=len, reverse=True):
        if n in SCHEMAS:
            out = re.sub(r"(?<![A-Za-z0-9#\-])" + n + r"(?![A-Za-z0-9])", f'<a href="#schema-{n}">{n}</a>', out)
    return out

def body_type(x):
    if x is None: return None
    if isinstance(x, str): return x
    return type_str(x)

def resp_type(e):
    if e["lst"] is not None:
        it = body_type(e["lst"]) if isinstance(e["lst"], str) else "{…}"
        s = f"Paged<{it}>"
        if e["lsum"] is not None:
            s += " + summary: " + (e["lsum"] if isinstance(e["lsum"], str) else type_str(e["lsum"]))
        return s
    if e["resp"] is not None: return body_type(e["resp"])
    return {204: "204 No Content", 302: "302 → signed URL", 101: "101 WebSocket / SSE"}.get(e["code"], str(e["code"]))

# ---------------------------------------------------------------- HTML
CSS = """
:root{--bg:#1A0F1E;--bg2:#21142A;--card:#271830;--card2:#2E1D38;--line:rgba(245,237,227,.10);--line2:rgba(245,237,227,.18);
--cream:#F5EDE3;--muted:#C9B9C3;--dim:#A795A3;--rose:#C65C75;--rose2:#E08A9E;--rosebg:rgba(198,92,117,.16);
--get:#7FC8A0;--post:#E08A9E;--patch:#E8B86A;--put:#B89BE8;--del:#F07A7A;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
*{box-sizing:border-box}html{scroll-behavior:auto}
body{margin:0;background:var(--bg);color:var(--cream);font:14px/1.55 Inter,system-ui,sans-serif}
a{color:var(--rose2);text-decoration:none}a:hover{text-decoration:underline}
a:focus-visible,button:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid var(--rose2);outline-offset:2px;border-radius:4px}
h1,h2,h3{font-family:"Playfair Display",Georgia,serif;font-weight:600;letter-spacing:.2px}
h1{font-size:34px;margin:0 0 6px}h2{font-size:26px;margin:48px 0 8px;padding-top:8px;border-top:1px solid var(--line)}h3{font-size:19px;margin:28px 0 10px}
code,pre,.mono{font-family:var(--mono);font-size:12.5px}
code{background:rgba(245,237,227,.07);padding:1px 5px;border-radius:5px;color:#F3D9C9}
.layout{display:grid;grid-template-columns:300px minmax(0,1fr);min-height:100vh}
nav{position:sticky;top:0;height:100vh;overflow:auto;background:#140B18;border-inline-end:1px solid var(--line);padding:22px 14px 40px}
nav .brand{font-family:"Playfair Display",serif;font-size:24px;color:var(--cream);padding:0 8px 2px;display:block}
nav .tag{font-size:10px;letter-spacing:2.5px;color:var(--rose2);padding:0 8px 16px;display:block;text-transform:uppercase}
nav .grp{font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:var(--dim);margin:18px 8px 6px}
nav a{display:flex;justify-content:space-between;gap:8px;color:var(--muted);padding:5px 8px;border-radius:8px;font-size:13px}
nav a:hover{background:var(--rosebg);color:var(--cream);text-decoration:none}
nav a .n{color:var(--dim);font-size:11px}
nav input{width:100%;margin:4px 0 6px;padding:8px 10px;border-radius:10px;border:1px solid var(--line2);background:var(--bg2);color:var(--cream);font:inherit}
main{padding:36px 48px 120px;max-width:1240px;min-width:0}
main p,main li,td{overflow-wrap:anywhere}
.tblwrap{overflow-x:auto}
.lead{color:var(--muted);max-width:820px}
.pill{display:inline-block;padding:1px 9px;border-radius:999px;font-size:11.5px;border:1px solid var(--line2);color:var(--muted);margin:2px 4px 2px 0;white-space:nowrap}
.pill.r{border-color:rgba(198,92,117,.45);color:#F2C4CF;background:var(--rosebg)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}.grid pre{white-space:pre-wrap}
.box{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.box h4{margin:0 0 6px;font-size:13px;color:var(--rose2);text-transform:uppercase;letter-spacing:1.2px}
.ep{background:var(--card);border:1px solid var(--line);border-radius:14px;margin:12px 0;overflow:hidden}
.ep>header{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 16px;background:var(--card2);border-bottom:1px solid var(--line)}
.m{font:700 11.5px var(--mono);padding:3px 0;width:62px;text-align:center;border-radius:7px;color:#1A0F1E}
.m.GET{background:var(--get)}.m.POST{background:var(--post)}.m.PATCH{background:var(--patch)}.m.PUT{background:var(--put)}.m.DELETE{background:var(--del)}
.path{font:600 13.5px var(--mono);color:var(--cream);direction:ltr;unicode-bidi:isolate}
.sum{color:var(--muted);flex:1 1 260px}
.ep .bd{padding:12px 16px}
.ep .desc{color:var(--muted);margin:0 0 10px}
.meta{font-size:12px;color:var(--dim);margin-bottom:8px}
table{border-collapse:collapse;width:100%;font-size:12.5px;margin:6px 0 10px}
th,td{text-align:start;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--dim);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:1px}
td.mono{white-space:nowrap}
.req{color:var(--rose2);font-weight:700}
details{margin:6px 0}
summary{cursor:pointer;color:var(--rose2);font-size:12.5px;font-weight:600;padding:3px 0}
pre{background:#130A17;border:1px solid var(--line);border-radius:10px;padding:12px 14px;overflow:auto;max-height:420px;margin:6px 0;color:#EADFD4;direction:ltr}
.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}@media(max-width:1100px){.two{grid-template-columns:minmax(0,1fr)}}@media(max-width:820px){.layout{grid-template-columns:minmax(0,1fr)}nav{position:static;height:auto}main{padding:24px 18px}}
.matrix td:first-child{width:24%}.matrix td:nth-child(2){width:18%;white-space:normal;font-size:11.5px;color:var(--dim)}.matrix .eps a{display:inline-block;margin:2px 10px 2px 0;font:12px var(--mono);color:var(--muted);white-space:nowrap}
.matrix .eps a b{font-weight:700;margin-inline-end:4px}.matrix .eps a.also{opacity:.75;font-style:italic}
.k{color:var(--rose2)}
.hidden{display:none!important}
.schema{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:4px 14px;margin:8px 0}
.schema>summary{font:600 13px var(--mono);color:var(--cream);padding:8px 0}
.schema>summary span{color:var(--dim);font:12px Inter,sans-serif;margin-inline-start:8px}
.ev{border-inline-start:3px solid var(--rose)}
footer{color:var(--dim);font-size:12px;margin-top:60px}
"""

def render_ep(e):
    op = e["_op"]
    out = [f'<article class="ep" id="{opanchor(e)}" data-s="{H((e["method"]+" "+e["path"]+" "+e["summary"]).lower())}">',
           f'<header><span class="m {e["method"]}">{e["method"]}</span><span class="path">/api/v1{H(e["path"])}</span><span class="sum">{H(e["summary"])}</span></header><div class="bd">']
    if e["desc"]: out.append(f'<p class="desc">{inline_md(e["desc"])}</p>')
    roles = "".join(f'<span class="pill r">{H(r)}</span>' for r in (e["roles"] or ["public"]))
    meta = f'<div class="meta">Roles: {roles} · operationId <code>{H(op["operationId"])}</code>'
    if e["also"]: meta += " · also used by: " + ", ".join(f'<a href="#scr-{s}">{H(SCREENS[s][1])}</a>' for s in e["also"])
    out.append(meta + "</div>")
    rows = param_rows(op)
    if rows:
        out.append("<table><thead><tr><th>Param</th><th>In</th><th>Type</th><th>Description</th></tr></thead><tbody>")
        for n, i, t, r, d in rows:
            out.append(f'<tr><td class="mono">{H(n)}{"<span class=req> *</span>" if r else ""}</td><td>{i}</td><td class="mono">{schema_link(t)}</td><td>{inline_md(d)}</td></tr>')
        out.append("</tbody></table>")
    bt = body_type(e["body"])
    out.append(f'<div class="meta">Request body: {schema_link(bt) if bt else "—"} &nbsp;·&nbsp; Response <b>{e["code"]}</b>: {schema_link(resp_type(e))}</div>')
    out.append('<div class="two">')
    if "requestBody" in op:
        out.append(f'<details><summary>Request example</summary><pre>{H(jdump(op["requestBody"]["content"]["application/json"]["example"]))}</pre></details>')
    else:
        out.append("<div></div>")
    r = op["responses"][str(e["code"])]
    if "content" in r and "example" in r["content"].get("application/json", {}):
        out.append(f'<details><summary>Response {e["code"]} example</summary><pre>{H(jdump(r["content"]["application/json"]["example"]))}</pre></details>')
    out.append("</div></div></article>")
    return "\n".join(out)

def inline_md(s):
    s = H(s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    return s

def md_block(text):
    outl, inlist = [], False
    for line in text.splitlines():
        if line.startswith("## "):
            continue
        if line.startswith("- "):
            if not inlist: outl.append("<ul>"); inlist = True
            outl.append("<li>" + inline_md(line[2:]) + "</li>")
        else:
            if inlist: outl.append("</ul>"); inlist = False
            if line.strip(): outl.append("<p>" + inline_md(line) + "</p>")
    if inlist: outl.append("</ul>")
    return "\n".join(outl)

def render_schema(n):
    s = SCHEMAS[n]
    if "enum" in s:
        return ""
    rows = []
    req = set(s.get("required", []))
    for k, v in s.get("properties", {}).items():
        exv = ex(v, k, 3, n)
        exs = json.dumps(exv, ensure_ascii=False)
        if len(exs) > 70: exs = exs[:67] + "…"
        rows.append(f'<tr><td class="mono">{H(k)}{"<span class=req> *</span>" if k in req else ""}</td><td class="mono">{schema_link(type_str(v))}</td><td>{inline_md(v.get("description", ""))}</td><td class="mono">{H(exs)}</td></tr>')
    return (f'<details class="schema" id="schema-{n}"><summary>{n}<span>{H(s.get("description", ""))}</span></summary>'
            f'<table><thead><tr><th>Field</th><th>Type</th><th>Notes</th><th>Example</th></tr></thead><tbody>{"".join(rows)}</tbody></table></details>')

def build_html():
    by_screen = {}
    for e in EP: by_screen.setdefault(e["screen"], []).append(e)
    nav, body = [], []
    nav.append('<a class="brand" href="#top">WonderBites</a><span class="tag">Portals API · v1</span>')
    nav.append('<label for="flt" class="grp" style="display:block">Filter endpoints</label><input id="flt" type="search" placeholder="e.g. refund, /merchant/orders">')
    nav.append('<div class="grp">Reference</div>')
    for a, l in [("conventions", "Conventions"), ("auth-roles", "Auth & roles"), ("errors", "Errors"), ("matrix", "Screen → endpoints matrix"),
                 ("realtime", "Realtime & webhooks"), ("enums", "Enums (status pills)"), ("schemas", "Schemas")]:
        nav.append(f'<a href="#{a}">{l}</a>')
    for portal, title in (("shared", "Shared & Auth"), ("admin", "Admin portal"), ("merchant", "Merchant portal")):
        nav.append(f'<div class="grp">{title}</div>')
        for k, (p, label, route) in SCREENS.items():
            if p == portal and k in by_screen:
                nav.append(f'<a href="#scr-{k}"><span>{H(label.split(" (")[0])}</span><span class="n">{len(by_screen[k])}</span></a>')

    body.append(f'<h1 id="top">WonderBites Portals API</h1><p class="lead">Reference for the Admin and Merchant portals of the WonderBites surplus-food marketplace. '
                f'{len(EP)} operations across {len(spec["paths"])} paths, {len([s for s in SCHEMAS if "enum" not in SCHEMAS[s]])} schemas and {len(ENUMS)} enums. '
                f'Base URL <code>/api/v1</code>. Machine-readable source: <code>openapi.yaml</code> (delivered as a separate file) (OpenAPI 3.1) · builder summary and v1.1 change log: <code>API_CONTRACT.md</code> (in the source package). v1.1 has been reconciled with the final screen code and mock adapters.</p>')
    body.append('<h2 id="conventions">Conventions</h2>' + md_block(open(os.path.join(HERE, "intro.md")).read().split("## Conventions", 1)[1]))
    body.append('''<h3>List response</h3><pre>{ "data": [ … ], "page": 1, "pageSize": 10, "total": 42, "summary": { …screen KPI tiles / tab counts… } }</pre>
<h3>Common shapes</h3><div class="grid">
<div class="box"><h4>Money</h4><pre>{ "amount": 15, "currency": "AED" }</pre></div>
<div class="box"><h4>LocalizedText</h4><pre>{ "en": "Morning Pastry Box", "ar": "صندوق معجنات الصباح" }</pre></div>
<div class="box"><h4>TimeWindow</h4><pre>{ "start": "18:00", "end": "20:00" }</pre></div>
<div class="box"><h4>Kpi</h4><pre>{ "key": "reservedToday", "label": "Reserved Today",
  "value": 356, "format": "number", "delta": 16.4,
  "deltaUnit": "pct", "trend": "up", "comparison": "vs. avg" }</pre></div>
<div class="box"><h4>Series</h4><pre>{ "key": "gmv", "label": "This Period (QAR)", "kind": "area",
  "points": [ { "x": "2026-06-14", "y": 61200 } ] }</pre></div>
<div class="box"><h4>Segment</h4><pre>{ "key": "commission", "label": "Commission",
  "value": 17246, "share": 90.1 }</pre></div></div>''')
    body.append('''<h2 id="auth-roles">Auth &amp; roles</h2>
<p>Login → (optional OTP) → <code>accessToken</code> (JWT, 15 min) + <code>refreshToken</code> (30 days, rotating, single use). Send <code>Authorization: Bearer &lt;accessToken&gt;</code>. On 401 <code>unauthorized</code> call <code>POST /auth/refresh</code> once, then retry; if that fails, route to login. Merchant tokens carry <code>merchantId</code> and optional <code>branchIds</code>.</p>
<table><thead><tr><th>Role</th><th>Portal</th><th>Scope</th></tr></thead><tbody>
<tr><td class="mono">super_admin</td><td>admin</td><td>Everything incl. users &amp; access, settings, policy overrides, deletes</td></tr>
<tr><td class="mono">operations_admin</td><td>admin</td><td>Drops, pickups, orders, merchants, consumers, compliance, wallet/vouchers, templates, CMS, payouts</td></tr>
<tr><td class="mono">support_agent</td><td>admin</td><td>Support tickets, cases &amp; moderation, refunds/cancels within policy, issue credit, block consumers; read elsewhere</td></tr>
<tr><td class="mono">read_only</td><td>admin</td><td>All GET endpoints (dashboards &amp; reports); no writes; pickup codes masked</td></tr>
<tr><td class="mono">merchant_owner</td><td>merchant</td><td>All merchant endpoints for own merchant (branches, vendors, drivers, store &amp; security settings)</td></tr>
<tr><td class="mono">merchant_staff</td><td>merchant</td><td>Day-to-day: orders, listings/inventory, products, templates, customers, reviews, disputes, help — limited to assigned branches</td></tr>
</tbody></table>''')
    body.append('<h2 id="errors">Errors</h2><pre>{ "error": { "code": "validation_error", "message": "Some fields are invalid", "details": { "price.amount": "Must be lower than originalPrice" } } }</pre>'
                '<table><thead><tr><th>HTTP</th><th>code</th><th>When</th></tr></thead><tbody>'
                + "".join(f'<tr><td>{a}</td><td class="mono">{b}</td><td>{c}</td></tr>' for a, b, c in [
                    ("400", "validation_error", "Malformed query/body"), ("401", "unauthorized", "Missing/expired token, bad credentials"),
                    ("403", "forbidden", "Role not allowed / other merchant's data"), ("404", "not_found", "Unknown id"),
                    ("409", "conflict", "State conflict (already verified, code exists, active reservations)"),
                    ("409", "invalid_transition", "Order state machine: action not allowed from the current status (details.from/to/allowed); terminal: completed, cancelled, refunded"),
                    ("409", "code_used / moderation_hold / sold_out", "Pickup code already used · listing disabled by WonderBites · not enough bags"),
                    ("422", "invalid_code / code_expired", "Pickup code doesn’t match the order · expired (window end + 30 min)"),
                    ("403", "pending_verification / account_rejected / account_suspended", "Merchant sign-in blocked until approval / after rejection or suspension"),
                    ("422", "validation_error / policy_violation", "Field errors in details; refund outside policy"),
                    ("429", "rate_limited", "Too many requests (Retry-After header)"), ("500", "internal", "Unexpected — retry with backoff")])
                + "</tbody></table>")

    # matrix
    m = ['<h2 id="matrix">Screen → endpoints matrix</h2><p class="lead">Every screen and the endpoints it calls. <i>Italic</i> = endpoint owned by another screen but also used here. Realtime events listed per screen.</p>',
         '<table class="matrix"><thead><tr><th>Screen</th><th>Route</th><th>Endpoints</th></tr></thead><tbody>']
    for k, (p, label, route) in SCREENS.items():
        own = by_screen.get(k, [])
        also = [e for e in EP if k in e["also"]]
        evs = [n for n, d, pl, scr in EVENTS if k in scr]
        links = "".join(f'<a href="#{opanchor(e)}"><b class="k">{e["method"]}</b>{H(e["path"])}</a>' for e in own)
        links += "".join(f'<a class="also" href="#{opanchor(e)}"><b class="k">{e["method"]}</b>{H(e["path"])}</a>' for e in also)
        links += "".join(f'<a href="#ev-{anchor(n)}"><b class="k">EVENT</b>{H(n)}</a>' for n in evs)
        m.append(f'<tr><td><a href="#scr-{k}">{H(label)}</a><br><span class="pill">{p}</span></td><td class="mono" style="white-space:normal">{H(route)}</td><td class="eps">{links}</td></tr>')
    m.append("</tbody></table>")
    body.append("\n".join(m))

    for portal, title in (("shared", "Shared & Auth"), ("admin", "Admin portal"), ("merchant", "Merchant portal")):
        body.append(f'<h2 id="portal-{portal}">{title}</h2>')
        for k, (p, label, route) in SCREENS.items():
            if p != portal or k not in by_screen: continue
            body.append(f'<section class="scr" id="scr-{k}"><h3>{H(label)} <span class="pill">{H(route)}</span></h3>')
            for e in by_screen[k]: body.append(render_ep(e))
            body.append("</section>")

    # realtime
    rt = ['<h2 id="realtime">Realtime &amp; webhooks</h2>',
          '<p>Connect once per session: <code>wss://api.wonderbites.app/api/v1/stream?token=&lt;accessToken&gt;</code> (WebSocket) or <code>GET /api/v1/stream</code> with <code>Accept: text/event-stream</code> (SSE, auto-reconnect with <code>Last-Event-ID</code>). '
          'Optional filters: <code>events=order.status_changed,alert.created</code>, <code>branchId</code>. Server sends a <code>ping</code> every 25 s; client may send <code>{"type":"subscribe","events":[…]}</code>. '
          'Admins receive platform-wide events (filtered by role); merchants receive only events for their merchant/branches. The same payloads can be delivered as signed HTTPS webhooks (<code>X-WB-Signature: t=…,v1=HMAC-SHA256(secret, t + "." + body)</code>, retries with exponential backoff for 24 h).</p>',
          '<pre>{ "id": "evt_9001", "type": "order.status_changed", "occurredAt": "2026-11-19T16:30:00Z", "data": { … } }</pre>']
    for n, d, pl, scr in EVENTS:
        sample = spec["webhooks"][n]["post"]["requestBody"]["content"]["application/json"]["example"]
        ps = schema_of(pl)
        t = pl if isinstance(pl, str) else type_str(ps)
        rt.append(f'<article class="ep ev" id="ev-{anchor(n)}" data-s="{H(n.lower()+" "+d.lower())}"><header><span class="m POST">EVENT</span><span class="path">{H(n)}</span><span class="sum">{H(d)}</span></header><div class="bd">'
                  f'<div class="meta">data: {schema_link(t)} · screens: {", ".join(f"<a href=#scr-{s}>{H(SCREENS[s][1])}</a>" for s in scr)}</div>'
                  f'<details><summary>Payload example</summary><pre>{H(jdump(sample))}</pre></details></div></article>')
    body.append("\n".join(rt))

    # enums
    en = ['<h2 id="enums">Enums (status pills &amp; filters)</h2><table><thead><tr><th>Enum</th><th>Values</th><th>Used for</th></tr></thead><tbody>']
    for n, (vals, d) in ENUMS.items():
        en.append(f'<tr id="schema-{n}"><td class="mono">{n}</td><td>{"".join(f"<span class=pill>{H(v)}</span>" for v in vals.split())}</td><td>{H(d)}</td></tr>')
    en.append("</tbody></table>")
    body.append("\n".join(en))
    body.append('<h2 id="schemas">Schemas</h2><p class="lead">Click a schema to expand its fields. <span class="req">*</span> = required.</p>' +
                "\n".join(render_schema(n) for n in sorted(SCHEMAS) if "enum" not in SCHEMAS[n]))
    body.append('<footer>Generated from the same model as openapi.yaml · WonderBites Portals API v1 · English reference (UI is bilingual EN/AR via Accept-Language).</footer>')

    js = """<script>
(function(){var i=document.getElementById('flt');if(!i)return;var eps=[].slice.call(document.querySelectorAll('article.ep')),secs=[].slice.call(document.querySelectorAll('section.scr'));
i.addEventListener('input',function(){var q=i.value.trim().toLowerCase();eps.forEach(function(a){a.classList.toggle('hidden',q&&a.getAttribute('data-s').indexOf(q)<0)});
secs.forEach(function(s){s.classList.toggle('hidden',q&&!s.querySelector('article.ep:not(.hidden)'))});});})();
</script>"""
    doc = f"""<!DOCTYPE html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WonderBites Portals API — v1 reference</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body><div class="layout"><nav aria-label="API sections">{"".join(nav)}</nav><main>{"".join(body)}</main></div>{js}</body></html>"""
    open(OUT + "api.html", "w").write(doc)
    return len(doc)

# ---------------------------------------------------------------- MD contract
def fields(x):
    if x is None: return "—"
    if isinstance(x, str): return f"`{x}`"
    s = x
    req = set(s.get("required", []))
    return "`{ " + ", ".join(k + ("*" if k in req else "") + ": " + type_str(v) for k, v in s.get("properties", {}).items()) + " }`"

def qstr(e):
    toks = []
    for t in e["q"]:
        toks.append(t)
    return " ".join(toks)

def build_md():
    L = ["# WonderBites Portals — API Contract (v1)", "",
         "Concise builder contract, grouped by screen. **Generated from the same model as `docs/openapi.yaml`** (OpenAPI 3.1, validated) and `docs/api.html` (readable reference with examples + Screen → endpoints matrix). If anything here disagrees with openapi.yaml, the YAML wins.", "",
         "Notation: `field*` = required · `Type[]` = array · `Type?` = nullable · `Paged<X>` = `{ data: X[], page, pageSize, total, summary? }` · query `name:Type` = screen-specific filter, `name*` = required. Every endpoint also accepts `Accept-Language: en|ar`. Mock handlers in `assets/js/api/mock/*.js` must mirror these paths and shapes.", ""]
    L += ["## v1.1 — reconciled with the final screen code and mocks (2026-11-19)",
          "Every `api()` call and every mock route in `assets/js` (lead, D1–D4, admin-business) resolves to a documented path. All 118 mock GET responses that could be called were compared field by field against the schemas, and no differences remain. POST/PATCH bodies were checked against the mocks' `need()` validations. Mock-internal helper keys (`_n`, `_s`, `sortUsage`, `sortNet`…) are deliberately not part of the contract.",
          "- **New endpoints (D2):** `GET /admin/financials/filter-options`, `GET /admin/financials/payouts-settlements?period`, `GET /admin/financials/refunds-adjustments?period`, `GET /admin/analytics/performance/merchants/{merchantId}`.",
          "- **Refund policy (D1 + D3):** `RefundPolicyConfig = { key, version, freeCancellationHours, refundDestinationDefault, outcomes[], reasons:[PolicyReason {key,label,outcome}] }` (replaces `rules`). `RefundEligibility` adds `hoursSincePlaced, hoursToWindow, insideCancellationDeadline, collected, policy{…}, outcomes[]`. The refund body may carry `outcome`, `approved`, `note`. `Order.refund` = `OrderRefund {amount, reason, reasonLabel, outcome, …}`.",
          "- **Detail endpoints return the entity flat** (not wrapped): cases, moderation, consumers, pickups (+`order`), drops, tickets, disputes (+`messages`), drivers (+`branch`,`orders`), customers (+`orders`), vendors, merchant orders, listings (`GET /merchant/listings/{id}` → `Listing` with `activity`).",
          "- **Renamed to match the code:** Case/Moderation/Ticket `createdAt` + `ageMinutes` (were reportedAt/ageHours); ModerationItem `item`; AdminUser `twoFactor`, `lastActiveAt`; UsersSummary `total, withoutTwoFa, byRole`; MerchantListSummary `totalMerchants`; PickupSummary `onTimeRatePct`; Driver `onTime`, DriverSummary `avgOnTime`; DayRecord `co2T`; TopOffer `{id,title,sellThrough}`; EarningsSummary `split`; SalesAnalytics `days`, `daysTotal` with object-shaped `ordersPickups`, `customerInsights`, `impact`; MerchantOrder `total`, `createdAt`, `bag: LocalizedText`, `deliveryAddress`; MerchantOrderSummary `{total, readyForPickup, outForDelivery, awaitingDriver, activeDrivers}`; Review `customer`, `listing`; RatingSummary `total` (overview card: `count`); Dispute `number`, `customer`, `tab`; DayHours `closed` (was enabled); Template `source` (was owner); TemplateUsage `{id,name,usageCount}`; StoreInfo `category`, `description`, `address: LocalizedText`.",
          "- **Settings rewritten to match the code:** GeneralSettings (`timezone, autoCancelUnclaimed, requirePickupPassport, supportEmail, countries, commissionRate, pickupWindowMinutes, reservationHoldMinutes`), NotificationSettings `alerts[]`, SecuritySettings (`sso, auditLog, auditRetentionDays, auditExportRange, passwordPolicy, ipAllowlist`), `MerchantProfile` / `AdminProfile` (`phoneCountry, phone`), `MerchantSecurityResult` (`verificationSent, sentTo`), `SupportDashboard { kpis{…minutes/hours…}, responseTrend, byChannel[{key,count}], byPriority }`.",
          "- **Added fields:** SustainabilityDashboard `equivalentCars`, plus documented `Activity.type/by/note/detail/meta{score,max,doc,status,dueAt,note}` and the action list. ComplianceSummary `hygieneMax`, ComplianceRow `id, createdAt, suspended`, CertificateInput `fileName, size`, Wallet `consumerId`, IssueCredit `skipped`, MerchantPerformanceRow `id, city, category`. Consumer `rescueScore, co2KgAvoided, preferences, language, marketingOptIn, blockReason`. Pickup `bag{id,title,thumb}, codeMasked`; Drop `titleI18n`, `thumb`; Ticket `channel, category, messageCount`, requester `email`. CaseSummary `byKind`, ModerationSummary `byType`, TemplateSummary `byCategory`, CmsSummary `counts`, Banner `subtitle`, CMS `subtype: legal`.",
          "- **Enums:** CaseStatus + `pending, in_review`; ModerationType + `merchant_profile`; new `TemplateSource`, `DisputeTab`, `AuditExportRange`. `Ref.name` (and Driver/Customer/Vendor/Merchant `name`) may be a plain localized string or a `LocalizedText`.",
          "- **Query/other:** `GET /admin/templates?source=wonderbites|mine`; `GET /merchant/disputes?status=all|open|in_progress|resolved|closed`; `DELETE /admin/drops/{id}?force=true` (409 with `details.reserved`); `GET /admin/merchants/{id}/listings` → Drop list; `/admin/merchants/{id}/compliance` → `MerchantComplianceTab`; `GET /merchant/help/faqs` is a list with `summary.contact`; `GET /merchant/branches` has `summary {total, open}`. The CMS mock's generic `/admin/cms/{kind}/{id}` routes are exactly the documented pages/banners/faqs endpoints. `POST /shared/uploads/presign` is documented under Global shell; the mock is D2's fallback until core owns it.",
          "- The generator lives in `docs/generator/` (run `python3 docs/generator/render.py`; it writes all three docs). Contract-vs-code checks: `bash docs/generator/checks/run_all.sh` (see checks/README.md).", ""]
    L += ["## v1.4 Audit fixes (shared demo store, order state machine, pickup codes, commission)",
          "- **One store for both portals:** orders, listings (= admin drops, same ids), pickups, support tickets (merchant disputes + help requests), moderation and merchant accounts are shared. Merchant lists are a tenant-filtered projection of the admin data. Demo clock: every date is relative to `DEMO_TODAY` 2026-11-19.",
          "- **Order state machine:** `allowedActions: OrderAction[]` and `active` on every order; disallowed actions → 409 `invalid_transition` `{from, to, allowed}`. Self-pickup completes only via `POST /merchant/pickups/verify` (→ `PickupVerifyResult` with the completed order); delivery completes out_for_delivery → delivered → completed.",
          "- **Pickup codes:** 6 characters A–Z/2–9 (no 0 O 1 I L), single-use (`usedAt`), expire at window end + 30 min (`expiresAt`). Admin Pickups verify uses the same helper (response adds `order`). Errors: 422 `invalid_code` / `code_expired`, 409 `code_used`.",
          "- **Stock:** Listing `reserved`, `collected`; `remaining = quantity − reserved − collected` changes only with quantity / reservations / collections. 422 `{quantity: below_committed}`.",
          "- **Commission:** `GET|PUT /admin/settings/commercial` (19 % default, effective-dated history), `GET|PUT /admin/merchants/{id}/contract` (override). Merchant / Payout / DayRecord / EarningsSummary carry `commissionRate`; Merchant `commissionSource`.",
          "- **Merchant approval:** sign-up creates a Pending verification merchant; OTP verify returns `status: pending_verification` (no tokens); login 403 `pending_verification` / `account_rejected` / `account_suspended`.",
          "- **Support contacts:** Market `supportEmail, merchantSupportEmail, supportPhone, supportWhatsApp, supportHours` (Qatar: support@wonderbites.qa, +974); `PATCH /admin/settings/markets/{code}` edits them; merchant Help `contact[]` comes from them.",
          "- **Demo only:** `POST /shared/demo/reservations` (consumer checkout stand-in). All people, emails (example.com), phones (5550 range) and IBANs (masked) are demo data.", ""]
    L += ["## v1.3 Markets (Qatar launch; UAE/KSA addable)",
          "- **New:** `GET /shared/markets`, `GET /shared/markets/{code}`, `GET /admin/settings/markets`, `PATCH /admin/settings/markets/{code}`, `POST|PATCH /admin/settings/markets/{code}/cities[/{cityId}]`, `GET|PUT /admin/settings/fx` (+ demo-only `POST /admin/settings/markets/reset`). Schemas `Market`, `MarketCity`, `MarketUpdate`, `FxSettings`, `FxRate`, `MarketMeta`.",
          "- **Convention:** `market` query param on every admin read (`all` default). Rows carry `market`; aggregates are in the market currency or converted to the reporting currency (`meta.market`).",
          "- **Fields:** Branch / BranchOption `country, currency, timeZone`; BranchInput `country`; User `country, timeZone`; MerchantContext `country, timeZone, branches[BranchOption]`; OperatingHours `timeZone, branches`; merchant sign-up `country` must be an enabled market. Country enum order `QA AE SA`. Sample data is Qatari (Doha, Al Rayyan, Al Wakrah, Lusail; QAR; +974; Asia/Qatar).",
          ""]
    L += ["## Changes since the first draft (v1-draft → v1)",
          "- Shared endpoints live under **`/shared/*`** (lead convention): `/shared/notifications` (+ `PATCH /shared/notifications/{id} {read}`), `/shared/search`, `/shared/exports`, `/shared/uploads/presign`, `/shared/imports`, `/shared/settings/language`, `/shared/impact`, `/shared/meta/*`, `/shared/help/faqs`, `/shared/support/tickets`. Root `/uploads/presign` and `/imports` remain as **deprecated aliases** (screens already call them).",
          "- Enum values from the draft are kept (mocks use them); screen-only states were added as extra values. Display labels that differ from values: DropStatus `live`='Active'; OrderStatus `reserved`='Placed', `ready_for_pickup`='Ready'; PickupStatus `ready`='Ready for Pickup'; Severity `high`='Warning', `medium`='Information'; TicketPriority `medium`='Normal'; TemplateStatus `published`='Active'; DisputeStatus `in_review`='In progress'.",
          "- Field names kept from the draft: `pickupWindow` (drops, orders, listings, templates — pickups use `window`), `remaining`, `fulfillment: pickup|delivery`, `commissionRate`, listing `settings { publish, featured, allowNegotiation, expiresOn }`, listing `stats { sold, revenue, views }`; listing/branch address is flat (`address, city, state, zip`).",
          "- Added: `GET /admin/{drops|pickups|orders|merchants|consumers|cases|moderation}/summary`, `GET /admin/ops/meta`, `POST /admin/pickups/{id}/cancel`, `GET|PATCH /admin/settings/profile`, `GET /merchant/me/branches`, `POST /merchant/imports/preview`, `POST /merchant/reviews/feedback` ('Write a Review' = partner feedback to WonderBites), `GET /merchant/help/faqs`, `POST /merchant/templates/{id}/create-product`.",
          "- `pageSize` default is 10 (max 100).", ""]
    intro = open(os.path.join(HERE, "intro.md")).read().split("## Conventions", 1)[1]
    L += ["## Conventions", intro.strip(), ""]
    L += ["### Common shapes", "- `Money { amount: number, currency: AED|QAR|SAR }` · `LocalizedText { en, ar }` · `Ref { id, name }` · `UserRef { id, name, avatarUrl? }` · `TimeWindow { start: HH:mm, end: HH:mm }` · `Phone { countryCode, number }`",
          "- `Kpi { key, label, value, format: KpiFormat, currency?, delta?, deltaUnit?, trend?, comparison?, caption?, sparkline?: number[], badge? }`",
          "- `Series { key, label, kind?: line|bar|area, unit?, points: [{ x, y }] }` · `Segment { key, label, value, share? }` · `FunnelStep { key, label, value, rate? }` · `Activity { id, action, label, actor?, at, meta? }`",
          "- `Error { error: { code, message, details } }` · `BulkResult { updated, failed: [{ id, error }] }` · `ReasonBody { reason?, notify? }`", ""]
    L += ["## Enums (status pills, filters)", "| Enum | Values | Used for |", "|---|---|---|"]
    for n, (vals, d) in ENUMS.items():
        L.append(f"| {n} | `{' '.join(vals.split())}` | {d} |")
    L.append("")
    by_screen = {}
    for e in EP: by_screen.setdefault(e["screen"], []).append(e)
    for portal, title in (("shared", "SHARED & AUTH"), ("admin", "ADMIN PORTAL (`/admin/*`)"), ("merchant", "MERCHANT PORTAL (`/merchant/*`, all accept `branchId`)")):
        L.append(f"## {title}")
        for k, (p, label, route) in SCREENS.items():
            if p != portal or k not in by_screen: continue
            L.append(f"### {label}  — route `{route}`")
            for e in by_screen[k]:
                line = f"- **{e['method']} {e['path']}** — {e['summary']}"
                if e["q"]: line += f"  \n  query: `{qstr(e)}`"
                if e["body"] is not None: line += f"  \n  body: {fields(e['body'])}"
                rt = resp_type(e)
                if e["lst"] is not None and not isinstance(e["lst"], str):
                    rt = "Paged<" + fields(e["lst"]).strip("`") + ">" + (" + summary: " + (e["lsum"] if isinstance(e["lsum"], str) else type_str(e["lsum"])) if e["lsum"] is not None else "")
                elif e["resp"] is not None and not isinstance(e["resp"], str):
                    rt = fields(e["resp"]).strip("`")
                line += f"  \n  → `{rt}`"
                roles = e["roles"] or ["public"]
                if roles not in (gen_all_admin, gen_all_merchant):
                    line += f" · roles: {', '.join(roles)}"
                if e["desc"]: line += f"  \n  _{e['desc']}_"
                L.append(line)
            L.append("")
    L += ["## Realtime — `/api/v1/stream` (WebSocket or SSE) + optional signed webhooks", "Envelope `{ id, type, occurredAt, data }`.", ""]
    for n, d, pl, scr in EVENTS:
        L.append(f"- **{n}** — {d}. data: {fields(pl)}")
    L += ["", "## Schemas (response / request shapes)", "`*` = required.", ""]
    for n in sorted(SCHEMAS):
        s = SCHEMAS[n]
        if "enum" in s or n in ("Money",): continue
        L.append(f"- **{n}** {fields(s)}")
    open(OUT + "API_CONTRACT.md", "w").write("\n".join(L) + "\n")

from endpoints import A_ALL as gen_all_admin, M as gen_all_merchant
n = build_html(); build_md()
print("html bytes", n)
