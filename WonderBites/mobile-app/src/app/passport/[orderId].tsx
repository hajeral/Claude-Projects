// E14 Pickup passport — card-stock ticket with punched notches and a tear line, live
// countdown, QR + PIN, a ruby PAID ink stamp (from payment status) that thumps on once,
// and a slide-to-confirm control that goes to Pickup completed.
import React, { useEffect, useState } from 'react';
import { marEnd } from '../../i18n';
import { atStart, atEnd } from '../../i18n';
import { useLang } from '../../i18n';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle, Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { Rise, RollDigit } from '../../components/motion';
import { callShop, openDirections } from '../../lib/actions';
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Halo } from '../../components/Halo';
import { back, useBottomInset, useTopInset } from '../../components/layout';
import { Icon, IconBtn, MerchantLogo, Pill, W } from '../../components/ui';
import { NotFound } from '../../components/NotFound';
import { useStore } from '../../state/store';
import { Redirect } from 'expo-router';
import { api, sync, useTick } from '../../api/client';
import { countdownParts, dayLabel, longDate, windowText } from '../../lib/format';
import { now } from '../../lib/clock';
import { LIVE } from '../../config';
import { canCancel, cancelUntil, isDelivery, isDone, isEnded } from '../../lib/orders';
import { toast } from '../../components/Toast';
import { hhmm } from '../../lib/format';
import { photos } from '../../lib/photos';
import { colors, fonts, shadow } from '../../theme';

export default function PassportRoute() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  useStore((s) => s.orders); useStore((s) => s.orderPatches);
  const o = sync.findOrder(orderId);
  if (!o) return <NotFound kind="order" />;
  if (isDone(o)) return <Redirect href={`/completed/${o.id}`} />;
  if (o.status === 'cancelled') return <NotFound kind="cancelled" />;
  return <Passport />;
}

