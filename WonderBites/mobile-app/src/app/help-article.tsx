// P09 Help article
import { useLocalSearchParams } from 'expo-router';
import { ARTICLES, findArticle } from '../lib/help';
import { setStore, useStore } from '../state/store';
import { toast } from '../components/Toast';
import React, { useState } from 'react';
import { WALLET } from '../lib/platform';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Page, SubHeader } from '../components/layout';
import { Button, Card, Pill, W } from '../components/ui';
import { colors, fonts } from '../theme';

const B = ({ children }: { children: string }) => <Text style={W('bold')}>{children}</Text>;

export default function HelpArticle() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const a = findArticle(id ?? 'closed') ?? ARTICLES[0];
  const helpful = useStore((x) => (a.id in x.helpful ? x.helpful[a.id] : null));
  const setHelpful = (v: boolean) => { setStore((x) => ({ ...x, helpful: { ...x.helpful, [a.id]: v } })); if (!v) toast('Thanks. Tell us more in a ticket if you still need help', 'info'); };
  return (
    <Page header={<SubHeader title="Help centre" />} footer={<View><Button title="Report a problem" onPress={() => router.push('/ticket-new')} /><Button kind="text" title="Go to my order" onPress={() => router.push('/orders')} /></View>}>
      <Pill label={a.cat} tone="pink" />
      <Text style={{ fontFamily: fonts.serif, fontSize: 26, lineHeight: 31, color: colors.plum, marginTop: 12 }}>{a.title}</Text>
      {a.id !== 'closed' ? (
        <>
          <Text style={p}>{a.intro}</Text>
          <Text style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.plum, marginTop: 20 }}>What to do</Text>
          {a.steps.map((x) => <View key={x} style={{ flexDirection: 'row', gap: 10, marginTop: 6, paddingStart: 6 }}><Text style={[p, { marginTop: 0 }]}>•</Text><Text style={[p, { flex: 1, marginTop: 0 }]}>{x}</Text></View>)}
        </>
      ) : (<>
      <Text style={p}>We’re sorry, that shouldn’t happen. If you arrived within your pickup window and the shop was closed, you’ll get a <B>full refund</B>, service fee included.</Text>
      <Text style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.plum, marginTop: 20 }}>What to do</Text>
      {[['Tap ', <B key="b">Report a problem</B>, ' on your Pickup passport while you’re still at the shop.'], ['Add a photo of the closed door if you can.'], [`We refund to your card or ${WALLET} within 3–5 days.`]].map((x, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, marginTop: 6, paddingStart: 6 }}><Text style={[p, { marginTop: 0 }]}>•</Text><Text style={[p, { flex: 1, marginTop: 0 }]}>{x}</Text></View>
      ))}
      </>)}
      <Card style={{ flexDirection: 'row', alignItems: 'center', padding: 14, marginTop: 20, gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 15, color: colors.plum, ...W('bold') }}>{helpful === null ? 'Was this helpful?' : 'Thanks for telling us'}</Text>
        <Pressable onPress={() => setHelpful(true)} accessibilityRole="button" accessibilityState={{ selected: helpful === true }} style={{ height: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: colors.emeraldSoft, justifyContent: 'center' }}><Text style={{ color: colors.emerald, ...W('bold') }}>Yes</Text></Pressable>
        <Pressable onPress={() => setHelpful(false)} accessibilityRole="button" accessibilityState={{ selected: helpful === false }} style={{ height: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: '#F6EDF1', justifyContent: 'center' }}><Text style={{ color: colors.muted, ...W('bold') }}>No</Text></Pressable>
      </Card>
    </Page>
  );
}
const p = { fontSize: 15, lineHeight: 24, color: '#4A2E47', marginTop: 10, fontFamily: fonts.regular } as const;
