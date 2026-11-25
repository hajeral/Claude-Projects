import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { SKY } from './skylineData';

const AP = Animated.createAnimatedComponent(Path);
const AR = Animated.createAnimatedComponent(Rect);
const AG = Animated.createAnimatedComponent(G);

const clamp = (x: number) => { 'worklet'; return x < 0 ? 0 : x > 1 ? 1 : x; };

/**
 * Welcome "Silk Ribbon": tapered glowing comets shoot in from the bottom corners and
 * sides and draw the Doha West Bay skyline (Doha Tower, Tornado Tower, Zig Zag Towers,
 * Al Bidda) in fine blush lines. Then windows twinkle, a shimmer runs along the skyline
 * every 6 s, a Corniche light trail glides, and a faint reflection ripples below.
 * Drawn in the design's 390 × 844 space and scaled to the screen.
 */
export function Skyline() {
  const { width, height } = useWindowDimensions();
  const clock = useSharedValue(0); // seconds since mount
  useEffect(() => { clock.value = withTiming(100000, { duration: 100000 * 1000, easing: Easing.linear }); }, [clock]);
  return (
    <Svg width={width} height={height} viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <ClipPath id="below"><Rect x={0} y={431} width={390} height={34} /></ClipPath>
        <LinearGradient id="rg" x1="0" y1="431" x2="0" y2="465" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#fff" stopOpacity="0" />
        </LinearGradient>
        <Mask id="rfade" maskUnits="userSpaceOnUse" x="0" y="425" width="390" height="45"><Rect x={0} y={431} width={390} height={34} fill="url(#rg)" /></Mask>
      </Defs>

      {/* the skyline, revealed as each trail passes */}
      <Settle clock={clock}>
        {SKY.lines.map((l, i) => <SkyLine key={i} clock={clock} {...l} />)}
      </Settle>

      {/* reflection on the water */}
      <Reflection clock={clock} />

      {/* idle shimmer every 6 s */}
      {SKY.shimmer.map((s, i) => <Shimmer key={i} clock={clock} {...s} />)}

      {/* comets */}
      {SKY.trails.map((t, i) => (
        <G key={i}>
          <Comet clock={clock} {...t} head={150} w={0.8} color="#E6B8C0" o={0.5} />
          <Comet clock={clock} {...t} head={70} w={1.8} color="#FFE3EC" o={0.75} />
          <Comet clock={clock} {...t} head={34} w={8} color="#FF4F8B" o={0.35} />
          <Comet clock={clock} {...t} head={26} w={3} color="#FFFFFF" o={1} />
        </G>
      ))}

      {SKY.windows.map((w, i) => <Window key={i} clock={clock} {...w} />)}
      <Corniche clock={clock} />
    </Svg>
  );
}

type C = { clock: SharedValue<number> };

function Settle({ clock, children }: C & { children: React.ReactNode }) {
  const p = useAnimatedProps(() => ({ opacity: 0.85 - 0.51 * clamp((clock.value - 2.6) / 1.2) }));
  return <AG animatedProps={p}>{children}</AG>;
}

function SkyLine({ clock, d, len, faint, t, delay }: C & { d: string; len: number; faint: boolean; t: number; delay: number }) {
  const p = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - clamp((clock.value - delay) / t)) }));
  return (
    <G>
      <AP d={d} fill="none" stroke="#FF4F8B" strokeOpacity={faint ? 0.18 : 0.35} strokeWidth={faint ? 2.2 : 3.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${len} ${len}`} animatedProps={p} />
      <AP d={d} fill="none" stroke="#E6B8C0" strokeOpacity={faint ? 0.5 : 1} strokeWidth={faint ? 0.7 : 1.1} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${len} ${len}`} animatedProps={p} />
    </G>
  );
}

