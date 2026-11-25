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
        t0=dt.datetime(2026,11,20,7,0,tzinfo=dt.timezone.utc); await pg.clock.install(time=t0)
        async def nav(r,w=2500): await pg.goto(B+r); await pg.wait_for_timeout(w)
        st=lambda: pg.evaluate("JSON.parse(localStorage.getItem('wb.demo.v1')||'{}')")
        txt=lambda: pg.evaluate('document.body.innerText')
        vis=lambda t: pg.get_by_text(t,exact=True).locator('visible=true').first
        total=lambda t: float(re.search(r'Pay QAR ?([\d.]+)',t).group(1))
        await nav('/welcome')
        # ---- delivery shown only where offered
        await nav('/store/olive-grill'); t=await txt(); ok('Shop that delivers shows its delivery label', 'Delivery · QAR 12' in t)
        await nav('/store/lp-bakery'); t=await txt(); ok('Shop without delivery shows no label', 'Delivery ·' not in t)
        await nav('/checkout/lp-bakery'); t=await txt(); ok('No delivery choice for a shop that doesn’t deliver', 'Pickup or delivery' not in t)
        # ---- checkout with delivery
        await nav('/checkout/olive-grill'); t=await txt(); base=total(t); ok('Delivery choice appears for a delivering shop', 'Pickup or delivery' in t)
        await vis('Delivery').click(); await pg.wait_for_timeout(600); t=await txt()
        ok('Delivery adds the QAR 12 fee to the total', abs(total(t)-(base+12))<0.01, f'{base} -> {total(t)}')
        ok('Delivery fee row and address chips', 'Delivery fee' in t and 'Deliver to' in t and 'Home · Msheireb' in t)
        await vis('Work · West Bay').click(); await pg.wait_for_timeout(300)
        # free delivery voucher offered only with delivery
        ok('Checkout suggests a voucher (expiring one first)', 'Use it now?' in t or 'Use your' in t)
        await nav('/vouchers?select=1&bagId=olive-grill&qty=1&how=delivery'); t=await txt(); ok('Free delivery voucher applies to a delivery order', 'Saves QAR 12.00 on this order' in t)
        await nav('/vouchers?select=1&bagId=olive-grill&qty=1&how=pickup'); t=await txt(); ok('…but not to a pickup order', 'Delivery orders only' in t)
        await nav('/checkout/olive-grill'); await vis('Delivery').click(); await pg.wait_for_timeout(500); await vis('Work · West Bay').click(); await pg.wait_for_timeout(300)
        await pg.get_by_text(re.compile(r'^Pay QAR')).click(); await pg.wait_for_url(re.compile('/passport/'),timeout=8000); await pg.wait_for_timeout(1500)
        oid=pg.url.split('/passport/')[1]; s=await st(); o=[x for x in s['orders'] if x['id']==oid][0]
        ok('Order saved as delivery with address and fee', o.get('fulfilment')=='delivery' and o.get('deliveryFee')==12 and o['deliverTo']['label']=='Work', str({k:o.get(k) for k in ('fulfilment','deliveryFee')}))
        t=await txt()
        ok('Same passport: delivery wording, QR + PIN, delivery slider', 'Your delivery' in t and 'Delivery to Work · West Bay' in t and 'Slide to confirm delivery received' in t and 'tell them your PIN' in t and 'Directions' not in t)
        # ---- window passes: not auto-completed, slider and help stay
        await pg.clock.set_system_time(dt.datetime.fromisoformat(o['pickupEnd'].replace('Z','+00:00'))+dt.timedelta(hours=30))
        await nav(f'/passport/{oid}'); t=await txt(); s=await st(); o2=[x for x in s['orders'] if x['id']==oid][0]
        ok('Delivery is NOT auto-completed after its window', o2['status']=='paid')
        ok('Slider and help still offered after the window', 'Slide to confirm delivery received' in t and 'Didn’t arrive? Get help' in t and 'Delivery window ended' in t)
        await nav('/orders'); t=await txt(); ok('Unconfirmed delivery stays under To collect with confirm + help', 'Confirm delivery received' in t and 'Didn’t arrive? Get help' in t)
        # ---- customer slides → Delivered, with time and method recorded
        await nav(f'/passport/{oid}')
        el=pg.get_by_text('Slide to confirm delivery received').first; await el.scroll_into_view_if_needed(); await pg.wait_for_timeout(500)
        bx=await el.bounding_box(); y=bx['y']+bx['height']/2
        await pg.mouse.move(40,y); await pg.mouse.down()
        for x in range(40,380,20): await pg.mouse.move(x,y); await pg.wait_for_timeout(15)
        await pg.mouse.up(); await pg.wait_for_timeout(3000)
        s=await st(); p3=s['orderPatches'].get(oid) or [x for x in s['orders'] if x['id']==oid][0]
        o3=[x for x in s['orders'] if x['id']==oid][0]; o3.update(s['orderPatches'].get(oid,{}))
        ok('Slide marks the order Delivered', o3['status']=='delivered', o3['status'])
        ok('Confirmation time, who and method recorded', bool(o3.get('confirmedAt')) and o3.get('confirmedBy')=='customer' and o3.get('confirmMethod')=='slider')
        t=await txt(); ok('Completed screen says Delivered', 'Delivered.' in t, pg.url[-25:])
        await nav('/orders?tab=completed'); t=await txt(); ok('Shows as Delivered in Completed', 'Delivered' in t)
        # ---- pickup unchanged
        await pg.clock.set_system_time(t0); await nav('/checkout/olive-grill'); t=await txt()
        await pg.get_by_text(re.compile(r'^Pay QAR')).click(); await pg.wait_for_url(re.compile('/passport/'),timeout=8000); await pg.wait_for_timeout(1500)
        t=await txt(); ok('Pickup still default and unchanged', 'Pickup passport' in t and 'Slide to confirm pickup' in t and 'Directions' in t)
        # ---- filters
        await nav('/refine'); await vis('Delivery available').click(); await pg.wait_for_timeout(500); t=await txt(); ok('Delivery filter narrows the count', re.search(r'Show (\d) bags?',t) is not None, re.search(r'Show \d+ bags?',t).group(0) if re.search(r'Show \d+ bags?',t) else '')
        await nav('/home',3000); el=vis('Delivery'); await el.scroll_into_view_if_needed(); await el.click(); await pg.wait_for_timeout(700); t=await txt()
        shops=[x for x in ['Mama','Olive','Corniche','La Patisserie','Karak','Green Fork','Bloom'] if x in t]; ok('Home Delivery chip shows only delivering shops', set(shops)<= {'Mama','Olive','Corniche'} and shops, str(shops))
        # ---- vouchers: New tag, bell, checkout offer, welcome
        # fresh alert state (as a customer who hasn't opened Vouchers yet)
        await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('wb.demo.v1'));s.seenVouchers=['v1','v2','v3'];s.bellSeen=['v1:new','v2:new','v3:new'];localStorage.setItem('wb.demo.v1',JSON.stringify(s))})()")
        await nav('/account'); t=await txt(); ok('Account shows New on vouchers (gift voucher)', 'New' in t)
        await nav('/home',3000); dot=await pg.evaluate("[...document.querySelectorAll('[aria-label=Alerts]')].length")
        await pg.get_by_label('Alerts').click(); await pg.wait_for_timeout(1500); t=await txt()
        ok('Bell shows a voucher message and opens Vouchers', '/vouchers' in pg.url and ('expires' in t or 'New voucher' in t or 'gift' in t.lower()), pg.url[-12:])
        ok('Vouchers shows New tag on the gift voucher', 'New' in t); await pg.wait_for_timeout(1500)
        await nav('/account'); t=await txt(); ok('After visiting Vouchers, New is gone', '\nNew\n' not in t)
        await nav('/checkout/lp-bakery'); t=await txt(); ok('Checkout offers the expiring voucher first', 'expires in' in t and 'Use it now?' in t)
        b0=total(t); await vis('Use').click(); await pg.wait_for_timeout(600); t=await txt(); ok('Use applies it and lowers the total', total(t)<b0, f'{b0} -> {total(t)}')
        # welcome gift via sign-up
        await nav('/your-name'); await vis('Create account').click(); await pg.wait_for_timeout(2500); t=await txt()
        ok('Welcome screen has no voucher pill', 'voucher is in your' not in t)
        s=await st(); ok('Welcome voucher added to Vouchers', any(v.get('tag')=='welcome' for v in s.get('addedVouchers',[])))
        await nav('/checkout/hotel-buffet'); await pg.get_by_label('Remove voucher').click(); await pg.wait_for_timeout(500); t=await txt(); ok('Checkout offers the welcome gift', 'welcome gift' in t or 'expires' in t)
        await nav('/vouchers'); t=await txt(); ok('Welcome voucher tagged New', 'New' in t)
        # Arabic
        for r in ['/checkout/olive-grill?lang=ar','/vouchers?lang=ar','/account?lang=ar','/refine?lang=ar','/home?lang=ar',f'/passport/{oid}?lang=ar',f'/completed/{oid}?lang=ar']: await nav(r)
        miss=await pg.evaluate('globalThis.__wbMissing||[]'); ok('No missing Arabic', not miss, str(miss)[:300])
        ok('no errors', not errs, str(errs[:2]))
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
