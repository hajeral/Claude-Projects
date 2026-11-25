# WonderBites customer app: connecting it to the platform

The app runs in two modes from the same code:

| Mode | How | What happens |
|---|---|---|
| **Demo** (default) | `EXPO_PUBLIC_API_URL` empty | Sample Doha data. Orders, favourites, profile, settings, vouchers and tickets are saved on the phone (AsyncStorage key `wb.demo.v1`). No money is taken, no code is sent, nothing leaves the phone. Screens say so. |
| **Live** | `EXPO_PUBLIC_API_URL=https://…/v1` | Every read and write goes to the endpoints below. Tokens are kept in the device keychain. Payment goes through your provider. |

Screens never call `fetch` themselves. They use `api` and `sync` from `src/api/client.ts`. That file picks
`src/api/demo.ts` or `src/api/live.ts`. **Integration is done in `live.ts`, `payments.ts` and your server: no
screen needs to change.** Types are in `src/api/types.ts`. They are the contract for every response.

## Environment variables

| Variable | Example | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.wonderbites.qa/v1` | Empty = demo mode |
| `EXPO_PUBLIC_PAYMENT_PROVIDER` | `server` | `server` in live, `demo` for the local flow |
| `EXPO_PUBLIC_SUPPORT_PHONE` | `+974 4xxx xxxx` | Help → Call. Empty = the app offers chat instead |
| `GOOGLE_MAPS_ANDROID_KEY` | `AIza…` | Build-time only (read by `app.config.js`). Needed for Android builds of the search map. Expo Go works without it |
| `GOOGLE_MAPS_IOS_KEY` | `AIza…` | Build-time only, optional. With it the iPhone shows the same brand-styled Google map; without it the iPhone shows Apple Maps (light) |
| `EXPO_PUBLIC_SUPPORT_REPLY_TIME` | `2 hours` | The usual support reply time shown on Help, tickets and the ticket confirmation. Empty = no time is promised. Will move to the Admin Portal settings. |

`EXPO_PUBLIC_*` values are bundled into the app and are public. **Never put a secret key in them** (payment
secret keys, SMS keys, admin tokens). Those stay on the server.

## Endpoints the app calls (`src/api/live.ts`)

All bodies are JSON. Times are ISO-8601 UTC; the app shows them in Doha time (Asia/Qatar, UTC+3) whatever the
phone's time zone is. Money is a number in QAR.

**Start-up cache** (`bootstrapLive`, called once in `_layout.tsx`):
`GET /branches` · `GET /bags` · `GET /me/orders` · `GET /me/vouchers`

**Catalogue**
- `GET /bags` → `Bag[]` · `GET /bags/:id` → `Bag` · `GET /branches/:id` → `Branch`
- `GET /home/rails` → rails for the home screen · `GET /branches/:id/reviews`

**Account**
- `GET /me` · `PATCH /me` (name, email, phone, birthday, photo) · `DELETE /me`
- `PATCH /me/preferences` (notification switches, quiet hours)
- Saved places (coming in a later step): `{ id, label, kind: home|work|gym|family|study|other, area, detail }`. The first place is the customer's default.
- `GET /me/favourites` · `PUT /me/favourites/:branchId` · `DELETE /me/favourites/:branchId`

**Orders**
- `GET /me/orders` · `GET /me/orders/:id`
- `POST /me/orders/:id/collected` · `POST /me/orders/:id/cancel` · `POST /me/orders/:id/rating`

**Vouchers**: `GET /me/vouchers` · `POST /me/vouchers {code}` (add a code)

**Support**: `GET /me/tickets` · `POST /me/tickets` · `POST /feedback` · `POST /recommendations`

**Sign-in**
- `POST /auth/code {to, channel: sms|whatsapp|email}` · `POST /auth/verify {to, code}`
- `POST /auth/login {id, password}` · `POST /auth/reset {to, code, password}`
- `POST /auth/refresh {refreshToken}` · `POST /auth/logout` · `POST /auth/sessions/revoke-others`
- `PATCH /me/password {current, next}` (the app sends exactly this)
- verify / login / reset return `{ access, refresh, expiresAt, user }`

**Delivery and voucher tests**: `tests/step5.py` (33 checks) covers both.

**Phone numbers**: the app sends numbers with their country code, for example `+974 5512 3456` or `+971 501234567`. The customer can pick any country. The default is the country of the phone's time zone, then its region setting, then Qatar. The server should validate the number for its country.

**Home quick filters**: Home's chips (Tomorrow, shop types, categories) set the same `Filters` as the Filters screen (`day`, `shopTypes`, `category`), so `GET /bags` with those filters returns the same bags.

**Errors**: return `{ code, message }` with a 4xx/5xx status. The app shows `message` to the user, so write it
for the customer (English and Arabic, chosen by the `Accept-Language` header). Timeouts (15 s) and no
connection have their own messages already.

## Security: what the app already does

- Access and refresh tokens are stored with **expo-secure-store** (Keychain / Keystore,
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY`). On web they stay in memory only. They are never put in AsyncStorage.
- Every request sends `Authorization: Bearer …`. The token is renewed 30 s before it expires, or once after a
  401, and the request is retried. **A request renews at most once:** if the new token is refused too, or the
  renewal fails, the person is signed out.
