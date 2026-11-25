// E15 Pickup completed — "The seal of good taste": the ruby wax seal drops onto the receipt,
// squashes and settles; luminous 4-point stars burst out once, then a few keep twinkling.
// Emerald only for completion and impact (+1 meal, count-up, progress ring).
import React, { useEffect, useState } from 'react';
import { atStart, atEnd } from '../../i18n';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Path } from 'react-native-svg';
import { InkRing, Pop, Rise, RollDigit } from '../../components/motion';
import Animated, { Easing, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Halo } from '../../components/Halo';
import { useBottomInset, useTopInset } from '../../components/layout';
import { Button, Icon, MerchantLogo, Pill, W } from '../../components/ui';
import { api, sync, useApi } from '../../api/client';
import { NotFound } from '../../components/NotFound';
import { toast } from '../../components/Toast';
import { useStore } from '../../state/store';
import { hhmm } from '../../lib/format';
import { now } from '../../lib/clock';
import { photos, waxSeal } from '../../lib/photos';
import { colors, fonts, shadow } from '../../theme';

const ACircle = Animated.createAnimatedComponent(Circle);

export default function CompletedRoute() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  useStore((s) => s.orders); useStore((s) => s.orderPatches);
  const o = sync.findOrder(orderId);
  if (!o) return <NotFound kind="order" />;
  return <Completed />;
}

function Completed() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const o = sync.order(orderId);
  const bag = sync.bag(o.bagId);
  const br = sync.branch(o.branchId);
  const top = useTopInset();
  const bottom = useBottomInset();
  const [rating, setRatingState] = useState(o.rating ?? 0);
  const setRating = (i: number) => { setRatingState(i); api.rateOrder(o.id, i); toast('Thanks for sharing your rating!'); };
  const collected = hhmm(o.collectedAt ?? new Date(now()).toISOString());
  // The signed-in customer's own numbers (sample account in the demo, the backend when live).
  // This pickup always counts, so a brand-new customer sees 1, never 0 or someone else's total.
  const { data: me } = useApi(() => api.me());
  const meals = Math.max(me?.impact.meals ?? 0, 1);
  const co2 = me?.monthImpact.co2Kg ?? 0;
  const [count, setCount] = useState(meals - 1);
  useEffect(() => { setCount(meals - 1); const t = setTimeout(() => setCount(meals), 1400); return () => clearTimeout(t); }, [meals]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.plum }}>
      <StatusBar style="light" />
      <Halo full style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
      <View style={{ paddingTop: top + 2, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={s.okDot}><Icon name="check" size={14} color="#fff" stroke={2.4} /></View>
          <Text style={{ color: '#fff', fontSize: 14, letterSpacing: 2, ...W('semibold') }}>PICKUP COMPLETED</Text>
        </View>
      </View>

      <Ticket style={[s.ticket, { marginTop: 18 }]}>
        <View style={{ padding: 18 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View>
              <Image source={photos[bag.photo]} style={{ width: 50, height: 50, borderRadius: 10 }} contentFit="cover" />
              <View style={{ position: 'absolute', ...atEnd(-8), bottom: -8 }}><MerchantLogo initials={br.initials} size={24} /></View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{br.storeName}</Text>
              <Text style={s.mu}>{bag.title} × {o.quantity} · {br.branchName}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
            <View><Text style={s.mu}>Order {o.id}</Text><Text style={s.mu}>{o.status === 'delivered' ? 'Delivered today' : 'Collected today'}</Text></View>
            <View style={{ alignItems: 'flex-end' }}><Text style={s.mu}>Paid QAR {o.total.toFixed(2)}</Text><Text style={{ fontSize: 13, color: colors.plum, ...W('bold') }}>{collected}</Text></View>
          </View>
        </View>
        <View style={{ height: 24, justifyContent: 'center' }}>
          <View style={[s.notch, { left: -12 }]} /><View style={s.dash} /><View style={[s.notch, { right: -12 }]} />
        </View>
        <View style={{ height: 110, justifyContent: 'flex-end', padding: 18 }}>
          <Rise delay={1100} dy={0}><Text style={{ fontSize: 13, letterSpacing: 2, color: colors.muted2, ...W('semibold') }}>CODE USED</Text></Rise>
        </View>
        <Seal />
      </Ticket>
      <Stars />

      <View style={s.panel}>
        <Svg width="100%" height={46} viewBox="0 0 390 46" preserveAspectRatio="none" style={{ position: 'absolute', top: -45 }}>
          <Path d="M0 46 Q195 -30 390 46 Z" fill={colors.cream} />
        </Svg>
        <Rise delay={1120} dy={12} duration={550} style={{ alignItems: 'center' }}>
          <Text style={s.h1}>{o.status === 'delivered' ? 'Delivered.\nEnjoy every bite.' : 'Collected.\nEnjoy every bite.'}</Text>
          <Text style={[s.mu, { fontSize: 14, marginTop: 6 }]}>{br.storeName} · {br.branchName} · {collected}</Text>
        </Rise>
        <Rise delay={1260} dy={12} duration={550} style={s.impact}>
          <Ring value={count} />
          <View style={{ flex: 1, gap: 4 }}>
            <Pop delay={1250} from={0.5} mid={1.06} style={{ alignSelf: 'flex-start' }}><Pill label="+1 meal given a second chance!" tone="green" solid icon="leaf" /></Pop>
            <Text style={{ fontSize: 16, color: colors.emerald, ...W('bold') }}>{meals} meals given a second chance so far</Text>
            {co2 > 0 ? <Text style={s.mu}>{co2} kg CO₂ saved this month</Text> : null}
          </View>
        </Rise>
        <Text style={{ fontSize: 14, color: colors.plum, marginTop: 18, textAlign: 'center', ...W('bold') }}>How was your experience?</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable key={i} onPress={() => setRating(i)} hitSlop={12} accessibilityLabel={`${i} stars`}>
              <Icon name="star" size={24} color={i <= rating ? colors.ruby : '#E6B8C0'} fill={i <= rating ? colors.ruby : '#E6B8C0'} />
            </Pressable>
          ))}
        </View>
        <View style={{ flexGrow: 1, minHeight: 20 }} />
        <Button title="Done" onPress={() => router.replace('/home')} style={{ marginBottom: bottom }} />
      </View>
      </ScrollView>
    </View>
  );
}

