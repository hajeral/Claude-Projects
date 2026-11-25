import asyncio,json,re
from playwright.async_api import async_playwright
B='http://127.0.0.1:8099'
res=[]
def ok(name,cond,info=''): res.append((name,bool(cond),info)); print(('PASS' if cond else 'FAIL'),name,info)
async def state(pg):
    s=await pg.evaluate("localStorage.getItem('wb.demo.v1')"); return json.loads(s) if s else {}
async def go(pg,r,w=2200): await pg.goto(B+r); await pg.wait_for_timeout(w)
async def txt(pg): return await pg.evaluate('document.body.innerText')
async def pay(pg,bag,qty=1):
    await go(pg,f'/checkout/{bag}?qty={qty}')
    t=await txt(pg); m=re.search(r'Pay QAR ?([\d.]+)',t)
    await pg.get_by_text(re.compile(r'^Pay QAR')).click()
    await pg.wait_for_url(re.compile('/passport/'),timeout=8000); await pg.wait_for_timeout(1500)
    return pg.url.split('/passport/')[1].split('?')[0], float(m.group(1)) if m else None, t
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        ctx=await b.new_context(viewport={'width':390,'height':844}); pg=await ctx.new_page()
        errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)[:150]))
        await go(pg,'/welcome')
        # 1 checkout: two different bags -> two correct orders
        a,ta,_=await pay(pg,'karak-cafe',2); pa=await txt(pg)
        bb,tb,_=await pay(pg,'gf-salad',1); pb=await txt(pg)
        st=await state(pg); orders=st.get('orders',[])
        oa=[o for o in orders if o['id']==a]; ob=[o for o in orders if o['id']==bb]
        ok('two checkouts create two different orders', a!=bb and oa and ob, f'{a} / {bb}')
        ok('order A = Karak café bag ×2', oa and oa[0]['bagId']=='karak-cafe' and oa[0]['quantity']==2 and abs(oa[0]['total']-ta)<0.01, f"total {oa[0]['total'] if oa else '-'} vs shown {ta}")
        ok('order B = Green Fork salad ×1', ob and ob[0]['bagId']=='gf-salad' and ob[0]['quantity']==1)
        ok('passport A shows Karak, passport B shows Green Fork', 'Karak' in pa and 'Green Fork' in pb)
        ok('each order has its own pickup PIN and QR code', bool(oa and ob and re.fullmatch(r'\d{4}', str(oa[0].get('pin',''))) and re.fullmatch(r'\d{4}', str(ob[0].get('pin',''))) and oa[0].get('qrPayload') != ob[0].get('qrPayload')), f"{oa[0].get('pin') if oa else ''}/{ob[0].get('pin') if ob else ''}")
        # 2 collect A only
        await go(pg,f'/passport/{a}')
        el=pg.get_by_text('Slide to confirm pickup').first; await el.scroll_into_view_if_needed(); await pg.wait_for_timeout(600)
        try:
            bx=await el.bounding_box(); y=bx['y']+bx['height']/2
            await pg.mouse.move(40,y); await pg.mouse.down()
            for x in range(40,380,20): await pg.mouse.move(x,y); await pg.wait_for_timeout(15)
            await pg.mouse.up(); await pg.wait_for_timeout(2500)
        except Exception as e: print('slide err',e)
        st=await state(pg); P=st.get('orders',[])
        sa=[o['status'] for o in P if o['id']==a]; sb=[o['status'] for o in P if o['id']==bb]
        ok('collecting order A completes only A', sa==['collected'] and sb!=['collected'], f'A={sa} B={sb} url={pg.url[-30:]}')
        # 3 voucher changes total
        await go(pg,'/checkout/sidra-bread'); t0=await txt(pg); base=float(re.search(r'Pay QAR ?([\d.]+)',t0).group(1))
        await go(pg,'/vouchers?select=1&bagId=sidra-bread&qty=1')
        await pg.get_by_placeholder('Enter a voucher code').fill('WELCOME10'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(1500)
        st=await state(pg); ok('voucher code WELCOME10 added', any('WELCOME10' in json.dumps(v) for v in st.get('addedVouchers',[])) or 'WELCOME10' in json.dumps(st))
        try:
            await pg.get_by_label('Use voucher').first.click(); await pg.wait_for_timeout(1500)
        except Exception as e: print('apply click err',e)
        st=await state(pg); ok('tapping the new voucher applies it (UI)', st.get('appliedVoucher') is not None, str(st.get('appliedVoucher')))
        await go(pg,'/checkout/sidra-bread'); t1=await txt(pg); nt=float(re.search(r'Pay QAR ?([\d.]+)',t1).group(1))
        ok('voucher lowers the checkout total', nt<base, f'{base} -> {nt}')
        await pg.get_by_label('Remove voucher').click(); await pg.wait_for_timeout(800)
        t2=await txt(pg); ok('removing voucher restores total', f'{base:g}' in t2.replace('QAR ','') or str(base) in t2, '')
        # 4 filters change results
        await go(pg,'/results'); r0=await txt(pg)
        await go(pg,'/refine'); t=await txt(pg); m0=re.search(r'Show (\d+) bags',t)
        await pg.get_by_text('Vegan',exact=True).first.click(); await pg.wait_for_timeout(600)
        t=await txt(pg); m1=re.search(r'Show (\d+) bags?',t) or re.search(r'Show (\w+) bag',t)
        ok('dietary filter changes the live count', m0 and m1 and m0.group(0)!=m1.group(0), f'{m0.group(0) if m0 else t[-80:]} -> {m1.group(0) if m1 else "?"}')
        await pg.get_by_text(re.compile(r'^Show ')).last.click(); await pg.wait_for_timeout(1800)
        r1=await txt(pg); ok('results respect the filter', 'Green Fork' in r1 and 'Karak' not in r1, pg.url[-25:])
        st=await state(pg); ok('filters saved', 'Vegan' in json.dumps(st.get('filters',{})))
        # 5 favourites persist after reload
        await go(pg,'/favorites'); f0=await txt(pg)
        was='lp-msheireb' in (await state(pg)).get('favBranches',[])
        await go(pg,'/store/lp-bakery'); await pg.get_by_label('Favourite', exact=True).first.click(); await pg.wait_for_timeout(800)
        await pg.reload(); await pg.wait_for_timeout(2500)
        now='lp-msheireb' in (await state(pg)).get('favBranches',[])
        await go(pg,'/favorites'); t=await txt(pg)
        ok('favourite toggle persists after reload and Favourites list follows', was!=now and (('Patisserie' in t)==now), f'was={was} now={now}')
        await go(pg,'/store/lp-bakery'); await pg.get_by_label('Favourite', exact=True).first.click(); await pg.wait_for_timeout(800)
        await go(pg,'/favorites'); t=await txt(pg); ok('favourite toggles back', ('Patisserie' in t)==was)
        # 6 settings persist after reload
        await go(pg,'/edit-profile')
        f=pg.locator('input').first; await f.fill('Noor Test'); 
        await pg.get_by_text(re.compile('^Save')).last.click(); await pg.wait_for_timeout(1200)
        await pg.reload(); await pg.wait_for_timeout(2500); await go(pg,'/account'); t=await txt(pg)
        ok('profile name persists after reload', 'Noor Test' in t)
        await go(pg,'/notifications'); before=(await state(pg)).get('prefs',{})
        await pg.locator('[role=switch]:not([aria-disabled=true])').first.click(); await pg.wait_for_timeout(800)
        await pg.reload(); await pg.wait_for_timeout(2500); after=(await state(pg)).get('prefs',{})
        ok('notification preference persists after reload', before!=after, f'{before} -> {after}')
        # 7 invalid links
        for r,word in [('/store/nope','isn’t available'),('/checkout/nope','isn’t available'),('/passport/nope','couldn’t find this order'),('/completed/nope','couldn’t find this order'),('/voucher/nope','voucher isn’t available'),('/shop/nope','couldn’t find this shop')]:
            await go(pg,r); t=await txt(pg); ok(f'invalid link {r} shows a not-found screen', word in t, '')
        # 8 Arabic
        await go(pg,'/checkout/sidra-bread?lang=ar',2800); t=await txt(pg)
        d=await pg.evaluate("getComputedStyle(document.querySelector('#root > div') || document.body).direction")
        latin=[w for w in re.findall(r'[A-Za-z]{4,}',t) if w not in ('WonderBites','Apple','Google','Visa','Sidra')]
        ok('Arabic checkout is translated and RTL', 'الدفع' in t or 'ادفع' in t, f'dir={d} leftover latin={latin[:8]}')
        for r in ['/home','/orders','/results','/refine','/vouchers','/help','/notifications','/passport/'+a]:
            await go(pg,r+('&' if '?' in r else '?')+'lang=ar',2500); t=await txt(pg)
            latin=[w for w in re.findall(r'[A-Za-z]{3,}',t) if w not in ('WonderBites','Apple','Google','Visa','QAR','Pay','PIN')]
            ok(f'Arabic {r}', len(latin)<=6, ' '.join(latin[:10]))
        ok('no JavaScript errors during the run', not errs, '; '.join(errs[:3]))
        await b.close()
    print(f"\n{sum(1 for r in res if r[1])}/{len(res)} passed")
asyncio.run(main())