function Comet({ clock, d, len, t, delay, head, w, color, o }: C & { d: string; len: number; t: number; delay: number; head: number; w: number; color: string; o: number }) {
  const p = useAnimatedProps(() => {
    const k = (clock.value - delay) / t;
    const op = k <= 0 || k >= 1 ? 0 : k > 0.9 ? o * (1 - (k - 0.9) / 0.1) : o;
    return { strokeDashoffset: head - len * clamp(k), opacity: op };
  });
  return <AP d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${head} ${len + 200}`} animatedProps={p} />;
}

function Shimmer({ clock, d, len, delay }: C & { d: string; len: number; delay: number }) {
  const seg = len * 0.1;
  const p = useAnimatedProps(() => {
    if (clock.value < delay) return { opacity: 0, strokeDashoffset: seg };
    const k = ((clock.value - delay) % 6) / 6; // 6 s cycle
    const run = clamp(k / 0.36);
    const op = k < 0.04 ? (k / 0.04) * 0.75 : k < 0.3 ? 0.75 : k < 0.36 ? 0.75 * (1 - (k - 0.3) / 0.06) : 0;
    return { opacity: op, strokeDashoffset: seg - (len + seg) * run };
  });
  return <AP d={d} fill="none" stroke="#FFF4F7" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${seg} ${len * 1.3}`} animatedProps={p} />;
}

function Window({ clock, x, y, delay }: C & { x: number; y: number; delay: number }) {
  const p = useAnimatedProps(() => {
    if (clock.value < delay) return { opacity: 0 };
    const k = ((clock.value - delay) % 3.2) / 3.2;
    return { opacity: k < 0.4 ? (k / 0.4) * 0.85 : k < 0.6 ? 0.85 : 0.85 * (1 - (k - 0.6) / 0.4) };
  });
  return <AR x={x} y={y} width={2.4} height={2.4} rx={0.6} fill="#FFE3EC" animatedProps={p} />;
}

function Corniche({ clock }: C) {
  const p = useAnimatedProps(() => {
    if (clock.value < 2.2) return { opacity: 0, strokeDashoffset: 0 };
    const k = ((clock.value - 2.2) % 9) / 9;
    const op = k < 0.1 ? (k / 0.1) * 0.9 : k > 0.9 ? 0.9 * (1 - (k - 0.9) / 0.1) : 0.9;
    return { opacity: op, strokeDashoffset: -k * 500 };
  });
  return <AP d="M-20 438 H410" fill="none" stroke="#FFE3EC" strokeWidth={1.6} strokeLinecap="round" strokeDasharray="34 215" animatedProps={p} />;
}

function Reflection({ clock }: C) {
  const fade = useAnimatedProps(() => ({ opacity: 0.26 * clamp((clock.value - 1.4) / 0.9) }));
  const sway = useAnimatedProps(() => {
    const k = ((clock.value % 4.2) / 4.2) * Math.PI * 2;
    return { transform: `translate(${Math.sin(k) * 1.5} 0)` };
  });
  const rp = (dl: number, tt: number) => useAnimatedProps(() => ({ strokeDashoffset: -(((Math.max(0, clock.value - dl)) % tt) / tt) * 140 })); // eslint-disable-line react-hooks/rules-of-hooks
  const r = [rp(0, 3.2), rp(0.6, 4.1), rp(1.1, 3.6), rp(0.3, 4.6)];
  return (
    <AG clipPath="url(#below)" animatedProps={fade}>
      <G mask="url(#rfade)">
        <G transform="translate(0 860) scale(1 -1)">
          <AG animatedProps={sway}>
            {SKY.reflection.map((d, i) => <Path key={i} d={d} fill="none" stroke="#F1CBD7" strokeWidth={1.5} strokeLinejoin="round" />)}
          </AG>
        </G>
      </G>
      {[437, 443, 449, 455].map((y, i) => (
        <AP key={y} d={`M-40 ${y} H430`} fill="none" stroke="#331631" strokeWidth={1.6} strokeDasharray="34 10 18 8" animatedProps={r[i]} />
      ))}
    </AG>
  );
}
