"""v1.4 audit regressions (F-001…F-005, pickup code, commission, demo data) and the cross-portal journeys
FLOW-02/05-06/07/08-09/10/12/15/17 (FLOW-01 lives in flows.py: f_signup). Installed by flows.py.

Every flow starts from a fresh app with both portals signed in; the shared demo store (WBStore) is the single
source for orders, listings/drops, pickups, tickets and moderation, so a change in one portal must show in the other.
"""
import re, time

CODE_RE = re.compile(r'^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$')


def install(ns):
    globals().update({k: ns[k] for k in ('flow', 'check', 'Fail', 'goto', 'idle', 'route', 'wait_route', 'toast', 'overlay')})
    _register()


def A(pg, method, path, body=None):
    """call the mock API in the page → {'data':…} or {'err': status, 'code':…, 'details':…}"""
    return pg.evaluate("""async ([m, p, b]) => { try { const r = await api(m, p, b || undefined); return { data: r.data, meta: r.meta || null }; }
      catch (e) { return { err: e.status, code: e.code, details: e.details || null, message: e.message }; } }""", [method, path, body])


def S(pg, js, arg=None):
    return pg.evaluate(js, arg)


def listing(pg, lid):
    return S(pg, "(id) => { const l = WBStore.listings.find(x => x.id === id); return { quantity: l.quantity, reserved: l.reserved, collected: l.collected, remaining: l.remaining, status: l.status }; }", lid)


def code_of(pg, oid):
    return S(pg, "(id) => WBStore.orders.find(o => o.id === id).pickupCode", oid)


