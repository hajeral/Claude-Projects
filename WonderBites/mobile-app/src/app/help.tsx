// P08 Help centre
import { ARTICLES } from '../lib/help';
import { tr } from '../i18n';
import { callShop } from '../lib/actions';
import { toast } from '../components/Toast';
import { SUPPORT_PHONE, SUPPORT_REPLY_TIME } from '../config';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Halo } from '../components/Halo';
import { Page, SubHeader } from '../components/layout';
import { Button, Field, Group, ListRow, OptChip, SectionLabel, W } from '../components/ui';
import { colors, fonts } from '../theme';

const CATS = ['All', 'Orders', 'Pickup', 'Payments', 'Account'];

export default function Help() {
  const [c, setC] = useState('All');
  const [q, setQ] = useState('');
  const shown = ARTICLES.filter((a) => (c === 'All' || a.cat === c) && (!q.trim() || [a.title, a.intro, ...a.steps].some((x) => x.toLowerCase().includes(q.trim().toLowerCase()) || tr(x).includes(q.trim()))));
  const call = () => (SUPPORT_PHONE ? callShop(SUPPORT_PHONE) : toast(SUPPORT_REPLY_TIME ? `Phone support isn’t set up yet. Message us and we’ll reply within ${SUPPORT_REPLY_TIME}.` : 'Phone support isn’t set up yet. Message us and we’ll get back to you.', 'info'));
  return (
    <Page header={<SubHeader title="Help centre" />}>
      <Field icon="search" placeholder="How can we help?" value={q} onChangeText={setQ} controlled />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>{CATS.map((x) => <OptChip key={x} label={x} on={c === x} onPress={() => setC(x)} />)}</View>
      <SectionLabel>{q.trim() || c !== 'All' ? `${shown.length} articles` : 'Questions you may have'}</SectionLabel>
      {shown.length ? <Group>{shown.map((a) => <ListRow key={a.id} title={a.title} onPress={() => router.push({ pathname: '/help-article', params: { id: a.id } })} />)}</Group>
        : <Text style={{ fontSize: 15, color: colors.muted, ...W('regular') }}>No articles match. Try other words, or chat with us below.</Text>}
      <View style={{ borderRadius: 22, overflow: 'hidden', marginTop: 16 }}>
        <Halo full style={{ padding: 18 }}>
          <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: '#fff' }}>Still need help?</Text>
          <Text style={{ fontSize: 14, color: colors.pale, marginTop: 4, ...W('regular') }}>{SUPPORT_REPLY_TIME ? `Our team in Doha replies within ${SUPPORT_REPLY_TIME}.` : 'Our team in Doha is here to help.'}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button title="Message us" icon="chat" small style={{ flex: 1.2, height: 48 }} onPress={() => router.push('/ticket-new')} />
            <Button title="Call" icon="phone" kind="ghost" small style={{ flex: 1, height: 48 }} onPress={call} />
          </View>
        </Halo>
      </View>
    </Page>
  );
}
