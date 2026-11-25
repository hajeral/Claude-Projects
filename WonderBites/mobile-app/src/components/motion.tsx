// Shared motion pieces, matching the keyframes in the final design (Glow & Go).
// All horizontal movement takes the reading direction into account (Arabic mirrors).
import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing, FadeIn, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';

/** cubic-bezier(.2,.8,.2,1): the design's "rise" ease. */
export const EASE_RISE = Easing.bezier(0.2, 0.8, 0.2, 1);
/** cubic-bezier(.3,1.4,.5,1): the design's "pop / stamp" overshoot. */
export const EASE_POP = Easing.bezier(0.3, 1.4, 0.5, 1);

/** rise: opacity 0 → 1 while moving up 14 px (design: .5s cubic-bezier(.2,.8,.2,1)). */
export function Rise({ delay = 0, dy = 14, duration = 500, style, children }: { delay?: number; dy?: number; duration?: number; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { if (!reduce) k.value = withDelay(delay, withTiming(1, { duration, easing: EASE_RISE })); }, [k, delay, duration, reduce]);
  const a = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateY: (1 - k.value) * dy }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** popIn: 0 → 60% scale 1.08 → 1, from scale .6 and opacity 0 (design: cubic-bezier(.3,1.4,.5,1)). */
export function Pop({ delay = 0, duration = 500, from = 0.6, mid = 1.08, style, children }: { delay?: number; duration?: number; from?: number; mid?: number; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    k.value = withDelay(delay, withSequence(
      withTiming(0.6, { duration: duration * 0.6, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: duration * 0.4, easing: Easing.inOut(Easing.quad) }),
    ));
  }, [k, delay, duration, reduce]);
  const a = useAnimatedStyle(() => ({
    opacity: interpolate(k.value, [0, 0.6, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(k.value, [0, 0.6, 1], [from, mid, 1]) }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/**
 * dtSwing + idle: a hanging tag drops in on its string, swings to rest, then sways gently
 * (design: 1.1s cubic-bezier(.3,.7,.4,1), then idle 5s rotate 0 ↔ 2.5deg). Mirrored in Arabic.
 */
export function Swing({ delay = 0, idle = true, mirror = false, origin = 'top', style, children }: { delay?: number; idle?: boolean; mirror?: boolean; origin?: string; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const reduce = useReducedMotion();
  const m = mirror ? -1 : 1;
  const k = useSharedValue(reduce ? 1 : 0);
  const sway = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    k.value = withDelay(delay, withTiming(1, { duration: 1100, easing: Easing.bezier(0.3, 0.7, 0.4, 1) }));
    if (idle) sway.value = withDelay(delay + 2400, withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [k, sway, delay, idle, reduce]);
  const a = useAnimatedStyle(() => ({
    opacity: interpolate(k.value, [0, 0.18, 1], [0, 1, 1]),
    transform: [
      { translateY: interpolate(k.value, [0, 0.42, 1], [-8, 0, 0]) },
      { rotate: `${m * (interpolate(k.value, [0, 0.42, 0.62, 0.8, 1], [-18, 10, -5, 2, 0]) + 2.5 * sway.value)}deg` },
    ],
  }));
  return <Animated.View style={[{ transformOrigin: origin } as ViewStyle, style, a]}>{children}</Animated.View>;
}

/** Ken Burns: a photo eases from 108% to 100% over 9 s while the screen settles. */
export function KenBurns({ play = true, style, children }: { play?: boolean; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { if (play && !reduce) { k.value = 0; k.value = withTiming(1, { duration: 9000, easing: Easing.out(Easing.quad) }); } }, [k, play, reduce]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: 1.08 - 0.08 * k.value }] }));
  return <Animated.View style={[{ overflow: 'hidden' }, style]}><Animated.View style={[StyleSheet.absoluteFill, a]}>{children}</Animated.View></Animated.View>;
}

/** panelUp: the curved panel slides up from below with a small overshoot (.9s cubic-bezier(.2,.9,.25,1.08)). */
export function PanelUp({ delay = 0, play = true, style, children }: { delay?: number; play?: boolean; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [h, setH] = React.useState(0);
  const k = useSharedValue(play && !reduce ? 0 : 1);
  useEffect(() => { if (play && !reduce) k.value = withDelay(delay, withTiming(1, { duration: 900, easing: Easing.bezier(0.2, 0.9, 0.25, 1.08) })); }, [k, delay, play, reduce]);
  const a = useAnimatedStyle(() => ({ opacity: h ? 1 : 0, transform: [{ translateY: (1 - k.value) * h * 1.05 }] }));
  return <Animated.View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={[style, a]}>{children}</Animated.View>;
}

/** sheetUp: a card glides up from below (design: 1s cubic-bezier(.65,0,.35,1) at 1.35s on the map). */
export function SlideUp({ delay = 0, duration = 500, style, children }: { delay?: number; duration?: number; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(reduce ? 1 : 0);
  const [h, setH] = React.useState(220);
  useEffect(() => { if (!reduce) k.value = withDelay(delay, withTiming(1, { duration, easing: Easing.bezier(0.65, 0, 0.35, 1) })); }, [k, delay, duration, reduce]);
  const a = useAnimatedStyle(() => ({ opacity: interpolate(k.value, [0, 0.3, 1], [0, 1, 1]), transform: [{ translateY: (1 - k.value) * (h + 30) }] }));
  return <Animated.View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={[style, a]}>{children}</Animated.View>;
}

/** Ink ring: a thin ruby ring that spreads out and fades once, after a stamp lands. */
export function InkRing({ delay = 0, size, radius, color = '#D9175C', to = 1.9, duration = 600, width = 2, style }: { delay?: number; size: number; radius?: number; color?: string; to?: number; duration?: number; width?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => { if (!reduce) k.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) })); }, [k, delay, duration, reduce]);
  const a = useAnimatedStyle(() => ({ opacity: k.value === 0 || k.value === 1 ? 0 : 0.85 * (1 - k.value), transform: [{ scale: 1 + (to - 1) * k.value }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: radius ?? size / 2, borderWidth: width, borderColor: color }, style, a]} />;
}

