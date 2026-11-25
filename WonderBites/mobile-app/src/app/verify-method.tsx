// M06 How should we send your code?
import { DEMO } from '../config';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Sheet } from '../components/Sheet';
import { Button, Icon, Radio, W } from '../components/ui';
import type { IconName } from '../components/icons';
import { api } from '../api/client';
import { useStore } from '../state/store';
import { signupDraft } from '../lib/validate';
import { toast } from '../components/Toast';
import { colors, fonts } from '../theme';


export default function VerifyMethod() {
  const [m, setM] = useState('SMS');
  const email = useStore((x) => x.profile.email);
  const phone = signupDraft.phone ?? (DEMO ? '+974 5512 3456' : '');
  const OPTS: [string, string, IconName][] = [['SMS', 'Usually arrives in seconds', 'sms'], ['WhatsApp', 'If SMS doesn’t reach you', 'whatsapp'], ['Email', email, 'mail']];
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const channel = m === 'SMS' ? 'sms' : m === 'WhatsApp' ? 'whatsapp' : 'email';
    try { await api.requestCode(channel === 'email' ? email : phone, channel); signupDraft.channel = channel; router.replace('/verify'); }
    catch (e) { toast((e as Error).message, 'error'); setBusy(false); }
  };
  return (
    <Sheet>
      <Text style={{ fontFamily: fonts.serif, fontSize: 24, lineHeight: 29, color: colors.plum }}>How would you like to get your code?</Text>
      <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4, ...W('regular') }}>We’ll send a 4-digit code to {m === 'Email' ? email : phone}.</Text>
      <View style={{ gap: 10, marginTop: 16 }}>
        {OPTS.map(([t, sub, ic]) => (
          <Pressable key={t} onPress={() => setM(t)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1.5, borderColor: m === t ? colors.ruby : colors.line }} accessibilityRole="radio" accessibilityState={{ checked: m === t }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={18} color={colors.ruby} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{t}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, ...W('regular') }}>{sub}</Text>
            </View>
            <Radio on={m === t} />
          </Pressable>
        ))}
      </View>
      <Button title={busy ? 'Sending…' : 'Get code'} disabled={busy} style={{ marginTop: 20 }} onPress={send} />
    </Sheet>
  );
}
