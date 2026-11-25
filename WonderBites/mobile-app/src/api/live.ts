// LIVE implementation: the same functions as ./demo, backed by the WonderBites
// platform API. Endpoints are documented in INTEGRATION.md. Responses must use the
// shapes in ./types. Everything fetched is cached so screens can read it instantly.
import { http, setOnSignedOut } from './http';
import type { Bag, Branch, Order, Ticket, User, Voucher } from './types';
import type { Api } from './demo';
import { setTokens, type Tokens } from '../lib/secure';
import { setStore, type Feedback, clearAccountData } from '../state/store';

const cache = { bags: new Map<string, Bag>(), branches: new Map<string, Branch>(), orders: new Map<string, Order>(), vouchers: new Map<string, Voucher>() };
// A full list from the server replaces what was cached, so nothing old (or from another account) stays behind.
const put = <T extends { id: string }>(m: Map<string, T>, list: T[]) => { m.clear(); list.forEach((x) => m.set(x.id, x)); return list; };

export const liveSync = {
  branches: () => [...cache.branches.values()],
  findBranch: (id?: string) => (id ? cache.branches.get(id) : undefined),
  bags: () => [...cache.bags.values()],
  findBag: (id?: string) => (id ? cache.bags.get(id) : undefined),
  orders: () => [...cache.orders.values()],
  findOrder: (id?: string) => (id ? cache.orders.get(id) : undefined),
  vouchers: () => [...cache.vouchers.values()],
  findVoucher: (id?: string) => (id ? cache.vouchers.get(id) : undefined),
};

/** A new order (e.g. right after payment) goes into the cache so the passport opens at once. */
export const rememberOrder = (o: Order) => { cache.orders.set(o.id, o); return o; };
/** Forget everything about the signed-in person (orders, vouchers) and their saved data. */
export function forgetAccount() { cache.orders.clear(); cache.vouchers.clear(); clearAccountData(); }
setOnSignedOut(forgetAccount);

/** Load the catalogue and the customer's orders into the cache at launch. */
export async function bootstrapLive() {
  const [branches, bags] = await Promise.all([http.get<Branch[]>('/branches'), http.get<Bag[]>('/bags')]);
  put(cache.branches, branches); put(cache.bags, bags);
  try { put(cache.orders, await http.get<Order[]>('/me/orders')); put(cache.vouchers, await http.get<Voucher[]>('/me/vouchers')); } catch { /* signed out */ }
}

type Session = Tokens & { user: User };
// Signing in starts clean (nothing from whoever used the phone before), then loads this person's orders and vouchers.
const signIn = async (s: Session) => { forgetAccount(); await setTokens({ access: s.access, refresh: s.refresh, expiresAt: s.expiresAt }); setStore((st) => ({ ...st, session: { signedIn: true, guest: false, phone: s.user.phone, email: s.user.email } }));
  try { put(cache.orders, await http.get<Order[]>('/me/orders')); put(cache.vouchers, await http.get<Voucher[]>('/me/vouchers')); } catch { /* loaded again on the next screen */ } };

export const liveApi: Api = {
  me: () => http.get<User>('/me'),
  branch: async (id) => { const b = await http.get<Branch>(`/branches/${encodeURIComponent(id)}`); cache.branches.set(b.id, b); return b; },
  bag: async (id) => { const b = await http.get<Bag>(`/bags/${encodeURIComponent(id)}`); cache.bags.set(b.id, b); return b; },
  bags: async () => put(cache.bags, await http.get<Bag[]>('/bags')),
  homeRails: () => http.get<{ title: string; bagIds: string[] }[]>('/home/rails'),
  orders: async () => put(cache.orders, await http.get<Order[]>('/me/orders')),
  order: async (id) => { const o = await http.get<Order>(`/me/orders/${encodeURIComponent(id)}`); cache.orders.set(o.id, o); },
  vouchers: async () => put(cache.vouchers, await http.get<Voucher[]>('/me/vouchers')),
  tickets: () => http.get<Ticket[]>('/me/tickets'),
  favourites: () => http.get<string[]>('/me/favourites'),
  reviews: (branchId) => http.get<{ text: string; who: string }[]>(`/branches/${encodeURIComponent(branchId)}/reviews`),

  setFavourite: async (branchId, on) => {
    setStore((s) => ({ ...s, favBranches: on ? [...new Set([...s.favBranches, branchId])] : s.favBranches.filter((x) => x !== branchId) }));
    await (on ? http.put(`/me/favourites/${encodeURIComponent(branchId)}`, {}) : http.del(`/me/favourites/${encodeURIComponent(branchId)}`));
  },
  welcomeGift: async () => { put(cache.vouchers, await http.get<Voucher[]>('/me/vouchers')); },
  addVoucherCode: async (code) => { const v = await http.post<Voucher>('/me/vouchers', { code: code.trim().toUpperCase() }); cache.vouchers.set(v.id, v); return v; },

  // Real reservations go through payments.ts (createIntent → provider → confirm), never straight here.
  reserve: async () => { throw new Error('In live mode use payments.pay(); the server creates the order after payment.'); },

  markCollected: async (id, method = 'slider') => { const o = await http.post<Order>(`/me/orders/${encodeURIComponent(id)}/collected`, { method }); cache.orders.set(o.id, o); },
  cancelOrder: async (id) => { const o = await http.post<Order>(`/me/orders/${encodeURIComponent(id)}/cancel`, {}, { idempotent: true }); cache.orders.set(o.id, o); },
  rateOrder: async (id, rating) => { await http.post(`/me/orders/${encodeURIComponent(id)}/rating`, { rating }); },
  updateProfile: async (p) => { await http.patch('/me', p); setStore((s) => ({ ...s, profile: { ...s.profile, ...p } })); },
  updatePrefs: async (prefs) => { await http.patch('/me/preferences', prefs); setStore((s) => ({ ...s, prefs: { ...s.prefs, ...prefs } })); },
  submitTicket: (t) => http.post<Ticket>('/me/tickets', t, { idempotent: true }),
  sendFeedback: async (f: Omit<Feedback, 'id' | 'at'>) => { await http.post(f.kind === 'recommend' ? '/recommendations' : '/feedback', f, { idempotent: true }); },

  // The server sends and checks codes, rate-limits them, and issues tokens.
  requestCode: (to, channel) => http.post<{ demo: boolean }>('/auth/code', { to, channel }, { auth: false }),
  verifyCode: async (to, code) => { await signIn(await http.post<Session>('/auth/verify', { to, code }, { auth: false })); },
  login: async (id, password) => { await signIn(await http.post<Session>('/auth/login', { id, password }, { auth: false })); },
  changePassword: async (current, next) => { await http.patch('/me/password', { current, next }); },
  resetPassword: async (to, code, next) => { await signIn(await http.post<Session>('/auth/reset', { to, code, password: next }, { auth: false })); },
  signOutOtherDevices: async () => { await http.post('/auth/sessions/revoke-others'); },
  logout: async () => { try { await http.post('/auth/logout'); } finally { await setTokens(null); forgetAccount(); } },
  deleteAccount: async () => { await http.del('/me'); await setTokens(null); forgetAccount(); },
};
