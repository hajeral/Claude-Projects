import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { colors } from '../theme';
import type { IconName } from './icons';
import { Icon, W } from './ui';

const TABS: Record<string, { label: string; icon: IconName }> = {
  home: { label: 'Home', icon: 'home' },
  search: { label: 'Search', icon: 'search' },
  favorites: { label: 'Favorites', icon: 'heart' },
  orders: { label: 'Orders', icon: 'orders' },
  account: { label: 'Account', icon: 'user' },
};

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  return <TabBarView active={state.routes[state.index]?.name} onPress={(name) => { const r = state.routes.find((x) => x.name === name); if (r) navigateToTab(r.key); }} />;
}

/** The tab bar on its own, for stack screens that show it (e.g. Search typing). */
export function TabBarView({ active, onPress }: { active?: string; onPress?: (name: string) => void }) {
  const insets = useSafeAreaInsets();
  const go = onPress ?? ((name: string) => router.navigate(`/${name}` as Href));
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 22) }]}>
      {Object.keys(TABS).map((name) => {
        const t = TABS[name];
        const on = active === name;
        const r = { key: name, name };
        return (
          <Pressable key={r.key} onPress={() => go(r.name)} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label}>
            <View style={[s.pill, on && s.pillOn]}><Icon name={t.icon} size={20} color={on ? colors.white : colors.muted} /></View>
            <Text maxFontSizeMultiplier={1.15} style={[s.lb, on && { color: colors.ruby, ...W('bold') }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingTop: 6, paddingHorizontal: 8, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, shadowColor: colors.plum, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: -8 }, elevation: 12 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 44 },
  pill: { width: 56, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ruby, shadowColor: colors.ruby, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 6 } },
  lb: { fontSize: 13, color: colors.muted, ...W('medium') },
});
