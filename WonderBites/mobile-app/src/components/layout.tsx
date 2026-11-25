import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors, fonts } from '../theme';
import { Halo } from './Halo';
import { IconBtn, W } from './ui';

export const useTopInset = () => {
  const i = useSafeAreaInsets();
  return Math.max(i.top, Platform.OS === 'web' ? 44 : 20);
};
export const useBottomInset = () => {
  const i = useSafeAreaInsets();
  return Math.max(i.bottom, Platform.OS === 'web' ? 20 : 12);
};

export const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

/** Plum curved header with back button and centred title (account & sub pages). */
export function SubHeader({ title, right, onBack = back, children }: { title: string; right?: React.ReactNode; onBack?: () => void; children?: React.ReactNode }) {
  const top = useTopInset();
  return (
    <Halo style={{ paddingTop: top + 4, paddingHorizontal: 20 }} curve={30}>
      <View style={st.bar}>
        <IconBtn name="back" variant="glass" onPress={onBack} label="Back" />
        <Text style={st.title} numberOfLines={1}>{title}</Text>
        <View style={{ width: 44, alignItems: 'flex-end' }}>{right}</View>
      </View>
      {children}
      <View style={{ height: 14 }} />
    </Halo>
  );
}

/** Large serif title header (My orders, Favourites). */
export function BigHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  const top = useTopInset();
  return (
    <Halo style={{ paddingTop: top + 16, paddingHorizontal: 20 }} curve={30}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 32, lineHeight: 37, color: colors.white }}>{title}</Text>
      {sub ? <Text style={{ color: colors.pale, fontSize: 14, marginTop: 4, ...W('regular') }}>{sub}</Text> : null}
      {children}
      <View style={{ height: 16 }} />
    </Halo>
  );
}

/** Scrolling page on the cream background, with an optional pinned bottom action. */
export function Page({ header, children, footer, contentStyle, tabBar, bg = colors.cream }: { header?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode; contentStyle?: StyleProp<ViewStyle>; tabBar?: boolean; bg?: string }) {
  const [footH, setFootH] = useState(0);
  const bottom = useBottomInset();
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={[{ paddingBottom: footer ? Math.max(120, footH + 16) : tabBar ? 110 : bottom + 24 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {header}
        <View style={[{ paddingHorizontal: 20 }, contentStyle]}>{children}</View>
      </ScrollView>
      {/* the page measures its bottom bar so the last line is never hidden behind it */}
      {footer ? <View onLayout={(e) => setFootH(e.nativeEvent.layout.height)} style={[st.footer, { paddingBottom: bottom + 8 }]}>{footer}</View> : null}
    </View>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, textAlign: 'center', color: colors.white, fontSize: 17, ...W('bold') },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: colors.cream },
});
