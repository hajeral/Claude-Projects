import React, { useEffect, useId, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient as LG } from 'expo-linear-gradient';
import Svg, { ClipPath, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, useReducedMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

const ARect = Animated.createAnimatedComponent(Rect);
const ENTER = Easing.bezier(0.2, 0.8, 0.2, 1);
import { colors } from '../theme';

/**
 * The curved plum "Halo" band at the top of most screens.
 * On open: the band stretches down into place, its content rises in, and a soft light sweeps
 * across once. Idle: the ruby glow breathes. (Home also collapses it on scroll.)
 * enter={false} for full-screen backgrounds and cards.
 */
const FIELD = require('../../assets/img/halo_field.png');
const FD = 1040; // design: a 1040 px blurred conic disc behind the band

export function Halo({ children, curve = 36, style, minHeight, full, enter = !full, fieldTop, spin = 48000 }: { children?: React.ReactNode; curve?: number; style?: StyleProp<ViewStyle>; minHeight?: number; full?: boolean; enter?: boolean; fieldTop?: number; spin?: number }) {
  const reduce = useReducedMotion();
  // hzSpin: the plum field turns one full circle every 48 s (60 s on the map).
  const turn = useSharedValue(0);
  useEffect(() => { if (!reduce) turn.value = withRepeat(withTiming(360, { duration: spin, easing: Easing.linear }), -1, false); }, [turn, spin, reduce]);
  const fieldSpin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  const uid = useId().replace(/:/g, '');
  const [size, setSize] = useState({ w: 390, h: minHeight ?? 120 });
  const breathe = useSharedValue(0.72);
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [breathe]);
  // breathe: opacity .72 ↔ 1 and scale 1 ↔ 1.07 from the top-right glow (6 s round trip)
  const glow = useAnimatedStyle(() => ({ opacity: breathe.value, transform: [{ scale: 1 + 0.25 * (breathe.value - 0.72) }] }));
  // entrance: 0 → 1
  const k = useSharedValue(enter ? 0 : 1);
  const sw = useSharedValue(enter ? 0 : 1);
  useEffect(() => {
    if (!enter) return;
    k.value = withTiming(1, { duration: 650, easing: ENTER });
    sw.value = withDelay(250, withTiming(1, { duration: 1600, easing: Easing.bezier(0.4, 0, 0.2, 1) }));
  }, [enter, k, sw]);
  const bandIn = useAnimatedStyle(() => ({ transform: [{ translateY: -(1 - k.value) * size.h * 0.42 }] }));
  const contentIn = useAnimatedStyle(() => ({ opacity: 0.2 + 0.8 * k.value, transform: [{ translateY: (1 - k.value) * -10 }] }));
  const sweep = useAnimatedProps(() => ({ x: -size.w * 0.6 + sw.value * size.w * 1.8, opacity: sw.value > 0 && sw.value < 1 ? 1 : 0 }));
  const { w, h } = size;
  const c = full ? 0 : curve;
  const d = c ? `M0 0H${w}V${h - c}A${w / 2} ${c} 0 0 1 0 ${h - c}Z` : `M0 0H${w}V${h}H0Z`;
  return (
    <View style={[{ minHeight, paddingBottom: c }, style]} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Animated.View style={[StyleSheet.absoluteFill, bandIn]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
          <Defs>
            <ClipPath id={`hc${uid}`}><Path d={d} /></ClipPath>
            <LinearGradient id={`hb${uid}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#3A1838" />
              <Stop offset="0.55" stopColor={colors.plum} />
              <Stop offset="1" stopColor="#2B1229" />
            </LinearGradient>
            <RadialGradient id={`hv${uid}`} cx="50%" cy="40%" rx="85%" ry="65%">
              <Stop offset="0" stopColor={colors.plum} stopOpacity="0" />
              <Stop offset="1" stopColor={colors.plum} stopOpacity="0.42" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={w} height={h} fill={`url(#hb${uid})`} clipPath={`url(#hc${uid})`} />
        </Svg>
        {/* turning field, kept above the curve and faded into the band's base near the bottom */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.max(0, h - c), overflow: 'hidden' }}>
          <Animated.View style={[{ position: 'absolute', width: FD, height: FD, left: w / 2 - FD / 2, top: fieldTop ?? (full ? -420 : 0) }, fieldSpin]}>
            <Image source={FIELD} style={{ width: FD, height: FD }} resizeMode="stretch" />
          </Animated.View>
          {c ? <LG colors={['rgba(51,22,49,0)', '#311530']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.min(48, h * 0.4) }} /> : null}
        </View>
        <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
          <Defs>
            <ClipPath id={`hc4${uid}`}><Path d={d} /></ClipPath>
            <RadialGradient id={`hv4${uid}`} cx="50%" cy="40%" rx="85%" ry="65%">
              <Stop offset="0" stopColor={colors.plum} stopOpacity="0" />
              <Stop offset="1" stopColor={colors.plum} stopOpacity="0.42" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={w} height={h} fill={`url(#hv4${uid})`} clipPath={`url(#hc4${uid})`} />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: '88% 0%' } as object, glow]}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
            <Defs>
              <ClipPath id={`hc2${uid}`}><Path d={d} /></ClipPath>
              <RadialGradient id={`g1${uid}`} cx={w * 0.88} cy="0" rx={w * 0.55} ry={Math.max(h, 160) * 0.95} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={colors.ruby} stopOpacity="0.5" />
                <Stop offset="0.7" stopColor={colors.ruby} stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id={`g2${uid}`} cx={w * 0.04} cy={h} rx={w * 0.45} ry={h * 0.7} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#E6B8C0" stopOpacity="0.2" />
                <Stop offset="0.7" stopColor="#E6B8C0" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width={w} height={h} fill={`url(#g1${uid})`} clipPath={`url(#hc2${uid})`} />
            <Rect x="0" y="0" width={w} height={h} fill={`url(#g2${uid})`} clipPath={`url(#hc2${uid})`} />
          </Svg>
        </Animated.View>
        {enter ? (
          <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
            <Defs>
              <ClipPath id={`hc3${uid}`}><Path d={d} /></ClipPath>
              <LinearGradient id={`sw${uid}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="0.5" stopColor="#FFE3EC" stopOpacity="0.16" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <ARect y={0} width={w * 0.6} height={h} fill={`url(#sw${uid})`} clipPath={`url(#hc3${uid})`} animatedProps={sweep} />
          </Svg>
        ) : null}
      </Animated.View>
      <Animated.View style={enter ? contentIn : undefined}>{children}</Animated.View>
    </View>
  );
}
