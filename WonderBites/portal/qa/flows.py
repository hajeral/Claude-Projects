"""End-to-end flow checks (EN night 1440, one fresh app per flow).

  python3 qa/flows.py            # all flows
  python3 qa/flows.py refund     # flows whose name contains "refund"
"""
import sys, json, time, traceback
from playwright.sync_api import sync_playwright
from lib import boot, goto, idle, save

LOG_CALLS = r"""
(() => { const q = window.__qa; q.log = []; const inner = window.api; const w = function (m, p, b) { q.log.push({ m: (m||'GET').toUpperCase(), p: String(p).split('?')[0], b: b || null }); return inner.apply(this, arguments); }; Object.assign(w, inner); window.api = w; })();
"""
FLOWS = []


def flow(name):
    def deco(fn):
        FLOWS.append((name, fn)); return fn
    return deco


class Fail(Exception):
    pass


def check(cond, msg):
    if not cond:
        raise Fail(msg)


def route(pg):
    return pg.evaluate('App.state.route')


def wait_route(pg, name, timeout=5000):
    t0 = time.time()
    while time.time() - t0 < timeout / 1000:
        if route(pg) == name:
            idle(pg); return True
        pg.wait_for_timeout(50)
    raise Fail(f'expected route {name}, got {route(pg)}')


def toast(pg):
    return pg.evaluate("[...document.querySelectorAll('.toasts .toast')].map(t => t.innerText.trim()).join(' | ')")


def overlay(pg):
    return pg.locator('.modal, .drawer, .pop').last


def calls(pg):
    return pg.evaluate('window.__qa.log || []')


def click_text(scope, text, exact=False):
    scope.get_by_text(text, exact=exact).first.click()


def logout_all(pg):
    pg.qa_env['relogin'] = False
    pg.evaluate("['admin','merchant'].forEach(p => { App.state.sessions[p] = null; localStorage.removeItem('wb.session.' + p); })")


# ------------------------------------------------------------------------------------------- auth
@flow('admin login → OTP → Command Center')
def f_admin_login(pg):
    logout_all(pg); goto(pg, 'admin-command-center')
    check(route(pg) == 'admin-login', 'guard did not redirect to admin-login (got %s)' % route(pg))
    pg.fill('input[name=email]', 'qa@wonderbites.ae'); pg.fill('input[name=password]', 'secret123')
    pg.click('form button[type=submit]'); wait_route(pg, 'otp')
    for i, d in enumerate('123456'):
        pg.fill(f'[data-d="{i}"]', d)
    wait_route(pg, 'admin-command-center')
    check(pg.evaluate('!!App.state.sessions.admin'), 'no admin session after OTP')
    check(pg.locator('#page .kpi').count() >= 4, 'Command Center KPIs not rendered')


@flow('admin login: wrong OTP 000000 shows error')
def f_bad_otp(pg):
    logout_all(pg); goto(pg, 'admin-login')
    pg.fill('input[name=email]', 'qa@wonderbites.ae'); pg.fill('input[name=password]', 'x'); pg.click('form button[type=submit]'); wait_route(pg, 'otp')
    for i in range(6): pg.fill(f'[data-d="{i}"]', '0')
    pg.wait_for_timeout(600); idle(pg)
    check(route(pg) == 'otp', 'wrong code was accepted')
    check(pg.locator('[data-err]:not([hidden])').count() == 1, 'no error message for wrong code')