- **Sign-out, account deletion and a failed renewal clear everything about the person on the phone:** cached
  orders and vouchers, profile, favourites, saved places, tickets and recent searches. Signing in starts from
  an empty account and loads only that person's orders and vouchers. A full list from the server always
  replaces what was cached.
- A paid order goes into the cache as soon as payment is confirmed, so the pickup passport opens at once.
- Writes that move money or create records send an **`Idempotency-Key`** header. The checkout button also has
  a lock, so a double tap cannot create two orders.
- Passwords, OTP codes and card numbers are **never stored** on the phone.
- The app has no secret keys. Prices and voucher discounts on screen are only a preview: the server
  calculates the real amount.

## Security: what the server must do

1. **Calculate every amount itself**: price × quantity − voucher + service fee. Never trust a total from the
   app. The rules the app previews are in `src/lib/pricing.ts` (one voucher, minimum spend, shop/branch scope,
   expiry, delivery-only, maximum discount).
2. **Hold stock when the payment intent is created.** Release it if the payment fails or times out, so a bag
   can't be sold twice.
3. **Store `Idempotency-Key`s** for at least 24 h. A repeated key returns the first result.
4. OTP: 4 digits, 5-minute life, at most 5 tries, rate-limited by phone number and by IP.
5. Short-lived access tokens (≈15 min) and rotating refresh tokens. `revoke-others` removes every other session.
6. Only return orders, tickets and vouchers that belong to the signed-in user (`/me/...`). A wrong id returns
   404, and the app then shows its "We couldn't find this order" screen.
7. The pickup PIN and QR payload are created on the server. The shop checks them on the merchant platform.
8. Use TLS 1.2 or later everywhere. Certificate pinning is optional and needs a development build.

## Pickup confirmation

1. **Normally:** at the counter the customer shows the passport ("Show this screen to the staff, then slide once your bag is in hand.") and slides **"Slide to confirm pickup"** while the staff member watches, then gets the bag. The app calls `POST /me/orders/:id/collected`.
2. **If the app has a problem:** the customer shows the QR code and PIN. The shop completes the order from the Merchant Portal by scanning the QR (`qrPayload`) or typing the PIN. Suggested endpoint: `POST /merchant/orders/:id/collect {pin | qrPayload}`. The QR and PIN must be single-use.
3. **The customer's app follows the server:** while the pickup passport is open it re-reads `GET /me/orders/:id` every 8 seconds and moves to the completed screen when `status` is `collected`.
4. **Nobody slid:** after the pickup window ends the app shows "Pickup ended · Get help" for 24 hours. The server then closes the order as completed unless a support ticket was opened for it.
5. **Free cancellation** ends 2 hours before the window opens (`freeCancelUntil`). The app shows the cutoff and, after it, "Free cancellation ended at HH:MM · Need help?". The server enforces the same rule in `POST /me/orders/:id/cancel`.

