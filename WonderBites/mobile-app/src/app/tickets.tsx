// P10 My tickets
import { SUPPORT_REPLY_TIME } from '../config';
import { useState } from 'react';
import { useStore } from '../state/store';
import React from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Page, SubHeader } from '../components/layout';
import { Button, Card, Icon, Pill, W } from '../components/ui';
import { api, useApi } from '../api/client';
import { colors, fonts } from '../theme';

export default function Tickets() {
  const mine = useStore((x) => x.tickets);
  const { data: list = [] } = useApi(() => api.tickets(), [mine]);
  const [open, setOpen] = useState('');
  return (
    <Page header={<SubHeader title="Support requests" />} footer={<Button title="New ticket" icon="plus" onPress={() => router.push('/ticket-new')} />} contentStyle={{ gap: 12 }}>
      {list.map((t) => (
        <Card key={t.id} onPress={() => setOpen(open === t.id ? '' : t.id)} style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{t.title}</Text>
            <Pill label={t.statusText} tone={t.status === 'open' ? 'pink' : 'green'} style={{ height: 24, paddingHorizontal: 8 }} />
          </View>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, ...W('regular') }}>{t.meta}</Text>
          {open === t.id ? (
            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line, gap: 4 }}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: colors.plum, ...W('regular') }}>{t.details ?? (t.status === 'open' ? (SUPPORT_REPLY_TIME ? `Our team is looking into this. We usually reply within ${SUPPORT_REPLY_TIME}.` : 'Our team is looking into this. We’ll get back to you soon.') : 'This ticket is closed. Open a new one if you still need help.')}</Text>
              {t.reach ? <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>{`Reply by: ${t.reach}`}</Text> : null}
            </View>
          ) : null}
        </Card>
      ))}
      <View style={{ alignItems: 'center', marginTop: 30 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="chat" size={24} color={colors.ruby} /></View>
        <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.plum, marginTop: 12 }}>Need a hand with an order?</Text>
        <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 4, ...W('regular') }}>{SUPPORT_REPLY_TIME ? `Open a ticket and we’ll get back to you within ${SUPPORT_REPLY_TIME}.` : 'Open a ticket and our team will get back to you.'}</Text>
      </View>
    </Page>
  );
}
