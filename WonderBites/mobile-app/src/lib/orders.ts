// Order rules shared by My orders, the pickup passport and the demo API.
// The server applies the same rules with its own clock; these only decide what the app shows.
import type { Order } from '../api/types';
import { now } from './clock';

const HOUR = 3600000;
/** Free cancellation ends 2 hours before the pickup window opens (or at the time the server sends). */
export const cancelUntil = (o: Order) => o.freeCancelUntil ?? new Date(new Date(o.pickupStart).getTime() - 2 * HOUR).toISOString();
export const isOpenOrder = (o: Order) => o.status === 'paid' || o.status === 'reserved';
/** Paid or reserved, but the pickup window has passed without a collection. */
export const isEnded = (o: Order) => isOpenOrder(o) && new Date(o.pickupEnd).getTime() < now();
export const isDelivery = (o: Order) => o.fulfilment === 'delivery';
/** Collected (pickup) or delivered (delivery) */
export const isDone = (o: Order) => o.status === 'collected' || o.status === 'delivered';
export const canCancel = (o: Order) => isOpenOrder(o) && now() < new Date(cancelUntil(o)).getTime();
