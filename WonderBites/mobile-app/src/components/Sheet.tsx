import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { colors } from '../theme';
import { useBottomInset } from './layout';

const EASE = Easing.bezier(0.22, 1, 0.36, 1); // smooth ease-out, no bounce

/** Bottom sheet over a dimmed screen (Verify method, Log out). Slides up smoothly; tap outside to close. */
export function Sheet({ children }: { children: React.ReactNode }) {
  const bottom = useBottomInset();
  const [h, setH] = useState(0);
  const p = useSharedValue(0); // 0 hidden → 1 shown
  useEffect(() => { if (h) p.value = withTiming(1, { duration: 420, easing: EASE }); }, [h, p]);
  const close = () => { p.value = withTiming(0, { duration: 260, easing: Easing.in(Easing.cubic) }, (done) => { if (done) scheduleOnRN(router.back); }); };
  const dim = useAnimatedStyle(() => ({ opacity: p.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * (h || 600) }] }));
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(51,22,49,0.55)' }, dim]}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={[st.sheet, { paddingBottom: bottom + 10, opacity: h ? 1 : 0 }, sheet]}>
        <View style={st.grab} />
        {children}
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12 },
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#E6B8C0', marginBottom: 16 },
});
