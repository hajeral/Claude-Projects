"""Heuristic request-body check: for every POST/PATCH/PUT mock handler, lists body fields the handler validates (need())
or reads (body.x / b.x) that the spec request body does not declare. The chunking is heuristic: a handler is
the text up to the next route registration, so review hits by hand (fields of a neighbouring handler can leak in).
Always exits 0 (informational)."""
import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))  # app/
SPEC = os.path.join(ROOT, "docs", "openapi.yaml")
PROBE = os.environ.get("WB_PROBE_JSON", "/tmp/wb_probe.json")
import re,glob,yaml,json
sp=yaml.safe_load(open(SPEC)); S=sp['components']['schemas']
def norm(p): return re.sub(r'(:\w+|\{\w+\})','{}',p)
ops={(m.upper(),norm(p)):op for p,o in sp['paths'].items() for m,op in o.items()}
def props(s):
    while '$ref' in s: s=S[s['$ref'].split('/')[-1]]
    return set(s.get('properties',{}))
reg=re.compile(r"""(?:on|api\.mock)\(\s*['"](?:(GET|POST|PATCH|PUT|DELETE)['"]\s*,\s*['"]|((?:GET|POST|PATCH|PUT|DELETE) ))([^'"]+)['"]|['"]((?:POST|PATCH|PUT) )(/[^'"]+)['"]\s*:""")
for f in glob.glob(os.path.join(ROOT,'assets','js','api','mock','*.js')):
    t=open(f).read(); hits=[(mm.start(),mm) for mm in reg.finditer(t)]
    for i,(pos,mm) in enumerate(hits):
        meth=(mm.group(1) or mm.group(2) or mm.group(4) or '').strip(); path=mm.group(3) or mm.group(5)
        if meth not in ('POST','PATCH','PUT'): continue
        chunk=t[pos:hits[i+1][0] if i+1<len(hits) else pos+3000]
        req=set()
        for arr in re.findall(r"need\((?:body|b)[^,]*,\s*\[([^\]]+)\]",chunk): req|=set(re.findall(r"'(\w+)'",arr))
        req|=set(re.findall(r"need\([^,]*?\bb(?:ody)?\.(\w+)",chunk))
        used=set(re.findall(r"\b(?:body|b)\??\.(\w+)",chunk))
        op=ops.get((meth,norm(path)))
        if not op: print('NOSPEC',meth,path); continue
        rb=op.get('requestBody',{}).get('content',{}).get('application/json',{}).get('schema')
        have=props(rb) if rb else set()
        miss=sorted((req|used)-have-{'amount','length','trim'})
        if miss: print(meth,path,'| not in spec body:',miss, '| required by mock:',sorted(req&set(miss)))
