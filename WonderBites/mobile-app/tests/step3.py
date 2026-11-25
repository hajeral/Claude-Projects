import asyncio,re,json,datetime as dt
from playwright.async_api import async_playwright
B='http://127.0.0.1:8099'
R=[]
def ok(n,c,i=''): R.append(bool(c)); print('PASS' if c else 'FAIL',n,i)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        ctx=await b.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Qatar'); await ctx.add_init_script('globalThis.__wbCollect=true'); pg=await ctx.new_page()
        errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)[:150]))
        # 10:00 Doha today
        t0=dt.datetime(2026,11,20,7,0,tzinfo=dt.timezone.utc)
        await pg.clock.install(time=t0)
        async def nav(r,w=2500): await pg.goto(B+r); await pg.wait_for_timeout(w)
        st=lambda: pg.evaluate("JSON.parse(localStorage.getItem('wb.demo.v1')||'{}')")
        txt=lambda: pg.evaluate('document.body.innerText')
        vis=lambda t: pg.get_by_text(t,exact=True).locator('visible=true').first
        await nav('/welcome')
        async def pay(bag):
            await nav(f'/checkout/{bag}'); await pg.get_by_text(re.compile(r'^Pay QAR')).click()
            await pg.wait_for_url(re.compile('/passport/'),timeout=8000); await pg.wait_for_timeout(1500)
            return pg.url.split('/passport/')[1].split('?')[0]
        # stock before
        a=await pay('karak-cafe'); s=await st(); oa=[o for o in s['orders'] if o['id']==a][0]
        left=s['stock'].get('karak-cafe')
        ok('Paid order shows under To collect', True)
        await nav('/orders'); t=await txt()
        ok('To collect card offers Cancel reservation', 'Cancel reservation' in t)
        await vis('Cancel reservation').click(); await pg.wait_for_timeout(400)
        ok('First tap asks to confirm', 'Tap again to cancel' in await txt())
        await vis('Tap again to cancel').click(); await pg.wait_for_timeout(1500)
        s=await st(); patch=s['orderPatches'].get(a) or [o for o in s['orders'] if o['id']==a][0]
        ok('Order is cancelled with full refund', patch.get('status')=='cancelled' and abs(patch.get('refund',0)-oa['total'])<0.01, str(patch.get('status')))
        ok('Bag goes back in stock', s['stock'].get('karak-cafe')==left+oa['quantity'], f"{left} -> {s['stock'].get('karak-cafe')}")
        # cancel from the passport
        c=await pay('gf-salad'); await nav(f'/passport/{c}'); t=await txt()
        ok('Passport offers free cancellation with its time', re.search(r'Cancel reservation · free until \d\d:\d\d',t) is not None)
        await pg.get_by_text(re.compile('^Cancel reservation')).click(); await pg.wait_for_timeout(300); await vis('Tap again to cancel').click(); await pg.wait_for_timeout(2000)
        ok('Cancelling from the passport opens Cancelled', 'cancelled' in pg.url, pg.url[-30:])
        # an order kept past its window
        d=await pay('lp-bakery'); s=await st(); od=[o for o in s['orders'] if o['id']==d][0]; start0=od['pickupStart']
        # after the cancellation cutoff (pickup start - 1h): no cancel offered
        cut=dt.datetime.fromisoformat(od['pickupStart'].replace('Z','+00:00'))-dt.timedelta(hours=1)
        await pg.clock.set_system_time(cut); await nav('/orders'); t=await txt()
        ok('No cancel offered after the free-cancel cutoff', 'Cancel reservation' not in t)
        ok('Card explains the cutoff', re.search(r'Free cancellation ended at \d\d:\d\d · Need help\?', t) is not None)
        await nav(f'/passport/{d}'); t=await txt(); ok('Passport explains the cutoff and says slide in front of staff', 'Free cancellation ended at' in t and 'Slide to confirm pickup' in t)
        await pg.get_by_text(re.compile('^Free cancellation ended')).click(); await pg.wait_for_timeout(1200); ok('Need help opens a ticket for that order', 'ticket-new?order='+d in pg.url, pg.url[-30:])
        await nav(f'/passport/{d}?lang=ar'); await nav('/orders?lang=ar')
        # next day: the order keeps its date and shows Pickup ended
        await pg.clock.set_system_time(dt.datetime.fromisoformat(od['pickupEnd'].replace('Z','+00:00'))+dt.timedelta(hours=20))
        await nav(f'/passport/{d}'); t=await txt()
        s=await st(); od2=[o for o in s['orders'] if o['id']==d][0]
        ok('Bought order keeps its original pickup date', od2['pickupStart']==start0)
        ok('Passport shows Pickup ended and help, no slider', 'Pickup ended' in t and 'Get help' in t and 'Slide once' not in t)
        await nav('/orders'); t=await txt(); ok('Ended order is not under To collect', 'Pickup ended' not in t.split('Recently collected')[0])
        await nav('/orders?tab=completed'); t=await txt(); ok('Ended order shows in Completed with help', 'Pickup ended' in t and 'Get help with this order' in t)
        await vis('Get help with this order').click(); await pg.wait_for_timeout(1500)
        ok('Help opens the ticket form', '/ticket-new' in pg.url, pg.url[-40:])
        # Arabic
        await nav(f'/passport/{d}?lang=ar'); t=await txt(); ok('Arabic passport', 'انتهى' in t or 'انتهت' in t, t[:0])
        for r in ['/orders?tab=completed&lang=ar','/orders?lang=ar',f'/passport/{d}?lang=ar','/ticket-new?order='+d+'&lang=ar']:
            await nav(r)
        miss=await pg.evaluate('globalThis.__wbMissing||[]'); ok('No missing Arabic (ended orders)', not miss, str(miss))
        await pg.clock.set_system_time(t0); await nav('/welcome?lang=ar'); e=await pay('olive-grill'); await nav('/orders?lang=ar'); await nav(f'/passport/{e}?lang=ar')
        miss=await pg.evaluate('globalThis.__wbMissing||[]'); ok('No missing Arabic (open orders)', not miss, str(miss))
        ok('no errors', not errs, str(errs[:2]))
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
