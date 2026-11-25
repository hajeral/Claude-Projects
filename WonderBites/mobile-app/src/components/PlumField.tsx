import React, { useEffect, useId } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from '../theme';

/** Full-screen plum background with a slowly turning ruby field and a vignette. */
export function PlumField({ glowY = 0.45 }: { glowY?: number }) {
  const uid = useId().replace(/:/g, '');
  const { width: w, height: h } = useWindowDimensions();
  const rot = useSharedValue(0);
  useEffect(() => { rot.value = withRepeat(withTiming(360, { duration: 60000, easing: Easing.linear }), -1, false); }, [rot]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const D = Math.max(w, h) * 1.3;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.plum, overflow: 'hidden' }]} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', width: D, height: D, left: (w - D) / 2, top: h * glowY - D / 2 }, spin]}>
        <Svg width={D} height={D}>
          <Defs>
            <RadialGradient id={`f1${uid}`} cx="30%" cy="35%" r="40%"><Stop offset="0" stopColor="#6E1A4C" stopOpacity="0.95" /><Stop offset="1" stopColor="#6E1A4C" stopOpacity="0" /></RadialGradient>
            <RadialGradient id={`f2${uid}`} cx="72%" cy="62%" r="38%"><Stop offset="0" stopColor="#5A1B4A" stopOpacity="0.9" /><Stop offset="1" stopColor="#5A1B4A" stopOpacity="0" /></RadialGradient>
          </Defs>
          <Rect width={D} height={D} fill={`url(#f1${uid})`} />
          <Rect width={D} height={D} fill={`url(#f2${uid})`} />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`vg${uid}`} cx="50%" cy={`${glowY * 100}%`} rx="70%" ry="55%">
            <Stop offset="0" stopColor={colors.plum} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.plum} stopOpacity="0.6" />
          </RadialGradient>
        </Defs>
        <Rect width={w} height={h} fill={`url(#vg${uid})`} />
      </Svg>
    </View>
  );
}
