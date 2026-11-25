import asyncio,sys
from playwright.async_api import async_playwright
async def main(routes):
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg=await (await b.new_context(viewport={'width':390,'height':844})).new_page()
        found={}
        for r in routes:
            await pg.goto('http://127.0.0.1:8099'+r); await pg.wait_for_timeout(1800)
            n=await pg.evaluate("""()=>[...document.querySelectorAll('button button, a a, button a, a button')].map(e=>{const o=e.parentElement.closest('button,a');return (o.getAttribute('aria-label')||o.innerText||'').slice(0,30).replace(/\\n/g,' ')+'  >  '+(e.getAttribute('aria-label')||e.innerText||'').slice(0,25).replace(/\\n/g,' ')})""")
            if n: found[r]=sorted(set(n))
        for r,v in found.items(): print(r, v[:4])
        print('screens with nesting:',len(found))
        await b.close()
asyncio.run(main(sys.argv[1:]))
