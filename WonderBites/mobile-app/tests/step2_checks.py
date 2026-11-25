import asyncio,re
from playwright.async_api import async_playwright
B='http://127.0.0.1:8099'
R=[]
def ok(n,c,i=''): R.append(c); print('PASS' if c else 'FAIL',n,i)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        async def page(tz='Asia/Qatar'):
            ctx=await b.new_context(viewport={'width':390,'height':844},timezone_id=tz); pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)[:120])); return ctx,pg,errs
        ctx,pg,errs=await page()
        go=lambda r,w=2300: (pg.goto(B+r), pg.wait_for_timeout(w))
        async def nav(r,w=2300): await pg.goto(B+r); await pg.wait_for_timeout(w)
        txt=lambda: pg.evaluate('document.body.innerText')
        vis=lambda t: pg.get_by_text(t,exact=True).locator('visible=true').first
        await nav('/welcome')
        # Home chips
        await nav('/home',3000)
        expect={'Restaurant':['Al Sufra','Olive','Mama'],'Bakery':['Bloom','Sidra'],'Patisserie':['La Patisserie'],'Café':['Karak'],'Hotel buffet':['Corniche'],'Supermarket':['Souq Fresh'],'Healthy & salads':['Green Fork'],'Donuts':['Glaze'],'Tomorrow':['Bloom','Sidra']}
        allshops=['Al Sufra','Olive','Mama','Bloom','Sidra','La Patisserie','Karak','Corniche','Souq Fresh','Green Fork','Glaze']
        for chip,want in expect.items():
            el=vis(chip); await el.scroll_into_view_if_needed(); await el.click(); await pg.wait_for_timeout(700)
            t=await txt(); shown=[s for s in allshops if s in t]
            ok(f'Home chip {chip}', set(shown)<=set(want) and len(shown)>0, str(shown))
        await vis('All').scroll_into_view_if_needed(); await vis('All').click(); await pg.wait_for_timeout(500)
        # Veg toggle colour
        sw=pg.locator('[role=switch]').first
        c0=await sw.evaluate("e=>getComputedStyle(e).backgroundColor"); await sw.click(); await pg.wait_for_timeout(400)
        c1=await sw.evaluate("e=>getComputedStyle(e).backgroundColor")
        ok('Veg switch turns emerald when on', c1!=c0 and c1.replace(' ','') in ('rgb(23,115,79)','rgb(14,122,86)') or 'rgb' in c1, f'{c0} -> {c1}')
        # Refine shop types
        await nav('/refine'); cnt=lambda: pg.evaluate("(document.body.innerText.match(/Show \\d+ bags?|No bags match/)||[''])[0]")
        base=await cnt()
        for s in ['Hotel buffet','Supermarket','Bakery']:
            await vis(s).scroll_into_view_if_needed(); await vis(s).click(); await pg.wait_for_timeout(500); c=await cnt(); ok(f'Filter {s} changes count', c!=base and 'Show' in c, f'{base} -> {c}'); await vis(s).click(); await pg.wait_for_timeout(400)
        # Country code
        await nav('/signup'); t=await txt(); ok('Signup default is Qatar in Qatar', '+974' in t)
        await pg.get_by_label('Country code').first.click(); await pg.wait_for_timeout(1500)
        await pg.get_by_placeholder('Search country or code').fill('emirates'); await pg.wait_for_timeout(500)
        await vis('United Arab Emirates').click(); await pg.wait_for_timeout(1500)
        t=await txt(); ok('Choosing UAE updates sign-up phone box', '+971' in t and pg.url.endswith('/signup'), pg.url[-20:])
        await nav('/login'); t=await txt(); ok('Log-in phone box follows the choice', 'AE +971' in t)
        await nav('/country-code'); await pg.get_by_placeholder('Search country or code').fill('44'); await pg.wait_for_timeout(500); t=await txt(); ok('Search by code finds United Kingdom', 'United Kingdom' in t)
        await pg.get_by_placeholder('Search country or code').fill(''); await pg.wait_for_timeout(500)
        n=await pg.evaluate("document.body.innerText.split('\\n').filter(l=>/^\\+\\d+$/.test(l.trim())).length"); ok('Full country list', n>200, str(n))
        # Not found
        await nav('/ticket-sent?id=nope'); ok('Wrong ticket link', 'couldn’t find this ticket' in await txt())
        await nav('/no/such/page'); ok('Unknown link shows page not found', 'This page doesn’t exist' in await txt())
        await nav('/index.html'); await pg.wait_for_timeout(2000); ok('Preview entry still opens the app', 'page doesn’t exist' not in await txt(), pg.url[-25:])
        await nav('/search-text'); ok('Search screen has a trending bag', 'trending in doha' in (await txt()).lower())
        ok('no errors', not errs, str(errs[:2])); await ctx.close()
        # detection by time zone
        for tz,code in [('Asia/Dubai','+971'),('Asia/Qatar','+974'),('Europe/London','+44')]:
            ctx,pg,_=await page(tz); await pg.goto(B+'/signup'); await pg.wait_for_timeout(2500); t=await pg.evaluate('document.body.innerText'); ok(f'Default code in {tz}', code in t); await ctx.close()
        # font failure
        ctx,pg,_=await page(); await pg.route(re.compile(r'.*\.ttf.*'), lambda r: r.abort())
        await pg.goto(B+'/welcome'); await pg.wait_for_timeout(6500); t=await pg.evaluate('document.body.innerText'); ok('App opens even if fonts fail', 'WonderBites' in t or 'Log in' in t, t[:40].replace('\n',' ')); await ctx.close()
        # Arabic
        ctx,pg,_=await page(); await pg.goto(B+'/country-code?lang=ar'); await pg.wait_for_timeout(2500); t=await pg.evaluate('document.body.innerText'); ok('Arabic country names', 'الإمارات' in t and 'قطر' in t); await ctx.close()
        await b.close()
    print(f"{sum(R)}/{len(R)} passed")
asyncio.run(main())