@flow('FLOW-01 merchant sign-up → OTP → Pending verification → admin approves → merchant signs in')
def f_signup(pg):
    logout_all(pg); goto(pg, 'm-signup')
    pg.click('form button[type=submit]'); idle(pg)
    check(pg.locator('.fld.invalid').count() >= 5, 'empty sign-up did not show validation errors')
    vals = dict(businessName='QA Bakery', ownerFirstName='Qa', ownerLastName='Tester', email='qa.bakery@example.com', phone='55501234', password='Passw0rd!', confirm='Passw0rd!')
    for k, v in vals.items(): pg.fill(f'input[name={k}]', v)
    pg.select_option('select[name=category]', 'bakery'); pg.select_option('select[name=city]', 'doha')
    pg.check('input[name=acceptTerms]')
    pg.click('form button[type=submit]'); wait_route(pg, 'otp')
    for i, d in enumerate('246810'): pg.fill(f'[data-d="{i}"]', d)
    wait_route(pg, 'm-login')
    check(not pg.evaluate('!!App.state.sessions.merchant'), 'a pending merchant got a session')
    check('pending verification' in pg.inner_text('#app').lower(), 'login screen does not explain the pending verification')
    # the pending merchant can't sign in yet
    pg.fill('input[name=email]', 'qa.bakery@example.com'); pg.fill('input[name=password]', 'Passw0rd!'); pg.click('form button[type=submit]'); idle(pg)
    check(route(pg) == 'm-login' and 'pending verification' in pg.inner_text('[data-err]').lower(), 'pending merchant was not blocked at sign-in: ' + pg.inner_text('#app')[:200])
    # Admin → Merchants shows it as Pending verification; the admin approves it from the detail screen
    pg.evaluate("App.login('admin', App.DEMO.admin)")
    goto(pg, 'admin-merchants')
    check('QA Bakery' in pg.inner_text('#page'), 'new merchant not listed in Admin → Merchants')
    mid = pg.evaluate("async () => (await api('GET', '/admin/merchants', { q: 'QA Bakery' })).data[0]")
    check(mid and mid['status'] == 'pending', f'new merchant not pending: {mid}')
    goto(pg, 'admin-merchant-detail', {'id': mid['id']})
    pg.click('#page [data-mact="verify"]'); idle(pg)
    if pg.locator('.modal').count(): pg.locator('.modal .btn.primary').last.click(); idle(pg)
    st = pg.evaluate("async (id) => (await api('GET', '/admin/merchants/' + id)).data.status", mid['id'])
    check(st == 'verified', 'admin approval did not verify the merchant: ' + st)
    # now the merchant can sign in (as its own tenant)
    pg.evaluate("App.logout ? App.state.sessions.merchant = null : null; localStorage.removeItem('wb.session.merchant')")
    goto(pg, 'm-login'); pg.fill('input[name=email]', 'qa.bakery@example.com'); pg.fill('input[name=password]', 'Passw0rd!'); pg.click('form button[type=submit]')
    t0 = time.time()
    while time.time() - t0 < 5 and route(pg) == 'm-login': pg.wait_for_timeout(50)
    if route(pg) == 'otp':
        for i, d in enumerate('135790'): pg.fill(f'[data-d="{i}"]', d)
    t0 = time.time()
    while time.time() - t0 < 5 and route(pg) in ('m-login', 'otp'): pg.wait_for_timeout(50)
    check(pg.evaluate('!!App.state.sessions.merchant'), 'approved merchant could not sign in')
    check(pg.evaluate('WBStore.me()') == mid['id'], 'signed-in merchant is not the approved tenant')
    # rejected / suspended merchants cannot sign in
    for status in ('rejected', 'suspended'):
        r = pg.evaluate("async (st) => { const m = WBStore.merchants.find(x => x.status === st); try { await api('POST', '/auth/login', { portal: 'merchant', email: m.contact.email, password: 'x' }); return 'signed-in'; } catch (e) { return e.code; } }", status)
        check(r == 'account_' + status, f'{status} merchant sign-in not blocked ({r})')


@flow('forgot password → reset password → sign in')
def f_forgot(pg):
    logout_all(pg); goto(pg, 'm-login')
    pg.click('a[data-go="forgot-password"]'); wait_route(pg, 'forgot-password')
    pg.fill('input[name=email]', 'sara@figandbloom.ae'); pg.click('form button[type=submit]'); idle(pg)
    check('Check your email' in pg.inner_text('#page'), 'no confirmation after sending reset link')
    pg.get_by_text('Open reset link (demo)').click(); wait_route(pg, 'reset-password')
    pg.fill('input[name=password]', 'NewPassw0rd!'); pg.fill('input[name=confirm]', 'Mismatch1!'); pg.click('form button[type=submit]'); idle(pg)
    check(route(pg) == 'reset-password' and pg.locator('.fld.invalid').count() >= 1, 'mismatching passwords accepted')
    pg.fill('input[name=confirm]', 'NewPassw0rd!'); pg.click('form button[type=submit]'); wait_route(pg, 'm-login')
    check('Password updated' in toast(pg), 'no "Password updated" toast')


@flow('logout (profile menu → Log out → confirm → login)')
def f_logout(pg):
    goto(pg, 'admin-drops')
    pg.click('.top [data-ov="profile"]'); pg.locator('.pop [data-pm="logout"]').click(); idle(pg)
    check(pg.locator('.modal').count() == 1, 'no logout confirmation')
    pg.qa_env['relogin'] = False
    pg.locator('.modal .btn.danger').click(); wait_route(pg, 'admin-login')
    check(not pg.evaluate('App.state.sessions.admin'), 'admin session still present')
    goto(pg, 'admin-drops'); check(route(pg) == 'admin-login', 'guard let a logged-out user in')


# ------------------------------------------------------------------------------------------- shell
@flow('global search → result navigates')
def f_search(pg):
    goto(pg, 'admin-command-center')
    pg.keyboard.press('/'); idle(pg)
    check(pg.locator('.pop .gs').count() == 1, '"/" did not open search')
    pg.fill('.pop .gs input', 'Green'); pg.wait_for_timeout(350); idle(pg)
    res = pg.locator('.pop .res[data-route]')
    check(res.count() > 0, 'no search results for "Green"')
    target = res.first.get_attribute('data-route'); res.first.click(); wait_route(pg, target)


