# WonderBites — customer app (React Native + Expo)

Surprise-bag marketplace for Doha: shops sell end-of-day food at 50–70% off, pickup only.
This project is the full customer app built from the final design — all 52 screens, navigation and motion — with a
mock data layer shaped for the WonderBites merchant platform API.

## Run it

```bash
npm install
npx expo start          # press i (iOS simulator), a (Android) or scan the QR with Expo Go
npx expo start --web    # browser preview
npm run typecheck
```

Open **/screens** (e.g. `npx expo start --web`, then `localhost:8081/screens`) for a list of every design screen
(E01–E15, F01, M01–M13, P01–P19) with a link to each.

Stack: Expo SDK 58 · React Native 0.88 · TypeScript · expo-router · Reanimated 4 · react-native-svg ·
Gesture Handler 3 · expo-image · DM Serif Display + Figtree. Everything used runs in Expo Go.

## Project layout

```
src/app/            one file per screen (expo-router). (tabs)/ = Home, Search map, Favourites, Orders, Account
src/components/     design system: ui.tsx (buttons, chips, rows, fields, toggles…), Halo (curved plum header),
                    PriceTag (swing tag + rotating stamp), BagCard, MapPin, Skyline (Welcome light trails),
                    AnimatedMark (splash logo), NightMap (Location), Sheet, Slider, OrderCard, VoucherCard…
src/theme/          colours, type scale, radii, shadows — taken 1:1 from the design
src/api/types.ts    data shapes the app expects from the backend
src/api/client.ts   THE ONLY PLACE THAT TALKS TO THE BACKEND
src/api/mock.ts     sample data used until the API is connected
src/lib/            formatting (QAR, pickup windows, "Opens in 2h 10m", countdowns), demo clock, photo map
assets/             product photos, logo vectors, wax seal, illustrated maps
```

## Connecting the platform, security and payments

See **[INTEGRATION.md](INTEGRATION.md)**: environment variables, every endpoint the app calls, the security
rules for the server, the payment-provider interface and which device features are connected.

Short version: leave `EXPO_PUBLIC_API_URL` empty for the demo (data saved on the phone, no real payment), or set
it to the API to go live. Screens don't change. All the work is in `src/api/live.ts`, `src/api/payments.ts` and
the server.

Every price, original price, discount %, bags left, pickup window and date on screen comes from the `Bag` /
`Branch` / `Order` records. Nothing is hard-coded in the UI. Pickup times are always shown in Doha time.
Voucher kinds mirror the merchant platform: amount off, percentage off, percentage off delivery, free delivery
and free service fee.

## Still to do before release

- Payment provider SDK in `setPaymentProvider()` (needs a development build).
- Push notifications (`expo-notifications`), Apple/Google sign-in, live map tiles (optional).
- Test on a physical Android phone and iPhone with a signed build:
  `npx eas-cli@latest build -p ios|android`, then `eas submit`. The app ID is `qa.wonderbites.app`.
- Remove `src/app/screens.tsx` before release.

## iOS & Android rules already built in

- **Safe areas**: notch, Dynamic Island, home indicator and the Android gesture bar are respected on every screen.
- **Tap areas**: at least 44 pt on iOS and 48 dp on Android (`src/lib/platform.ts → MIN_TAP / slopFor`);
  small visuals get an invisible larger tap area.
- **Large text**: all text follows the phone's text-size setting up to 130% (`src/components/AppText.tsx`);
  decorative tags and stamps stay fixed. Always import `Text` / `TextInput` from `components/AppText`.
- **Wallet**: Apple Pay on iOS, Google Pay on Android (`WALLET` in `src/lib/platform.ts`), used at checkout and in
  refund wording.
- **Permissions**: iOS permission messages (location, camera, photos) and Android permissions are in `app.json`.
- **App Store rules**: in-app account deletion (P17), Sign in with Apple alongside Google, location explained
  before the system prompt (E09).
- **Screen sizes**: checked at iPhone SE (375×667), iPhone 15 (390×844), Pro Max (430×932) and Android
  (412×915). Illustrated maps scale with the screen (`components/Stage.tsx`); Welcome uses a compact logo on
  short phones; Pickup passport and Pickup completed scroll when space runs out.

## Arabic & right-to-left

- Switch on **Account → Language**. It switches instantly on iOS, Android, Expo Go and web (also
  `?lang=ar` in the URL), with no restart. The choice is remembered; the phone's language is used on first launch.
