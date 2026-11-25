// DEMO implementation of the API: sample catalogue from ./mock plus everything the
// customer did, from the local store. No network, no real payment, no real SMS.
// It follows the same rules the server must enforce (stock, quantity, voucher rules,
// one order per tap) so the demo behaves like the real thing.
import * as mock from './mock';
import type { Bag, Branch, DeliveryAddress, Fulfilment, Order, Ticket, User, Voucher } from './types';
import { getState, setStore, type Feedback } from '../state/store';
import { now } from '../lib/clock';
import { checkVoucher, quote } from '../lib/pricing';
import { cancelUntil, isEnded } from '../lib/orders';

export class DemoError extends Error { constructor(public code: string, message: string) { super(message); } }
const wait = <T,>(v: T, ms = 0) => new Promise<T>((r) => setTimeout(() => r(v), ms));
const DAY = 86400000;

/** Sample pickup windows move to the next day once they have ended, so the demo always has live bags. */
function roll<T extends { pickupStart: string; pickupEnd: string }>(x: T): T {
  let s = new Date(x.pickupStart).getTime(), e = new Date(x.pickupEnd).getTime();
  while (e < now()) { s += DAY; e += DAY; }
  return { ...x, pickupStart: new Date(s).toISOString(), pickupEnd: new Date(e).toISOString() };
}

const placed = new Map<string, Order>();
function sampleWindow(o: Order): Order {
  if (o.status !== 'paid' && o.status !== 'reserved') return o;
  if (!placed.has(o.id)) {
    const r = roll(o);
    const shift = new Date(r.pickupStart).getTime() - new Date(o.pickupStart).getTime();
    placed.set(o.id, shift && o.freeCancelUntil ? { ...r, freeCancelUntil: new Date(new Date(o.freeCancelUntil).getTime() + shift).toISOString() } : r);
  }
  return placed.get(o.id)!;
}

// Codes the demo recognises in "Add a voucher code" (the server validates real ones)
const CODE_POOL: Voucher[] = [
  { id: 'v-welcome10', kind: 'amount', value: 10, code: 'WELCOME10', issuer: 'WonderBites', scope: '', expires: '2027-03-31T23:59:00+03:00', state: 'available' },
  { id: 'v-fresh20', kind: 'percent', value: 20, code: 'FRESH20', maxDiscount: 8, issuer: 'WonderBites', scope: '', expires: '2027-03-31T23:59:00+03:00', state: 'available' },
  { id: 'v-nofee', kind: 'freeServiceFee', value: 0, code: 'NOFEE', issuer: 'WonderBites', scope: '', expires: '2027-03-31T23:59:00+03:00', state: 'available' },
];

export const demoSync = {
  branches: (): Branch[] => mock.branches,
  findBranch: (id?: string) => mock.branches.find((b) => b.id === id),
  bags: (): Bag[] => mock.bags.map((b) => { const r = roll(b); const left = getState().stock[b.id]; return left === undefined ? r : { ...r, bagsLeft: left }; }),
  findBag: (id?: string) => demoSync.bags().find((b) => b.id === id),
  orders: (): Order[] => {
    const st = getState();
    // A bought order keeps its own pickup window: only the sample orders are placed on
    // upcoming days, once when the app opens, so the demo starts with live examples.
    const sample = mock.orders.map((o) => ({ ...sampleWindow(o), ...st.orderPatches[o.id] }));
    return [...st.orders, ...sample];
  },
  findOrder: (id?: string) => demoSync.orders().find((o) => o.id === id),
  vouchers: (): Voucher[] => {
    const st = getState();
    return [...st.addedVouchers, ...mock.vouchers].map((v) => (st.usedVouchers.includes(v.id) ? { ...v, state: 'used' as const } : v));
  },
  findVoucher: (id?: string) => demoSync.vouchers().find((v) => v.id === id),
};