@flow('date-range calendar apply → KPIs refetch with from/to')
def f_daterange(pg):
    goto(pg, 'admin-command-center'); pg.evaluate(LOG_CALLS)
    pg.click('.top [data-ov="date"]'); pg.locator('.pop [data-preset="7d"]').click(); pg.locator('.pop [data-apply]').click(); idle(pg)
    dr = pg.evaluate('App.state.dateRange')
    T = pg.evaluate('api.DEMO_TODAY'); W7 = pg.evaluate('api.demoDate(-6)')
    check(dr['from'] == W7 and dr['to'] == T, f'date range not applied: {dr}')
    c = [x for x in calls(pg) if x['p'] == '/admin/dashboard']
    check(c and c[-1]['b'] and c[-1]['b'].get('from') == W7 and c[-1]['b'].get('to') == T, f'dashboard not refetched with from/to: {c[-1:]}')
    check(pg.evaluate("(d) => fmt.text.date(d, 'short')", W7) in pg.inner_text('.top [data-ov="date"]'), 'top-bar date label not updated')
    # custom range via two day clicks
    pg.click('.top [data-ov="date"]'); pg.locator(f'.pop [data-day="{T[:8]}01"]').click(); pg.locator(f'.pop [data-day="{T[:8]}10"]').click(); pg.locator('.pop [data-apply]').click(); idle(pg)
    dr = pg.evaluate('App.state.dateRange'); check(dr['from'] == T[:8] + '01' and dr['to'] == T[:8] + '10' and dr['preset'] == 'custom', f'custom range not applied: {dr}')
    goto(pg, 'm-orders'); pg.evaluate(LOG_CALLS); pg.click('.top [data-ov="date"]'); pg.locator('.pop [data-preset="today"]').click(); pg.locator('.pop [data-apply]').click(); idle(pg)
    c = [x for x in calls(pg) if x['p'].startswith('/merchant/orders')]
    check(c and c[-1]['b'].get('from') == T, f'merchant orders not refetched with from: {c[-1:]}')


@flow('notifications panel → deep link')
def f_notif(pg):
    goto(pg, 'admin-command-center')
    pg.click('.top [data-ov="notifications"]'); idle(pg)
    items = pg.locator('.pop [data-nid]')
    check(items.count() > 0, 'no notifications')
    n = None
    for i in range(items.count()):
        d = json.loads(items.nth(i).get_attribute('data-n'))
        if d.get('type') != 'export' and d.get('link'): n = (i, d); break
    check(n, 'no notification with a deep link')
    items.nth(n[0]).click(); wait_route(pg, n[1]['link']['route'])
    pg.keyboard.press('Escape'); pg.keyboard.press('Escape')  # the deep link may open a drawer on the target screen
    pg.click('.top [data-ov="notifications"]'); idle(pg); pg.locator('.pop [role=tab]', has_text='Unread').click(); idle(pg)
    pg.locator('.pop [data-readall]').click(); idle(pg)
    check(pg.evaluate('App.state.unread') == 0, 'mark all as read did not clear the badge')
    pg.locator('.pop a[data-go="admin-notifications"]').click(); wait_route(pg, 'admin-notifications')


@flow('profile menu → Profile settings (admin + merchant)')
def f_profile(pg):
    goto(pg, 'admin-drops'); pg.click('.top [data-ov="profile"]'); pg.locator('.pop [data-pm="profile"]').click(); wait_route(pg, 'admin-settings-profile')
    goto(pg, 'm-orders'); pg.click('.top [data-ov="profile"]'); pg.locator('.pop [data-pm="profile"]').click(); wait_route(pg, 'm-settings')
    check(pg.evaluate("App.paramsFor('m-settings').tab") == 'profile', 'merchant profile tab not selected')
    pg.click('.top [data-ov="profile"]'); pg.locator('.pop [data-name="theme"] button, .pop [data-seg="theme"] button, .pop .seg button').filter(has_text='Day').first.click(); idle(pg)
    check(pg.evaluate('App.state.theme') == 'light', 'theme switch from profile menu failed')


@flow('export dialog → toast → download in notifications')
def f_export(pg):
    goto(pg, 'admin-drops'); u0 = pg.evaluate('App.state.unread')
    pg.click('.top [data-ov="export"]'); idle(pg)
    check(pg.locator('.modal').count() == 1, 'export dialog did not open')
    pg.locator('.modal button', has_text='PDF').first.click()
    pg.locator('.modal .btn.primary').click(); idle(pg)
    check('Export started' in toast(pg), 'no export toast: ' + toast(pg))
    pg.wait_for_timeout(1800); idle(pg)
    check(pg.evaluate('App.state.unread') == u0 + 1, 'unread badge not incremented after export ready')
    pg.click('.top [data-ov="notifications"]'); idle(pg); pg.locator('.pop [role=tab]', has_text='Downloads').click(); idle(pg)
    it = pg.locator('.pop [data-nid]').first
    check(it.count() == 1, 'no download item in notifications')
    with pg.expect_download(timeout=4000) as dl:
        it.click()
    check(dl.value.suggested_filename.endswith('.csv'), 'download filename ' + dl.value.suggested_filename)