def _register():
    # ------------------------------------------------------------------------------------- F-001
    @flow('F-001 listing edit keeps remaining; quantity below committed → field error')
    def f_f001(pg):
        before = listing(pg, 'LIS-2412')
        check(before['reserved'] > 0 and before['remaining'] < before['quantity'], f'seed has nothing committed: {before}')
        goto(pg, 'm-inventory-new', {'id': 'LIS-2412'})
        pg.fill('#page [name=title]', 'Morning Pastry Box'); pg.locator('#page form [type=submit]').click(); wait_route(pg, 'm-inventory-detail')
        after = listing(pg, 'LIS-2412')
        check(after['remaining'] == before['remaining'] and after['quantity'] == before['quantity'], f'editing the title changed stock: {before} → {after}')
        # quantity below reserved + collected → inline field error, nothing saved
        goto(pg, 'm-inventory-new', {'id': 'LIS-2412'})
        pg.fill('#page [name=quantity]', '1'); pg.locator('#page form [type=submit]').click(); idle(pg)
        check(route(pg) == 'm-inventory-new', 'form left despite invalid quantity')
        fld = pg.locator('#page .fld.invalid:has([name=quantity])')
        check(fld.count() == 1 and 'reserved or collected' in fld.inner_text(), 'no inline quantity error: ' + pg.inner_text('#page form')[:200])
        check(listing(pg, 'LIS-2412') == after, 'invalid quantity was partly saved')
        # a real quantity change: remaining = new quantity − (reserved + collected)
        pg.fill('#page [name=quantity]', str(before['quantity'] + 4)); pg.locator('#page form [type=submit]').click(); wait_route(pg, 'm-inventory-detail')
        l = listing(pg, 'LIS-2412')
        check(l['remaining'] == l['quantity'] - l['reserved'] - l['collected'] and l['quantity'] == before['quantity'] + 4, f'remaining not recomputed: {l}')
        r = A(pg, 'PATCH', '/merchant/listings/LIS-2412', {'quantity': 0})
        check(r.get('err') == 422 and (r.get('details') or {}).get('quantity') == 'below_committed', f'API accepted quantity below committed: {r}')

    # ------------------------------------------------------------------------------------- F-002
    @flow('F-002 order state machine: terminal orders 409 invalid_transition, UI hides disallowed actions')
    def f_f002(pg):
        for m, p in (('POST', '/merchant/orders/MO-5199/cancel'), ('POST', '/admin/orders/MO-5199/cancel'), ('POST', '/merchant/orders/MO-5210/complete'), ('POST', '/merchant/orders/MO-5208/assign-driver')):
            r = A(pg, m, p, {'reason': 'QA', 'driverId': 'DRV-01'})
            check(r.get('err') == 409 and r.get('code') == 'invalid_transition', f'{m} {p} not rejected: {r}')
        # refunded is terminal: refund, then every action is rejected
        check(A(pg, 'POST', '/admin/orders/MO-5199/refund', {'reason': 'store_closed', 'approved': True}).get('data'), 'refund of a completed order failed')
        for p in ('/merchant/orders/MO-5199/cancel', '/admin/orders/MO-5199/cancel', '/merchant/orders/MO-5199/complete'):
            r = A(pg, 'POST', p, {'reason': 'QA'})
            check(r.get('code') == 'invalid_transition', f'refunded order accepted {p}: {r}')
        o = A(pg, 'GET', '/merchant/orders/MO-5199')['data']
        check(o['status'] == 'refunded' and o['allowedActions'] == [], f'refunded order still has actions: {o["allowedActions"]}')
        goto(pg, 'm-orders'); S(pg, "Ops.openOrder('MO-5199', () => {})"); idle(pg)
        m = pg.locator('.modal')
        check(m.locator('[data-act="cancel"], [data-act="complete"], [data-verify]').count() == 0, 'closed order modal still offers actions')
        check('closed' in m.inner_text().lower(), 'closed order modal has no closed notice')
        pg.keyboard.press('Escape'); idle(pg)
        # pickup order: no plain "Mark completed", only code verification
        S(pg, "Ops.openOrder('MO-5210', () => {})"); idle(pg)
        m = pg.locator('.modal')
        check(m.locator('[data-verify]').count() == 1 and m.locator('[data-act="complete"]').count() == 0, 'pickup order offers completion without the code')
        pg.keyboard.press('Escape'); idle(pg)
        # admin drawer hides refund on a refunded order
        goto(pg, 'admin-orders'); S(pg, "D1.openOrder('MO-5199', () => {})"); idle(pg)
        check(pg.locator('.drawer [data-dact="refund"], .drawer [data-dact="cancel"]').count() == 0, 'admin drawer offers refund/cancel on a refunded order')

    # ------------------------------------------------------------------------------------- F-003 / FLOW-08
    @flow('F-003 / FLOW-08 merchant verifies pickup code in the order modal → completed (single-use, expiry, inline error)')
    def f_f003(pg):
        goto(pg, 'm-orders'); S(pg, "Ops.openOrder('MO-5210', () => {})"); idle(pg)
        m = pg.locator('.modal'); f = m.locator('form[data-verify]')
        f.locator('[name=code]').fill('ABCDEF'); f.locator('[type=submit]').click(); idle(pg)
        check(f.locator('.fld.invalid').count() == 1 and 'match' in f.inner_text().lower(), 'wrong code: no inline error')
        check(A(pg, 'GET', '/merchant/orders/MO-5210')['data']['status'] == 'ready_for_pickup', 'wrong code changed the order')
        code = m.locator('[data-demo-code] b').inner_text().strip()
        check(CODE_RE.match(code), 'demo code has the wrong format: ' + code)
        f.locator('[name=code]').fill(code.lower()); f.locator('[type=submit]').click(); idle(pg)
        check('verified' in toast(pg).lower(), 'no verified toast: ' + toast(pg))
        for portal in ('merchant', 'admin'):
            o = A(pg, 'GET', f'/{portal}/orders/MO-5210')['data']
            check(o['status'] == 'completed', f'{portal} sees {o["status"]} after verification')
            check(sum(1 for e in o['timeline'] if e.get('event') == 'pickup_verified') == 1, f'{portal}: not exactly one pickup_verified event')
        pk = S(pg, "WBStore.pickups.find(p => p.orderId === 'MO-5210')")
        check(pk['status'] == 'picked_up' and pk['usedAt'], f'pickup not marked used: {pk}')
        r = A(pg, 'POST', '/merchant/pickups/verify', {'code': code, 'orderId': 'MO-5210'})
        check(r.get('err') == 409 and r.get('code') == 'code_used', f'code reuse not rejected: {r}')
        # expired code: paid but not collected yesterday → still Active, verification says expired
        r = A(pg, 'POST', '/merchant/pickups/verify', {'code': code_of(pg, 'MO-5172'), 'orderId': 'MO-5172'})
        check(r.get('code') == 'code_expired', f'expired code accepted: {r}')
        act = A(pg, 'GET', '/merchant/orders', {'status': 'active', 'pageSize': 50})['data']
        check('MO-5172' in [o['id'] for o in act], 'paid-but-uncollected order from yesterday is not Active')
        check('MO-5210' not in [o['id'] for o in act], 'collected order still Active')
        # delivery orders progress through the driver flow only
        check(A(pg, 'POST', '/merchant/orders/MO-5208/complete').get('data', {}).get('status') == 'delivered', 'out_for_delivery → delivered failed')
        check(A(pg, 'POST', '/merchant/orders/MO-5208/complete').get('data', {}).get('status') == 'completed', 'delivered → completed failed')

    # ------------------------------------------------------------------------------------- F-004
    @flow('F-004 merchant Overview KPIs / recent orders / top bags come from the order store')
    def f_f004(pg):
        def ov():
            return A(pg, 'GET', '/merchant/overview', {'branchId': 'BR-01', 'from': S(pg, 'api.demoDate(-30)'), 'to': S(pg, 'api.DEMO_TODAY')})['data']
        orders = A(pg, 'GET', '/merchant/orders', {'pageSize': 100, 'branchId': 'BR-01'})['data']
        o1 = ov(); k = {x['key']: x['value'] for x in o1['kpis']}
        by_id = {o['id']: o for o in orders}
        for r in o1['recentOrders']:
            check(r['id'] in by_id and by_id[r['id']]['status'] == r['status'], f'recent order {r["id"]} {r["status"]} ≠ Orders ({by_id.get(r["id"], {}).get("status")})')
        pend = [o for o in orders if o['fulfillment'] == 'pickup' and o['active']]
        check(k['pendingPickups'] == len(pend), f'pending pickups {k["pendingPickups"]} ≠ active pickup orders {len(pend)}')
        lids = {l['id'] for l in A(pg, 'GET', '/merchant/listings', {'pageSize': 50})['data']}
        check(o1['topSellingBags'] and all(t['listing']['id'] in lids for t in o1['topSellingBags']), 'top bags are not real listings')
        # a verification moves one order from pending to completed — in the overview too
        A(pg, 'POST', '/merchant/pickups/verify', {'code': code_of(pg, 'MO-5187'), 'orderId': 'MO-5187'})
        k2 = {x['key']: x['value'] for x in ov()['kpis']}
        check(k2['pendingPickups'] == k['pendingPickups'] - 1 and k2['completedOrders'] == k['completedOrders'] + 1, f'overview did not follow the order: {k} → {k2}')
        A(pg, 'POST', '/merchant/orders/MO-5204/cancel', {'reason': 'QA'})
        k3 = {x['key']: x['value'] for x in ov()['kpis']}
        check(k3['cancelledOrders'] == k2['cancelledOrders'] + 1, 'cancelled count did not follow the order')
        goto(pg, 'm-overview')
        txt = pg.inner_text('#page')
        check('MO-5187' in txt or '#' in txt, 'overview recent orders not rendered')

    # ------------------------------------------------------------------------------------- F-005
    @flow('F-005 support contacts from the markets registry (Need Help drawer + Help screen), editable in Settings → Markets')
    def f_f005(pg):
        goto(pg, 'm-overview'); pg.click('.side [data-ov="help"]'); idle(pg)
        d = pg.locator('.drawer [data-support-contacts]')
        check(d.count() == 1, 'support contacts block missing')
        html = d.inner_html()
        for needle in ('support@wonderbites.qa', 'tel:+974', 'wa.me/974'):
            check(needle in html, f'Need Help drawer lacks {needle}')
        check(pg.locator('.drawer [data-contact="hours"]').count() == 1, 'support hours missing')
        check('wonderbites.ae' not in html and 'wonderbites.com' not in html, 'non-Qatar support contact in the Qatar drawer')
        pg.keyboard.press('Escape'); idle(pg)
        goto(pg, 'm-help'); idle(pg)
        h = pg.inner_html('#page [data-contact]')
        check('support@wonderbites.qa' in h and '+974' in h, 'Help screen contacts not from the registry')
        # admin edits the Qatar support email → both portals pick it up
        r = A(pg, 'PATCH', '/admin/settings/markets/QA', {'supportEmail': 'help@wonderbites.qa'})
        check(r.get('data'), f'market support email not saved: {r}')
        S(pg, "Markets.load && Markets.load()"); idle(pg)
        goto(pg, 'm-overview'); pg.click('.side [data-ov="help"]'); idle(pg)
        check('help@wonderbites.qa' in pg.inner_html('.drawer [data-support-contacts]'), 'drawer did not follow the registry change')
        bad = A(pg, 'PATCH', '/admin/settings/markets/QA', {'supportEmail': 'not-an-email'})
        check(bad.get('err') == 422, 'invalid support email accepted')
        A(pg, 'PATCH', '/admin/settings/markets/QA', {'supportEmail': 'support@wonderbites.qa'})

    # ------------------------------------------------------------------------------------- pickup code standard
    @flow('pickup codes: one format (6 chars, no ambiguous characters), unique, expire at window end + grace; admin uses the same helper')
    def f_codes(pg):
        rows = S(pg, "WBStore.pickups.map(p => ({ id: p.id, code: p.code, end: p.window.end, date: p.window.date, exp: p.expiresAt, market: p.market }))")
        check(len(rows) >= 10, 'too few pickups in the store')
        codes = [r['code'] for r in rows]
        bad = [c for c in codes if not CODE_RE.match(c)]
        check(not bad, f'codes outside the standard: {bad}')
        check(len(set(codes)) == len(codes), 'duplicate pickup codes')
        for r in rows:
            exp = S(pg, "([d, e, m]) => WBStore.codeExpiry(d, e, m)", [r['date'], r['end'], r['market']])
            check(exp == r['exp'], f'{r["id"]} expiry {r["exp"]} ≠ window end + grace {exp}')
        grace = S(pg, "WBStore.GRACE_MIN"); check(grace == 30, 'grace period is not 30 min')
        ap = A(pg, 'GET', '/admin/pickups', {'pageSize': 100})['data']
        check(all(CODE_RE.match(p['code']) for p in ap), 'admin pickup list has non-standard codes')
        # admin verify path uses the same helper (wrong → valid:false; used → 409)
        p = next(p for p in ap if p['status'] in ('upcoming', 'ready') and A(pg, 'GET', '/admin/orders/' + p['orderId'])['data']['status'] in ('confirmed', 'ready_for_pickup'))
        check(A(pg, 'POST', f'/admin/pickups/{p["id"]}/verify', {'code': 'ZZZZZZ'})['data']['valid'] is False, 'admin accepted a wrong code')
        ok = A(pg, 'POST', f'/admin/pickups/{p["id"]}/verify', {'code': p['code']})['data']
        check(ok['valid'] and ok['order']['status'] == 'completed', f'admin verify did not complete the order: {ok.get("order", {}).get("status")}')
        check(A(pg, 'POST', f'/admin/pickups/{p["id"]}/verify', {'code': p['code']}).get('code') == 'code_used', 'admin re-verify not rejected')

    # ------------------------------------------------------------------------------------- commission
    @flow('commission: 19 % platform default (Settings → General → Commercial), effective-dated, merchant contract override')
    def f_commission(pg):
        c = A(pg, 'GET', '/admin/settings/commercial')['data']
        check(c['defaultCommissionRate'] == 19 and any(h['rate'] == 19 and not h['to'] for h in c['history']), f'default is not 19 %: {c}')
        goto(pg, 'admin-settings'); idle(pg)
        card = pg.locator('#page [data-commercial]')
        check(card.count() == 1 and card.locator('[name=defaultCommissionRate]').input_value() == '19', 'Commercial card missing or not 19 %')
        # merchant earnings use it
        e = A(pg, 'GET', '/merchant/analytics/sales')['data']['earnings']
        check(abs(e['commission']['amount'] - round(e['grossSales']['amount'] * 0.19, 2)) < 0.05, f'commission ≠ 19 % of gross: {e}')
        check(abs(e['netEarnings']['amount'] - (e['grossSales']['amount'] - e['commission']['amount'] - e['refundAdjustments']['amount'])) < 0.05, 'net ≠ gross − commission − refunds')
        fin = A(pg, 'GET', '/admin/financials/dashboard')
        if fin.get('data'):
            ks = {k['key']: k for k in (fin['data'].get('kpis') or [])}
            if 'gmv' in ks and 'commissionRevenue' in ks:
                check(abs(ks['commissionRevenue']['value'] - ks['gmv']['value'] * 0.19) <= 2, 'financials commission ≠ GMV × 19 %')
        # contract override
        m = A(pg, 'GET', '/admin/merchants/MER-071')['data']
        check(m['commissionRate'] == 17 and m['commissionSource'] == 'contract', f'contract override not applied: {m["commissionRate"]} {m["commissionSource"]}')
        A(pg, 'PATCH', '/admin/merchants/MER-066', {'commissionRate': 15})
        e2 = A(pg, 'GET', '/merchant/analytics/sales')['data']['earnings']
        check(e2['commissionRate'] == 15, 'merchant contract rate not used for its earnings')
        A(pg, 'PATCH', '/admin/merchants/MER-066', {'commissionRate': None})
        check(A(pg, 'GET', '/admin/merchants/MER-066')['data']['commissionSource'] == 'platform_default', 'contract not cleared')
        # effective-dated: a new default from tomorrow keeps today at 19 %
        r = A(pg, 'PUT', '/admin/settings/commercial', {'defaultCommissionRate': 20, 'effectiveFrom': S(pg, 'api.demoDate(1)')})
        check(r.get('data') and r['data']['defaultCommissionRate'] == 19 and len(r['data']['history']) == 3, f'effective-dated change wrong: {r}')
        check(A(pg, 'PUT', '/admin/settings/commercial', {'defaultCommissionRate': 70}).get('err') == 422, 'out-of-range rate accepted')

    # ------------------------------------------------------------------------------------- demo data / PII
    @flow('demo data: badge in both top bars, sign-in says "Demo: any credentials", no realistic emails / phones / IBANs')
    def f_demo(pg):
        for r in ('admin-command-center', 'm-overview'):
            goto(pg, r); check(pg.locator('.top [data-demo-badge]').count() == 1, f'no Demo data badge on {r}')
        S(pg, "['admin','merchant'].forEach(p => { App.state.sessions[p] = null; localStorage.removeItem('wb.session.' + p); })"); pg.qa_env['relogin'] = False
        for r in ('admin-login', 'm-login'):
            goto(pg, r); check('Demo: any credentials' in pg.inner_text('#app'), f'{r} lacks the demo credentials note')
        pg.qa_env['relogin'] = True
        S(pg, "App.login('admin', App.DEMO.admin); App.login('merchant', App.DEMO.merchant)")
        blob = S(pg, """async () => { const eps = ['/admin/consumers', '/admin/merchants', '/merchant/customers', '/merchant/vendors', '/merchant/drivers', '/admin/support/tickets', '/admin/users', '/merchant/branches'];
          const out = []; for (const e of eps) { try { out.push(JSON.stringify((await api('GET', e, { pageSize: 100 })).data)); } catch (x) { out.push(''); } }
          for (const id of ['MER-066', 'MER-071']) { try { out.push(JSON.stringify((await api('GET', '/admin/merchants/' + id)).data)); } catch (x) {} }
          return out.join('\\n'); }""")
        emails = set(re.findall(r'[\w.+-]+@([\w-]+(?:\.[\w-]+)+)', blob))
        bad = sorted(d for d in emails if not (d == 'example.com' or d.endswith('.example.com') or re.match(r'wonderbites\.(qa|ae|sa)$', d)))
        check(not bad, f'realistic email domains in mock data: {bad}')
        phones = re.findall(r'\+9(?:74|71|66)[\s\d]{7,14}', blob)
        badp = [p for p in phones if '5550' not in p.replace(' ', '') and '550' not in p]
        check(not badp, f'phones outside the 5550 test range: {badp[:5]}')
        ibans = re.findall(r'"iban":"([^"]*)"', blob)
        check(ibans and all('•' in i and 'demo' in i for i in ibans), f'unmasked IBANs: {ibans[:3]}')

    # ------------------------------------------------------------------------------------- FLOW-02
    @flow('FLOW-02 merchant listing appears in Admin → Drops; admin flag disables it for the merchant')
    def f_flow02(pg):
        r = A(pg, 'POST', '/merchant/listings', {'title': {'en': 'QA Flow Box', 'ar': 'صندوق اختبار'}, 'category': 'bakery', 'shortDescription': 'QA', 'description': 'QA listing', 'address': 'Al Corniche St 1', 'city': 'doha', 'state': 'Doha', 'zip': '00000', 'price': 12, 'originalPrice': 36, 'listingType': 'surprise_bag', 'availability': 'daily', 'quantity': 6, 'settings': {'publish': True}})
        lid = r['data']['id']
        goto(pg, 'admin-drops'); idle(pg)
        d = A(pg, 'GET', f'/admin/drops/{lid}')['data']
        check(d and d['status'] == 'live' and d['merchant']['id'] == 'MER-066' and d['remaining'] == 6, f'listing not visible as an admin drop: {d}')
        ids = [x['id'] for x in A(pg, 'GET', '/admin/drops', {'pageSize': 100, 'q': 'QA Flow'})['data']]
        check(lid in ids, 'drop not in the Admin → Drops list')
        check(A(pg, 'POST', f'/admin/drops/{lid}/flag', {'reason': 'misleading_photo', 'note': 'Photo shows a cake'}).get('data', {}).get('status') == 'flagged', 'admin flag failed')
        ml = A(pg, 'GET', f'/merchant/listings/{lid}')['data']
        check(ml['status'] == 'disabled' and ml['flagged'], f'merchant does not see the listing disabled: {ml["status"]}')
        goto(pg, 'm-inventory-detail', {'id': lid})
        check(pg.locator('#page [data-moderation]').count() == 1, 'merchant listing detail lacks the moderation notice')
        check(A(pg, 'POST', f'/merchant/listings/{lid}/resume').get('code') == 'moderation_hold', 'merchant could re-enable a flagged listing')
        A(pg, 'POST', f'/admin/drops/{lid}/unflag')
        check(A(pg, 'GET', f'/merchant/listings/{lid}')['data']['status'] == 'active', 'unflag did not re-activate the listing')
        # admin quantity edit goes through the same F-001 rule
        check(A(pg, 'PATCH', '/admin/drops/LIS-2412', {'quantity': 0}).get('err') == 422, 'admin set quantity below committed')

    # ------------------------------------------------------------------------------------- FLOW-05/06
    @flow('FLOW-05/06 merchant orders are a filtered projection of admin orders (same IDs, same states)')
    def f_flow05(pg):
        mo = A(pg, 'GET', '/merchant/orders', {'pageSize': 100})
        ao = A(pg, 'GET', '/admin/orders', {'pageSize': 100, 'merchantId': 'MER-066'})
        check(mo['meta']['total'] == ao['meta']['total'], f'order counts differ: merchant {mo["meta"]["total"]} vs admin {ao["meta"]["total"]}')
        ms = {o['id']: o['status'] for o in mo['data']}; as_ = {o['id']: o['status'] for o in ao['data']}
        check(ms == as_, 'merchant and admin orders differ: ' + str({k: (ms.get(k), as_.get(k)) for k in set(ms) ^ set(as_) or [k for k in ms if ms[k] != as_.get(k)]})[:300])
        other = A(pg, 'GET', '/admin/orders', {'pageSize': 100})['data']
        check(any(o['merchantId'] != 'MER-066' for o in other), 'admin sees no other merchants’ orders')
        check(not any(o['id'].startswith('ORD-') for o in mo['data']), 'merchant sees other merchants’ orders')
        goto(pg, 'admin-orders'); idle(pg)
        S(pg, "D1.openOrder('MO-5208', () => {})"); idle(pg)
        check('MO-5208' in pg.inner_text('.drawer'), 'admin cannot open the merchant order by its ID')

    # ------------------------------------------------------------------------------------- FLOW-07
    @flow('FLOW-07 reserving / completing reduces remaining; cancellation restores it')
    def f_flow07(pg):
        l0 = listing(pg, 'LIS-2415')
        r = A(pg, 'POST', '/shared/demo/reservations', {'listingId': 'LIS-2415', 'qty': 2})['data']
        oid = r['order']['id']; l1 = listing(pg, 'LIS-2415')
        check(l1['remaining'] == l0['remaining'] - 2 and l1['reserved'] == l0['reserved'] + 2, f'reservation did not hold stock: {l0} → {l1}')
        check(A(pg, 'GET', f'/admin/orders/{oid}')['data']['status'] == 'confirmed', 'new reservation not visible to admin')
        A(pg, 'POST', f'/merchant/orders/{oid}/cancel', {'reason': 'QA'})
        l2 = listing(pg, 'LIS-2415')
        check(l2['remaining'] == l0['remaining'] and l2['reserved'] == l0['reserved'], f'cancellation did not restore stock: {l2}')
        r = A(pg, 'POST', '/shared/demo/reservations', {'listingId': 'LIS-2415'})['data']; oid = r['order']['id']
        A(pg, 'POST', '/merchant/pickups/verify', {'code': code_of(pg, oid), 'orderId': oid})
        l3 = listing(pg, 'LIS-2415')
        check(l3['remaining'] == l0['remaining'] - 1 and l3['collected'] == l0['collected'] + 1 and l3['reserved'] == l0['reserved'], f'completion did not move reserved → collected: {l3}')
        # admin refund of an uncollected order also restores stock
        r = A(pg, 'POST', '/shared/demo/reservations', {'listingId': 'LIS-2415'})['data']; oid = r['order']['id']
        A(pg, 'POST', f'/admin/orders/{oid}/refund', {'reason': 'store_closed'})
        check(listing(pg, 'LIS-2415')['remaining'] == l3['remaining'], 'refund did not restore stock')
        goto(pg, 'm-inventory-detail', {'id': 'LIS-2415'})
        check(pg.locator('#page').inner_text().count('bags') >= 2, 'inventory detail does not show stock')

    # ------------------------------------------------------------------------------------- FLOW-09
    @flow('FLOW-09 admin verifies a pickup (Pickups → Verify code) → one completed state in both portals')
    def f_flow09(pg):
        pk = S(pg, "WBStore.pickups.find(p => p.orderId === 'MO-5187')")
        goto(pg, 'admin-pickups'); idle(pg)
        pg.click('#page [data-act="verify"]'); idle(pg)
        m = pg.locator('.modal'); m.locator('[name=code]').fill('ZZZZZZ'); m.locator('.btn.primary').last.click(); idle(pg)
        check(m.locator('.fld.invalid').count() == 1, 'wrong code: no inline error in the admin modal')
        m.locator('[name=code]').fill(pk['code']); m.locator('.btn.primary').last.click(); idle(pg)
        check('verified' in toast(pg).lower(), 'no admin verified toast: ' + toast(pg))
        a = A(pg, 'GET', '/admin/orders/MO-5187')['data']; mo = A(pg, 'GET', '/merchant/orders/MO-5187')['data']
        check(a['status'] == mo['status'] == 'completed', f'states differ: admin {a["status"]} merchant {mo["status"]}')
        check(sum(1 for e in mo['timeline'] if e.get('event') == 'pickup_verified') == 1, 'not exactly one pickup event')
        check(A(pg, 'POST', '/merchant/pickups/verify', {'code': pk['code'], 'orderId': 'MO-5187'}).get('code') == 'code_used', 'merchant could re-use the admin-verified code')
        goto(pg, 'm-orders'); S(pg, "Ops.openOrder('MO-5187', () => {})"); idle(pg)
        check(pg.locator('.modal [data-verify]').count() == 0, 'merchant modal still asks for the code')

    # ------------------------------------------------------------------------------------- FLOW-10
    @flow('FLOW-10 admin cancel / refund by policy → merchant sees Cancelled / Refunded')
    def f_flow10(pg):
        r = A(pg, 'POST', '/admin/orders/MO-5204/cancel', {'reason': 'store_closed', 'refund': True})
        check(r.get('data', {}).get('status') == 'cancelled', f'admin cancel failed: {r}')
        el = A(pg, 'GET', '/admin/orders/MO-5199/refund-eligibility')['data']
        check(el['eligible'], f'completed order not refundable: {el}')
        r = A(pg, 'POST', '/admin/orders/MO-5199/refund', {'reason': 'change_of_mind'})
        check(r.get('err') == 422, 'no-refund policy reason accepted')
        r = A(pg, 'POST', '/admin/orders/MO-5199/refund', {'reason': 'store_closed', 'approved': True})
        check(r.get('data', {}).get('status') == 'refunded', f'refund failed: {r}')
        goto(pg, 'm-orders'); idle(pg)
        txt = pg.inner_text('#page [data-table]')
        mo = {o['id']: o['status'] for o in A(pg, 'GET', '/merchant/orders', {'pageSize': 100})['data']}
        check(mo['MO-5204'] == 'cancelled' and mo['MO-5199'] == 'refunded', f'merchant statuses: {mo["MO-5204"]}, {mo["MO-5199"]}')
        check('Refunded' in txt and 'Cancelled' in txt, 'merchant Orders table does not show Refunded / Cancelled')
        e = A(pg, 'GET', '/merchant/analytics/sales')['data']['earnings']
        check(e['refundAdjustments']['amount'] >= 10, 'refund not reflected in merchant earnings')

    # ------------------------------------------------------------------------------------- FLOW-12
    @flow('FLOW-12 payouts = completed orders × effective commission: Admin Financials ≡ Admin Merchant ≡ Merchant Analytics')
    def f_flow12(pg):
        fin = [p for p in A(pg, 'GET', '/admin/financials/payouts', {'pageSize': 100})['data'] if p['merchantId'] == 'MER-066']
        mer = A(pg, 'GET', '/admin/merchants/MER-066/payouts')['data']
        st = S(pg, "WBStore.payouts('MER-066')")
        check(len(fin) == len(st) == len(mer) == 4, f'payout statements: financials {len(fin)}, merchant tab {len(mer)}, store {len(st)}')
        for p in st:
            f = next(x for x in fin if x['id'] == p['id']); m = next(x for x in mer if x['id'] == p['id'])
            check(abs(f['net']['amount'] - p['net']['amount']) < 0.01 and abs(m['net']['amount'] - p['net']['amount']) < 0.01, f'{p["id"]} net differs')
            check(abs(p['commission']['amount'] - p['gross']['amount'] * 0.19) < 0.05, f'{p["id"]} commission ≠ 19 %')
            orders = S(pg, "([a, b]) => WBStore.orders.filter(o => o.merchantId === 'MER-066' && o.status === 'completed' && String(o.completedAt || o.createdAt).slice(0, 10) >= a && String(o.completedAt || o.createdAt).slice(0, 10) <= b).reduce((s, o) => s + o.total.amount, 0)", [p['periodStart'], p['periodEnd']])
            check(abs(orders - p['gross']['amount']) < 0.01, f'{p["id"]} gross ≠ completed orders')
        e = A(pg, 'GET', '/merchant/analytics/sales')['data']
        pend = sum(p['net']['amount'] for p in st if p['status'] == 'pending'); paid = sum(p['net']['amount'] for p in st if p['status'] == 'paid')
        check(abs(e['earnings']['pendingPayout']['amount'] - pend) < 0.01 and abs(e['earnings']['paidToDate']['amount'] - paid) < 0.01, 'merchant analytics payouts ≠ admin statements')
        goto(pg, 'admin-merchant-detail', {'id': 'MER-066', 'tab': 'payouts'}); idle(pg)
        check(st[-1]['id'] in pg.inner_text('#page'), 'admin merchant payouts tab does not list the statements')

    # ------------------------------------------------------------------------------------- FLOW-15
    @flow('FLOW-15 merchant dispute / help request ↔ Admin Support with two-way replies')
    def f_flow15(pg):
        tk = [t['id'] for t in A(pg, 'GET', '/admin/support/tickets', {'pageSize': 100})['data']]
        check('dsp_1042' in tk and 'hr_318' in tk, 'merchant disputes / help requests missing from Admin Support')
        # merchant replies in the dispute thread (UI) → admin sees it
        goto(pg, 'm-report-detail', {'id': 'dsp_1042'}); idle(pg)
        box = pg.locator('#page textarea').first; box.fill('We re-sent the bag with a new driver.')
        pg.locator('#page form .btn.primary, #page form [type=submit]').first.click(); idle(pg)
        msgs = A(pg, 'GET', '/admin/support/tickets/dsp_1042')['data']['messages']
        check(any('re-sent the bag' in (m['body'] if isinstance(m['body'], str) else m['body'].get('en', '')) for m in msgs), 'merchant reply not in the admin ticket')
        # admin replies (UI) → merchant thread shows it
        goto(pg, 'admin-ticket-detail', {'id': 'dsp_1042'}); idle(pg)
        ta = pg.locator('#page textarea').first; ta.fill('Thanks — refund approved for the customer.')
        btn = pg.locator('#page .btn.primary', has_text='Send')
        (btn.first if btn.count() else pg.locator('#page form .btn.primary').first).click(); idle(pg)
        d = A(pg, 'GET', '/merchant/disputes/dsp_1042')['data']
        check(any(m['role'] == 'support' and 'refund approved' in (m['body'] if isinstance(m['body'], str) else m['body']['en']) for m in d['messages']), 'admin reply not in the merchant thread')
        goto(pg, 'm-report-detail', {'id': 'dsp_1042'}); idle(pg)
        check('refund approved' in pg.inner_text('#page'), 'merchant dispute screen does not show the admin reply')
        # help request round trip
        h = A(pg, 'POST', '/merchant/help/requests', {'name': 'Sara', 'phoneCountry': '+974', 'phone': '5550 1234', 'description': 'Please add our Msheireb branch to payouts.'})['data']
        check(A(pg, 'GET', f'/admin/support/tickets/{h["id"]}').get('data'), 'help request not in Admin Support')
        A(pg, 'POST', f'/admin/support/tickets/{h["id"]}/messages', {'body': 'Done — the branch is now included.'})
        goto(pg, 'm-help'); idle(pg)
        check('Done — the branch is now included.' in pg.inner_text('#page [data-reqs]'), 'admin reply not shown under Help → My requests')

    # ------------------------------------------------------------------------------------- FLOW-17
    @flow('FLOW-17 merchant reports a review → Admin Moderation → decision shown on merchant Reviews')
    def f_flow17(pg):
        goto(pg, 'm-reviews'); idle(pg)
        pg.locator('#page [data-report="rev_4"]').click(); idle(pg)
        m = pg.locator('.modal'); m.locator('input[name=reason]').first.check(force=True)
        m.locator('.btn.primary, .btn.danger').last.click(); idle(pg)
        check('moderation' in pg.inner_text('#page [data-id="rev_4"]').lower(), 'review not marked as sent to moderation')
        mod = [x for x in A(pg, 'GET', '/admin/moderation', {'pageSize': 100})['data'] if x.get('reviewId') == 'rev_4']
        check(len(mod) == 1 and mod[0]['status'] == 'pending', f'no pending moderation case: {mod}')
        goto(pg, 'admin-moderation'); idle(pg)
        check(mod[0]['id'] in pg.inner_text('#page') or 'Fig & Bloom' in pg.inner_text('#page'), 'case not visible in Admin Moderation')
        check(A(pg, 'POST', f'/admin/moderation/{mod[0]["id"]}/reject', {'reason': 'abusive_language'}).get('data'), 'admin decision failed')
        goto(pg, 'm-reviews'); idle(pg)
        card = pg.inner_text('#page [data-id="rev_4"]')
        check('Removed by WonderBites' in card, 'merchant review does not show the removal: ' + card[:200])
        r = [x for x in A(pg, 'GET', '/merchant/reviews', {'pageSize': 50})['data'] if x['id'] == 'rev_4'][0]
        check(r['status'] == 'removed' and r['moderation']['outcome'] == 'removed', f'review state {r["status"]}')
        # a kept decision on another review
        A(pg, 'POST', '/merchant/reviews/rev_6/report', {'reason': 'not_customer'})
        mid = [x for x in A(pg, 'GET', '/admin/moderation', {'pageSize': 100})['data'] if x.get('reviewId') == 'rev_6'][0]['id']
        A(pg, 'POST', f'/admin/moderation/{mid}/approve', {})
        r6 = [x for x in A(pg, 'GET', '/merchant/reviews', {'pageSize': 50})['data'] if x['id'] == 'rev_6'][0]
        check(r6['status'] == 'published' and r6['moderation']['outcome'] == 'kept', f'kept decision not reflected: {r6["status"]}')
