// P12 Recommend a store
import { useState } from 'react';
import { api } from '../api/client';
import { toast } from '../components/Toast';
import { FieldError } from '../components/forms';
import { LIVE } from '../config';
import React from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Page, SubHeader } from '../components/layout';
import { Button, Field, Icon, Label, W } from '../components/ui';
import { colors } from '../theme';

export default function Recommend() {
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [contact, setContact] = useState('');
  const [why, setWhy] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const send = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Enter the store’s name';
    if (!area.trim()) e.area = 'Tell us which area it’s in';
    setErr(e);
    if (Object.keys(e).length) return;
    await api.sendFeedback({ kind: 'recommend', about: `${name.trim()} · ${area.trim()}${contact.trim() ? ` · ${contact.trim()}` : ''}`, text: why.trim() });
    toast(LIVE ? 'Thanks for the tip! We’ll get in touch with them.' : 'Saved on this phone (demo, not sent)');
    router.back();
  };
  return (
    <Page header={<SubHeader title="Suggest a place you love" />} footer={<Button title="Send recommendation" onPress={send} />}>
      <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.emeraldSoft, borderWidth: 1, borderColor: '#CDE6D8' }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.emerald, alignItems: 'center', justifyContent: 'center' }}><Icon name="leaf" size={20} color="#fff" /></View>
        <Text style={{ flex: 1, fontSize: 14, lineHeight: 19, color: colors.plum, ...W('semibold') }}>Have a favourite café or bakery you’d love to see on WonderBites? Suggest it, and you’ll get <Text style={W('extrabold')}>QAR 10</Text> when they join.</Text>
      </View>
      <View style={{ marginTop: 18 }}><Label>Place name</Label><Field placeholder="e.g. Saffron & Rose Bakery" value={name} onChangeText={setName} error={!!err.name} /><FieldError text={err.name} /></View>
      <View style={{ marginTop: 16 }}><Label>Where is it in Doha?</Label><Field icon="pin" placeholder="e.g. Al Sadd, The Pearl, Lusail" value={area} onChangeText={setArea} error={!!err.area} /><FieldError text={err.area} /></View>
      <View style={{ marginTop: 16 }}><Label extra="(optional)">Phone or Instagram</Label><Field placeholder="+974 or @handle" value={contact} onChangeText={setContact} autoCapitalize="none" /></View>
      <View style={{ marginTop: 16 }}><Label>Why do you recommend it?</Label><Field multiline placeholder="Their croissants are worth a try…" value={why} onChangeText={setWhy} /></View>
    </Page>
  );
}