function Passport() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const o = sync.order(orderId);
  const bag = sync.bag(o.bagId);
  const br = sync.branch(o.branchId);
  const top = useTopInset();
  const bottom = useBottomInset();
  const lang = useLang();
  useTick(1000);
  const t = now();
  const s0 = new Date(o.pickupStart).getTime(), e0 = new Date(o.pickupEnd).getTime();
  const phase = t < s0 ? 'opens' : t < e0 ? (e0 - t < 30 * 60000 ? 'hurry' : 'closes') : 'closed';
  const dl = isDelivery(o);
  const label = (dl
    ? { opens: 'Delivery window opens in', closes: 'Delivery window closes in', hurry: 'Delivery window closes in', closed: 'Delivery window closed' }
    : { opens: 'Pickup opens in', closes: 'Pickup closes in', hurry: 'Hurry, pickup closes in', closed: 'Pickup window closed' })[phase];
  const cd = countdownParts(phase === 'opens' ? o.pickupStart : o.pickupEnd);
  const paid = o.status === 'paid' || o.status === 'reserved';
  const ended = isEnded(o);
  const [sure, setSure] = useState(false);
  // Live: if the shop completes the pickup from the Merchant Portal (QR scan or PIN),
  // this screen notices within a few seconds and moves on to the completed screen.
  useEffect(() => { if (!LIVE) return; const t = setInterval(() => { api.order(o.id).catch(() => undefined); }, 8000); return () => clearInterval(t); }, [o.id]);
  useEffect(() => { if (isDone(o)) router.replace(`/completed/${o.id}`); }, [o.status, o.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const freeEnded = paid && !ended && !canCancel(o);
  const help = () => router.push({ pathname: '/ticket-new', params: { order: o.id } });
  const cancel = async () => {
    if (!sure) { setSure(true); return; }
    try { await api.cancelOrder(o.id); toast('Reservation cancelled. Your full refund is on its way.'); router.replace({ pathname: '/orders', params: { tab: 'cancelled' } }); }
    catch (e) { toast((e as Error).message, 'error'); setSure(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.plum }}>
      <StatusBar style="light" />
      <Halo full style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={{ paddingTop: top + 4, paddingHorizontal: 20, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconBtn name="back" variant="glass" onPress={back} label="Back" />
          <Text style={[{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 17, ...W('bold') }, marEnd(44)]}>{dl ? 'Your delivery' : 'Pickup passport'}</Text>
        </View>

        <Rise delay={150} style={[s.ticket, { marginTop: 14 }]}>
          <View style={{ padding: 18 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View>
                <Image source={photos[bag.photo]} style={{ width: 52, height: 52, borderRadius: 10 }} contentFit="cover" />
                <View style={{ position: 'absolute', ...atEnd(-10), bottom: -10 }}><MerchantLogo initials={br.initials} size={28} /></View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{br.storeName}</Text>
                <Text style={s.mu}>{bag.title} × {o.quantity} · {br.branchName}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
              <Icon name="clock" size={15} color={colors.muted} />
              <Text style={s.mu}>{dl ? 'Delivery window' : 'Pickup window'}</Text>
            </View>
            <Text style={{ fontSize: 17, color: colors.plum, marginTop: 2, ...W('bold') }}>{dayLabel(o.pickupStart)}, {windowText(o.pickupStart, o.pickupEnd)}</Text>
            {paid ? <PaidStamp ar={lang === 'ar'} text={lang === 'ar' ? `مدفوع · ${o.total} ر.ق · ${longDate(o.pickupStart)} · ` : `PAID · QAR ${o.total} · ${longDate(o.pickupStart).toUpperCase()} · `} /> : null}
            <Text style={{ textAlign: 'center', fontSize: 13, color: phase === 'hurry' ? colors.ruby : colors.plum, marginTop: 12, ...W('bold') }}>{label}</Text>
            {phase !== 'closed' ? (
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 8, marginTop: 6 }}>
                <Box v={cd.h} l="HRS" /><Colon /><Box v={cd.m} l="MIN" /><Colon /><Box v={cd.s} l="SEC" />
              </View>
            ) : null}
            <Text style={[s.mu, { textAlign: 'center', marginTop: 12 }]}>Order {o.id} · Paid QAR {o.total.toFixed(2)} with {o.paidWith}</Text>
          </View>

          {/* tear line with punched notches */}
          <View style={s.tear}>
            <View style={[s.notch, { left: -12 }]} />
            <View style={s.dash} />
            <View style={[s.notch, { right: -12 }]} />
          </View>

          <View style={{ alignItems: 'center', padding: 18, paddingTop: 10 }}>
            <View style={s.qr}><QRCode value={o.qrPayload} size={150} color={colors.plum} backgroundColor="#fff" /></View>
            {ended
              ? <Pill label={dl ? 'Delivery window ended' : 'Pickup ended'} tone="grey" icon="clock" style={{ alignSelf: 'center', marginTop: 10 }} />
              : dl ? <Pill label={`Delivery to ${o.deliverTo?.label ?? ''} · ${o.deliverTo?.area ?? ''}`} tone="green" icon="home" style={{ alignSelf: 'center', marginTop: 10 }} />
              : <Pill label="Your bag is ready to collect" tone="green" icon="check" style={{ alignSelf: 'center', marginTop: 10 }} />}
            <Text style={[s.mu, { marginTop: 8, textAlign: 'center' }]}>{dl ? 'Show this code to the person delivering, or tell them your PIN' : 'Show this screen to the staff, then slide once your bag is in hand.'}</Text>
            {/* a PIN always reads left to right, also in Arabic */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, direction: 'ltr' }}>
              {o.pin.split('').map((d, i) => <View key={i} style={s.pin}><Text style={{ fontSize: 20, color: colors.plum, ...W('bold') }}>{d}</Text></View>)}
            </View>
          </View>
        </Rise>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {dl ? null : <Pressable onPress={() => openDirections(br.lat, br.lng, br.storeName)} accessibilityRole="button" style={s.glassBtn}><Icon name="directions" size={18} color="#fff" /><Text style={s.glassTx}>Directions</Text></Pressable>}
          <Pressable onPress={() => callShop(br.phone)} accessibilityRole="button" style={s.glassBtn}><Icon name="phone" size={18} color="#fff" /><Text style={s.glassTx}>Call shop</Text></Pressable>
        </View>
        <View style={{ marginTop: 12, marginBottom: bottom }}>
          {ended && !dl ? (
            <View style={{ flexDirection: 'row' }}><Pressable onPress={() => router.push({ pathname: '/ticket-new', params: { order: o.id } })} accessibilityRole="button" style={s.glassBtn}><Icon name="chat" size={18} color="#fff" /><Text style={s.glassTx}>Couldn’t make it? Get help</Text></Pressable></View>
          ) : (
            <SlideToCollect label={dl ? 'Slide to confirm delivery received' : 'Slide to confirm pickup'} onDone={async () => { await api.markCollected(o.id); router.replace(`/completed/${o.id}`); }} />
          )}
          {ended && dl ? (
            <View style={{ flexDirection: 'row', marginTop: 12 }}><Pressable onPress={help} accessibilityRole="button" style={s.glassBtn}><Icon name="chat" size={18} color="#fff" /><Text style={s.glassTx}>Didn’t arrive? Get help</Text></Pressable></View>
          ) : null}
          {freeEnded ? (
            <Pressable onPress={help} hitSlop={10} accessibilityRole="button" style={{ alignSelf: 'center', marginTop: 14 }}>
              <Text style={{ fontSize: 13, color: '#fff', opacity: 0.7, ...W('semibold') }}>{`Free cancellation ended at ${hhmm(cancelUntil(o))} · Need help?`}</Text>
            </Pressable>
          ) : null}
          {canCancel(o) ? (
            <Pressable onPress={cancel} hitSlop={10} accessibilityRole="button" style={{ alignSelf: 'center', marginTop: 14 }}>
              <Text style={{ fontSize: 13, color: '#fff', opacity: 0.85, ...W('bold') }}>{sure ? 'Tap again to cancel' : `Cancel reservation · free until ${hhmm(cancelUntil(o))}`}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

/** Countdown box: each digit rolls up when it changes (design: digit strips, steps). */
function Box({ v, l }: { v: number; l: string }) {
  const t = String(v).padStart(2, '0');
  const dg = (c: string) => <Text style={{ fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: colors.rubyDark }}>{c}</Text>;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[s.cd, { flexDirection: 'row', direction: 'ltr' }]} accessibilityLabel={`${t} ${l}`}>
        <RollDigit value={t[0]} height={28}>{dg}</RollDigit>
        <RollDigit value={t[1]} height={28}>{dg}</RollDigit>
      </View>
      <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3, letterSpacing: 0.6, ...W('bold') }}>{l}</Text>
    </View>
  );
}

/** The colons blink softly (design: colon 2s, opacity .35 at 50 %). */
function Colon() {
  const k = useSharedValue(1);
  useEffect(() => { k.value = withRepeat(withSequence(withTiming(0.35, { duration: 1000, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })), -1); }, [k]);
  const a = useAnimatedStyle(() => ({ opacity: k.value }));
  return <Animated.Text style={[s.colon, a]}>:</Animated.Text>;
}

function PaidStamp({ text, ar }: { text: string; ar?: boolean }) {
  // stThump: lands once at .9 s — scale 1.4 → .93 → 1.04 → 1 with a small twist. Mirrored in Arabic.
  const k = useSharedValue(0);
  useEffect(() => { k.value = withDelay(900, withTiming(1, { duration: 550, easing: Easing.bezier(0.2, 0.8, 0.3, 1.15) })); }, [k]);
  const m = ar ? -1 : 1;
  const a = useAnimatedStyle(() => ({
    opacity: interpolate(k.value, [0, 0.55, 1], [0, 0.9, 0.9], 'clamp'),
    transform: [
      { scale: interpolate(k.value, [0, 0.55, 0.76, 1], [1.4, 0.93, 1.04, 1]) },
      { rotate: `${m * (-16 + interpolate(k.value, [0, 0.55, 0.76, 1], [-9, 2, -0.5, 0]))}deg` },
    ],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', ...atEnd(10), top: 56, width: 92, height: 92 }, a]} pointerEvents="none" accessibilityLabel="Paid">
      <Svg width={92} height={92} viewBox="0 0 100 100">
        <Defs><Path id="pr" d="M50 50m-38 0a38 38 0 1 1 76 0a38 38 0 1 1 -76 0" /></Defs>
        <Circle cx={50} cy={50} r={47} fill="none" stroke={colors.ruby} strokeWidth={2.4} />
        <Circle cx={50} cy={50} r={29} fill="none" stroke={colors.ruby} strokeWidth={1.6} />
        <SvgText fontFamily={ar ? 'IBMPlexSansArabic_700Bold' : fonts.extrabold} fontSize={9.5} letterSpacing={ar ? 0 : 1.4} fill={colors.ruby}><TextPath href="#pr">{text}</TextPath></SvgText>
        <SvgText x={50} y={56} textAnchor="middle" fontFamily={ar ? 'IBMPlexSansArabic_700Bold' : fonts.extrabold} fontSize={ar ? 16 : 17} letterSpacing={ar ? 0 : 1} fill={colors.ruby}>{ar ? 'مدفوع' : 'PAID'}</SvgText>
      </Svg>
    </Animated.View>
  );
}

const KNOB = 56;
function SlideToCollect({ onDone, label: text = 'Slide to confirm pickup' }: { onDone: () => void; label?: string }) {
  const dir = useLang() === 'ar' ? -1 : 1; // Arabic: slide from right to left
  const [w, setW] = useState(350);
  const x = useSharedValue(0);
  const n = useSharedValue(0); // nudge hint: 2.6 s loop, moves 18 px at 25 %, rests from 55 %
  const max = w - KNOB - 8;
  useEffect(() => { n.value = withDelay(1200, withRepeat(withSequence(withTiming(18, { duration: 650, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 780, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 1170 })), -1)); }, [n]);
  const pan = usePanGesture({
    onBegin: () => { 'worklet'; cancelAnimation(n); x.value = x.value + n.value; n.value = 0; },
    onUpdate: (e) => { 'worklet'; x.value = Math.max(0, Math.min(max, x.value + e.changeX * dir)); },
    onDeactivate: () => { 'worklet'; if (x.value > max * 0.85) { x.value = withTiming(max, { duration: 120 }); scheduleOnRN(onDone); } else x.value = withSpring(0); },
  });
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: (x.value + n.value) * dir }] }));
  const label = useAnimatedStyle(() => ({ opacity: 1 - x.value / Math.max(1, max) }));
  return (
    <View style={s.slider} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="adjustable" accessibilityLabel={text} accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={onDone}>
      <Animated.View style={[s.slideWrap, label]}><Text style={s.slideTx}>{text}</Text></Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[s.knob, knob]}><Icon name="chevsR" size={22} color="#fff" stroke={2} /></Animated.View>
      </GestureDetector>
    </View>
  );
}

