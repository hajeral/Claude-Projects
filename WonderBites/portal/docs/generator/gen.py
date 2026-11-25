import json, re, copy, html, sys, yaml
import os; HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from model import SCHEMAS, ENUMS, S, O
from endpoints import EP, EVENTS, SCREENS

OUT = "/home/claude/wb/app/docs/"

# ------------------------------------------------------------- parameters
COMMON = {
 "q": ("query", {"type": "string"}, "Free-text search (name, code/ID, email…)"),
 "sort": ("query", {"type": "string", "examples": ["-createdAt"]}, "Sort field; prefix `-` for descending. Default `-createdAt` (Newest First)."),
 "page": ("query", {"type": "integer", "minimum": 1, "default": 1}, "1-based page"),
 "pageSize": ("query", {"type": "integer", "minimum": 1, "maximum": 100, "default": 10}, "Items per page (default 10)"),
 "from": ("query", {"type": "string", "format": "date-time"}, "Global date range start (ISO-8601 UTC, inclusive)"),
 "to": ("query", {"type": "string", "format": "date-time"}, "Global date range end (ISO-8601 UTC, exclusive)"),
 "branchId": ("query", {"type": "string"}, "Merchant branch scope; omit or `all` = all branches"),
 "category": ("query", {"$ref": "#/components/schemas/Category"}, "Category filter"),
 "city": ("query", {"type": "string"}, "City filter (id from /shared/meta/cities)"),
 "dietary": ("query", {"type": "array", "items": {"$ref": "#/components/schemas/Dietary"}}, "Dietary tags (comma-separated, match all)"),
 "market": ("query", {"type": "string", "default": "all", "examples": ["all", "QA"]}, "(v1.3) Market scope of every admin read: `all` (default) = every ENABLED market, or a market code (QA, AE, SA). "
            "Lists return only rows of those markets (each row keeps its own currency); KPI/chart aggregates are in the market's currency, or converted to the reporting currency when `all` spans several currencies (see meta.market)."),
}
PNAME = {"from": "From", "to": "To"}

def param_obj(tok):
    req = False
    name, typ = (tok.split(":", 1) + [None])[:2]
    if typ and typ.endswith("*"): typ = typ[:-1]; req = True
    if name.endswith("*"): name = name[:-1]; req = True
    if typ is None and name in COMMON and not req:
        return {"$ref": "#/components/parameters/" + PNAME.get(name, name[0].upper() + name[1:])}, name
    if typ is None:
        loc, sch, d = COMMON.get(name, ("query", {"type": "string"}, ""))
    else:
        sch, d = S(typ), ""
    p = {"name": name, "in": "query", "required": req, "schema": sch}
    if d: p["description"] = d
    if name == "dietary": p.update(style="form", explode=False)
    return p, name

# ------------------------------------------------------------- examples
def resolve(s):
    while "$ref" in s:
        s = SCHEMAS[s["$ref"].split("/")[-1]]
    return s

from examples import ex  # field-aware realistic example values

def type_str(s):
    if "$ref" in s: return s["$ref"].split("/")[-1]
    if "anyOf" in s:
        alts = [a for a in s["anyOf"] if a.get("type") != "null"]
        return " | ".join(type_str(a) for a in alts) + ("?" if len(alts) < len(s["anyOf"]) else "")
    if "enum" in s and "$ref" not in s: return "enum(" + "|".join(s["enum"]) + ")"
    t = s.get("type")
    nul = ""
    if isinstance(t, list): nul = "?"; t = [x for x in t if x != "null"][0]
    if t == "array": return type_str(s["items"]) + "[]" + nul
    if t == "object" and "properties" in s: return "{ " + ", ".join(k + ": " + type_str(v) for k, v in s["properties"].items()) + " }"
    if t == "object": return "object"
    f = s.get("format")
    return {"date-time": "datetime", "date": "date", "uri": "url", "email": "email"}.get(f, t) + nul

# ------------------------------------------------------------- build openapi
def schema_of(x):
    if x is None: return None
    if isinstance(x, dict): return x
    return S(x)

def paged(item, summ):
    p = {"data": {"type": "array", "items": schema_of(item)}, "page": {"type": "integer", "examples": [1]},
         "pageSize": {"type": "integer", "examples": [10]}, "total": {"type": "integer", "examples": [42]}}
    req = ["data", "page", "pageSize", "total"]
    if summ is not None: p["summary"] = schema_of(summ)
    return {"type": "object", "required": req, "properties": p}

def opid(e):
    parts = [p for p in re.split(r"[/{}-]", e["path"]) if p]
    base = "".join(w[:1].upper() + w[1:] for w in parts)
    return e["method"].lower() + base