export const demoApi = {
  me: async (): Promise<User> => ({ ...mock.user, ...getState().profile }),
  branch: async (id: string) => demoSync.findBranch(id),
  bag: async (id: string) => demoSync.findBag(id),
  bags: async () => demoSync.bags(),
  homeRails: async () => mock.homeRails,
  orders: async () => demoSync.orders(),
  order: async (id: string) => demoSync.findOrder(id),
  vouchers: async () => demoSync.vouchers(),
  tickets: async (): Promise<Ticket[]> => [...getState().tickets, ...mock.tickets],
  favourites: async () => getState().favBranches,
  reviews: async (_branchId: string) => mock.reviews,

  setFavourite: async (branchId: string, on: boolean) =>
    setStore((s) => ({ ...s, favBranches: on ? [...new Set([...s.favBranches, branchId])] : s.favBranches.filter((x) => x !== branchId) })),

  /** A new account gets its welcome voucher (the server does this itself when live). */
  welcomeGift: async () => {
    const id = 'v-welcome-gift';
    if (getState().addedVouchers.some((v) => v.id === id)) return;
    const v: Voucher = { id, kind: 'amount', value: 10, code: 'HELLO10', issuer: 'WonderBites', scope: '', expires: new Date(now() + 30 * DAY).toISOString(), state: 'available', tag: 'welcome', addedAt: new Date(now()).toISOString() };
    setStore((s) => ({ ...s, addedVouchers: [v, ...s.addedVouchers], seenVouchers: s.seenVouchers.filter((x) => x !== id), bellSeen: s.bellSeen.filter((x) => !x.startsWith(id)) }));
  },
  addVoucherCode: async (code: string): Promise<Voucher> => {
    const c = code.trim().toUpperCase();
    if (!c) throw new DemoError('empty', 'Enter a voucher code');
    if (demoSync.vouchers().some((v) => v.code === c)) throw new DemoError('exists', 'This voucher is already in your list');
    const v = CODE_POOL.find((x) => x.code === c);
    if (!v) throw new DemoError('invalid', 'This code isn’t valid');
    setStore((s) => ({ ...s, addedVouchers: [v, ...s.addedVouchers] }));
    return v;
  },

  /** Reserve a bag. Validates stock, quantity, pickup window and voucher; creates ONE unique order. */
  reserve: async (input: { bagId: string; quantity: number; payWith: Order['paidWith']; voucherId?: string; fulfilment?: Fulfilment; deliverTo?: DeliveryAddress }): Promise<Order> => {
    const bag = demoSync.findBag(input.bagId);
    if (!bag) throw new DemoError('not_found', 'This bag is no longer available');
    const br = demoSync.findBranch(bag.branchId)!;
    const q = Math.floor(input.quantity);
    if (bag.bagsLeft <= 0) throw new DemoError('sold_out', 'Sold out. Check back tomorrow');
    if (!(q >= 1) || q > bag.bagsLeft) throw new DemoError('quantity', `Only ${bag.bagsLeft} left`);
    if (new Date(bag.pickupEnd).getTime() <= now()) throw new DemoError('ended', 'Pickup for this bag has ended');
    const delivery = input.fulfilment === 'delivery';
    if (delivery && !br.delivery) throw new DemoError('no_delivery', 'This shop doesn’t deliver');
    if (delivery && !input.deliverTo) throw new DemoError('address', 'Choose where to deliver');
    const fee = delivery ? br.delivery!.fee : 0;
    let discount = 0;
    if (input.voucherId) {
      const v = demoSync.findVoucher(input.voucherId);
      const c = v ? checkVoucher(v, bag.price * q, br, getState().usedVouchers, delivery ? 'delivery' : 'pickup', fee) : { ok: false as const, reason: 'Voucher not found' };
      if (!c.ok) throw new DemoError('voucher', c.reason);
      discount = c.discount;
    }
    const p = quote(bag.price, q, discount, fee);
    const st = getState();
    const no = st.nextOrderNo;
    const order: Order = {
      id: `0974-${no}`, ref: `#WB-${2100 + (no % 1000)}`, bagId: bag.id, branchId: bag.branchId, quantity: q, status: 'paid',
      price: bag.price * q, originalPrice: bag.originalPrice * q, serviceFee: p.fee, total: p.total, paidWith: input.payWith,
      pin: String(1000 + Math.floor(Math.random() * 9000)), qrPayload: `WB-DEMO-0974-${no}`,
      pickupStart: bag.pickupStart, pickupEnd: bag.pickupEnd, freeCancelUntil: new Date(new Date(bag.pickupStart).getTime() - 2 * 3600000).toISOString(),
      ...(delivery ? { fulfilment: 'delivery' as const, deliveryFee: fee, deliverTo: input.deliverTo } : { fulfilment: 'pickup' as const }),
    };
    setStore((s) => ({
      ...s,
      orders: [order, ...s.orders],
      stock: { ...s.stock, [bag.id]: bag.bagsLeft - q },
      usedVouchers: input.voucherId ? [...s.usedVouchers, input.voucherId] : s.usedVouchers,
      appliedVoucher: undefined,
      nextOrderNo: no + 1,
    }));
    return wait(order, 900); // short pause like a real payment confirmation
  },

  /** The customer slid (or the shop validated the PIN/QR): pickup → collected, delivery → delivered. */
  markCollected: async (orderId: string, method: 'slider' | 'pin' | 'qr' = 'slider') => {
    const o = demoSync.findOrder(orderId); const at = new Date(now()).toISOString();
    return patchOrder(orderId, { status: o?.fulfilment === 'delivery' ? 'delivered' : 'collected', collectedAt: at, confirmedAt: at, confirmedBy: method === 'slider' ? 'customer' : 'merchant', confirmMethod: method });
  },
  rateOrder: async (orderId: string, rating: number) => patchOrder(orderId, { rating }),
  /** Free cancellation until freeCancelUntil; puts the bag back in stock and refunds in full. */
  cancelOrder: async (orderId: string) => {
    const o = demoSync.findOrder(orderId);
    if (!o || (o.status !== 'paid' && o.status !== 'reserved')) throw new DemoError('state', 'This order can’t be cancelled');
    if (isEnded(o)) throw new DemoError('ended', 'The pickup window for this order has ended');
    if (new Date(cancelUntil(o)).getTime() < now()) throw new DemoError('late', 'Free cancellation has ended for this order');
    const left = demoSync.findBag(o.bagId)?.bagsLeft ?? 0;
    setStore((s) => ({ ...s, stock: { ...s.stock, [o.bagId]: left + o.quantity } }));
    return patchOrder(orderId, { status: 'cancelled', cancelledBy: 'you', refund: o.total });
  },

  updateProfile: async (p: Partial<User> & { photo?: string }) => setStore((s) => ({ ...s, profile: { ...s.profile, ...p } })),
  updatePrefs: async (prefs: Record<string, boolean>) => setStore((s) => ({ ...s, prefs: { ...s.prefs, ...prefs } })),

  submitTicket: async (t: { orderId?: string; issue: string; details: string; reach: string; photos?: string[] }): Promise<Ticket> => {
    const o = t.orderId ? demoSync.findOrder(t.orderId) : undefined;
    const br = o ? demoSync.findBranch(o.branchId) : undefined;
    const id = `#T-${2100 + getState().tickets.length + 1}`;
    const ticket: Ticket = { id, title: t.issue, status: 'open', statusText: 'Saved in demo · not sent', meta: [br ? `${br.storeName} · ${br.area}` : 'General', id, 'today'].join(' · '), orderId: t.orderId, details: t.details, reach: t.reach, photos: t.photos, createdAt: new Date().toISOString() };
    setStore((s) => ({ ...s, tickets: [ticket, ...s.tickets] }));
    return ticket;
  },
  sendFeedback: async (f: Omit<Feedback, 'id' | 'at'>) => setStore((s) => ({ ...s, feedback: [{ ...f, id: `f${Date.now()}`, at: new Date().toISOString() }, ...s.feedback] })),

  // Auth (demo): no SMS or email is sent. Any 4 digits are accepted as the code.
  requestCode: async (_to: string, _channel: 'sms' | 'whatsapp' | 'email') => ({ demo: true }),
  verifyCode: async (to: string, code: string) => {
    setStore((s) => ({ ...s, session: { signedIn: true, guest: false, phone: to.includes('@') ? s.session.phone : to, email: to.includes('@') ? to : s.session.email } }));
  },
  login: async (id: string, password: string) => {
    setStore((s) => ({ ...s, session: { signedIn: true, guest: false, email: id.includes('@') ? id : undefined, phone: id.includes('@') ? undefined : id } }));
  },
  changePassword: async (current: string, next: string) => {
  },
  resetPassword: async (to: string, _code: string, next: string) => {
    setStore((s) => ({ ...s, session: { signedIn: true, guest: false, phone: to } }));
  },
  signOutOtherDevices: async () => {},
  logout: async () => setStore((s) => ({ ...s, session: { signedIn: false, guest: false } })),
  deleteAccount: async () => setStore((s) => ({ ...s, session: { signedIn: false, guest: false } })),
};

function patchOrder(id: string, p: Partial<Order>) {
  setStore((s) => {
    if (s.orders.some((o) => o.id === id)) return { ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, ...p } : o)) };
    return { ...s, orderPatches: { ...s.orderPatches, [id]: { ...s.orderPatches[id], ...p } } };
  });
  return Promise.resolve();
}

export type Api = typeof demoApi;
