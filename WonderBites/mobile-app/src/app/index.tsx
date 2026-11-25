// E01 Splash — light travels along the arch, the dot drops with glow rings,
// the wordmark wipes in. Tap anywhere to continue to onboarding.
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { AnimatedMark } from '../components/AnimatedMark';
import { Lockup } from '../components/Logo';
import { PlumField } from '../components/PlumField';
import { W } from '../components/ui';
import { Text } from '../components/AppText';

export default function Splash() {
  const wipe = useSharedValue(0);
  const tap = useSharedValue(0);
  useEffect(() => {
    wipe.value = withDelay(1750, withTiming(1, { duration: 500, easing: Easing.bezier(0.6, 0, 0.2, 1) }));
    tap.value = withDelay(2600, withTiming(1, { duration: 500 }));
  }, [wipe, tap]);
  const wipeStyle = useAnimatedStyle(() => ({ width: `${wipe.value * 100}%`, opacity: 0.2 + wipe.value * 0.8 }));
  const tapStyle = useAnimatedStyle(() => ({ opacity: tap.value }));
  return (
    <Pressable style={{ flex: 1 }} onPress={() => router.replace('/onboarding')} accessibilityLabel="WonderBites. Good finds. Close by. Continue.">
      <StatusBar style="light" />
      <PlumField glowY={0.42} />
      <View style={st.center}>
        <AnimatedMark size={135} />
        <View style={{ height: 96 }} />
        <View style={{ width: 290, height: 290 * (698.6 / 2589.5) }}>
          <Animated.View style={[{ overflow: 'hidden', height: '100%' }, wipeStyle]}>
            <View style={{ width: 290 }}><Lockup width={290} /></View>
          </Animated.View>
        </View>
      </View>
      <Animated.View style={[st.tapWrap, tapStyle]}><Text style={st.tap}>START YOUR JOURNEY</Text></Animated.View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  center: { position: 'absolute', left: 0, right: 0, top: '29%', alignItems: 'center' },
  tapWrap: { position: 'absolute', bottom: 56, left: 0, right: 0 },
  tap: { textAlign: 'center', color: 'rgba(255,255,255,0.85)', fontSize: 13, letterSpacing: 1.6, ...W('semibold') },
});

