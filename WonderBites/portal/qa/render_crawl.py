"""Render crawler: every registered route (+ sampled params / tab variants) in EN/AR x Night/Day at 1440 and 1280.

Checks: console + page errors, document horizontal overflow, card overflow / clipped children,
App.i18n.missing() empty (AR), placeholder / not-found screens, every [data-go] target is a registered route.
Also records the API endpoints each route calls (used by docs/screens.html).

  python3 qa/render_crawl.py            # full matrix (8 combos)
  python3 qa/render_crawl.py --quick    # EN night 1440 + AR night 1280 only
"""
import sys, json, time
from playwright.sync_api import sync_playwright
from lib import boot, goto, idle, sample_params, save, VARIANTS

CHECK_JS = r"""
() => {
  const R = { issues: [], info: [] };
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) R.issues.push({ kind: 'doc-overflow', detail: `scrollWidth ${de.scrollWidth} > ${de.clientWidth}` });
  if (document.querySelector('.ph-screen') && !document.querySelector('.launch')) R.issues.push({ kind: 'placeholder', detail: 'placeholder "Screen in progress" rendered' });
  if (document.querySelector('.launch .ph-screen') && App.state.route !== 'not-found') R.issues.push({ kind: 'not-found', detail: '404 screen rendered' });
  if (document.querySelector('#page .errst')) R.issues.push({ kind: 'error-state', detail: (document.querySelector('#page .errst').innerText || '').slice(0, 120) });
  const vis = (el) => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const scroller = (el, stop) => { for (let p = el.parentElement; p && p !== stop; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll') return p; } return null; };
  const desc = (el) => { const c = el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className; const lbl = (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50); return `${el.tagName.toLowerCase()}${c ? '.' + String(c).trim().split(/\s+/).slice(0, 3).join('.') : ''}${lbl ? ' "' + lbl + '"' : ''}`; };
  const cardTitle = (cd) => { const h = cd.querySelector('h3,.lb'); return h ? h.innerText.trim().slice(0, 40) : ''; };
  // cards: own overflow + children sticking out of the card box (not inside a horizontal scroller)
  document.querySelectorAll('#page .cd, .ov-back .cd, .modal, .drawer').forEach((cd) => {
    if (!vis(cd)) return;
    const cr = cd.getBoundingClientRect();
    let n = 0;
    cd.querySelectorAll('*').forEach((el) => {
      if (n > 3 || !vis(el) || el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return;
      const r = el.getBoundingClientRect();
      if (r.right > cr.right + 1.5 || r.left < cr.left - 1.5) {
        if (scroller(el, cd)) return;
        const cs = getComputedStyle(el);
        if (cs.position === 'absolute' || cs.position === 'fixed') return;
        n++; R.issues.push({ kind: 'card-overflow', detail: `[${cardTitle(cd)}] ${desc(el)} sticks out by ${Math.round(Math.max(r.right - cr.right, cr.left - r.left))}px` });
      }
    });
    // KPI: content wider than the card (the reported ~190px in ~179px case)
    if (cd.classList.contains('kpi')) {
      cd.querySelectorAll('.k-v,.k-f,.k-top').forEach((x) => { if (x.scrollWidth > x.clientWidth + 1) R.issues.push({ kind: 'kpi-overflow', detail: `[${cardTitle(cd)}] ${x.className} content ${x.scrollWidth}px in ${x.clientWidth}px` }); });
      cd.querySelectorAll('.lb,.k-f>span:last-child').forEach((x) => { if (x.scrollWidth > x.clientWidth + 1) R.info.push({ kind: 'kpi-truncated', detail: `[${cardTitle(cd)}] "${x.innerText.trim().slice(0, 50)}" truncated (${x.scrollWidth}/${x.clientWidth})` }); });
    }
  });
  // clipped text: overflow hidden w/o ellipsis, content larger than box (inside page)
  let c = 0;
  document.querySelectorAll('#page *').forEach((el) => {
    if (c > 5 || !vis(el) || el.closest('svg') || el.clientWidth <= 2 || el.closest('.sr-only')) return;
    const cs = getComputedStyle(el);
    if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2 && el.children.length < 40 && !el.closest('.k-sp')) {
      if (el.matches('.ph,.thumb,.sk-kpi,.k-sp,.cd,.chart,.cht,svg,.ops-map') ) return; /* decorative placeholders clip by design */
      c++; R.issues.push({ kind: 'clipped', detail: `${desc(el)} content ${el.scrollWidth}px clipped to ${el.clientWidth}px` });
    }
  });
  // tables that need horizontal scrolling hide their row actions at the end side
  document.querySelectorAll('#page .tbl-wrap').forEach((w) => { if (vis(w) && w.scrollWidth > w.clientWidth + 2) R.issues.push({ kind: 'table-scroll', detail: `[${cardTitle(w.closest('.cd') || w)}] table ${w.scrollWidth}px in ${w.clientWidth}px (row actions scrolled out of view)` }); });
  // data-go targets & hash links
  const gos = new Set();
  document.querySelectorAll('[data-go]').forEach((x) => gos.add(x.getAttribute('data-go')));
  document.querySelectorAll('a[href^="#"]').forEach((a) => { const h = a.getAttribute('href').slice(1); if (h) gos.add(h.replace(/-(ar|en)$/, '')); });
  R.links = [...gos];
  R.badLinks = [...gos].filter((g) => !App.routes[g]);
  R.missing = I18N.missing();
  R.calls = [...new Set(window.__qa.calls)];
  R.route = App.state.route; R.title = (document.querySelector('.top h1') || document.querySelector('h2') || {}).innerText || document.title;
  return R;
}
"""


