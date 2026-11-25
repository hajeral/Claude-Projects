import React, { useEffect } from 'react';
import { useLang } from '../i18n';
import { Pressable } from 'react-native';
import Svg, { Circle, Defs, G, Path, Text as SvgText, TextPath } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { InkRing } from './motion';
import { colors, fonts } from '../theme';

/**
 * Round ruby stamp sticker used as a map pin: "% OFF" curved round the ring, the
 * serif price in the centre, the old price struck. Settles in softly; the ring
 * turns once every few seconds. Sold-out shops are grey.
 */
export function MapPin({ id, x, y, size = 74, tilt = 0, pct, price, was, soldOut, selected, hurry, delay = 0, onPress, label }: {
  id: string; x: number; y: number; size?: number; tilt?: number; pct: number; price: number; was: number; soldOut?: boolean; selected?: boolean; hurry?: boolean; delay?: number; onPress?: () => void; label: string;
}) {
  // hurryRing: a ruby ring keeps spreading from pins whose pickup closes soon (1.8 s loop)
  const hr = useSharedValue(0);
  useEffect(() => { hr.value = hurry ? withDelay(1600, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false)) : 0; }, [hurry, hr]);
  const hrS = useAnimatedStyle(() => ({ opacity: hr.value === 0 ? 0 : 0.9 * (1 - hr.value), transform: [{ scale: 1 + 0.45 * hr.value }] }));
  const s = useSharedValue(0);
  const ring = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(delay, selected ? withSequence(withTiming(1.25, { duration: 260 }), withSpring(1, { damping: 7 })) : withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.4)) }));
    if (soldOut) return;
    const id2 = setInterval(() => { ring.value = withSequence(withTiming(360, { duration: 1600, easing: Easing.inOut(Easing.cubic) }), withTiming(0, { duration: 0 })); }, 7000 + (delay % 1000) * 3);
    return () => clearInterval(id2);
  }, [delay, s, ring, selected, soldOut]);
  const a = useAnimatedStyle(() => ({ opacity: Math.min(1, s.value), transform: [{ scale: s.value }, { rotate: `${tilt}deg` }] }));
  const r = useAnimatedStyle(() => ({ transform: [{ rotate: `${ring.value}deg` }] }));
  const red = soldOut ? '#9A8A97' : colors.ruby;
  const ar = useLang() === 'ar';
  const word = ar ? (soldOut ? 'نفدت' : `خصم ${pct}%`) : soldOut ? 'SOLD OUT' : `${pct}% OFF`;
  const txt = `${word} · ${word} · ${word} · `;
  const F = ar ? { x: 'IBMPlexSansArabic_700Bold', b: 'IBMPlexSansArabic_700Bold', s: fonts.serif, m: 'IBMPlexSansArabic_500Medium', ls: 0 } : { x: fonts.extrabold, b: fonts.bold, s: fonts.serif, m: fonts.semibold, ls: 1.2 };
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: size, height: size }, a, selected && { zIndex: 5 }]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width: size, height: size }}>
        {selected ? <Animated.View style={{ position: 'absolute', left: -8, top: -8, right: -8, bottom: -8, borderRadius: size, backgroundColor: 'rgba(217,23,92,0.18)' }} /> : null}
        {selected ? <InkRing key={id} size={size} delay={delay + 450} duration={1200} to={1.75} width={2.5} /> : null}
        {hurry && !soldOut ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size, borderWidth: 2.5, borderColor: colors.ruby }, hrS]} /> : null}
        <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
          <Circle cx={50} cy={50} r={49} fill="#fff" />
          <Circle cx={50} cy={50} r={45.5} fill={red} />
        </Svg>
        <Animated.View style={[{ position: 'absolute', width: size, height: size }, r]}>
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Defs><Path id={`rp${id}`} d="M50 50m-36.5 0a36.5 36.5 0 1 1 73 0a36.5 36.5 0 1 1 -73 0" fill="none" /></Defs>
            <Circle cx={50} cy={50} r={43.5} fill="none" stroke="#FEFAF7" strokeOpacity={0.45} strokeWidth={0.8} strokeDasharray="1 2.6" />
            <SvgText fontFamily={F.x} fontSize={11} letterSpacing={F.ls} fill="#fff">
              <TextPath href={`#rp${id}`}>{txt}</TextPath>
            </SvgText>
          </Svg>
        </Animated.View>
        <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
          <G>
            <Circle cx={50} cy={50} r={33} fill="#FEFAF7" />
            <Circle cx={50} cy={50} r={30.5} fill="none" stroke={red} strokeOpacity={0.35} strokeWidth={0.8} />
            <SvgText x={50} y={38} textAnchor="middle" fontFamily={F.b} fontSize={13} letterSpacing={ar ? 0 : 1.3} fill={red}>{ar ? 'ر.ق' : 'QAR'}</SvgText>
            <SvgText x={50} y={61} textAnchor="middle" fontFamily={fonts.serif} fontSize={26} fill={red}>{soldOut ? '–' : price}</SvgText>
            <SvgText x={50} y={76} textAnchor="middle" fontFamily={F.m} fontSize={13} fill={colors.muted} textDecoration="line-through">{ar ? `${was} ر.ق` : `QAR ${was}`}</SvgText>
            <Path d="M33 72 H67" stroke={colors.muted} strokeWidth={1.2} opacity={0.8} />
          </G>
        </Svg>
      </Pressable>
    </Animated.View>
  );
}