## Delivery

- A shop that delivers has `delivery: { fee, minSpend? }` on its `Branch` (set in the Merchant Portal). No `delivery` = pickup only: the app shows no delivery option, label or filter match for it.
- Checkout offers **Pickup / Delivery** only for those shops. Delivery adds the shop's fee to the total and sends `fulfilment: "delivery"` and `deliverTo: { label, area, detail }` (one of the customer's saved places) to `POST /checkout/intents`. The server re-prices it, fee included.
- The shop delivers **during the same window** as pickup. Delivery vouchers (`freeDelivery`, `percentDelivery`) only apply to delivery orders.
- **Confirmation uses the pickup mechanism:** same passport screen, same QR + PIN. The customer slides "Slide to confirm delivery received" → `POST /me/orders/:id/collected { method: "slider" }` → status `delivered`. If the app can't be used, the shop validates the PIN/QR in the Merchant Portal (`confirmedBy: "merchant"`, `confirmMethod: "pin" | "qr"`).
- **A delivery is never completed automatically.** After its window it stays under "To collect" with the slider and "Didn't arrive? Get help" until the customer confirms or opens a ticket.
- The server records `confirmedAt`, `confirmedBy` (`customer` | `merchant`) and `confirmMethod` (`slider` | `pin` | `qr`) on every order, pickup and delivery.

## Voucher alerts

| Voucher | "New" tag (Vouchers, Account) | Bell | Push (later) | Offered at checkout |
|---|---|---|---|---|
| Welcome (`tag: "welcome"`) and gift (`tag: "gift"`) vouchers | ✓ | ✓ | ✓ | ✓ |
| Delivery vouchers | — | ✓ | ✓ | ✓, delivery orders only |
| Any voucher in its last 3 days | — | ✓ reminder | ✓ | ✓, first in line |

- A new account gets its welcome voucher from the server (the app calls `GET /me/vouchers` after sign-up). Send `tag` and `addedAt` with vouchers.
- "Seen" is kept on the phone for now; it can move to the account later so it follows the customer across phones.

## Search map

The search tab shows a real map (`react-native-maps`, `src/components/map/MapLayer.native.tsx`).
The web preview can't run it, so it shows the same look drawn from Doha coordinates (`MapLayer.tsx`).

- **Pins come from coordinates.** Each shop shows one animated stamp at its branch `lat` / `lng`. If a shop has
  several bags, the stamp shows the bag that comes first in the chosen sort. **Send `lat` and `lng` with every branch.**
  A new restaurant shows on the map as soon as the backend returns it.
- **Stamp size follows the zoom:** small when zoomed out (more than ~7.5 km across the screen), regular, and
  big when zoomed in (less than ~2.6 km). Sizes and limits are in `src/lib/mapGeo.ts`.
- **Doha landmarks** (Museum of Islamic Art, Corniche dhows, Souq Waqif, Katara, The Pearl) show only while the
  map shows 4 km or more across, so they fade away when someone zooms in.
- **Always cream & rose.** A plum night style also exists (`NIGHT_STYLE`, `isNight()`), switched off for now.
- **Map colours** are set in `CREAM_STYLE` and `NIGHT_STYLE` in `src/lib/mapGeo.ts`. Shop and business icons from
  Google are hidden so only WonderBites stamps show.
- **Keys:** create Google Maps keys (Maps SDK for Android, and Maps SDK for iOS if wanted) restricted to the app
  package `qa.wonderbites.app`, and set them as build secrets (see Environment variables).

## Payments (`src/api/payments.ts`)

The app never decides that a payment succeeded.