@flow('branch switcher → branch-scoped refetch')
def f_branch(pg):
    goto(pg, 'm-orders'); pg.evaluate(LOG_CALLS)
    pg.click('.top [data-ov="branch"]'); idle(pg)
    pg.locator('.pop [data-bid="BR-02"]').click(); idle(pg)
    check(pg.evaluate('App.state.branch.id') == 'BR-02', 'branch not switched')
    c = [x for x in calls(pg) if x['p'] == '/merchant/orders']
    check(c and c[-1]['b'].get('branchId') == 'BR-02', 'orders not refetched with branchId=BR-02')
    check('The Pearl' in pg.inner_text('.top [data-ov="branch"]'), 'top bar branch label not updated')
    pg.click('.top [data-ov="branch"]'); idle(pg); pg.locator('.pop [data-manage]').click(); wait_route(pg, 'm-branches')


@flow('Need Help drawer (ticket) + Help screen')
def f_help(pg):
    goto(pg, 'm-overview'); pg.click('.side [data-ov="help"]'); idle(pg)
    d = pg.locator('.drawer'); check(d.count() == 1, 'Need Help drawer did not open')
    check(d.locator('.faq details').count() > 0, 'FAQ not loaded in drawer')
    d.locator('.btn.primary').click(); idle(pg)
    check(d.locator('.fld.invalid').count() >= 2, 'empty ticket not validated')
    d.locator('input[name=subject]').fill('Payout question'); d.locator('select[name=category]').select_option('Payouts'); d.locator('textarea[name=message]').fill('When will the July payout arrive?')
    d.locator('.btn.primary').click(); idle(pg)
    check('created' in toast(pg), 'no ticket toast: ' + toast(pg))
    pg.click('.side [data-ov="help"]'); idle(pg); pg.locator('.drawer .ov-f .btn.secondary, .drawer .btn.secondary').filter(has_text='View my tickets').first.click(); wait_route(pg, 'm-help')
    check(pg.locator('#page form').count() >= 1, 'Help screen has no request form')


# ------------------------------------------------------------------------------------------- merchant
@flow('template banner → templates → Create from Template → prefilled product → save')
def f_template(pg):
    goto(pg, 'm-overview'); pg.locator('#page .banner .btn').click(); wait_route(pg, 'm-templates')
    pg.locator('#page [data-tpl] .btn.primary').first.click(); wait_route(pg, 'm-create-product')
    name = pg.input_value('#page input[name=name]'); price = pg.input_value('#page input[name=price]')
    check(name and price, f'create product not prefilled (name={name!r}, price={price!r})')
    pg.locator('#page form [type=submit]').click(); wait_route(pg, 'm-inventory-detail')
    check('Product created' in toast(pg), 'no "Product created" toast')
    # Create-from-template picker modal on the templates screen
    goto(pg, 'm-templates'); pg.locator('#page [data-act="pick"]').click(); idle(pg)
    pg.locator('.modal .btn.primary').click(); wait_route(pg, 'm-create-product')


@flow('Add listing → detail → edit → delete')
def f_listing(pg):
    goto(pg, 'm-inventory'); pg.locator('#page [data-go="m-inventory-new"]').first.click(); wait_route(pg, 'm-inventory-new')
    f = pg.locator('#page form[data-lf]')
    f.locator('[type=submit]').click(); idle(pg)
    check(f.locator('.fld.invalid').count() >= 5, 'empty listing form not validated')
    for k, v in dict(title='QA Croissant Box', shortDescription='Fresh pastries rescued today', address='Al Corniche St 1', state='Doha', zip='00000', price='15', originalPrice='45', quantity='8').items():
        f.locator(f'[name={k}]').fill(v)
    f.locator('select[name=city]').select_option('doha')
    f.locator('select[name=category]').select_option(index=1); f.locator('select[name=listingType]').select_option(index=1); f.locator('select[name=availability]').select_option(index=1)
    f.locator('[contenteditable]').first.click(); pg.keyboard.type('Assorted croissants and danishes.')
    check('QA Croissant Box' in pg.inner_text('[data-preview]'), 'live preview not updated')
    f.locator('[type=submit]').click(); wait_route(pg, 'm-inventory-detail')
    lid = pg.evaluate("App.paramsFor('m-inventory-detail').id")
    check('QA Croissant Box' in pg.inner_text('#page'), 'detail does not show the new listing')
    pg.locator('#page [data-go="m-inventory-new"]').first.click(); wait_route(pg, 'm-inventory-new')
    check(pg.input_value('#page [name=title]') == 'QA Croissant Box', 'edit form not prefilled')
    pg.fill('#page [name=title]', 'QA Croissant Box XL'); pg.locator('#page form [type=submit]').click(); wait_route(pg, 'm-inventory-detail')
    check('QA Croissant Box XL' in pg.inner_text('#page'), 'edit not saved')
    pg.locator('#page [data-act="more"]').click(); idle(pg)
    pg.locator('.pop [role=menuitem]', has_text='Delete').click(); idle(pg)
    pg.locator('.modal .btn.danger').click(); idle(pg)
    check(route(pg) == 'm-inventory', 'not back on inventory after delete (got %s)' % route(pg))
    gone = pg.evaluate("async (id) => { try { await api('GET', '/merchant/listings/' + id); return false; } catch (e) { return e.status === 404; } }", lid)
    check(gone, 'listing still exists after delete')


