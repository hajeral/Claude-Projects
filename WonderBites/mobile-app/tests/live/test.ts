// Live-mode safety checks against a simulated server (no real accounts or payments).
import { liveApi, liveSync, bootstrapLive } from '../../src/api/live';
import { pay, setPaymentProvider } from '../../src/api/payments';
import { setTokens, getTokens } from '../../src/lib/secure';
import { getState, setStore } from '../../src/state/store';

let calls: string[] = [];
let route: (m: string, p: string, body: any) => [number, any] = () => [404, {}];
(globalThis as any).fetch = async (url: string, init: any) => {
  const p = url.replace('http://api.test', ''); const m = init?.method ?? 'GET';
  calls.push(`${m} ${p}`);
  const [status, json] = route(m, p, init?.body ? JSON.parse(init.body) : undefined);
  return { status, ok: status < 400, text: async () => JSON.stringify(json) };
};
const R: boolean[] = []; const ok = (n: string, c: boolean, i = '') => { R.push(c); console.log(c ? 'PASS' : 'FAIL', n, i); };
const tok = () => setTokens({ access: 'a1', refresh: 'r1', expiresAt: Date.now() + 3600e3 });
const order = (id: string, status = 'paid') => ({ id, ref: '#WB-1', bagId: 'b1', branchId: 'br1', quantity: 1, status, price: 10, originalPrice: 30, serviceFee: 2, total: 12, paidWith: 'Card', pin: '1234', qrPayload: 'QR-' + id, pickupStart: new Date(Date.now() + 5 * 3600e3).toISOString(), pickupEnd: new Date(Date.now() + 6 * 3600e3).toISOString() });

(async () => {
  // 1. A paid order is in the cache straight after payment
  await tok(); calls = [];
  route = (m, p) => p === '/checkout/intents' ? [200, { intentId: 'i1', amount: 12, currency: 'QAR', provider: 'test', providerPayload: {} }]
    : p === '/checkout/intents/i1/confirm' ? [200, order('0974-5001')] : [404, {}];
  setPaymentProvider({ present: async () => ({ status: 'authorized', providerToken: 'tok' } as any) });
  const o = await pay({ bagId: 'b1', quantity: 1, payWith: 'Card' } as any);
  ok('Paid order is ready for the passport at once', !!liveSync.findOrder(o.id), o.id);

  // 2. Logout removes the previous account's orders and data
  route = (m, p) => p === '/branches' ? [200, []] : p === '/bags' ? [200, []] : p === '/me/orders' ? [200, [order('0974-6001'), order('0974-6002')]] : p === '/me/vouchers' ? [200, [{ id: 'v1', kind: 'amount', value: 5, issuer: 'x', scope: '', expires: '2030-01-01', state: 'available' }]] : p === '/auth/logout' ? [200, {}] : [404, {}];
  await bootstrapLive();
  setStore((s) => ({ ...s, profile: { ...s.profile, firstName: 'Previous' }, favBranches: ['x', 'y'], session: { signedIn: true, guest: false } }));
  ok('Orders loaded for account A', liveSync.orders().length >= 2);
  await liveApi.logout();
  ok('After logout no orders remain', liveSync.orders().length === 0, String(liveSync.orders().length));
  ok('After logout no vouchers remain', liveSync.vouchers().length === 0);
  ok('After logout profile and favourites are cleared', getState().profile.firstName !== 'Previous' && getState().favBranches.length === 0 && !getState().session.signedIn);
  ok('After logout tokens are gone', (await getTokens()) === null);
  // next start with an empty list for account B
  route = (m, p) => p === '/me/orders' ? [200, []] : p === '/me/vouchers' ? [200, []] : (p === '/branches' || p === '/bags') ? [200, []] : [404, {}];
  await tok(); await bootstrapLive();
  ok('Account B sees no orders from account A', liveSync.orders().length === 0);

  // 3. Token renewal happens at most once per request
  await tok(); calls = [];
  route = (m, p) => p === '/auth/refresh' ? [200, { access: 'a2', refresh: 'r2', expiresAt: Date.now() + 3600e3 }] : [401, { code: 'unauthorized', message: 'Sign in again' }];
  setStore((s) => ({ ...s, session: { signedIn: true, guest: false }, favBranches: ['z'] }));
  let err = ''; try { await liveApi.me(); } catch (e) { err = (e as Error).message; }
  const prot = calls.filter((c) => c === 'GET /me').length, ref = calls.filter((c) => c === 'POST /auth/refresh').length;
  ok('One request: at most 2 protected calls and 1 renewal', prot === 2 && ref === 1, `${prot} protected, ${ref} renewals`);
  ok('Then signed out, with data cleared', (await getTokens()) === null && !getState().session.signedIn && getState().favBranches.length === 0, err);

  // 4. Delete account also clears everything
  await tok(); route = (m, p) => p === '/me' && m === 'DELETE' ? [200, {}] : [404, {}];
  setStore((s) => ({ ...s, favBranches: ['q'], session: { signedIn: true, guest: false } })); liveSync.orders();
  await liveApi.deleteAccount();
  ok('Delete account clears all saved data', getState().favBranches.length === 0 && liveSync.orders().length === 0 && (await getTokens()) === null);

  // 5. Change password uses PATCH
  await tok(); calls = []; route = () => [200, {}];
  await liveApi.changePassword('old', 'NewPass123');
  ok('Change password sends PATCH /me/password', calls.includes('PATCH /me/password'), calls.join(','));

  // 6. Signing in as someone else on the same phone shows only their orders
  route = (m, p) => p === '/auth/login' ? [200, { access: 'b1', refresh: 'rb', expiresAt: Date.now() + 3600e3, user: { phone: '+974 5000 0000', email: 'b@x.qa' } }] : p === '/me/orders' ? [200, [order('0974-7001')]] : p === '/me/vouchers' ? [200, []] : [404, {}];
  liveSync.orders(); (liveApi as any).order; 
  await liveApi.login('b@x.qa', 'pw');
  const ids = liveSync.orders().map((o) => o.id);
  ok('New sign-in shows only that person’s orders', ids.length === 1 && ids[0] === '0974-7001', ids.join(','));
  // 7. A full refresh from the server replaces old cached orders
  route = (m, p) => p === '/me/orders' ? [200, []] : [404, {}];
  await liveApi.orders();
  ok('Server list replaces old cached orders', liveSync.orders().length === 0);
  console.log(`${R.filter(Boolean).length}/${R.length} passed`);
})();