```
1. POST /checkout/intents {bagId, quantity, method, voucherId}   → { intentId, amount, currency, provider, providerPayload }
       server prices the order, holds the stock, creates the provider payment
2. provider.present(intent, method)                               → the provider's own sheet (Apple Pay / Google Pay / card + 3-D Secure)
3. POST /checkout/intents/:id/confirm {providerToken}             → Order
       server checks the payment with the provider (and its webhook)
4. GET /me/orders/:id until status is "paid" (up to 30 s)        → app opens the Pickup passport
```

Connect your provider (for example Stripe, Checkout.com, Tap, SkipCash, QPay or another Qatar gateway) by
implementing one interface and registering it at start-up:

```ts
import { setPaymentProvider } from './src/api/payments';
setPaymentProvider({
  async present(intent, method) {
    // open the provider SDK with intent.providerPayload (client secret / session id)
    // return { status: 'authorized', providerToken } | { status: 'cancelled' } | { status: 'failed', message }
  },
});
```

- Card details are entered only in the provider's sheet. They never reach WonderBites code. This keeps the app
  out of PCI scope (SAQ A).
- Cancelled payments show no error. A failed payment says "You have not been charged". If the payment is still
  pending, the app tells the customer to check My orders.
- Refunds after a cancellation are done by the server through the provider. The app only calls
  `POST /me/orders/:id/cancel`.
- Native payment SDKs and Apple Pay merchant IDs need a **development build** (`eas build`). They don't run in
  Expo Go.

## Device features

| Feature | Status |
|---|---|
| Photo picker (profile, feedback, tickets) | Works (`expo-image-picker`), permission texts in `app.json` |
| Current location (nearest Doha area) | Works (`expo-location`). Outside Doha, it falls back to "all Doha" |
| Copy code / address, share, call shop, directions | Works |
| Push notifications | Not connected. The settings are saved and the screen says so. Add `expo-notifications` and send the push token to `PATCH /me/preferences` |
| Apple / Google sign-in | The buttons explain that these come later. They need a development build and the provider setup |
| Search map | Real map (`react-native-maps`). See Search map |

## Checks already run on this build

- `npx tsc --noEmit`: no errors
- `npx expo export --platform android`: Android bundle compiles (Hermes)
- Every screen opened in English and Arabic: no runtime errors
- Live-mode safety test (`tests/live`): 13/13 checks against a simulated server (payment cache, logout and
  delete clearing all data, a second account seeing only its own orders, one token renewal per request, PATCH for
  password).
- End-to-end browser test (`tests/e2e.py`): 33/33 checks pass. It covers two checkouts creating two correct
  orders, collecting one order without changing the other, a voucher code lowering the total, filters changing
  results, favourites/profile/notification settings surviving a reload, six invalid links showing not-found
  screens, and Arabic RTL on nine screens.

- Search map checks (`tests/map.py`, web preview): 16/16. Stamps grow when zoomed in and shrink when zoomed
  out, landmarks hide when zoomed in and come back, two-finger scroll moves the map, the cream & rose colours day and night, no errors.

- Full audit (21 Nov 2026): 59 screens opened in English and Arabic (no errors, no missing Arabic, no clipped
  text except the known Location tags and "Choose date"); about 600 buttons tapped; live mode opened with the
  server switched off (see "Before release").

## Before release

- Remove the developer screen list (`src/app/screens.tsx`, opened at `/screens`).
- Live mode needs loading, error and retry states: with no connection, Account is blank, Home and the map show
  empty lists, a shop link says "This bag isn't available", and Orders shows an empty "Recently collected" title.
- Bag photos and shop logos from the backend (`photoUrl`, `logoUrl`) and Arabic shop names are not read yet.
- Push notifications, Apple / Google sign-in, saved places and photo upload still need their connections.

**Not checked here** (needs a phone and signing keys): a physical Android or iPhone (including the real search map), a signed release build,
real payment-provider sheets, and push delivery.