/** tkHit: the ticket gives a little under the seal's weight (.5s at .52s). */
function Ticket({ style, children }: { style?: object; children: React.ReactNode }) {
  const k = useSharedValue(0);
  useEffect(() => { k.value = withDelay(520, withTiming(1, { duration: 500 })); }, [k]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(k.value, [0, 0.35, 1], [0, 3, 0]) }, { scale: interpolate(k.value, [0, 0.35, 1], [1, 0.995, 1]) }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/**
 * The wax seal drops with weight (sealDrop .95s at .1s): falls from 120 px above at 155 %,
 * squashes on impact, rebounds a little and settles at -8deg. Its shadow grows in under it
 * and a ruby spill ring spreads once on impact.
 */
function Seal() {
  const k = useSharedValue(0);
  useEffect(() => { k.value = withDelay(100, withTiming(1, { duration: 950, easing: Easing.bezier(0.55, 0, 0.35, 1) })); }, [k]);
  const T = [0, 0.22, 0.48, 0.64, 0.8, 1];
  const a = useAnimatedStyle(() => ({
    opacity: interpolate(k.value, [0, 0.22, 1], [0, 1, 1]),
    transform: [
      { translateY: interpolate(k.value, T, [-120, -70, 0, -6, 0, 0]) },
      { scaleX: interpolate(k.value, T, [1.55, 1.35, 1.06, 0.97, 1.01, 1]) },
      { scaleY: interpolate(k.value, T, [1.55, 1.35, 0.9, 1.04, 0.99, 1]) },
      { rotate: `${interpolate(k.value, T, [-16, -12, -6, -7, -8, -8])}deg` },
    ],
  }));
  const sh = useAnimatedStyle(() => ({ opacity: interpolate(k.value, [0, 0.48, 1], [0, 1, 0.9]), transform: [{ scale: interpolate(k.value, [0, 0.48, 1], [1.9, 1, 1]) }] }));
  return (
    <View style={{ position: 'absolute', left: '50%', marginLeft: -88, top: 112, width: 176, height: 176 }} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', left: 28, top: 36, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(51,22,49,0.22)', shadowColor: colors.plum, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }, sh]} />
      <InkRing size={120} delay={580} duration={900} to={2.1} width={5} color="rgba(217,23,92,0.55)" style={{ left: 28, top: 28 }} />
      <Animated.View style={[{ width: 176, height: 176 }, a]}>
        <Image source={waxSeal} style={{ width: 176, height: 176 }} contentFit="contain" accessibilityLabel="WonderBites wax seal" />
      </Animated.View>
    </View>
  );
}

