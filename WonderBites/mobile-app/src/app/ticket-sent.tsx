// P10c Ticket sent
import { useLocalSearchParams } from 'expo-router';
import { useStore } from '../state/store';
import { sync } from '../api/client';
import { NotFound } from '../components/NotFound';
import { LIVE, SUPPORT_REPLY_TIME } from '../config';
import React from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Page, SubHeader } from '../components/layout';
import { Button, Group, Icon, ListRow, W } from '../components/ui';
import { colors, fonts } from '../theme';

export default function TicketSent() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const tickets = useStore((x) => x.tickets);
  const t = tickets.find((x) => x.id === id) ?? (id ? undefined : tickets[0]);
  const o = t?.orderId ? sync.findOrder(t.orderId) : undefined;
  const br = o ? sync.findBranch(o.branchId) : undefined;
  if (!t) return <NotFound kind="ticket" />;
  return (
    <Page header={<SubHeader title="New ticket" />} footer={<View><Button title="View my tickets" onPress={() => router.replace('/tickets')} /><Button kind="text" title="Back to home" onPress={() => router.replace('/home')} /></View>}>
      <View style={{ alignItems: 'center' }}>
        <Animated.View entering={ZoomIn.springify().damping(9)} style={{ width: 108, height: 108, borderRadius: 54, backgroundColor: colors.emeraldSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={44} color={colors.emerald} stroke={2.4} />
        </Animated.View>
        <Text style={{ fontFamily: fonts.serif, fontSize: 32, color: colors.plum, marginTop: 14 }}>We’ve got your message and we’re on it</Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', marginTop: 4, ...W('regular') }}>Ticket <Text style={{ color: colors.plum, ...W('bold') }}>{t.id}</Text>{SUPPORT_REPLY_TIME ? <> is open. Our team in Doha usually replies within <Text style={{ color: colors.plum, ...W('bold') }}>{SUPPORT_REPLY_TIME}</Text>.</> : ' is open. We’ll get back to you as soon as we can.'}</Text>
      </View>
      <Group style={{ marginTop: 20 }}>
        <ListRow icon="store" title={br ? br.storeName : 'Not about an order'} sub={br && o ? `${br.branchName} · ${o.ref}` : 'General question'} />
        <ListRow icon="help" title={t.title} sub={t.photos?.length ? `${t.photos.length} photo${t.photos.length > 1 ? 's' : ''} attached` : 'No photos'} />
        <ListRow icon="chat" title={t.reach === 'Call me' ? 'We’ll call you' : t.reach === 'Email' ? 'We’ll reply by email' : 'We’ll reply in the app'} sub={LIVE ? 'You’ll get a notification' : 'Demo: saved on this phone, not sent'} />
      </Group>
      <View style={{ marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: colors.emeraldSoft, borderWidth: 1, borderColor: '#CDE6D8' }}>
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.emerald, ...W('semibold') }}>We’ll check what happened and tell you the next steps, including any refund you’re eligible for.</Text>
      </View>
    </Page>
  );
}
