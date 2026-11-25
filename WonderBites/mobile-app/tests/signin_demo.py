import asyncio,re
from playwright.async_api import async_playwright
B='http://127.0.0.1:8099'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg=await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)[:150]))
        async def tap(t):
            await pg.get_by_text(t,exact=True).locator('visible=true').last.click(); await pg.wait_for_timeout(1800); print(' ',t,'->',pg.url.replace(B,''))
        await pg.goto(B+'/signup'); await pg.wait_for_timeout(2500)
        await pg.locator('input').first.fill('')
        print('signup, all empty'); await tap('Continue'); await tap('Get code'); 
        await tap('Verify & continue')
        for t in ['Create account']:
            if await pg.get_by_text(t,exact=True).locator('visible=true').count(): await tap(t); break
        print(' end:',pg.url.replace(B,''))
        await pg.goto(B+'/login'); await pg.wait_for_timeout(2500)
        print('login, empty'); await tap('Log in')
        print('errors:',errs)
        await b.close()
asyncio.run(main())
