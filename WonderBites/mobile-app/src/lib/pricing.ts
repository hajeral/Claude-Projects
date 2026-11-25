// Prices, service fee and voucher rules. In live mode the SERVER recalculates all of
// this and its number is the one charged; the app only previews it.
import type { Branch, Fulfilment, Voucher } from '../api/types';
import { now } from './clock';

export const SERVICE_FEE = 2;

export type VoucherCheck = { ok: true; discount: number } | { ok: false; reason: string };

/** Can this voucher be used on this order, and how much does it take off? */
export function checkVoucher(v: Voucher, subtotal: number, branch: Branch, usedIds: string[] = [], fulfilment: Fulfilment = 'pickup', deliveryFee = 0): VoucherCheck {
  if (v.state === 'used' || usedIds.includes(v.id)) return { ok: false, reason: 'Already used' };
  if (v.state === 'expired' || new Date(v.expires).getTime() < now()) return { ok: false, reason: 'Expired' };
  const forDelivery = v.kind === 'freeDelivery' || v.kind === 'percentDelivery';
  if (forDelivery && fulfilment !== 'delivery') return { ok: false, reason: 'Delivery orders only' };
  if (v.issuer !== 'WonderBites' && v.issuer !== branch.storeName) return { ok: false, reason: `Only at ${v.issuer}` };
  if (v.scope && v.scope !== 'all branches' && v.issuer === branch.storeName && v.scope !== branch.branchName) return { ok: false, reason: `Only at the ${v.scope}` };
  if (v.minSpend && subtotal < v.minSpend) return { ok: false, reason: `Spend QAR ${v.minSpend} or more` };
  let d = 0;
  if (v.kind === 'amount') d = v.value;
  if (v.kind === 'percent') d = (subtotal * v.value) / 100;
  if (v.kind === 'freeServiceFee') d = SERVICE_FEE;
  if (v.kind === 'freeDelivery') d = deliveryFee;
  if (v.kind === 'percentDelivery') d = (deliveryFee * v.value) / 100;
  if (v.maxDiscount) d = Math.min(d, v.maxDiscount);
  d = Math.min(d, subtotal + SERVICE_FEE + deliveryFee);
  return { ok: true, discount: Math.round(d * 100) / 100 };
}

export function quote(price: number, qty: number, discount = 0, deliveryFee = 0) {
  const subtotal = price * qty;
  const total = Math.max(0, subtotal + SERVICE_FEE + deliveryFee - discount);
  return { subtotal, fee: SERVICE_FEE, deliveryFee, discount, total };
}