@flow('order modal → assign driver')
def f_assign(pg):
    goto(pg, 'm-orders')
    oid = pg.evaluate("async () => { const r = await api('GET', '/merchant/orders', { pageSize: 100 }); const o = r.data.find(o => (o.allowedActions || []).includes('assign_driver') && !o.driver); return o && o.id; }")
    check(oid, 'no unassigned delivery order in mocks')
    pg.evaluate("(id) => Ops.openOrder(id, () => {})", oid); idle(pg)
    m = pg.locator('.modal'); check(m.count() == 1, 'order modal did not open')
    m.locator('select[name=driverId]').select_option(index=1)
    m.locator('[data-act="assign"]').click(); idle(pg)
    o = pg.evaluate("async (id) => (await api('GET', '/merchant/orders/' + id)).data", oid)
    check(o.get('driver'), 'driver not assigned on the order')
    check('assigned' in toast(pg).lower() or 'driver' in toast(pg).lower(), 'no assign toast: ' + toast(pg))


# ------------------------------------------------------------------------------------------- admin
@flow('refund flow (policy check → submit)')
def f_refund(pg):
    goto(pg, 'admin-orders')
    o = pg.evaluate("async () => { const r = await api('GET', '/admin/orders', { pageSize: 100 }); return r.data.find(o => o.status === 'completed' && (o.allowedActions || []).includes('refund')) || r.data.find(o => (o.allowedActions || []).includes('refund')); }")
    check(o, 'no refundable order')
    pg.evaluate("(id) => D1.openOrder(id, () => {})", o['id']); idle(pg)
    d = pg.locator('.drawer'); check(d.count() == 1, 'order drawer did not open')
    d.locator('button', has_text='Refund').first.click()
    idle(pg)
    m = pg.locator('.modal').last; check(m.count() == 1, 'refund modal did not open')
    if 'Refund not available' in m.inner_text():
        raise Fail('refund not available for ' + o['id'] + ': ' + m.inner_text()[:200])
    m.locator('.ov-f .btn.primary').click(); idle(pg)
    check(m.locator('[data-field="reason"].invalid').count() == 1, 'refund without reason not blocked')
    m.locator('input[name=reason]:not([data-outcome="no_refund"])').first.check(force=True)
    note = m.locator('textarea')
    if note.count(): note.first.fill('Customer received the wrong bag; refund approved by QA.')
    appr = m.locator('input[name=approved]')
    if appr.count() and appr.is_visible(): appr.check(force=True)
    m.locator('.ov-f .btn.primary, .ov-f .btn.danger').last.click(); idle(pg)
    after = pg.evaluate("async (id) => (await api('GET', '/admin/orders/' + id)).data", o['id'])
    check(after['status'] in ('refunded', 'partially_refunded') or after.get('refund'), f'order not refunded: {after["status"]} toast={toast(pg)}')


@flow('invite user')
def f_invite(pg):
    goto(pg, 'admin-users'); pg.locator('#page [data-act="invite"]').click(); idle(pg)
    m = pg.locator('.modal'); check(m.count() == 1, 'invite modal did not open')
    m.locator('.ov-f .btn.primary').click(); idle(pg)
    check(m.locator('.fld.invalid').count() >= 1, 'empty invite not validated')
    for n, v in (('name', 'QA Invitee'), ('firstName', 'QA'), ('lastName', 'Invitee'), ('email', 'qa.invitee@wonderbites.ae')):
        if m.locator(f'input[name={n}]').count(): m.locator(f'input[name={n}]').fill(v)
    r = m.locator('select[name=role]')
    if r.count(): r.select_option(index=1)
    rr = m.locator('input[name=role]')
    if rr.count(): rr.first.check()
    m.locator('.ov-f .btn.primary').click(); idle(pg)
    check(pg.locator('.modal').count() == 0, 'invite modal still open: ' + (pg.locator('.modal').inner_text()[:300] if pg.locator('.modal').count() else ''))
    check('qa.invitee@wonderbites.ae' in pg.evaluate("async () => JSON.stringify((await api('GET','/admin/users',{pageSize:100})).data)"), 'invited user not in list')


