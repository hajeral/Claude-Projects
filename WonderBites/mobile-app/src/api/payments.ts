// Payment flow. The app never decides a payment succeeded and never sees card numbers.
//
//   1. createIntent  → the SERVER prices the order (bag, quantity, voucher) and holds stock
//   2. provider      → the payment provider's own sheet (Apple Pay / Google Pay / card + 3-D Secure)
//   3. confirm       → the SERVER verifies the payment with the provider (and its webhook)
//   4. poll          → the app waits until the server says the order is "paid", then shows the passport
//
// Demo mode runs the same steps locally and takes no money.
import { rememberOrder } from './live';
import { PAYMENT_PROVIDER } from '../config';
import { http } from './http';
import { demoApi } from './demo';
import type { DeliveryAddress, Fulfilment, Order } from './types';

export type PayMethod = Order['paidWith'];
export type PayInput = { bagId: string; quantity: number; payWith: PayMethod; voucherId?: string; fulfilment?: Fulfilment; deliverTo?: DeliveryAddress };
export type Intent = { intentId: string; amount: number; currency: 'QAR'; provider: string; providerPayload: Record<string, unknown> };
export type ProviderResult = { status: 'authorized'; providerToken: string } | { status: 'cancelled' } | { status: 'failed'; message?: string };

/**
 * The bridge to your payment provider's SDK. Implement `present` with the provider's
 * React Native SDK (it receives what your server returned in providerPayload) and
 * register it with setPaymentProvider() at app start. Native payment SDKs need a
 * development build: they do not run in Expo Go.
 */
export interface PaymentProvider { present(intent: Intent, method: PayMethod): Promise<ProviderResult> }

let provider: PaymentProvider | null = null;
export const setPaymentProvider = (p: PaymentProvider) => { provider = p; };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function pay(input: PayInput): Promise<Order> {
  if (PAYMENT_PROVIDER === 'demo') return demoApi.reserve(input);
  if (!provider) throw new Error('Payment provider not set up. Call setPaymentProvider() at app start.');
  const intent = await http.post<Intent>('/checkout/intents', { bagId: input.bagId, quantity: input.quantity, method: input.payWith, voucherId: input.voucherId, fulfilment: input.fulfilment ?? 'pickup', deliverTo: input.deliverTo }, { idempotent: true });
  const r = await provider.present(intent, input.payWith);
  if (r.status === 'cancelled') throw Object.assign(new Error('Payment cancelled'), { code: 'cancelled' });
  if (r.status === 'failed') throw Object.assign(new Error(r.message ?? 'Payment failed. You have not been charged.'), { code: 'failed' });
  let order = await http.post<Order>(`/checkout/intents/${intent.intentId}/confirm`, { providerToken: r.providerToken }, { idempotent: true });
  for (let i = 0; order.status !== 'paid' && i < 15; i++) { await sleep(2000); order = await http.get<Order>(`/me/orders/${order.id}`); }
  if (order.status !== 'paid') throw Object.assign(new Error('We’re still confirming your payment. Check My orders in a minute.'), { code: 'pending' });
  return rememberOrder(order);
}
