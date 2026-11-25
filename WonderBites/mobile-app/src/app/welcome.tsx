// E05 Welcome — "Silk Ribbon": light trails draw the Doha skyline behind the logo,
// the dot switches on last, the ruby bloom breathes.
import { setStore } from '../state/store';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { InkRing, Rise } from '../components/motion';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Lockup } from '../components/Logo';
import { PlumField } from '../components/PlumField';
import { Skyline } from '../components/Skyline';
import { useBottomInset, useTopInset } from '../components/layout';
import { Button, W } from '../components/ui';
import { ARCH, W_PATH } from '../../assets/svg/markParts';
import { colors, dropShadow, fonts } from '../theme';

export default function Welcome() {
  const top = useTopInset();
  const bottom = useBottomInset();
  const { height } = useWindowDimensions();
  const compact = height < 760; // iPhone SE / mini: smaller logo so it never meets the headline
  const L = compact ? 0.72 : 1;
  const pop = useSharedValue(0.6);
  const popO = useSharedValue(0);
  const dot = useSharedValue(0);
  const bloom = useSharedValue(0);
  const lglow = useSharedValue(0);
  const dg = useSharedValue(0);
  useEffect(() => {
    // lglow: soft light behind the logo breathes (5 s); dotGlow: the dot's glow pulses (3.6 s)
    lglow.value = withDelay(800, withSequence(withTiming(0.72, { duration: 600 }), withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }), -1, true)));
    dg.value = withDelay(2200, withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }), -1, true));
    popO.value = withDelay(100, withTiming(1, { duration: 300 }));
    pop.value = withDelay(100, withSequence(withTiming(1.08, { duration: 420 }), withTiming(1, { duration: 280 })));
    dot.value = withDelay(1100, withSequence(withTiming(1.5, { duration: 300, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 600 })));
    bloom.value = withDelay(800, withSequence(withTiming(1, { duration: 1400, easing: Easing.bezier(0.2, 0.7, 0.2, 1) }), withRepeat(withTiming(0.72, { duration: 3500, easing: Easing.inOut(Easing.ease) }), -1, true)));
  }, [pop, popO, dot, bloom, lglow, dg]);
  const lglowS = useAnimatedStyle(() => ({ opacity: lglow.value, transform: [{ scale: 0.93 + 0.07 * lglow.value }] }));
  const dgS = useAnimatedStyle(() => ({ opacity: dot.value > 0 ? 0.35 + 0.65 * dg.value : 0, transform: [{ scale: 1 + 0.5 * dg.value }] }));
  const logoS = useAnimatedStyle(() => ({ opacity: popO.value, transform: [{ scale: pop.value }] }));
  const dotS = useAnimatedStyle(() => ({ opacity: dot.value > 0 ? 1 : 0, transform: [{ scale: dot.value }] }));
  const bloomS = useAnimatedStyle(() => ({ opacity: bloom.value, transform: [{ scale: 0.7 + 0.3 * Math.min(1, bloom.value / 0.72) }] }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.plum }}>
      <StatusBar style="light" />
      <PlumField glowY={0.2} />
      <Animated.View style={[st.bloom, bloomS]} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 470 260">
          <Defs>
            <RadialGradient id="bl" cx="50%" cy="70%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#D9175C" stopOpacity="0.42" />
              <Stop offset="0.45" stopColor="#D9175C" stopOpacity="0.14" />
              <Stop offset="0.72" stopColor="#D9175C" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="235" cy="130" rx="235" ry="130" fill="url(#bl)" />
        </Svg>
      </Animated.View>
      <Skyline />

      <View style={{ paddingTop: compact ? top + 26 : Math.max(150 - 44 + top, 120), alignItems: 'center' }}>
        <View style={st.shade} pointerEvents="none">
          <Svg width="100%" height="100%" viewBox="0 0 350 96" preserveAspectRatio="none">
            <Defs>
              <RadialGradient id="sh" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor="#331631" stopOpacity="0.88" />
                <Stop offset="0.55" stopColor="#331631" stopOpacity="0.6" />
                <Stop offset="1" stopColor="#331631" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse cx="175" cy="48" rx="175" ry="48" fill="url(#sh)" />
          </Svg>
        </View>
        <View style={{ transform: [{ scale: L }], marginVertical: compact ? -17 : 0 }}>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -70, top: -60, width: 250, height: 250 }, lglowS]}>
            <Svg width={250} height={250}><Defs><RadialGradient id="lg" cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#D9175C" stopOpacity="0.38" /><Stop offset="0.5" stopColor="#D9175C" stopOpacity="0.12" /><Stop offset="1" stopColor="#D9175C" stopOpacity="0" /></RadialGradient></Defs><Ellipse cx={125} cy={125} rx={125} ry={125} fill="url(#lg)" /></Svg>
          </Animated.View>
          <InkRing size={64} delay={1150} to={2.6} duration={1600} width={1.5} color="rgba(230,184,192,0.9)" style={{ left: 23, top: 30 }} />
          <InkRing size={64} delay={1450} to={2.6} duration={1600} width={1.5} color="rgba(244,141,180,0.8)" style={{ left: 23, top: 30 }} />
          <Animated.View style={[{ width: 110, height: 124 }, logoS]}>
          <View style={dropShadow('drop-shadow(0 0 10px rgba(230,184,192,.55))', { shadowColor: '#E6B8C0', shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } })}>
            <Svg width={110} height={124} viewBox="0 0 100 113">
              <Path d={ARCH} fill="none" stroke="#F4C3CD" strokeWidth={5.8} strokeLinecap="round" />
              <Path d={W_PATH} fill="#FFFFFF" />
            </Svg>
          </View>
          <Animated.View style={[st.dot, st.dotGlow, dgS]} />
          <Animated.View style={[st.dot, dotS]} />
        </Animated.View></View>
        <Rise delay={250} style={{ marginTop: compact ? 0 : 28 }}>
          <Lockup width={250 * L} />
        </Rise>
      </View>

      <View style={[st.bottom, { paddingBottom: bottom + 14 }]}>
        <Rise delay={350}>
          <Text style={st.h1}>Let’s get you{'\n'}something good.</Text>
          <Text style={st.p}>Great flavours from places you love, at prices that suit you.</Text>
        </Rise>
        <Rise delay={450} style={{ gap: 12, marginTop: 32 }}>
          <Button title="Create an account" onPress={() => router.push('/signup')} />
          <Button title="Log in" kind="ghost" onPress={() => router.push('/login')} />
          <Pressable onPress={() => { setStore((x) => ({ ...x, session: { signedIn: false, guest: true } })); router.push('/location'); }} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="link">
            <Text style={{ color: '#fff', fontSize: 16, textDecorationLine: 'underline', ...W('semibold') }}>Continue as guest</Text>
          </Pressable>
        </Rise>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  bloom: { position: 'absolute', left: -40, right: -40, top: 250, height: 260 },
  shade: { position: 'absolute', left: 20, right: 20, top: 286, height: 96 },
  dot: { position: 'absolute', left: 48.5, top: 107.5, width: 13, height: 13, borderRadius: 7, backgroundColor: '#fff', shadowColor: '#FF4F8B', shadowOpacity: 0.85, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  dotGlow: { backgroundColor: 'rgba(255,79,139,0.45)', shadowOpacity: 1, shadowRadius: 14 },
  bottom: { position: 'absolute', left: 20, right: 20, bottom: 0 },
  h1: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 37, color: '#fff', textAlign: 'center' },
  p: { color: colors.pale, fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 8, ...W('regular') },
});