def combos(quick):
    if '--w1280' in sys.argv:
        return [(l, th, 1280) for l in ('en', 'ar') for th in ('dark',)]
    if quick:
        return [('en', 'dark', 1440), ('ar', 'dark', 1280)]
    return [(l, th, w) for w in (1440, 1280) for l in ('en', 'ar') for th in ('dark', 'light')]


def main():
    quick = '--quick' in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    t0 = time.time()
    results = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for lang, theme, width in combos(quick):
            ctx, page = boot(b, width, lang, theme)
            if '--all-markets' in sys.argv:  # (v1.3) UAE + KSA enabled: multi-currency 'All markets', switcher with 3 markets
                page.evaluate("async () => { for (const c of ['AE', 'SA']) await api('PATCH', '/admin/settings/markets/' + c, { enabled: true }); await Markets.load(); }")
            routes = page.evaluate('Object.keys(App.routes)')
            samples = sample_params(page)
            jobs = []
            for r in routes:
                if only and r not in only:
                    continue
                jobs.append((r, samples.get(r, {})))
                for v in VARIANTS.get(r, []):
                    jobs.append((r, v))
                if r in samples and r not in ('m-create-product',):
                    jobs.append((r, {}))  # "new" mode / no-id mode as well
            for r, params in jobs:
                page.qa_console.clear()
                try:
                    goto(page, r, params)
                    res = page.evaluate(CHECK_JS)
                except Exception as e:  # noqa
                    res = {'issues': [{'kind': 'crawler', 'detail': str(e)[:300]}], 'info': [], 'links': [], 'badLinks': [], 'missing': [], 'calls': []}
                res['errors'] = list(page.qa_console)
                res.update(route=r, params=params, lang=lang, theme=theme, width=width)
                if lang == 'en':
                    res['missing'] = []  # missing() is meaningful in AR only
                results.append(res)
                bad = res['issues'] or res['errors'] or res['badLinks'] or res['missing']
                print(f"{'FAIL' if bad else 'ok  '} {lang}/{theme}/{width} {r} {json.dumps(params) if params else ''}"
                      + (f" issues={len(res['issues'])} errors={len(res['errors'])} bad={res['badLinks']} missing={res['missing'][:6]}" if bad else ''), flush=True)
            ctx.close()
        b.close()
    save(('render-allmarkets.json' if '--all-markets' in sys.argv else 'render.json') if not only else 'render-partial.json', results)
    fails = [r for r in results if r['issues'] or r['errors'] or r['badLinks'] or r['missing']]
    print(f"\n{len(results)} renders, {len(fails)} with findings, {time.time() - t0:.0f}s")


if __name__ == '__main__':
    main()
