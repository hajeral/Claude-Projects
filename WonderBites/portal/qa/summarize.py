"""Print totals from qa/results/*.json (used for QA_REPORT.md)."""
import json, collections
from pathlib import Path
R = Path(__file__).resolve().parent / 'results'

render = json.loads((R / 'render.json').read_text()) if (R / 'render.json').exists() else []
combos = {(r['lang'], r['theme'], r['width']) for r in render}
routes = {r['route'] for r in render}
rf = [r for r in render if r['issues'] or r['errors'] or r['badLinks'] or r['missing']]
links = set(); [links.update(r.get('links', [])) for r in render]
print(f'render: {len(render)} renders, {len(routes)} routes, {len(combos)} combos, {len(rf)} with findings, {len(links)} distinct link targets checked')

for lang in ('en', 'ar'):
    files = sorted(R.glob(f'clicks-{lang}-*of2.json'))
    if not files: continue
    c = collections.Counter(); n = 0; rs = 0; bad = []
    for f in files:
        for r in json.loads(f.read_text()):
            rs += 1
            for x in r['items']:
                n += 1; c[x.get('verdict')] += 1
                if x.get('verdict') in ('dead', 'error', 'unclickable', 'bad-route', 'i18n'):
                    bad.append(f"{r['route']}: [{x['verdict']}] {x['desc'][:90]} {x.get('why', '')}")
    print(f'clicks {lang}: {rs} route runs, {n} interactions, verdicts {dict(c)}')
    for b in bad: print('   ', b)

if (R / 'flows.json').exists():
    fl = json.loads((R / 'flows.json').read_text())
    print(f"flows: {sum(f['ok'] for f in fl)}/{len(fl)} pass")
    for f in fl:
        if not f['ok']: print('   FAIL', f['flow'], f.get('why'))
