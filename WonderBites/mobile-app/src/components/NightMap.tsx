import React, { useEffect } from 'react';
import { localizeMapXml } from '../i18n/maps';
import { useLang } from '../i18n';
import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { Image } from 'expo-image';
import Svg, { Circle, ClipPath, Defs, G, Path, RadialGradient, Stop, SvgXml } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { baseXml, glints, landClip, litXml, pool, poolXml, streets } from '../../assets/svg/dohaNightLayers';
import { photos } from '../lib/photos';
import type { PhotoKey } from '../api/types';
import { colors } from '../theme';
import { Mark } from './Logo';
import { W } from './ui';

// Shops on the example map. Orb size = bags left. Cards come two at a time.
const ORBS = [
  { x: 141.2, y: 187.2, s: 65.6, d: 1.0 }, { x: 31.4, y: 301.4, s: 57.2, d: 1.15 }, { x: 42, y: 159, s: 52, d: 1.3 },
  { x: 129, y: 281, s: 74, d: 1.45 }, { x: 227.6, y: 143.6, s: 48.8, d: 1.6 }, { x: 191.8, y: 71.8, s: 40.4, d: 1.75 },
];
type Card = { name: string; km: string; win: string; price: number; was: number; pct: number; left: number; photo: PhotoKey; x: number; y: number; s: number; o: number; notch: { left: number; top: boolean } };
const PAIRS: Card[][] = [
  [
    { name: 'Karak & Co', km: '0.5 km', win: '17:00 – 18:30', price: 20, was: 50, pct: 60, left: 3, photo: 'drink', x: 62, y: 103.2, s: 1, o: 1, notch: { left: 105, top: false } },
    { name: 'Al Sufra Kitchen', km: '2.2 km', win: '20:00 – 21:30', price: 15, was: 50, pct: 70, left: 6, photo: 'bowl', x: 20, y: 366.6, s: 0.822, o: 0.915, notch: { left: 33, top: true } },
  ],
  [
    { name: 'Sidra Bakery', km: '1.1 km', win: '18:00 – 19:30', price: 20, was: 50, pct: 60, left: 4, photo: 'basket', x: 22, y: 75, s: 0.937, o: 0.97, notch: { left: 39, top: false } },
    { name: 'La Patisserie Doha', km: '1.4 km', win: '17:30 – 19:00', price: 15, was: 50, pct: 70, left: 5, photo: 'croissant', x: 54, y: 363, s: 0.905, o: 0.955, notch: { left: 105, top: true } },
  ],
  [
    { name: 'The Green Fork', km: '1.9 km', win: '19:00 – 20:30', price: 35, was: 70, pct: 50, left: 2, photo: 'bowl', x: 102, y: 200.4, s: 0.853, o: 0.93, notch: { left: 143, top: true } },
    { name: 'Bloom Bakehouse', km: '2.6 km', win: '16:30 – 18:00', price: 20, was: 50, pct: 60, left: 3, photo: 'croissant', x: 100, y: -12.2, s: 0.779, o: 0.895, notch: { left: 105, top: false } },
  ],
];

export function NightMap({ height = 560 }: { height?: number }) {
  const ar = useLang() === 'ar';
  const clock = useSharedValue(0);
  useEffect(() => { clock.value = withTiming(100000, { duration: 100000 * 1000, easing: Easing.linear }); }, [clock]);
  const mapIn = useSharedValue(0);
  useEffect(() => { mapIn.value = withTiming(1, { duration: 900 }); }, [mapIn]);
  const mapS = useAnimatedStyle(() => ({ opacity: mapIn.value }));
  return (
    <View style={{ height, overflow: 'hidden' }}>
      <Animated.View style={mapS}><SvgXml xml={localizeMapXml(baseXml, ar)} width={390} height={560} /></Animated.View>
      <Streets />
      <FadeLayer delay={700} duration={900}><SvgXml xml={litXml} width={390} height={560} /></FadeLayer>
      <Pool />
      {glints.map((g, i) => <Glint key={i} {...g} />)}
      <You />
      {ORBS.map((o, i) => <Orb key={i} {...o} />)}
      {PAIRS.map((pair, pi) => pair.map((c, ci) => <MapCard key={`${pi}${ci}`} c={c} clock={clock} start={2.1 + pi * 3.4} />))}
      <FadeLayer delay={300} duration={500} style={st.tag}><Text maxFontSizeMultiplier={1} style={st.tagTx}>Example</Text></FadeLayer>
      <View style={st.legend}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          {[8, 12, 17].map((s) => <View key={s} style={{ width: s, height: s, borderRadius: s, backgroundColor: '#FCEAF1', opacity: 0.4 + s / 30 }} />)}
        </View>
        <Text maxFontSizeMultiplier={1} style={{ color: colors.pale, fontSize: 13, ...W('medium') }}>Glow size = bags left</Text>
      </View>
    </View>
  );
}

