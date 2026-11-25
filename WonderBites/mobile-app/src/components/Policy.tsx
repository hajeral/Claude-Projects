import React, { useRef } from 'react';
import { padStart } from '../i18n';
import { Pressable, ScrollView, type ScrollViewInstance, View } from 'react-native';
import { Text } from './AppText';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors, fonts } from '../theme';
import { SubHeader, useBottomInset } from './layout';
import { Group, ListRow, W } from './ui';

export type Section = { h: string; p?: string; list?: string[] };

/** Policy page (Privacy, Terms): table of contents chips that jump to sections. */
export function Policy({ title, updated, toc, sections }: { title: string; updated: string; toc: string[]; sections: Section[] }) {
  const ref = useRef<ScrollViewInstance>(null);
  const ys = useRef<Record<string, number>>({});
  const bottom = useBottomInset();
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <StatusBar style="light" />
      <ScrollView ref={ref} contentContainerStyle={{ paddingBottom: bottom + 24 }}>
        <SubHeader title={title} />
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 12, color: colors.muted, ...W('regular') }}>{updated}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {toc.map((t) => (
              <Pressable key={t} hitSlop={{ top: 7, bottom: 7 }} onPress={() => ref.current?.scrollTo({ y: ys.current[t] ?? 0, animated: true })} style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F1DDE6', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13, color: colors.muted, ...W('bold') }}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ marginTop: 16, padding: 16, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line }}>
            {sections.map((s) => (
              <View key={s.h} onLayout={(e) => { ys.current[s.h] = e.nativeEvent.layout.y + 200; }}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.plum, marginTop: 14, marginBottom: 4 }}>{s.h}</Text>
                {s.p ? <Text style={{ fontSize: 15, lineHeight: 24, color: '#4A2E47', ...W('regular') }}>{s.p}</Text> : null}
                {s.list?.map((li) => <Text key={li} style={{ fontSize: 15, lineHeight: 24, color: '#4A2E47', ...W('regular'), ...padStart(12) }}>•  {li}</Text>)}
              </View>
            ))}
          </View>
          <Group style={{ marginTop: 14 }}><ListRow icon="chat" title="Questions about this?" sub="Our team is here to help" onPress={() => router.push('/help')} /></Group>
        </View>
      </ScrollView>
    </View>
  );
}