@flow('create voucher')
def f_voucher(pg):
    goto(pg, 'admin-wallet', {'tab': 'vouchers'})
    pg.locator('#page [data-go="admin-voucher-new"], #page button', has_text='Create Voucher').first.click(); wait_route(pg, 'admin-voucher-new')
    f = pg.locator('#page form').first
    f.locator('[type=submit], .btn.primary').last.click(); idle(pg)
    check(pg.locator('#page .fld.invalid').count() >= 1, 'empty voucher not validated')
    pg.fill('#page input[name=code]', 'QATEST10'); pg.fill('#page input[name=value]', '10'); pg.fill('#page input[name=expiresAt]', pg.evaluate('api.demoDate(40)'))
    if pg.locator('#page input[name=nameEn]').count(): pg.fill('#page input[name=nameEn]', 'QA campaign')
    pg.locator('#page form [type=submit], #page .btn.primary').last.click(); idle(pg)
    wait_route(pg, 'admin-voucher-detail')
    check('QATEST10' in pg.inner_text('#page'), 'voucher detail does not show the new code')


@flow('CMS banner publish')
def f_cms(pg):
    b = pg.evaluate("async () => { const r = await api('GET', '/admin/cms', { type: 'banner', pageSize: 50 }); return r.data.find(x => x.status !== 'published') || r.data[0]; }")
    goto(pg, 'admin-cms-banner', {'id': b['id']})
    pg.locator('#page [data-act="publish"]').click(); idle(pg)
    ok = pg.locator('.modal').count()
    if ok: pg.locator('.modal .btn.primary').last.click(); idle(pg)
    after = pg.evaluate("async (id) => (await api('GET', '/admin/cms/banners/' + id)).data", b['id'])
    check(after['status'] == 'published', f'banner not published: {after["status"]} toast={toast(pg)}')


@flow('merchant Language tab switches the app to Arabic')
def f_lang(pg):
    goto(pg, 'm-settings', {'tab': 'language'})
    pg.locator('#page input[name=language][value=ar]').check(force=True)
    pg.locator('#page form [type=submit], #page .btn.primary').last.click(); idle(pg); pg.wait_for_timeout(200); idle(pg)
    check(pg.evaluate('App.state.lang') == 'ar' and pg.evaluate('document.documentElement.dir') == 'rtl', 'app did not switch to Arabic/RTL')
    check(route(pg) == 'm-settings' and pg.evaluate("App.paramsFor('m-settings').tab") == 'language', 'did not stay on the Language tab')
    check(pg.evaluate('I18N.missing().length') == 0, 'missing AR strings: ' + str(pg.evaluate('I18N.missing()')))


# ------------------------------------------------------------------------------------------- markets (v1.3)
def cur_label(pg, code):
    return pg.evaluate("(c) => fmt.text.currency(c)", code)