const APath = Animated.createAnimatedComponent(Path);
const DRAW = Easing.bezier(0.4, 0, 0.2, 1);
/** Streets glow in: each ring and road draws itself outward (design: draw 1.1s, staggered). */
function Streets() {
  return (
    <Svg width={390} height={560} viewBox="0 40 390 560" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs><ClipPath id="nmLand"><Path d={landClip} /></ClipPath></Defs>
      <G clipPath="url(#nmLand)">
        {streets.map((p, i) => <Street key={i} {...p} />)}
      </G>
    </Svg>
  );
}
function Street({ d, w, len, delay }: { d: string; w: number; len: number; delay: number }) {
  const k = useSharedValue(0);
  useEffect(() => { k.value = withDelay(delay, withTiming(1, { duration: 1100, easing: DRAW })); }, [k, delay]);
  const ap = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - k.value) }));
  return <APath d={d} stroke="#E6B8C0" strokeOpacity={0.2} strokeWidth={w} strokeLinecap="round" fill="none" strokeDasharray={`${len} ${len}`} animatedProps={ap} />;
}
function FadeLayer({ delay, duration, style, children }: { delay: number; duration: number; style?: object; children: React.ReactNode }) {
  const k = useSharedValue(0);
  useEffect(() => { k.value = withDelay(delay, withTiming(1, { duration })); }, [k, delay, duration]);
  const a = useAnimatedStyle(() => ({ opacity: k.value }));
  return <Animated.View pointerEvents="none" style={[style ?? StyleSheet.absoluteFill, a]}>{children}</Animated.View>;
}
/** Light pools round "you": grows in from 30 % (light 1s at .5s), then shimmers (5 s). */
function Pool() {
  const k = useSharedValue(0);
  const sh = useSharedValue(0);
  useEffect(() => {
    k.value = withDelay(500, withTiming(1, { duration: 1000, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }));
    sh.value = withDelay(2600, withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [k, sh]);
  const S = pool.r * 2;
  const a = useAnimatedStyle(() => ({ opacity: k.value * (1 - 0.2 * sh.value), transform: [{ scale: (0.3 + 0.7 * k.value) * (1 + 0.06 * sh.value) }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: pool.cx - pool.r, top: pool.cy - 40 - pool.r, width: S, height: S }, a]}>
      <SvgXml xml={poolXml.replace('viewBox="0 40 390 560"', `viewBox="${pool.cx - pool.r} ${pool.cy - pool.r} ${S} ${S}"`).replace(/width="390" height="560"/, `width="${S}" height="${S}"`)} width={S} height={S} />
    </Animated.View>
  );
}
/** Glints on the water twinkle (opacity .15 ↔ .75, 4.8 s). */
function Glint({ x, y, h, delay }: { x: number; y: number; h: number; delay: number }) {
  const k = useSharedValue(0.55);
  useEffect(() => { k.value = withDelay(delay - 1600, withRepeat(withSequence(withTiming(0.15, { duration: 1200 }), withTiming(0.75, { duration: 2400, easing: Easing.inOut(Easing.ease) }), withTiming(0.15, { duration: 1200 })), -1)); }, [k, delay]);
  const a = useAnimatedStyle(() => ({ opacity: k.value }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y - 40, width: 1.6, height: h, borderRadius: 0.8, backgroundColor: '#E6B8C0' }, a]} />;
}
/** "You": the mark fades and settles in (youIn .8s at .45s). */
function You() {
  const k = useSharedValue(0);
  useEffect(() => { k.value = withDelay(450, withTiming(1, { duration: 800, easing: Easing.bezier(0.2, 0.8, 0.2, 1) })); }, [k]);
  const a = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: 0.85 + 0.15 * k.value }] }));
  return <Animated.View style={[{ position: 'absolute', left: 107, top: 241, width: 30, height: 34 }, a]}><Mark size={30} /></Animated.View>;
}

