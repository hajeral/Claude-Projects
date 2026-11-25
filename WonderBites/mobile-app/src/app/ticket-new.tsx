// P10b New ticket — how to open a support ticket.
import { api } from '../api/client';
import { pickPhoto } from '../lib/device';
import { toast } from '../components/Toast';
import { FieldError } from '../components/forms';
import { atEnd } from '../i18n';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Page, SubHeader } from '../components/layout';
import { Button, Field, Icon, OptChip, Radio, Segmented, W } from '../components/ui';
import { sync } from '../api/client';
import { isToday, shortDate, windowText } from '../lib/format';
import { photos } from '../lib/photos';
import { colors } from '../theme';

const ISSUES = ['Shop was closed', 'Missing items', 'Food quality', 'I got a different bag', 'Payment or refund', 'Something else'];

export default function NewTicket() {
  // "Get help with this order" opens this form with that order already chosen
  const { order: pre } = useLocalSearchParams<{ order?: string }>();
  const all = sync.orders().filter((o) => o.status !== 'cancelled');
  const first = all.find((o) => o.id === pre);
  const recent = first ? [first, ...all.filter((o) => o.id !== pre).slice(0, 2)] : all.slice(0, 3);
  const [ord, setOrd] = useState(first?.id ?? recent[0]?.id ?? '');
  const [issue, setIssue] = useState(ISSUES[0]);
  const [text, setText] = useState('');
  const [reach, setReach] = useState('In-app chat');
  const [shots, setShots] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (text.trim().length < 10) { setErr('Please tell us what happened (at least 10 characters)'); return; }
    setBusy(true);
    try { const t = await api.submitTicket({ orderId: ord || undefined, issue, details: text.trim(), reach, photos: shots }); router.replace({ pathname: '/ticket-sent', params: { id: t.id } }); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  const addShot = async () => { if (shots.length >= 3) { toast('You can add up to 3 photos', 'info'); return; } const u = await pickPhoto(); if (u) setShots([...shots, u]); };
  return (
    <Page header={<SubHeader title="New ticket" />} footer={<Button title={busy ? 'Sending…' : 'Send ticket'} disabled={busy} onPress={send} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Step n="✓" l="Order" done /><View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        <Step n="✓" l="Issue" done /><View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        <Step n="3" l="Details" />
      </View>
      <Text style={q}>1 · Which order is it about?</Text>
      <View style={{ gap: 8 }}>
        {recent.map((o) => {
          const b = sync.bag(o.bagId), br = sync.branch(o.branchId);
          const when = isToday(o.pickupStart) ? `today ${windowText(o.pickupStart, o.pickupEnd)}` : shortDate(o.pickupStart);
          return (
            <Pressable key={o.id} onPress={() => setOrd(o.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: '#fff', borderWidth: 2, borderColor: ord === o.id ? '#F1C6D3' : colors.line }}>
              <Image source={photos[b.photo]} style={{ width: 48, height: 48, borderRadius: 12 }} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{br.storeName}</Text>
                <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>{br.branchName} · {when} · {o.ref}</Text>
              </View>
              <Radio on={ord === o.id} />
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={() => setOrd('')} hitSlop={14} style={{ marginTop: 10, alignSelf: 'flex-start' }}><Text style={{ fontSize: 13, color: colors.ruby, ...W('bold') }}>Not about an order</Text></Pressable>
      <Text style={q}>2 · Tell us what went wrong</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ISSUES.map((x) => <OptChip key={x} label={x} on={issue === x} onPress={() => setIssue(x)} />)}</View>
      <Text style={q}>3 · Tell us what happened</Text>
      <Field multiline value={text} onChangeText={(t) => { setText(t); setErr(''); }} maxLength={500} placeholder="For example: I arrived at 21:10 and the shop was already closed." error={!!err} />
      <FieldError text={err} />
      <Text style={{ textAlign: 'right', fontSize: 12, color: colors.muted2, marginTop: 4, ...W('regular') }}>{text.length} / 500</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        {shots.map((u) => (
          <View key={u}>
            <Image source={{ uri: u }} style={{ width: 72, height: 72, borderRadius: 12 }} contentFit="cover" />
            <Pressable onPress={() => setShots(shots.filter((x) => x !== u))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Remove photo" style={{ position: 'absolute', top: -6, ...atEnd(-6), width: 24, height: 24, borderRadius: 12, backgroundColor: colors.plum, alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={12} color="#fff" /></Pressable>
          </View>
        ))}
        <Pressable onPress={addShot} accessibilityRole="button" accessibilityLabel="Add a photo" style={{ width: 72, height: 72, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#D8BFCB', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Icon name="photo" size={18} color={colors.muted} /><Text style={{ fontSize: 12, color: colors.muted, ...W('semibold') }}>Add</Text>
        </Pressable>
      </View>
      <Text style={q}>How should we reach you?</Text>
      <Segmented items={['In-app chat', 'Call me', 'Email']} value={reach} onChange={setReach} />
    </Page>
  );
}

function Step({ n, l, done }: { n: string; l: string; done?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: done ? colors.emerald : colors.ruby, alignItems: 'center', justifyContent: 'center' }}>
        {done ? <Icon name="check" size={13} color="#fff" stroke={2.6} /> : <Text style={{ color: '#fff', fontSize: 12, ...W('bold') }}>{n}</Text>}
      </View>
      <Text style={{ fontSize: 13, color: colors.plum, ...W('semibold') }}>{l}</Text>
    </View>
  );
}
const q = { fontSize: 13, color: colors.plum, marginTop: 20, marginBottom: 8, fontFamily: 'Figtree_700Bold' } as const;
