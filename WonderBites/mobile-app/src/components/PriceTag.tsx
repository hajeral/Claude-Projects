import React, { useEffect } from 'react';
import { atStart, atEnd } from '../i18n';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './AppText';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { colors, dropShadow, fonts } from '../theme';
import { W } from './ui';
import { GlowFlash } from './motion';
import { useLang } from '../i18n';

/** Round ruby "70% OFF" stamp. Thumps in, then rotates a full turn every few seconds (not continuously). */
export function Stamp({ percent, size = 52, delay = 800, label = 'OFF', style, spin = true }: { percent: number | string; size?: number; delay?: number; label?: string; style?: StyleProp<ViewStyle>; spin?: boolean }) {
  const ar = useLang() === 'ar';
  const A = ar ? 14 : -14;
  const sc = useSharedValue(1.4);
  const op = useSharedValue(0);
  const rot = useSharedValue(ar ? 34 : -34);
  const ring = useSharedValue(0);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 200 }));
    sc.value = withDelay(delay, withSequence(withTiming(0.92, { duration: 300 }), withSpring(1, { damping: 8 })));
    rot.value = withDelay(delay, withTiming(A, { duration: 450, easing: Easing.out(Easing.back(2)) }));
    ring.value = withDelay(delay + 150, withTiming(1, { duration: 700 }));
    if (!spin) return;
    // A calm full turn every 6 s, holding still in between.
    const id = setInterval(() => {
      rot.value = withSequence(withTiming(A + (ar ? -360 : 360), { duration: 1400, easing: Easing.inOut(Easing.cubic) }), withTiming(A, { duration: 0 }));
    }, 6000);
    return () => clearInterval(id);
  }, [delay, op, sc, rot, ring, spin, A, ar]);
  const a = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ scale: sc.value }, { rotate: `${rot.value}deg` }] }));
  const r = useAnimatedStyle(() => ({ opacity: ring.value === 0 ? 0 : 0.85 * (1 - ring.value), transform: [{ scale: 1 + ring.value * 0.9 }] }));
  const k = size / 52;
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      {/* glowP: a ruby glow pulses once as the stamp lands */}
      <GlowFlash delay={delay} duration={900} width={size * 2.2} height={size * 2.2} peak={0.6} style={{ left: -size * 0.6, top: -size * 0.6 }} />
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size, borderWidth: 2, borderColor: colors.ruby }, r]} />
      <Animated.View style={[st.stamp, { width: size, height: size, borderRadius: size / 2 }, a]}>
        <View style={[st.dash, { borderRadius: size }]} />
        <Text maxFontSizeMultiplier={1} style={{ color: '#fff', fontSize: 16 * k, lineHeight: 17 * k, ...W('extrabold') }}>{typeof percent === 'number' ? `${percent}%` : percent}</Text>
        {label ? <Text maxFontSizeMultiplier={1} style={{ color: '#fff', fontSize: 12 * k, lineHeight: 13 * k, letterSpacing: 0.6, ...W('bold') }}>{label}</Text> : null}
      </Animated.View>
    </View>
  );
}

/** Swing tag on a string with the price, original price and stamp. Drops in and swings to rest. */
export function SwingTag({ price, was, percent, delay = 0, rest: rest0 = -4, scale = 0.88, style, soldOut }: { price: number; was: number; percent: number; delay?: number; rest?: number; scale?: number; style?: StyleProp<ViewStyle>; soldOut?: boolean }) {
  const ar = useLang() === 'ar';
  const mir = ar ? -1 : 1; // tilt the other way in Arabic
  const rest = rest0 * mir;
  const rot = useSharedValue(-38 * (ar ? -1 : 1));
  const ty = useSharedValue(-16);
  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 150 }));
    ty.value = withDelay(delay, withTiming(0, { duration: 300 }));
    rot.value = withDelay(delay, withSequence(
      withTiming(16 * mir, { duration: 430, easing: Easing.out(Easing.quad) }),
      withTiming(-9 * mir, { duration: 240 }),
      withTiming(4.5 * mir, { duration: 200 }),
      withTiming(-2 * mir, { duration: 200 }),
      withTiming(rest, { duration: 200 }),
    ));
  }, [delay, rest, op, ty, rot, mir]);
  const sw = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }, { translateX: 0 }, { rotate: `${rot.value}deg` }] }));
  const priceTx = soldOut ? '–' : String(price);
  return (
    <View style={[{ width: 84, height: 140, transform: [{ scale }] }, style]} pointerEvents="none" accessibilityLabel={`Now QAR ${price}, was QAR ${was}, ${percent}% off`}>
      <Svg width={84} height={34} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Path d="M42 4C37 12 47 22 42 32" fill="none" stroke={colors.muted} strokeWidth={1.4} strokeLinecap="round" />
        <Circle cx={42} cy={4} r={3.6} fill={colors.plum} stroke="#fff" strokeWidth={1.5} />
      </Svg>
      {/* pivot at 42,14 of the tag: shift origin with translate */}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 18, width: 84, height: 96, transformOrigin: '42px 14px' } as ViewStyle, sw]}>
        <View style={st.tagShadow}>
          <Svg width={84} height={96}>
            <Path fillRule="evenodd" d="M16 0H68L84 16V88a8 8 0 0 1-8 8H8a8 8 0 0 1-8-8V16Z M37 14a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z" fill="#fff" />
            <Path d="M16.5 .5H67.5L83.5 16.5V88a7.5 7.5 0 0 1-7.5 7.5H8A7.5 7.5 0 0 1 .5 88V16.5Z" fill="none" stroke="#E6B8C0" strokeWidth={1} />
            <Circle cx={42} cy={14} r={7.5} fill="none" stroke="#E6B8C0" strokeWidth={2.5} />
            <Path d="M10 27H74" stroke={colors.pale} strokeWidth={1.2} strokeDasharray="2 3" />
          </Svg>
        </View>
        <View style={st.tagIn}>
          <Text maxFontSizeMultiplier={1} style={st.now} numberOfLines={1}>
            {ar ? null : <Text maxFontSizeMultiplier={1} style={{ fontSize: 13, letterSpacing: 0.3, ...W('bold') }}>QAR </Text>}
            <Text maxFontSizeMultiplier={1} style={priceTx.length > 2 ? { fontSize: 20 } : null}>{priceTx}</Text>
            {ar ? <Text maxFontSizeMultiplier={1} style={{ fontSize: 13, ...W('bold') }}> ر.ق</Text> : null}
          </Text>
          <Text maxFontSizeMultiplier={1} style={st.was}>{ar ? `${was} ر.ق` : `QAR ${was}`}</Text>
        </View>
        {soldOut ? null : <Stamp percent={percent} delay={delay + 800} style={{ position: 'absolute', ...atStart(-22), top: 70 }} />}
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  stamp: { position: 'absolute', backgroundColor: colors.ruby, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: colors.plum, shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  dash: { position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderWidth: 1.2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.7)' },
  tagShadow: dropShadow('drop-shadow(0 8px 10px rgba(51,22,49,.28))', { shadowColor: colors.plum, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 8 } }),
  tagIn: { position: 'absolute', left: 0, right: 0, top: 24, alignItems: 'center' },
  now: { color: colors.ruby, fontSize: 24, lineHeight: 28, letterSpacing: -0.2, ...W('extrabold') },
  was: { color: colors.muted, fontSize: 13, lineHeight: 18, textDecorationLine: 'line-through', ...W('semibold') },
});

export const serif = { fontFamily: fonts.serif };