function Orb({ x, y, s, d }: { x: number; y: number; s: number; d: number }) {
  const sc = useSharedValue(0);
  useEffect(() => {
    sc.value = withDelay(d * 1000, withSequence(withTiming(1, { duration: 700, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }),
      withRepeat(withTiming(1.12, { duration: 2300, easing: Easing.inOut(Easing.ease) }), -1, true)));
  }, [d, sc]);
  const a = useAnimatedStyle(() => ({ opacity: Math.min(1, sc.value), transform: [{ scale: sc.value }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: s, height: s }, a]} pointerEvents="none">
      <Svg width={s} height={s}>
        <Defs>
          <RadialGradient id={`o${x}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.16" stopColor="#FCEAF1" />
            <Stop offset="0.3" stopColor="#E6B8C0" stopOpacity="0.75" />
            <Stop offset="0.56" stopColor="#D9175C" stopOpacity="0.32" />
            <Stop offset="0.74" stopColor="#D9175C" stopOpacity="0.1" />
            <Stop offset="1" stopColor="#D9175C" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={s / 2} cy={s / 2} r={s / 2} fill={`url(#o${x})`} />
      </Svg>
    </Animated.View>
  );
}

const CYCLE = 10.2;
function MapCard({ c, clock, start }: { c: Card; clock: SharedValue<number>; start: number }) {
  const a = useAnimatedStyle(() => {
    if (clock.value < start) return { opacity: 0 };
    const k = ((clock.value - start) % CYCLE) / CYCLE;
    let op = 0, ty = 8, sc = c.s * 0.9;
    if (k < 0.05) { const t = k / 0.05; op = c.o * t; ty = 8 * (1 - t); sc = c.s * (0.9 + 0.1 * t); }
    else if (k < 0.29) { op = c.o; ty = 0; sc = c.s; }
    else if (k < 0.34) { const t = (k - 0.29) / 0.05; op = c.o * (1 - t); ty = -6 * t; sc = c.s * (1 - 0.03 * t); }
    return { opacity: op, transform: [{ translateY: ty }, { scale: sc }] };
  });
  const stamp = useAnimatedStyle(() => {
    if (clock.value < start) return { transform: [{ scale: 0 }, { rotate: '-14deg' }] };
    const k = ((clock.value - start) % CYCLE) / CYCLE;
    const t = Math.min(1, Math.max(0, (k - 0.03) / 0.04));
    const sc = t < 0.6 ? 1.4 - 0.5 * (t / 0.6) : 0.9 + 0.1 * ((t - 0.6) / 0.4);
    return { transform: [{ scale: t === 0 ? 0 : sc }, { rotate: '-14deg' }] };
  });
  return (
    <Animated.View style={[st.pc, { left: c.x, top: c.y, transformOrigin: `${c.notch.left + 7}px ${c.notch.top ? '0' : '100%'}` } as object, a]} pointerEvents="none">
      <View style={[st.notch, { left: c.notch.left }, c.notch.top ? { top: -6 } : { bottom: -6 }]} />
      <Image source={photos[c.photo]} style={st.img} contentFit="cover" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text maxFontSizeMultiplier={1} style={st.r1} numberOfLines={1}>{c.name}</Text>
        <Text maxFontSizeMultiplier={1} style={st.r2}>{c.km} · <Text maxFontSizeMultiplier={1} style={{ color: colors.ruby, ...W('semibold') }}>{c.win}</Text></Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 3 }}>
          <Text maxFontSizeMultiplier={1} style={{ fontSize: 18, color: colors.ruby, ...W('bold') }}>QAR {c.price}</Text>
          <Text maxFontSizeMultiplier={1} style={{ fontSize: 13, color: colors.muted, textDecorationLine: 'line-through', ...W('regular') }}>QAR {c.was}</Text>
          <Text maxFontSizeMultiplier={1} style={{ marginLeft: 'auto', fontSize: 13, color: colors.emerald, ...W('bold') }}>{c.left} left</Text>
        </View>
      </View>
      <Animated.View style={[st.pst, stamp]}><Text maxFontSizeMultiplier={1} style={{ color: '#fff', fontSize: 14, ...W('extrabold') }}>{c.pct}%</Text></Animated.View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  tag: { position: 'absolute', left: 20, top: 52, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: 'rgba(51,22,49,0.55)', borderWidth: 1, borderColor: 'rgba(235,217,228,0.4)' },
  tagTx: { fontSize: 13, color: colors.pale, ...W('semibold') },
  legend: { position: 'absolute', left: 24, top: 462, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(51,22,49,0.55)' },
  pc: { position: 'absolute', width: 236, height: 76, flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, borderRadius: 18, backgroundColor: colors.cream, shadowColor: '#140613', shadowOpacity: 0.75, shadowRadius: 18, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
  notch: { position: 'absolute', width: 14, height: 14, backgroundColor: colors.cream, transform: [{ rotate: '45deg' }], borderRadius: 3 },
  img: { width: 52, height: 56, borderRadius: 12, backgroundColor: colors.rubySoft },
  r1: { fontSize: 15, color: colors.plum, paddingRight: 36, ...W('bold') },
  r2: { fontSize: 13, color: colors.muted, marginTop: 1, ...W('regular') },
  pst: { position: 'absolute', right: -12, top: -16, width: 46, height: 46, borderRadius: 23, backgroundColor: colors.ruby, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.cream },
});