def market_flow(pg, lang):
    """Qatar launch defaults → enable UAE in Settings → admin switcher / filters / sign-up / branch creation → AED prices → back to QAR."""
    pg.qa_env['keep'] = True
    if lang == 'ar':
        pg.evaluate("App.setLang('ar')"); pg.qa_env['lang'] = 'ar'
    # 0. launch defaults: only Qatar is enabled
    check(pg.evaluate("Markets.enabled().map(m => m.code).join()") == 'QA', 'launch market should be Qatar only')
    goto(pg, 'admin-drops'); pg.click('.top [data-ov="market"]'); idle(pg)
    check(pg.locator('.pop [data-mk]').count() == 2, 'switcher should list All markets + Qatar only')
    pg.keyboard.press('Escape')
    # 1. enable UAE in Settings → Markets
    goto(pg, 'admin-settings-markets')
    pg.locator('#page .tog[data-name="mk:AE"]').click(); idle(pg)
    check(pg.locator('.modal').count() == 1, 'enable-market confirmation missing')
    pg.locator('.modal .ov-f .btn.primary').click(); idle(pg); pg.wait_for_timeout(150); idle(pg)
    check(pg.evaluate("Markets.get('AE').enabled"), 'UAE not enabled after confirm')
    check(pg.evaluate("JSON.parse(localStorage.getItem('wb.mock.markets.v1')).find(m => m.code === 'AE').enabled"), 'UAE state not persisted in the mock store')
    # 2. admin switcher shows UAE; UAE scope shows UAE merchants in AED
    pg.click('.top [data-ov="market"]'); idle(pg)
    check(pg.locator('.pop [data-mk="AE"]').count() == 1, 'UAE missing from the admin market switcher')
    pg.locator('.pop [data-mk="AE"]').click(); idle(pg)
    check(pg.evaluate('App.state.market') == 'AE', 'market switch to UAE failed')
    goto(pg, 'admin-merchants')
    txt = pg.inner_text('#page')
    check('Sugar & Sage' in txt or 'شوجر' in txt, 'UAE merchant not listed in the UAE scope')
    check('Fig & Bloom' not in txt and 'فيغ آند بلوم' not in txt, 'Qatar merchant leaked into the UAE scope')
    goto(pg, 'admin-financials')
    check(cur_label(pg, 'AED') in pg.inner_text('#page .kpi'), 'financial KPIs not in AED for the UAE market')
    opts = pg.evaluate("[...document.querySelectorAll('#page select[name=country] option')].map(o => o.value)")
    check('AE' in opts and 'QA' not in opts, f'country filter should follow the UAE scope: {opts}')
    # 3. All markets → converted totals note
    pg.evaluate("App.setMarket('all')"); idle(pg)
    goto(pg, 'admin-financials')
    check(pg.locator('[data-fxnote]').count() == 1, 'no "converted from multiple currencies" note on All markets')
    check(cur_label(pg, 'QAR') in pg.inner_text('#page .kpi'), 'All-markets KPIs not in the reporting currency (QAR)')
    goto(pg, 'admin-orders')
    tbl = pg.inner_text('#page table')
    check(cur_label(pg, 'QAR') in tbl, 'orders table should show Qatar rows in QAR')
    # (v1.4) the newest rows are Fig & Bloom's (shared store); search a UAE merchant to see AED rows in the same table
    pg.fill('#page [name=q]', 'Sugar'); pg.wait_for_timeout(400); idle(pg)
    tbl = pg.inner_text('#page table')
    check(cur_label(pg, 'AED') in tbl, 'orders table should show UAE rows in AED')
    # 4. merchant sign-up offers UAE with its cities and phone code
    pg.qa_env['relogin'] = False
    pg.evaluate("App.state.sessions.merchant = null; localStorage.removeItem('wb.session.merchant')")
    goto(pg, 'm-signup')
    check(set(pg.evaluate("[...document.querySelectorAll('select[name=country] option')].map(o => o.value)")) >= {'QA', 'AE'}, 'sign-up country list misses UAE')
    pg.select_option('select[name=country]', 'AE'); idle(pg)
    check('dubai' in pg.evaluate("[...document.querySelectorAll('select[name=city] option')].map(o => o.value)"), 'UAE cities missing in sign-up')
    check(pg.input_value('select[name=phoneCode]') == '+971', 'phone code did not follow the country (+971)')
    pg.qa_env['relogin'] = True
    # 5. create a UAE branch
    goto(pg, 'm-branch-edit', {})
    f = pg.locator('#page form[data-bf]')
    f.locator('select[name=country]').select_option('AE'); idle(pg)
    f.locator('select[name=city]').select_option('dubai')
    f.locator('input[name=name]').fill('Dubai Marina Branch'); f.locator('input[name=address]').fill('Marina Walk, Tower 3')
    check(f.locator('select[name=phoneCode]').input_value() == '+971', 'branch phone code did not follow UAE')
    f.locator('input[name=phone]').fill('50 123 4567')
    f.locator('[type=submit]').click(); wait_route(pg, 'm-branches')
    br = pg.evaluate("async () => (await api('GET', '/merchant/me/branches')).data.find(b => b.country === 'AE')")
    check(br and br['currency'] == 'AED' and br['timeZone'] == 'Asia/Dubai', f'UAE branch missing market fields: {br}')
    # 6. switch to the UAE branch → AED prices / inputs
    pg.click('.top [data-ov="branch"]'); idle(pg); pg.locator(f'.pop [data-bid="{br["id"]}"]').click(); idle(pg)
    check(pg.evaluate('App.currency()') == 'AED' and pg.evaluate('App.timeZone()') == 'Asia/Dubai', 'merchant context not on AED / Asia/Dubai')
    goto(pg, 'm-inventory-new', {})
    check(pg.inner_text('#page [data-field="price"] .pre') == cur_label(pg, 'AED'), 'price input prefix is not AED on the UAE branch')
    fm = pg.locator('#page form[data-lf]')
    for k, v in dict(title='Dubai Croissant Box', shortDescription='Fresh pastries rescued today', address='Marina Walk 1', state='Dubai', zip='00000', price='19', originalPrice='55', quantity='6').items():
        fm.locator(f'[name={k}]').fill(v)
    fm.locator('select[name=city]').select_option('dubai')
    fm.locator('select[name=category]').select_option(index=1); fm.locator('select[name=listingType]').select_option(index=1); fm.locator('select[name=availability]').select_option(index=1)
    fm.locator('[contenteditable]').first.click(); pg.keyboard.type('Croissants and danishes.')
    fm.locator('[type=submit]').click(); wait_route(pg, 'm-inventory-detail')
    check(cur_label(pg, 'AED') in pg.inner_text('#page'), 'new UAE listing price not shown in AED')
    goto(pg, 'm-overview')
    check(cur_label(pg, 'AED') in pg.inner_text('#page .kpi'), 'overview totals not in AED on the UAE branch')
    # 7. back to the Qatar branch → QAR
    pg.click('.top [data-ov="branch"]'); idle(pg); pg.locator('.pop [data-bid="BR-01"]').click(); idle(pg)
    check(pg.evaluate('App.currency()') == 'QAR', 'merchant context did not return to QAR')
    check(cur_label(pg, 'QAR') in pg.inner_text('#page .kpi'), 'overview totals not back in QAR')
    goto(pg, 'm-inventory-new', {})
    check(pg.inner_text('#page [data-field="price"] .pre') == cur_label(pg, 'QAR'), 'price prefix not back to QAR')
    goto(pg, 'admin-drops'); pg.evaluate("App.setMarket('QA')"); idle(pg)
    check(cur_label(pg, 'QAR') in pg.inner_text('#page'), 'admin Qatar scope not in QAR')
    check(pg.evaluate('I18N.missing().length') == 0 or lang == 'en', 'missing AR strings: ' + str(pg.evaluate('I18N.missing()')))


