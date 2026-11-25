"""Static check: every api(...) call and mock route in assets/js resolves to a documented path in docs/openapi.yaml.
Dynamic segments (${id}, :id, {id}, string concatenation) are wildcards. Exit 1 if anything is missing."""
import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))  # app/
SPEC = os.path.join(ROOT, "docs", "openapi.yaml")
PROBE = os.environ.get("WB_PROBE_JSON", "/tmp/wb_probe.json")
import re,glob,yaml,sys
sp=yaml.safe_load(open(SPEC))
have=[(m.upper(),re.sub(r'\{[^}]+\}','[^/]+',p)) for p,ops in sp['paths'].items() for m in ops]
miss={}
for f in glob.glob(os.path.join(ROOT,'assets','js','**','*.js'),recursive=True):
    t=open(f).read()
    pats=[(m,p,pl) for m,p,pl in re.findall(r"api\(\s*['\"](GET|POST|PATCH|PUT|DELETE)['\"]\s*,\s*['\"`]([^'\"`?]+)['\"`]?\s*(\+)?",t)]
    pats+=[(m,p,'') for m,p in re.findall(r"['\"`](GET|POST|PATCH|PUT|DELETE) +(/[^'\"`?\s]+)",t)]
    pats+=[(m,p,'') for m,p in re.findall(r"\b(?:on|mock|route|reg)\(\s*['\"](GET|POST|PATCH|PUT|DELETE)['\"]\s*,\s*['\"`]([^'\"`?]+)",t)]
    for m,p,plus in pats:
        q=re.sub(r'\$\{[^}]+\}','X',p); q=re.sub(r':\w+','X',q); q=re.sub(r'\{\w+\}','X',q).replace('/api/v1','')
        if plus or q.endswith('/'): q=q.rstrip('/')+'/X'
        if not q.startswith('/'): continue
        qrx=re.escape(q).replace('X','[^/]+')
        if not any(mm==m and (re.fullmatch(rx,q) or re.fullmatch(qrx, re.sub(r'\[\^/\]\+','X',rx))) for mm,rx in have):
            miss.setdefault((m,q),set()).add(f.split('/')[-1])
# known false positives: segments built by string concatenation that do exist (e.g. '/admin/alerts/' + id + '/dismiss')
KNOWN = {('POST','/admin/alerts/X'), ('POST','/shared/exports/X')}
real = {k: v for k, v in miss.items() if k not in KNOWN and '${' not in k[1]}
for k in sorted(real): print('MISSING', k, sorted(real[k]))
print(f"{len(real)} undocumented path(s)")
import sys; sys.exit(1 if real else 0)