spec = {
 "openapi": "3.1.0",
 "info": {"title": "WonderBites Portals API", "version": "1.0.0",
   "summary": "Admin + Merchant portal API for the WonderBites surplus-food marketplace",
   "description": open(os.path.join(HERE, "intro.md")).read(),
   "contact": {"name": "WonderBites Platform"}},
 "servers": [{"url": "https://api.wonderbites.app/api/v1", "description": "Production"}, {"url": "https://staging-api.wonderbites.app/api/v1", "description": "Staging"},
             {"url": "/api/v1", "description": "Same-origin / mock adapter"}],
 "security": [{"bearerAuth": []}],
 "tags": [], "paths": {}, "webhooks": {},
 "components": {"securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT",
     "description": "Access JWT (15 min). Claims: sub, role, portal, merchantId?, branchIds?, perms[]. Refresh via POST /auth/refresh."}},
   "parameters": {}, "responses": {}, "schemas": SCHEMAS, "headers": {}},
}
C = spec["components"]
for n, (loc, sch, d) in COMMON.items():
    p = {"name": n, "in": loc, "required": False, "schema": sch, "description": d}
    if n == "dietary": p.update(style="form", explode=False)
    C["parameters"][PNAME.get(n, n[0].upper() + n[1:])] = p
C["parameters"]["AcceptLanguage"] = {"name": "Accept-Language", "in": "header", "required": False, "schema": {"$ref": "#/components/schemas/Language"},
   "description": "en (default) | ar — localizes labels, messages and plain-string content"}
C["parameters"]["IdempotencyKey"] = {"name": "Idempotency-Key", "in": "header", "required": False, "schema": {"type": "string"},
   "description": "Recommended on POST actions (refunds, credits, payouts) — safe retries for 24h"}
def err(desc, code, msg):
    return {"description": desc, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"},
            "example": {"error": {"code": code, "message": msg, "details": {}}}}}}
C["responses"] = {
 "BadRequest": err("Malformed request", "validation_error", "Invalid query parameter: pageSize"),
 "Unauthorized": err("Missing / expired access token", "unauthorized", "Access token expired"),
 "Forbidden": err("Role lacks permission", "forbidden", "Requires role super_admin"),
 "NotFound": err("Resource not found", "not_found", "Drop drp_3391 not found"),
 "Conflict": err("State conflict", "conflict", "Pickup already verified"),
 "InvalidTransition": {"description": "Order state machine rejected the action (terminal or not allowed from the current status)", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"},
    "example": {"error": {"code": "invalid_transition", "message": "Order MO-5199 can't move from completed to cancelled.", "details": {"from": "completed", "to": "cancelled", "allowed": ["refunded", "partially_refunded"]}}}}}},
 "PickupCode": {"description": "Pickup code already used, or the order can't be completed (409); 422 invalid_code / code_expired", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"},
    "example": {"error": {"code": "code_used", "message": "This pickup code was already used.", "details": {"usedAt": "2026-11-19T15:40:00Z"}}}}}},
 "Unprocessable": {"description": "Validation or policy error", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Error"},
    "example": {"error": {"code": "validation_error", "message": "Some fields are invalid", "details": {"price.amount": "Must be lower than originalPrice"}}}}}},
 "RateLimited": err("Too many requests (see Retry-After)", "rate_limited", "Too many attempts, retry in 60s"),
}

