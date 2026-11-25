# Search map checks (web preview build): stamps resize with the zoom, landmarks only while
# zoomed out, the cream & rose colours at any hour. Run against the exported web build on port 8099.
import asyncio
from playwright.async_api import async_playwright
URL='http://127.0.0.1:8099/search'
async def main():
    ok=0; n=0
    def check(name,cond,info=''):
        nonlocal ok,n; n+=1; ok+=bool(cond); print('PASS' if cond else 'FAIL',name,info)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        for when,night in [('2026-11-20T10:00:00+03:00',False),('2026-11-20T20:00:00+03:00',True)]:
            ctx=await b.new_context(viewport={'width':390,'height':844}); pg=await ctx.new_page()
            errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
            await pg.clock.install(time=when)
            await pg.goto(URL); await pg.wait_for_timeout(3500)
            stamp=pg.get_by_role('button',name='Karak & Co, 60% off',exact=False).first
            size=lambda: stamp.bounding_box()
            lm=lambda: pg.get_by_text('Museum of Islamic Art',exact=True).count()
            fills=await pg.evaluate("()=>[...document.querySelectorAll('rect')].map(r=>r.getAttribute('fill'))")
            check(f'cream & rose colours ({"night" if night else "day"})', '#F9DDE6' in fills and '#1A0918' not in fills)
            bb=await size(); await pg.mouse.move(195,420)
            await pg.mouse.wheel(120,160); await pg.wait_for_timeout(400)
            bb2=await size()
            check('two-finger scroll moves the map', abs(bb2['x']-bb['x'])>40 and abs(bb2['y']-bb['y'])>40, f"{bb['x']:.0f},{bb['y']:.0f} -> {bb2['x']:.0f},{bb2['y']:.0f}")
            await pg.mouse.wheel(-120,-160); await pg.wait_for_timeout(400)
            reg=(await size())['width']
            check('landmarks shown at normal zoom', await lm()>0)
            bb=await size(); await pg.mouse.move(bb['x']+bb['width']/2,bb['y']+bb['height']/2)
            await pg.keyboard.down('Control')
            for _ in range(8): await pg.mouse.wheel(0,-200); await pg.wait_for_timeout(60)
            await pg.keyboard.up('Control')
            await pg.wait_for_timeout(900)
            big=(await size())['width']
            check('bigger stamps zoomed in', big>reg+10, f'{reg:.0f} -> {big:.0f}')
            check('landmarks hidden zoomed in', await lm()==0)
            for _ in range(6): await pg.get_by_role('button',name='Zoom out').click(); await pg.wait_for_timeout(80)
            await pg.wait_for_timeout(900)
            small=(await size())['width']
            check('smaller stamps zoomed out', small<reg-10, f'{reg:.0f} -> {small:.0f}')
            check('landmarks back zoomed out', await lm()>0)
            check('no errors', not errs, errs[:2])
            await ctx.close()
        await b.close()
    print(f'{ok}/{n} passed')
asyncio.run(main())
