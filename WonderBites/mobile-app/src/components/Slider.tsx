import React, { useState } from 'react';
import { atStart, atEnd } from '../i18n';
import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { colors, shadow } from '../theme';
import { W } from './ui';
import { useLang } from '../i18n';

const K = 22;

function Knob({ x, min, max, onEnd, dir }: { x: SharedValue<number>; min: () => number; max: () => number; onEnd: () => void; dir: number }) {
  const g = usePanGesture({
    onUpdate: (e) => { 'worklet'; x.value = Math.max(min(), Math.min(max(), x.value + e.changeX * dir)); },
    onDeactivate: () => { 'worklet'; scheduleOnRN(onEnd); },
  });
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: (x.value - K / 2) * dir }] }));
  return (
    <GestureDetector gesture={g}>
      <Animated.View hitSlop={12} style={[st.knob, atStart(0), a]} />
    </GestureDetector>
  );
}

/** One- or two-knob slider. Values are in the given [from, to] range. */
export function Slider({ from, to, value, value2, onChange, ticks }: { from: number; to: number; value: number; value2?: number; onChange?: (a: number, b?: number) => void; ticks?: string[] }) {
  const [w, setW] = useState(330);
  const toX = (v: number) => ((v - from) / (to - from)) * w;
  const a = useSharedValue(toX(value));
  const b = useSharedValue(value2 !== undefined ? toX(value2) : 0);
  const two = value2 !== undefined;
  const dir = useLang() === 'ar' ? -1 : 1; // Arabic: the scale runs right to left
  const rtl = dir < 0;
  const fill = useAnimatedStyle(() => (two ? { [rtl ? 'right' : 'left']: a.value, width: b.value - a.value } : { [rtl ? 'right' : 'left']: 0, width: a.value }));
  const emit = () => {
    const v = (x: number) => Math.round(from + (x / w) * (to - from));
    onChange?.(v(a.value), two ? v(b.value) : undefined);
  };
  return (
    <View>
      <View style={{ height: 28, justifyContent: 'center' }} onLayout={(e) => { const nw = e.nativeEvent.layout.width; setW(nw); a.value = ((value - from) / (to - from)) * nw; if (two) b.value = ((value2! - from) / (to - from)) * nw; }}>
        <View style={st.track} />
        <Animated.View style={[st.fill, fill]} />
        <Knob x={a} dir={dir} min={() => 0} max={() => (two ? b.value - K : w)} onEnd={emit} />
        {two ? <Knob x={b} dir={dir} min={() => a.value + K} max={() => w} onEnd={emit} /> : null}
      </View>
      {ticks ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          {ticks.map((t) => <Text key={t} style={{ fontSize: 12, color: colors.muted2, ...W('regular') }}>{t}</Text>)}
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  track: { height: 4, borderRadius: 2, backgroundColor: colors.line },
  fill: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: colors.ruby },
  knob: { position: 'absolute', width: K, height: K, borderRadius: K / 2, backgroundColor: '#fff', borderWidth: 3, borderColor: colors.ruby, ...shadow.float },
});