/** A soft ruby glow behind something that flashes once (checkout total, stamps). */
export function GlowFlash({ delay = 0, duration = 1200, width, height, color = '#D9175C', peak = 0.55, style }: { delay?: number; duration?: number; width: number; height: number; color?: string; peak?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    k.value = withDelay(delay, withSequence(withTiming(1, { duration: duration * 0.3, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: duration * 0.7, easing: Easing.in(Easing.quad) })));
  }, [k, delay, duration, reduce]);
  const a = useAnimatedStyle(() => ({ opacity: k.value * peak }));
  const id = React.useId().replace(/:/g, '');
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width, height }, style, a]}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={`gf${id}`} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={`url(#gf${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * focusGlow: the ruby ring round a focused field / the current code box breathes
 * between a 4 px and a 6 px halo (design: 2.4s ease-in-out, infinite).
 */
export function FocusGlow({ radius, delay = 0, on = true }: { radius: number; delay?: number; on?: boolean }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => {
    if (!on || reduce) { k.value = 0; return; }
    k.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [k, delay, on, reduce]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.7 + 0.3 * k.value, transform: [{ scale: 1 + 0.012 * k.value }] }));
  const glow = useAnimatedStyle(() => ({ opacity: k.value }));
  if (!on) return null;
  return (
    <>
      <Animated.View pointerEvents="none" style={[st.glow, { borderRadius: radius + 10 }, glow]} />
      <Animated.View pointerEvents="none" style={[st.ring, { borderRadius: radius + 5 }, ring]} />
    </>
  );
}

/** Slow continuous pulse used for "Last one!" and live dots: a ring that expands and fades. */
export function PulseRing({ size, radius, color, duration = 1300, to = 1.35, delay = 0, style }: { size: number | { w: number; h: number }; radius?: number; color: string; duration?: number; to?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => { if (!reduce) k.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1, false)); }, [k, duration, delay, reduce]);
  const a = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - k.value), transform: [{ scale: 1 + (to - 1) * k.value }] }));
  const w = typeof size === 'number' ? size : size.w;
  const h = typeof size === 'number' ? size : size.h;
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: w, height: h, borderRadius: radius ?? Math.min(w, h) / 2, backgroundColor: color }, style, a]} />;
}

/** lastOne: an emerald halo spreads 0 → 8 px round a chip and fades, on a 1.3 s loop. */
export function PulseHalo({ color = 'rgba(0,107,60,0.55)', spread = 8, duration = 1300, radius = 999 }: { color?: string; spread?: number; duration?: number; radius?: number }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => { if (!reduce) k.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }), -1, false); }, [k, duration, reduce]);
  const a = useAnimatedStyle(() => ({ opacity: 1 - k.value, top: -spread * k.value, bottom: -spread * k.value, left: -spread * k.value, right: -spread * k.value }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', borderRadius: radius, backgroundColor: color }, a]} />;
}

/** One rolling digit: when the value changes the new digit slides up into place. */
export function RollDigit({ value, style, height = 20, children }: { value: string; style?: StyleProp<ViewStyle>; height?: number; children: (v: string) => React.ReactNode }) {
  return (
    <View style={[{ height, overflow: 'hidden' }, style]}>
      <RollIn key={value} height={height}>{children(value)}</RollIn>
    </View>
  );
}
function RollIn({ height, children }: { height: number; children: React.ReactNode }) {
  const k = useSharedValue(0);
  useEffect(() => { k.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }); }, [k]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - k.value) * height }] }));
  return <Animated.View style={a}>{children}</Animated.View>;
}

const st = StyleSheet.create({
  ring: { position: 'absolute', top: -5, left: -5, right: -5, bottom: -5, borderWidth: 4, borderColor: 'rgba(217,23,92,0.16)' },
  glow: { position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, borderWidth: 6, borderColor: 'rgba(217,23,92,0.07)' },
});

/**
 * Grows or shrinks smoothly (220ms) to fit whatever it holds, so content below slides instead of jumping;
 * new content fades in (200ms). `k` names what is shown: change it to swap the content.
 */
export function AutoHeight({ k, children, style }: { k: string; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const h = useSharedValue(-1);
  const a = useAnimatedStyle(() => (h.value < 0 ? {} : { height: h.value }));
  const onLayout = (e: { nativeEvent: { layout: { height: number } } }) => {
    const nh = e.nativeEvent.layout.height;
    h.value = h.value < 0 ? nh : withTiming(nh, { duration: 220, easing: EASE_RISE });
  };
  return (
    <Animated.View style={[{ overflow: 'hidden' }, style, a]}>
      <View onLayout={onLayout} style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
        <Animated.View key={k} entering={FadeIn.duration(200)}>{children}</Animated.View>
      </View>
    </Animated.View>
  );
}