used_tags = []
for e in EP:
    tag = SCREENS[e["screen"]][1]
    if tag not in used_tags: used_tags.append(tag)
    path = e["path"]
    op = {"tags": [tag], "summary": e["summary"], "operationId": opid(e), "x-roles": e["roles"] or ["public"], "x-screen": e["screen"]}
    if e["also"]: op["x-alsoUsedBy"] = [SCREENS[s][1] for s in e["also"]]
    if e["desc"]: op["description"] = e["desc"]
    if e.get("deprecated"): op["deprecated"] = True
    if not e["auth"]: op["security"] = []
    params = [{"$ref": "#/components/parameters/AcceptLanguage"}]
    for pp in re.findall(r"{(\w+)}", path):
        params.append({"name": pp, "in": "path", "required": True, "schema": {"type": "string"}})
    seen = set()
    for tok in e["q"]:
        p, nm = param_obj(tok)
        if nm in seen: continue
        seen.add(nm); params.append(p)
    if e["method"] == "POST" and e["body"] is not None and any(w in path for w in ("refund", "credits", "payouts", "adjust")):
        params.append({"$ref": "#/components/parameters/IdempotencyKey"})
    op["parameters"] = params
    if e["body"] is not None:
        bs = schema_of(e["body"])
        op["requestBody"] = {"required": True, "content": {"application/json": {"schema": bs, "example": ex(bs)}}}
    code = str(e["code"])
    if e["lst"] is not None:
        rs = paged(e["lst"], e["lsum"])
        ex_ = {"data": [ex(schema_of(e["lst"]))], "page": 1, "pageSize": 10, "total": 42}
        if e["lsum"] is not None: ex_["summary"] = ex(schema_of(e["lsum"]))
        resp = {"description": "Paged list", "content": {"application/json": {"schema": rs, "example": ex_}}}
    elif e["resp"] is not None:
        rs = schema_of(e["resp"])
        resp = {"description": "OK" if code == "200" else "Created" if code == "201" else "Accepted", "content": {"application/json": {"schema": rs, "example": ex(rs)}}}
    elif code == "302":
        resp = {"description": "Redirect to signed file URL", "headers": {"Location": {"schema": {"type": "string", "format": "uri"}}}}
    elif code == "101":
        resp = {"description": "Switching protocols (WebSocket) — or 200 text/event-stream for SSE",
                "content": {"text/event-stream": {"schema": {"$ref": "#/components/schemas/StreamEnvelope"}}}}
    else:
        resp = {"description": "No content"}
    responses = {code: resp}
    if e["auth"]:
        responses.update({"401": {"$ref": "#/components/responses/Unauthorized"}, "403": {"$ref": "#/components/responses/Forbidden"}})
    if "{" in path: responses["404"] = {"$ref": "#/components/responses/NotFound"}
    if e["method"] in ("POST", "PUT", "PATCH", "DELETE"):
        responses["409"] = {"$ref": "#/components/responses/" + e.get("x409", "Conflict")}
        responses["422"] = {"$ref": "#/components/responses/Unprocessable"}
    else:
        responses["400"] = {"$ref": "#/components/responses/BadRequest"}
    responses["429"] = {"$ref": "#/components/responses/RateLimited"}
    op["responses"] = responses
    e["_op"] = op
    spec["paths"].setdefault(path, {})[e["method"].lower()] = op

for t in used_tags:
    portal = [v[0] for v in SCREENS.values() if v[1] == t][0]
    route = [v[2] for v in SCREENS.values() if v[1] == t][0]
    spec["tags"].append({"name": t, "description": f"Portal: {portal} · route: `{route}`"})
spec["x-tagGroups"] = [{"name": g.title(), "tags": [SCREENS[k][1] for k in SCREENS if SCREENS[k][0] == g and SCREENS[k][1] in used_tags]} for g in ("shared", "admin", "merchant")]

for name, desc, payload, scr in EVENTS:
    ps = schema_of(payload)
    env = {"allOf": [{"$ref": "#/components/schemas/StreamEnvelope"}, {"type": "object", "properties": {"type": {"const": name}, "data": ps}}]}
    sample = {"id": "evt_9001", "type": name, "occurredAt": "2026-07-20T16:30:00Z", "data": ex(ps)}
    spec["webhooks"][name] = {"post": {"summary": desc, "operationId": "event_" + name.replace(".", "_"), "tags": ["Realtime"],
        "description": "Delivered over WebSocket/SSE `/api/v1/stream` and (optionally) as signed HTTPS webhooks (`X-WB-Signature: t=…,v1=HMAC-SHA256`).",
        "x-screens": [SCREENS[s][1] for s in scr],
        "requestBody": {"content": {"application/json": {"schema": env, "example": sample}}},
        "responses": {"200": {"description": "Ack (webhook receivers)"}}}}
    e = {"name": name, "desc": desc, "schema": ps, "sample": sample, "screens": scr}
spec["tags"].append({"name": "Realtime", "description": "Stream / webhook events"})
spec["x-tagGroups"].append({"name": "Realtime", "tags": ["Realtime"]})

class D(yaml.SafeDumper): pass
D.ignore_aliases = lambda *a: True
def str_rep(d, s):
    if "\n" in s: return d.represent_scalar("tag:yaml.org,2002:str", s, style="|")
    return d.represent_scalar("tag:yaml.org,2002:str", s)
D.add_representer(str, str_rep)
with open(OUT + "openapi.yaml", "w") as f:
    f.write("# WonderBites Portals API — OpenAPI 3.1 (generated; source of truth for docs/api.html and API_CONTRACT.md)\n")
    yaml.dump(spec, f, Dumper=D, sort_keys=False, allow_unicode=True, width=200)

json.dump({"spec": spec}, open("/tmp/wb_spec.json", "w"))
print("paths", len(spec["paths"]), "operations", len(EP), "schemas", len(SCHEMAS))
