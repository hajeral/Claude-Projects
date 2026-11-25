from playwright.sync_api import sync_playwright
import sys
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1440,'height':1000})
    pg.goto('file:///home/claude/wb/app/docs/api.html'); pg.wait_for_timeout(1500)
    print('scrollW', pg.evaluate('document.documentElement.scrollWidth'))
    for i,a in enumerate(sys.argv[1:]):
        pg.evaluate(f"document.getElementById('{a}').scrollIntoView()")
        if a.startswith('op-'): pg.evaluate(f"document.querySelectorAll('#{a} details').forEach(d=>d.open=true)")
        pg.wait_for_timeout(300); pg.screenshot(path=f'/tmp/shot{i}.png')
    b.close()