- Mirroring is done by the app (root `direction` style + the helpers below), not the system RTL flag:
  `I18nManager.forceRTL` needs a native restart and caused a reload loop in Expo Go, so it is kept off.
- **Type**: Noto Naskh Arabic for headings (DM Serif in English), IBM Plex Sans Arabic for body (Figtree).
  `components/AppText.tsx` swaps fonts automatically, removes letter-spacing/capitals and adds line height.
- **Strings**: `src/i18n/ar.ts`. English text is the key; patterns handle text with numbers and names
  ("2 left" → "متبقٍ 2", "QAR 15" → "15 ر.ق"). Prices use Western digits with ر.ق. Dates, times and
  "Opens in …" labels are localized in `src/lib/format.ts`. Shop/area names should come localized from the API.
- **Adding UI text**: always use `Text` from `components/AppText`, then add the Arabic to `ar.ts`.
  In development, untranslated strings are listed in `globalThis.__wbMissing`.
- **Layout**: rows mirror automatically. For one-sided positions use `atStart/atEnd`, `padStart/padEnd`,
  `marStart/marEnd`, `borderEnd` from `src/i18n` (they work the same on iOS, Android and web). Plain
  `left/right` stay physical, which is what the maps and illustrations use (geography doesn't mirror).
- Mirrored in Arabic: arrows, price tags and stamps (side and tilt), badges, sliders, slide-to-collect,
  onboarding page order, toggles. Not mirrored: maps, Doha skyline, QR code, logo.

## Motion (from the design, all in Reanimated)

Timings and easings follow the keyframes in the final design files. Shared pieces live in
`src/components/motion.tsx` (Rise, Pop, Swing, KenBurns, PanelUp, SlideUp, InkRing, GlowFlash,
FocusGlow, PulseHalo, PulseRing, RollDigit). All of them respect the phone's "Reduce motion" setting.

| Screen | Motion |
|---|---|
| Every plum header (Halo) | stretches down on open, content rises in, one light sweep; the plum field turns slowly (48 s, 60 s on the map); the ruby glow breathes (6 s) |
| Splash | light runs along the arch, W fades in; a glowing light falls with a trail, squashes on impact with a flash and ripple, bounces once and becomes the dot; glow rings; wordmark wipes in; halo breathes; background field turns (60 s) |
| Onboarding | photo eases from 108 % to 100 % (9 s); logo and text rise; first page: pickup pill rises at 1.1 s, curved panel pops up at 1.3 s; tag swings in on its string then sways; stamps thump with an ink ring and glow; value stickers stamp in |
| Welcome | logo pops in with two ring-outs, soft glow breathes; skyline drawn by light trails, shimmer, twinkling windows, Corniche trail, reflection; bloom; dot switches on and glows; text rises at .25/.35/.45 s |
| Create account / Verify / Your name | step bar fills with a glowing tip; title, text, fields and button rise in sequence; focused field breathes a ruby glow; strength meter fills segment by segment; code digits stamp in one by one with an ink ring; current box breathes; resend timer digits roll; checkbox pops and the tick draws; "Hello Sarah!" chip pops in |
| Location | streets and rings draw outward, the lit layer glows in, light pools round "you" and shimmers, water glints twinkle, shop orbs bloom and breathe, cards appear two at a time with stamps |
| Home | header stretches down on open and collapses on scroll; swing tags drop by rail; stamps thump with a glow pulse, then turn once every 6 s; "Last one!" chip pulses |
| Search map | pins settle, selected pin stamps down with an ink ring, "you" pulses, closing-soon pins send out a ruby ring; shop card glides up at 1.35 s |
| Store | photo stretches from its top edge and springs back; on scroll the band collapses into a plum bar with the shop name; pull down to stretch the photo; tag swings, stamp thumps |
| Checkout | cards rise one after another; the total glows once at 1.9 s |
| Pickup passport | ticket rises; PAID stamp thumps at .9 s; countdown digits roll and colons blink; slide knob nudges every 2.6 s until touched |
| Pickup completed | wax seal drops with weight, squashes and settles, shadow grows in, a ruby spill ring spreads; the ticket gives under it; star burst, a few keep twinkling; "CODE USED" fades in; text rises; "+1" pops, ring fills and the count rolls up |
| Welcome Sarah / Account | content rises in with the design's stagger |
| Sheets (verify method, log out) | slide up smoothly with the backdrop fading |

Arabic: every sideways motion is mirrored (tag swings, stamp tilt, progress fill direction,
slide-to-collect and its nudge, PAID stamp twist). Maps, skyline, logo and digits keep their direction.
