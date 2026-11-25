// Short confirmation messages ("Code copied", "Saved"), shown above the tab bar.
// Also shows, once, if saving to the phone ever fails.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './AppText';
import { Icon, W } from './ui';
import { colors } from '../theme';
import { useStoreError } from '../state/store';

type T = { id: number; text: string; tone: 'ok' | 'info' | 'error' };
let push: ((t: Omit<T, 'id'>) => void) | null = null;
export const toast = (text: string, tone: T['tone'] = 'ok') => push?.({ text, tone });

export function ToastHost() {
  const [items, setItems] = useState<T[]>([]);
  const { bottom } = useSafeAreaInsets();
  const err = useStoreError();
  useEffect(() => {
    push = (t) => { const id = Date.now() + Math.random(); setItems((x) => [...x.slice(-1), { ...t, id }]); setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 2600); };
    return () => { push = null; };
  }, []);
  useEffect(() => { if (err) toast('Couldn’t save your changes on this phone. They’ll be lost when you close the app.', 'error'); }, [err]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: bottom + 96 }]}>
      {items.map((t) => (
        <Animated.View key={t.id} entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(200)} style={[st.t, t.tone === 'error' && { backgroundColor: colors.rubyDark }]} accessibilityLiveRegion="polite">
          <Icon name={t.tone === 'error' ? 'info' : t.tone === 'info' ? 'info' : 'check'} size={16} color="#fff" />
          <Text style={st.tx}>{t.text}</Text>
        </Animated.View>
      ))}
    </View>
  );
}
const st = StyleSheet.create({
  t: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 340, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999, backgroundColor: colors.plum, marginTop: 8 },
  tx: { color: '#fff', fontSize: 14, flexShrink: 1, ...W('semibold') },
});