// Four-point stars: burst once from the seal at impact, then a few keep twinkling.
const STAR_PATH = 'M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z';
const BURST = [[-150, -40, 16], [150, -70, 14], [-120, 90, 12], [140, 80, 18], [-40, -120, 10], [60, 130, 12], [-170, 40, 10], [175, 10, 12]];
function Stars() {
  return (
    <View style={{ position: 'absolute', left: '50%', top: 300, width: 0, height: 0 }} pointerEvents="none">
      {BURST.map(([dx, dy, sz], i) => <Star key={i} dx={dx} dy={dy} sz={sz} keep={i % 3 === 0} i={i} />)}
    </View>
  );
}
function Star({ dx, dy, sz, keep, i }: { dx: number; dy: number; sz: number; keep: boolean; i: number }) {
  const k = useSharedValue(0);
  const tw = useSharedValue(0);
  useEffect(() => {
    k.value = withDelay(560 + i * 40, withTiming(1, { duration: 1150, easing: Easing.bezier(0.15, 0.7, 0.25, 1) }));
    if (keep) tw.value = withDelay(1800 + i * 300, withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.2, { duration: 900 })), -1, true));
  }, [k, tw, keep, i]);
  const a = useAnimatedStyle(() => {
    const burstOp = k.value < 0.15 ? k.value / 0.15 : 1 - (k.value - 0.15) / 0.85;
    const op = keep && k.value >= 1 ? 0.25 + 0.75 * tw.value : Math.max(0, burstOp);
    return { opacity: op, transform: [{ translateX: dx * k.value - sz / 2 }, { translateY: dy * k.value - sz / 2 }, { scale: 0.4 + 0.6 * k.value }, { rotate: `${k.value * 45}deg` }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', width: sz, height: sz, shadowColor: '#FFE3EC', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }, a]}>
      <Svg width={sz} height={sz} viewBox="0 0 24 24"><Path d={STAR_PATH} fill="#FFF4F7" /></Svg>
    </Animated.View>
  );
}

function Ring({ value, goal = 30 }: { value: number; goal?: number }) {
  const R = 24, C = 2 * Math.PI * R;
  const p = useSharedValue((value - 1) / goal);
  const first = React.useRef(true);
  useEffect(() => { p.value = withDelay(first.current ? 1350 : 0, withTiming(value / goal, { duration: 1100, easing: Easing.bezier(0.3, 0.7, 0.2, 1) })); first.current = false; }, [value, goal, p]);
  const ap = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - p.value) }));
  return (
    <View style={{ width: 58, height: 58, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={58} height={58} style={StyleSheet.absoluteFill}>
        <Circle cx={29} cy={29} r={R} stroke={colors.emeraldSoft} strokeWidth={6} fill="none" />
        <ACircle cx={29} cy={29} r={R} stroke={colors.emerald} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${C} ${C}`} animatedProps={ap} transform="rotate(-90 29 29)" />
      </Svg>
      <RollDigit value={String(value)} height={28}>{(v) => <Text style={{ fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: colors.emerald }}>{v}</Text>}</RollDigit>
    </View>
  );
}

const s = StyleSheet.create({
  okDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.emerald, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ticket: { marginHorizontal: 28, backgroundColor: '#FFFDFB', borderRadius: 20, ...shadow.card, shadowOpacity: 0.35 },
  mu: { fontSize: 13, color: colors.muted, ...W('regular') },
  notch: { position: 'absolute', top: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.plum },
  dash: { marginHorizontal: 18, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: '#E6B8C0' },
  panel: { flexGrow: 1, marginTop: 70, paddingBottom: 8, backgroundColor: colors.cream, paddingHorizontal: 24, paddingTop: 0 },
  h1: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 37, color: colors.plum, textAlign: 'center' },
  impact: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18, padding: 14, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, ...shadow.card, shadowOpacity: 0.1 },
});
