// M02 Forgot password
import { DEMO } from '../config';
import React, { useState } from 'react';
import { api } from '../api/client';
import { formatPhone, isMobile, mobileError, signupDraft } from '../lib/validate';
import { usePhoneCountry } from '../lib/region';
import { FieldError } from '../components/forms';
import { router } from 'expo-router';
import { View } from 'react-native';
import { FormPage } from '../components/forms';
import { SubHeader } from '../components/layout';
import { Button, Label, PhoneField } from '../components/ui';

export default function ForgotPassword() {
  const cc = usePhoneCountry();
  const [phone, setPhone] = useState(DEMO ? '5512 3456' : '');
  const [err, setErr] = useState('');
  const send = async () => {
    if (!DEMO && !isMobile(phone, cc.dial)) { setErr(mobileError(cc.dial)); return; }
    signupDraft.phone = formatPhone(phone, cc.dial); signupDraft.purpose = 'reset'; signupDraft.channel = 'sms';
    try { await api.requestCode(signupDraft.phone, 'sms'); router.push('/reset-code'); } catch (e) { setErr((e as Error).message); }
  };
  return (
    <FormPage
      header={<SubHeader title="Forgot password" />}
      title="Reset your password"
      intro="Enter the mobile number on your account. We’ll send you a 4-digit code."
      footer={
        <View style={{ gap: 4 }}>
          <Button title="Send code" onPress={send} />
          <Button kind="text" title="Back to log in" onPress={() => router.back()} />
        </View>
      }
    >
      <Label>Mobile number</Label>
      <PhoneField value={phone} onChangeText={(t) => { setPhone(t); setErr(''); }} error={!!err} onCountry={() => router.push('/country-code')} />
      <FieldError text={err} />
    </FormPage>
  );
}
