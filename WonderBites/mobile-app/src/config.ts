// One switch between the local demo and the real WonderBites platform.
// Set these in eas.json (build profiles) or a .env file — never commit secrets:
//   EXPO_PUBLIC_API_URL          e.g. https://api.wonderbites.qa/v1   (empty = demo mode)
//   EXPO_PUBLIC_PAYMENT_PROVIDER e.g. "server" (live) or "demo"
// Only PUBLIC values belong here: the app holds no secret keys. Secret keys for the
// payment provider and SMS provider live on the server.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
export const LIVE = API_URL.length > 0;
/** Demo build: sign-in and sign-up accept anything (empty fields too) so testers can get straight in. */
export const DEMO = !LIVE;
export const PAYMENT_PROVIDER = (process.env.EXPO_PUBLIC_PAYMENT_PROVIDER ?? (LIVE ? 'server' : 'demo')) as 'demo' | 'server';
export const REQUEST_TIMEOUT_MS = 15000;
/** WonderBites customer support line, e.g. +974 4xxx xxxx (EXPO_PUBLIC_SUPPORT_PHONE). Empty = hide calling. */
export const SUPPORT_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '';
/** Usual support reply time shown to customers, e.g. "2 hours" (EXPO_PUBLIC_SUPPORT_REPLY_TIME).
 *  Comes from the Admin Portal settings once that connection exists. Empty = no time is promised. */
export const SUPPORT_REPLY_TIME = process.env.EXPO_PUBLIC_SUPPORT_REPLY_TIME ?? '';
