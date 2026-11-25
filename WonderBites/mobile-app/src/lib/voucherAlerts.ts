// Which vouchers to point out, and where:
//  • welcome / free / other new vouchers → "New" tag (Vouchers + Account), bell, checkout offer
//  • new delivery vouchers               → bell only (and offered at checkout when delivery is chosen)
//  • any voucher expiring within 3 days  → bell reminder and checkout offer, so it isn't missed
// "Seen" is remembered per account; push notifications use the same rules later (server side).
import type { Voucher } from '../api/types';
import { now } from './clock';
import { dayDiff } from './format';
import { getState, setStore } from '../state/store';

export const isDeliveryVoucher = (v: Voucher) => v.kind === 'freeDelivery' || v.kind === 'percentDelivery';
const usable = (v: Voucher) => v.state === 'available' && new Date(v.expires).getTime() > now();
/** Calendar days left in Doha (expires on the 22nd, today the 20th → 2) */
export const daysLeft = (v: Voucher) => Math.max(0, dayDiff(v.expires));
export const isExpiringSoon = (v: Voucher) => usable(v) && daysLeft(v) <= 3;

export function voucherNews(list: Voucher[], seen: string[], bellSeen: string[]) {
  const fresh = list.filter((v) => usable(v) && !seen.includes(v.id));
  const tagged = fresh.filter((v) => !isDeliveryVoucher(v));
  const expiring = list.filter(isExpiringSoon);
  const bell = [...fresh, ...expiring.filter((v) => !fresh.includes(v))].filter((v) => !bellSeen.includes(`${v.id}:${isExpiringSoon(v) ? 'exp' : 'new'}`));
  return { fresh, tagged, expiring, bell };
}
export const markVouchersSeen = (ids: string[]) => setStore((s) => ({ ...s, seenVouchers: [...new Set([...s.seenVouchers, ...ids])] }));
export const markBellSeen = (list: Voucher[]) => setStore((s) => ({ ...s, bellSeen: [...new Set([...s.bellSeen, ...list.map((v) => `${v.id}:${isExpiringSoon(v) ? 'exp' : 'new'}`)])] }));
export const isSeen = (id: string) => getState().seenVouchers.includes(id);

/** The short message for the bell. */
export function bellMessage(v: Voucher, value: string) {
  if (isExpiringSoon(v)) { const d = daysLeft(v); return d === 0 ? `Your ${value} voucher expires today. Use it before it’s gone.` : d === 1 ? `Your ${value} voucher expires tomorrow.` : `Your ${value} voucher expires in ${d} days.`; }
  if (v.tag === 'welcome') return 'Your welcome gift is waiting';
  if (isDeliveryVoucher(v)) return `New delivery voucher: ${value}`;
  return `New voucher: ${value}`;
}

/** The checkout suggestion: expiring first, then welcome / gift / delivery vouchers. */
export function offerLine(v: Voucher, value: string) {
  if (isExpiringSoon(v)) { const d = daysLeft(v); return d === 0 ? `Your ${value} voucher expires today. Use it now?` : d === 1 ? `Your ${value} voucher expires tomorrow. Use it now?` : `Your ${value} voucher expires in ${d} days. Use it now?`; }
  if (v.tag === 'welcome') return `Use your ${value} welcome gift?`;
  if (isDeliveryVoucher(v)) return `Use your ${value} voucher?`;
  return `Use your ${value} gift voucher?`;
}
export const offerRank = (v: Voucher) => (isExpiringSoon(v) ? 0 : v.tag === 'welcome' ? 1 : v.tag === 'gift' ? 2 : isDeliveryVoucher(v) ? 3 : 9);

/** Short value for messages: "QAR 10", "20%", "free delivery"… */
export function valueLabel(v: Voucher) {
  switch (v.kind) {
    case 'amount': return `QAR ${v.value}`;
    case 'percent': return `${v.value}%`;
    case 'percentDelivery': return `${v.value}% delivery`;
    case 'freeDelivery': return 'free delivery';
    case 'freeServiceFee': return 'free service fee';
  }
}
