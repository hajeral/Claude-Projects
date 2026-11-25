"""Field-by-field comparison of the mock GET responses captured by probe_mocks.py against the response schemas.
Per schema prints `add` (fields the mock returns that the schema lacks, with inferred shorthand types for model.py)
and `missing` (schema-required fields the mock never returns). Mock-internal keys (_x, sortX) are ignored.
The generic CMS routes /admin/cms/:kind/... are covered by the concrete pages|banners|faqs paths."""
import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))  # app/
SPEC = os.path.join(ROOT, "docs", "openapi.yaml")
PROBE = os.environ.get("WB_PROBE_JSON", "/tmp/wb_probe.json")
import json, re, yaml
sp = yaml.safe_load(open(SPEC))
S = sp['components']['schemas']
pr = json.load(open(PROBE))
def norm(p): return re.sub(r'(:\w+|\{\w+\})', '{}', p.replace('/api/v1', ''))
specops = {(m.upper(), norm(p)): op for p, ops in sp['paths'].items() for m, op in ops.items()}
def infer(v):
    if v is None: return '?str'
    if isinstance(v, list): return '[' + (infer(v[0]) if v else 'str') + ']'
    if isinstance(v, dict):
        k = set(v)
        if k == {'en', 'ar'}: return 'LocalizedText'
        if k == {'amount', 'currency'}: return 'Money'
        if k == {'id', 'name'}: return 'Ref'
        if k <= {'start', 'end', 'date'} and 'start' in k: return 'TimeWindow'
        return 'obj'
    return {'string': 'str', 'number': 'num', 'boolean': 'bool'}.get(v, 'str')
print('== mock routes not in the spec')
_routes_missing = 0
for r in pr['routes']:
    m, p = r.split(' ', 1)
    if (m, norm(p)) not in specops and not p.startswith('/admin/cms/:kind'):
        print('  ', r); _routes_missing += 1
IGN = lambda k: k.startswith('_') or re.match(r'sort[A-Z]', k)
agg = {}
def res(s):
    nm = None
    while isinstance(s, dict) and '$ref' in s: nm = s['$ref'].split('/')[-1]; s = S[nm]
    if isinstance(s, dict) and 'anyOf' in s: return res([x for x in s['anyOf'] if x.get('type') != 'null'][0])
    return nm, s
def cmp(label, sch, shape, depth=0):
    nm, sch = res(sch)
    if isinstance(shape, list):
        if sch.get('type') == 'array' and shape: cmp(label + '[]', sch['items'], shape[0], depth)
        return
    if not isinstance(shape, dict) or 'properties' not in sch: return
    props = sch['properties']; req = set(sch.get('required', []))
    key = nm or ('inline:' + label)
    a = agg.setdefault(key, {'add': {}, 'missing': set(), 'at': set()})
    for k, v in shape.items():
        if k not in props and not IGN(k): a['add'][k] = infer(v)
    for k in req:
        if k not in shape: a['missing'].add(k)
    a['at'].add(label)
    if depth < 3:
        for k, v in shape.items():
            if k in props and isinstance(v, (dict, list)): cmp(label + '.' + k, props[k], v, depth + 1)
for key, shape in pr['shapes'].items():
    m, p = key.split(' ', 1); op = specops.get((m, norm(p)))
    if not op or not isinstance(shape, (dict, list)) or (isinstance(shape, dict) and '__err' in shape): continue
    c = [c for c in op['responses'] if c.startswith('2')]
    if not c or 'content' not in op['responses'][c[0]]: continue
    cmp(key, op['responses'][c[0]]['content']['application/json']['schema'], shape)
n=0
for k, a in sorted(agg.items()):
    if a['add'] or a['missing']:
        n+=1; print(k, '| add', json.dumps(a['add']), '| missing', sorted(a['missing']), '| at', sorted(a['at'])[:2])
print('schemas with diffs:', n, '| undocumented mock routes:', _routes_missing)
import sys; sys.exit(1 if (n or _routes_missing) else 0)
