import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient as LG } from 'expo-linear-gradient';
import Animated, { Easing, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { ARCH, ARCH_LEN, DOT, W_PATH } from '../../assets/svg/markParts';

const APath = Animated.createAnimatedComponent(Path);

/**
 * Splash logo motion: light travels along the arch, the W appears, the dot drops
 * under the W with glow rings, then the ruby halo breathes. Logo is W + arch + dot only.
 */
export function AnimatedMark({ size = 135, start = 100, play = true }: { size?: number; start?: number; play?: boolean }) {
  const k = size / 100;
  const sweep = useSharedValue(play ? 0 : 1);
  const wOp = useSharedValue(play ? 0 : 1);
  const dotY = useSharedValue(play ? -300 : 0);
  const dotOp = useSharedValue(play ? 0 : 1);
  const halo = useSharedValue(play ? 0 : 0.7);
  const rings = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  // the falling light: p runs 0 → 1 over the 1.8 s fall (design dFall/dSquash/dTrail), then the
  // glowing core fades (dFade) as the solid dot of the mark switches on.
  const p = useSharedValue(play ? 0 : 1);
  const core = useSharedValue(play ? 1 : 0);
  const hit = useSharedValue(0);

  useEffect(() => {
    if (!play) return;
    sweep.value = withDelay(start + 100, withTiming(1, { duration: 1100, easing: Easing.bezier(0.45, 0.05, 0.35, 1) }));
    wOp.value = withDelay(start + 750, withTiming(1, { duration: 400 }));
    p.value = withDelay(start + 1150, withTiming(1, { duration: 1800, easing: Easing.linear }));
    core.value = withDelay(start + 2350, withTiming(0, { duration: 450, easing: Easing.in(Easing.quad) }));
    hit.value = withDelay(start + 2030, withTiming(1, { duration: 800, easing: Easing.bezier(0.2, 0.6, 0.3, 1) }));
    dotOp.value = withDelay(start + 2400, withTiming(1, { duration: 1 }));
    dotY.value = withDelay(start + 1150, withSequence(
      withTiming(0, { duration: 900, easing: Easing.bezier(0.45, 0.05, 0.55, 0.95) }),
      withTiming(-10, { duration: 230, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 230, easing: Easing.in(Easing.quad) }),
    ));
    halo.value = withDelay(start + 1200, withSequence(
      withTiming(0.7, { duration: 700 }),
      withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }), -1, true),
    ));
    [1180, 1550, 2050].forEach((d, i) => { rings[i].value = withDelay(start + d, withTiming(1, { duration: 1800, easing: Easing.bezier(0.2, 0.6, 0.25, 1) })); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);

  const arch = useAnimatedProps(() => ({ strokeDashoffset: ARCH_LEN * (1 - sweep.value) }));
  const wStyle = useAnimatedStyle(() => ({ opacity: wOp.value }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOp.value }));
  const dropStyle = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.12, 1], [0, 1, 1]) * core.value, transform: [{ translateY: dotY.value }] }));
  const squash = useAnimatedStyle(() => ({ transform: [
    { scaleX: interpolate(p.value, [0, 0.47, 0.51, 0.58, 0.66, 0.74, 0.82, 1], [0.8, 0.85, 1.35, 0.9, 1, 1.15, 1, 1]) },
    { scaleY: interpolate(p.value, [0, 0.47, 0.51, 0.58, 0.66, 0.74, 0.82, 1], [1.3, 1.25, 0.68, 1.12, 1, 0.88, 1, 1]) },
  ] }));
  const trail = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.15, 0.4, 0.5, 1], [0, 0.9, 0.9, 0, 0]), transform: [{ scaleY: interpolate(p.value, [0, 0.4, 0.5, 1], [0.4, 1, 0, 0]) }] }));
  const flash = useAnimatedStyle(() => ({ opacity: interpolate(hit.value, [0, 0.08, 1], [0, 0.75, 0]), transform: [{ scale: interpolate(hit.value, [0, 0.08, 1], [0.4, 0.6, 2.4]) }] }));
  const ripple = useAnimatedStyle(() => ({ opacity: interpolate(hit.value, [0, 0.06, 1], [0, 0.9, 0]), transform: [{ scale: interpolate(hit.value, [0, 0.06, 1], [1, 1.3, 6.5]) }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value, transform: [{ scale: 0.9 + halo.value * 0.2 }] }));
  const ringStyle = (i: number, gs: number, go: number) => useAnimatedStyle(() => ({ // eslint-disable-line react-hooks/rules-of-hooks
    opacity: rings[i].value === 0 ? 0 : go * (1 - rings[i].value),
    transform: [{ scale: 1 + rings[i].value * (gs - 1) }],
  }));
  const r0 = ringStyle(0, 6.2, 0.95), r1 = ringStyle(1, 5.4, 0.8), r2 = ringStyle(2, 4.6, 0.6);

  const W = 100 * k, H = 113 * k;
  return (
    <View style={{ width: W, height: H }}>
      <Animated.View style={[{ position: 'absolute', left: -W * 0.8, top: -H * 0.75, width: W * 2.6, height: W * 2.6 }, haloStyle]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="mh" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#D9175C" stopOpacity="0.45" />
              <Stop offset="0.45" stopColor="#D9175C" stopOpacity="0.15" />
              <Stop offset="1" stopColor="#D9175C" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="50%" cy="50%" r="50%" fill="url(#mh)" />
        </Svg>
      </Animated.View>
      {[r0, r1, r2].map((st, i) => (
        <Animated.View key={i} pointerEvents="none" style={[styles.ring, { left: 49.8 * k - 45 * k * 0.5, top: 49.8 * k - 45 * k * 0.5, width: 45 * k, height: 45 * k, borderRadius: 45 * k,
          borderColor: ['rgba(230,184,192,0.95)', 'rgba(244,141,180,0.85)', 'rgba(255,240,244,0.8)'][i] }, st]} />
      ))}
      <View style={styles.glow}>
        <Svg width={W} height={H} viewBox="0 0 100 113">
          <APath d={ARCH} fill="none" stroke="#F4C3CD" strokeWidth={5.8} strokeLinecap="round" strokeDasharray={`${ARCH_LEN} ${ARCH_LEN}`} animatedProps={arch} />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, wStyle]}>
          <Svg width={W} height={H} viewBox="0 0 100 113"><Path d={W_PATH} fill="#FFFFFF" /></Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, dotStyle]}>
          <Svg width={W} height={H} viewBox="0 0 100 113"><Circle cx={DOT.cx} cy={DOT.cy} r={DOT.r} fill="#FFFFFF" /></Svg>
        </Animated.View>
      </View>
      {/* impact: flash + ripple where the light lands */}
      <View pointerEvents="none" style={{ position: 'absolute', left: DOT.cx * k, top: DOT.cy * k, width: 0, height: 0 }}>
        <Animated.View style={[{ position: 'absolute', left: -30 * k, top: -30 * k, width: 60 * k, height: 60 * k }, flash]}>
          <Svg width="100%" height="100%" viewBox="0 0 60 60">
            <Defs>
              <RadialGradient id="fl" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.7" />
                <Stop offset="0.4" stopColor="#E6B8C0" stopOpacity="0.35" />
                <Stop offset="0.7" stopColor="#E6B8C0" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={30} cy={30} r={30} fill="url(#fl)" />
          </Svg>
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', left: -7 * k * 0.8, top: -7 * k * 0.8, width: 14 * k * 0.8, height: 14 * k * 0.8, borderRadius: 14 * k, borderWidth: 1, borderColor: 'rgba(230,184,192,0.85)' }, ripple]} />
        {/* the falling light: trail above a squashing glowing core */}
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, dropStyle]}>
          <Animated.View style={[{ position: 'absolute', left: -2, top: -90, width: 4, height: 86, borderRadius: 2, transformOrigin: 'bottom' } as object, trail]}>
            <LG colors={['rgba(230,184,192,0)', 'rgba(230,184,192,0.45)', 'rgba(255,255,255,0.85)']} locations={[0, 0.7, 1]} style={{ flex: 1, borderRadius: 2 }} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', left: -36, top: -36, width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }, squash]}>
            <Svg width={72} height={72} style={StyleSheet.absoluteFill}>
              <Defs>
                <RadialGradient id="cg" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
                  <Stop offset="0.3" stopColor="#E6B8C0" stopOpacity="0.6" />
                  <Stop offset="0.6" stopColor="#D9175C" stopOpacity="0.3" />
                  <Stop offset="1" stopColor="#D9175C" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx={36} cy={36} r={36} fill="url(#cg)" />
            </Svg>
            <View style={{ width: DOT.r * 2 * k, height: DOT.r * 2 * k, borderRadius: DOT.r * k, backgroundColor: '#FFFFFF' }} />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 1.5 },
  // Soft light around the mark: CSS drop-shadow on web, layer shadow on iOS (Android has no shape shadows).
  glow: Platform.select({
    web: { width: '100%', height: '100%', filter: 'drop-shadow(0 0 4px rgba(255,240,244,.65)) drop-shadow(0 0 14px rgba(230,184,192,.55)) drop-shadow(0 0 30px rgba(217,23,92,.45))' } as object,
    ios: { width: '100%', height: '100%', shadowColor: '#E6B8C0', shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
    default: { width: '100%', height: '100%' },
  }) as object,
});
