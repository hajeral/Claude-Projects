// E07 Verify your number (step 2 of 3)
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { FormPage, OtpInput, ResendTimer, StepHeader } from '../components/forms';
import { Button, Icon, W } from '../components/ui';
import { api } from '../api/client';
import { signupDraft } from '../lib/validate';
import { FieldError } from '../components/forms';
import { toast } from '../components/Toast';
import { DEMO, LIVE } from '../config';
import { colors } from '../theme';

export default function Verify() {
  const to = signupDraft.channel === 'email' ? '' : signupDraft.phone ?? '+974 5512 3456';
  const [code, setCode] = useState('482');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (c = code) => {
    if (!DEMO && c.length !== 4) { setErr('Enter all 4 digits'); return; }
    setBusy(true);
    try { await api.verifyCode(to || 'email', c); router.push('/your-name'); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  const resend = async () => { await api.requestCode(to, signupDraft.channel ?? 'sms'); toast(LIVE ? 'New code sent' : 'Demo: no code is sent. Any code works, or just tap the button.', LIVE ? 'ok' : 'info'); };
  return (
    <FormPage
      header={<StepHeader step={2} />}
      title="Verify your number"
      intro={
        <View>
          <Text style={{ fontSize: 16, lineHeight: 24, color: colors.muted, marginTop: 6, ...W('regular') }}>We’ve sent a 4-digit code to <Text style={{ color: colors.plum, ...W('bold') }}>{to || 'your email'}</Text></Text>
          {!LIVE ? <Text style={{ fontSize: 13, color: colors.rubyDark, marginTop: 10, ...W('semibold') }}>Demo: no code is sent. Any code works, or just tap the button.</Text> : null}
          <Pressable onPress={() => router.back()} hitSlop={14} style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <Icon name="edit" size={16} color={colors.ruby} />
            <Text style={{ color: colors.ruby, fontSize: 14, ...W('semibold') }}>Change number</Text>
          </Pressable>
        </View>
      }
      footer={<Button title={busy ? 'Checking…' : 'Verify & continue'} disabled={busy} onPress={() => go()} />}
    >
      <OtpInput initial="482" onChange={(c) => { setCode(c); setErr(''); }} onDone={(c) => go(c)} />
      <FieldError text={err} />
      <View style={{ alignItems: 'center', marginTop: 28 }}><ResendTimer onResend={resend} /></View>
    </FormPage>
  );
}
