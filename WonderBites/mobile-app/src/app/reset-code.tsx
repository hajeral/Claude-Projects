// M03 Enter the reset code
import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { FormPage, LinkText, OtpInput, ResendTimer } from '../components/forms';
import { SubHeader } from '../components/layout';
import { Button, W } from '../components/ui';
import { api } from '../api/client';
import { signupDraft } from '../lib/validate';
import { FieldError } from '../components/forms';
import { toast } from '../components/Toast';
import { DEMO, LIVE } from '../config';
import { colors } from '../theme';

export default function ResetCode() {
  const to = signupDraft.phone ?? '+974 5512 3456';
  const [code, setCode] = useState('482');
  const [err, setErr] = useState('');
  const go = (c = code) => { if (!DEMO && c.length !== 4) { setErr('Enter all 4 digits'); return; } signupDraft.code = c; router.push('/new-password'); };
  const resend = async (channel: 'sms' | 'whatsapp') => { await api.requestCode(to, channel); toast(LIVE ? (channel === 'sms' ? 'New code sent by SMS' : 'Code sent by WhatsApp') : 'Demo: no code is sent. Any code works, or just tap the button.', LIVE ? 'ok' : 'info'); };
  return (
    <FormPage
      header={<SubHeader title="Forgot password" />}
      title="Enter the code"
      intro={<Text style={{ fontSize: 16, lineHeight: 24, color: colors.muted, marginTop: 6, ...W('regular') }}>Sent by SMS to <Text style={{ color: colors.plum, ...W('bold') }}>{to}</Text>.</Text>}
      footer={<Button title="Verify" onPress={() => go()} />}
    >
      <View style={{ alignItems: 'center' }}>
        <OtpInput initial="482" onChange={(c) => { setCode(c); setErr(''); }} onDone={(c) => go(c)} />
        <FieldError text={err} />
        {!LIVE ? <Text style={{ fontSize: 13, color: colors.rubyDark, marginTop: 10, ...W('semibold') }}>Demo: no code is sent. Any code works, or just tap the button.</Text> : null}
        <View style={{ marginTop: 22, alignItems: 'center', gap: 14 }}>
          <ResendTimer from={42} label="Didn’t get it? Resend in" onResend={() => resend('sms')} />
          <LinkText onPress={() => resend('whatsapp')}>Send by WhatsApp instead</LinkText>
        </View>
      </View>
    </FormPage>
  );
}
