"""F-018 screenshot gallery: every route at 1440 in EN Night and AR Day → docs/gallery/*.jpg + docs/gallery.html

  python3 qa/gallery.py            # all routes (≈ 2 × 83 images, max 180)
  python3 qa/gallery.py m-orders   # only these routes (re-uses the existing manifest for the rest)

Images: viewport 1440 × 900, full page capped at 1600 px tall, resized to 1200 px wide, JPEG quality 70.
Detail routes use the first record of their list (same sampling as the render crawl).
"""
import html, io, json, sys, time
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
from lib import APP, boot, goto, idle, sample_params

OUT = APP / 'docs' / 'gallery'
MANIFEST = OUT / 'manifest.json'
MODES = [('en', 'dark', 'EN · Night'), ('ar', 'light', 'AR · Day')]
MAX_IMAGES, WIDTH, QUALITY, MAX_H = 180, 1200, 70, 1600
PORTALS = [('admin', 'Admin portal'), ('merchant', 'Merchant portal'), ('public', 'Sign-in & shared screens')]


def shoot(page, path):
    h = min(MAX_H, page.evaluate('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)'))
    png = page.screenshot(clip={'x': 0, 'y': 0, 'width': 1440, 'height': max(900, h)}, full_page=True, animations='disabled')
    im = Image.open(io.BytesIO(png)).convert('RGB')
    im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    im.save(path, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    return im.size


def main():
    only = [a for a in sys.argv[1:] if not a.startswith('-')]
    OUT.mkdir(parents=True, exist_ok=True)
    old = {(x['route'], x['mode']): x for x in json.loads(MANIFEST.read_text())['shots']} if MANIFEST.exists() and only else {}
    shots, t0 = [], time.time()
    with sync_playwright() as p:
        b = p.chromium.launch()
        for lang, theme, label in MODES:
            ctx, page = boot(b, 1440, lang, theme)
            routes = page.evaluate("""() => Object.values(App.routes).map(r => ({ name: r.name, portal: r.portal || 'public',
                title: typeof r.title === 'string' ? r.title : r.name }))""")
            samples = sample_params(page)
            demo_today = page.evaluate('api.DEMO_TODAY')
            for r in routes:
                key = (r['name'], label)
                if only and r['name'] not in only:
                    if key in old: shots.append(old[key])
                    continue
                params = samples.get(r['name'], {})
                goto(page, r['name'], params); idle(page, settle=250); page.wait_for_timeout(150)
                fn = f"{r['name']}--{lang}-{theme}.jpg"
                size = shoot(page, OUT / fn)
                shots.append(dict(route=r['name'], portal=r['portal'], title=r['title'], params=params, mode=label, lang=lang, theme=theme, file='gallery/' + fn,
                                  size=list(size), capturedAt=datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'), demoToday=demo_today))
                print(f'shot {label} {r["name"]}', flush=True)
            ctx.close()
        b.close()
    if len(shots) > MAX_IMAGES:
        raise SystemExit(f'{len(shots)} images > {MAX_IMAGES} (F-018 cap) — trim routes or modes')
    keep = {Path(s['file']).name for s in shots}
    for f in OUT.glob('*.jpg'):
        if f.name not in keep: f.unlink()
    MANIFEST.write_text(json.dumps({'generatedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'shots': shots}, indent=1, ensure_ascii=False))
    write_html(shots)
    mb = sum((OUT / Path(s['file']).name).stat().st_size for s in shots) / 1e6
    print(f'\n{len(shots)} images ({mb:.1f} MB) → docs/gallery.html in {time.time() - t0:.0f}s')


def write_html(shots):
    e = html.escape
    routes = sorted({(s['portal'], s['route'], s['title']) for s in shots}, key=lambda x: ([p for p, _ in PORTALS].index(x[0]) if x[0] in [p for p, _ in PORTALS] else 9, x[1]))
    by = {(s['route'], s['mode']): s for s in shots}
    stamp = max(s['capturedAt'] for s in shots); demo = shots[0]['demoToday']
    sec = []
    for pk, plabel in PORTALS:
        rows = [r for r in routes if r[0] == pk]
        if not rows: continue
        cards = []
        for _, name, title in rows:
            figs = []
            for _, _, mlabel in MODES:
                s = by.get((name, mlabel))
                if not s: continue
                figs.append(f'<figure><a href="{e(s["file"])}" target="_blank" rel="noopener"><img loading="lazy" src="{e(s["file"])}" width="{s["size"][0]}" height="{s["size"][1]}" alt="{e(title)} — {e(mlabel)}"></a>'
                            f'<figcaption><b>{e(mlabel)}</b><span>captured {e(s["capturedAt"])}</span></figcaption></figure>')
            prm = next((by[(name, m)]['params'] for _, _, m in MODES if (name, m) in by and by[(name, m)]['params']), None)
            cards.append(f'<article id="{e(name)}"><header><h3>{e(title)}</h3><code>#{e(name)}</code>{f"<small>params {e(json.dumps(prm, ensure_ascii=False))}</small>" if prm else ""}</header><div class="pair">{"".join(figs)}</div></article>')
        toc = ''.join(f'<a href="#{e(n)}">{e(t)}</a>' for _, n, t in rows)
        sec.append(f'<section id="p-{pk}"><h2>{e(plabel)} <small>{len(rows)} routes</small></h2><nav class="toc">{toc}</nav>{"".join(cards)}</section>')
    doc = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WonderBites portals — screenshot gallery</title>
<style>
:root{{--bg:#140b17;--card:#1e1222;--line:rgba(183,131,167,.22);--text:#f7f3ee;--muted:#cdbbc7;--accent:#e8a33d}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 Inter,system-ui,sans-serif}}
.wrap{{max-width:1500px;margin:0 auto;padding:32px 28px 80px}} h1{{font:600 30px/1.2 Georgia,serif;margin:0 0 6px}} h2{{font:600 22px Georgia,serif;margin:48px 0 12px;border-top:1px solid var(--line);padding-top:24px}}
h2 small,header small{{color:var(--muted);font:12px Inter,sans-serif;margin-inline-start:8px}} a{{color:var(--accent)}}
.lead{{color:var(--muted);max-width:900px}} .meta{{display:flex;gap:18px;flex-wrap:wrap;color:var(--muted);font-size:12.5px;margin:12px 0 0}}
.toc{{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:12.5px;margin:0 0 18px}} .toc a{{text-decoration:none;color:var(--muted)}} .toc a:hover{{color:var(--accent)}}
article{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin:0 0 18px}} article header{{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:0 0 10px}}
article h3{{margin:0;font-size:16px}} code{{color:var(--accent);font-size:12px}}
.pair{{display:grid;grid-template-columns:1fr 1fr;gap:14px}} figure{{margin:0}} figure img{{width:100%;height:auto;max-height:620px;object-fit:cover;object-position:top;border-radius:8px;border:1px solid var(--line);display:block;background:#000}}
figcaption{{display:flex;justify-content:space-between;color:var(--muted);font-size:12px;margin-top:6px}}
.repro{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 20px;margin-top:24px}} pre{{background:#0d070f;padding:12px 14px;border-radius:8px;overflow:auto}}
@media (max-width:900px){{.pair{{grid-template-columns:1fr}}}}
</style></head><body><div class="wrap">
<p><a href="../index.html#launcher">← Launcher</a> · <a href="screens.html">Screen inventory</a> · <a href="api.html">API reference</a></p>
<h1>Screenshot gallery</h1>
<p class="lead">Every route of the Admin and Merchant portals at 1440 px, in English · Night theme and Arabic · Day theme (RTL). Images are downscaled to {WIDTH} px (JPEG, quality {QUALITY}); click one for the full image. All data is demo data (demo today {e(demo)}).</p>
<div class="meta"><span>{len(routes)} routes</span><span>{len(shots)} images</span><span>captured {e(stamp)}</span><span>generated by <code>qa/gallery.py</code></span></div>
{''.join(sec)}
<section class="repro" id="reproduce"><h2 style="margin-top:0;border:0;padding:0">How to reproduce</h2>
<p>The gallery is regenerated by the QA run (last step of <code>qa/run_all.sh</code>) or on its own:</p>
<pre>bash qa/run_all.sh                 # full QA run: render matrix, click-through, flows, inventory, gallery
python3 qa/gallery.py              # gallery only (≈ 2–3 min)
python3 qa/gallery.py m-orders     # re-shoot single routes</pre>
<p>Requirements: Python 3 with <code>playwright</code> (Chromium) and <code>Pillow</code>. The app is opened from <code>index.html</code> via <code>file://</code>; both portals are signed in with the demo accounts, date range = last 30 days ending on the demo today. Detail routes show the first record of their list.</p></section>
</div></body></html>'''
    (APP / 'docs' / 'gallery.html').write_text(doc)


if __name__ == '__main__':
    main()
