import React, { useId, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Plum panel with an arched top edge and a dashed stitch line (onboarding, store hero). */
export function CurvedPanel({ children, rise = 34, style, stitch = true }: { children?: React.ReactNode; rise?: number; style?: StyleProp<ViewStyle>; stitch?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const [sz, setSz] = useState({ w: 390, h: 300 });
  const { w, h } = sz;
  const top = `M0 ${rise} Q ${w / 2} ${-rise} ${w} ${rise} V ${h} H 0 Z`;
  const dash = `M14 ${rise + 22} Q ${w / 2} ${-rise + 30} ${w - 14} ${rise + 22}`;
  return (
    <View style={style} onLayout={(e) => setSz({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`cp${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#5E1B4D" />
            <Stop offset="0.5" stopColor="#3E1A3B" />
            <Stop offset="1" stopColor="#331631" />
          </LinearGradient>
          <RadialGradient id={`cg${uid}`} cx={w * 0.85} cy={h} rx={w * 0.6} ry={h * 0.7} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#D9175C" stopOpacity="0.28" />
            <Stop offset="1" stopColor="#D9175C" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path d={top} fill={`url(#cp${uid})`} />
        <Path d={top} fill={`url(#cg${uid})`} />
        {stitch ? <Path d={dash} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.2} strokeDasharray="4 4" /> : null}
        <Rect x={0} y={0} width={0} height={0} />
      </Svg>
      <View style={{ paddingTop: rise + 18 }}>{children}</View>
    </View>
  );
}