const s = StyleSheet.create({
  ticket: { backgroundColor: '#FFFDFB', borderRadius: 22, ...shadow.card, shadowOpacity: 0.35 },
  mu: { fontSize: 13, color: colors.muted, ...W('regular') },
  colon: { fontSize: 22, color: colors.muted, marginTop: 12, ...W('bold') },
  cd: { minWidth: 46, height: 44, borderRadius: 10, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  tear: { height: 24, justifyContent: 'center' },
  notch: { position: 'absolute', top: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.plum },
  dash: { marginHorizontal: 18, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: '#E6B8C0' },
  qr: { padding: 12, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  pin: { width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#E6B8C0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  glassBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  glassTx: { color: '#fff', fontSize: 15, textDecorationLine: 'underline', ...W('semibold') },
  slider: { height: 64, borderRadius: 32, backgroundColor: colors.cream, justifyContent: 'center', padding: 4 },
  slideWrap: { position: 'absolute', left: 0, right: 0, paddingStart: 62, paddingEnd: 12 }, // text stays clear of the round handle
  slideTx: { textAlign: 'center', fontSize: 16, color: colors.plum, textDecorationLine: 'underline', ...W('semibold') },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: colors.ruby, alignItems: 'center', justifyContent: 'center', ...shadow.button },
});