@flow('markets: enable UAE → switcher, filters, sign-up, UAE branch in AED → back to QAR (EN)')
def f_markets_en(pg):
    market_flow(pg, 'en')


@flow('markets: enable UAE → switcher, filters, sign-up, UAE branch in AED → back to QAR (AR)')
def f_markets_ar(pg):
    market_flow(pg, 'ar')


@flow('markets: Qatar defaults (general settings, sign-up, phone codes, time zone)')
def f_qatar_defaults(pg):
    goto(pg, 'admin-settings')
    check(pg.input_value('#page select[name=timezone]') == 'Asia/Qatar', 'default time zone not Asia/Qatar')
    check(pg.input_value('#page select[name=defaultCurrency]') == 'QAR', 'default currency not QAR')
    pg.qa_env['relogin'] = False; pg.evaluate("App.state.sessions.merchant = null; localStorage.removeItem('wb.session.merchant')")
    goto(pg, 'm-signup')
    check(pg.evaluate("[...document.querySelectorAll('select[name=country] option')].map(o => o.value).filter(Boolean)") == ['QA'], 'sign-up should only offer Qatar at launch')
    check(pg.input_value('select[name=phoneCode]') == '+974', 'sign-up phone code not +974')
    pg.qa_env['relogin'] = True
    goto(pg, 'm-overview')
    check(pg.evaluate('[App.currency(), App.timeZone()]') == ['QAR', 'Asia/Qatar'], 'merchant context not QAR / Asia/Qatar')
    check('Doha' in pg.inner_text('.side .mid'), 'sidebar branch city not Doha')
    # disabling the last market is refused
    goto(pg, 'admin-settings-markets'); pg.locator('#page .tog[data-name="mk:QA"]').click(); idle(pg); pg.locator('.modal .ov-f .btn.danger').click(); idle(pg)
    check(pg.evaluate("Markets.get('QA').enabled"), 'the last enabled market could be disabled')
    check('At least one market' in toast(pg), 'no conflict message when disabling the last market: ' + toast(pg))


import flows_v14  # noqa: E402  (v1.4 audit regressions + cross-portal journeys)
flows_v14.install(globals())


def main():
    only = sys.argv[1:]
    out = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, fn in FLOWS:
            if only and not any(o.lower() in name.lower() for o in only):
                continue
            ctx, pg = boot(b, 1440, 'en', 'dark')
            pg.evaluate(LOG_CALLS)
            t0 = time.time()
            try:
                fn(pg); err = list(pg.qa_console)
                res = {'flow': name, 'ok': not err, 'errors': err}
            except Fail as e:
                res = {'flow': name, 'ok': False, 'why': str(e), 'errors': list(pg.qa_console)}
            except Exception as e:  # noqa
                res = {'flow': name, 'ok': False, 'why': 'crawler: ' + str(e).split('\n')[0][:300], 'errors': list(pg.qa_console)}
                try: pg.screenshot(path=f'/tmp/flow-fail-{len(out)}.png')
                except Exception: pass
            res['secs'] = round(time.time() - t0, 1)
            out.append(res)
            print(('PASS ' if res['ok'] else 'FAIL ') + name + ('' if res['ok'] else f"  — {res.get('why', '')} {res['errors'][:2]}"), flush=True)
            ctx.close()
        b.close()
    save('flows.json' if not only else 'flows-partial.json', out)
    print(f"\n{sum(r['ok'] for r in out)}/{len(out)} flows pass")


if __name__ == '__main__':
    main()
