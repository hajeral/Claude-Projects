// M04 Choose a new password
import { DEMO } from '../config';
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { FieldError, FormPage, Rules } from '../components/forms';
import { api } from '../api/client';
import { passwordRules, signupDraft } from '../lib/validate';
import { toast } from '../components/Toast';
import { useState } from 'react';
import { SubHeader } from '../components/layout';
import { Button, Label, PasswordField } from '../components/ui';
import { colors } from '../theme';

export default function NewPassword() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const rules = [...passwordRules(pw).slice(0, 3), ['Both passwords match', !!pw && pw === pw2]] as [string, boolean][];
  const save = async () => {
    if (!DEMO && !rules.every(([, ok]) => ok)) { setErr('Check the rules below'); return; }
    try { await api.resetPassword(signupDraft.phone ?? '', signupDraft.code ?? '', pw); signupDraft.code = undefined; toast('Password changed. You’re logged in'); router.replace('/home'); }
    catch (e) { setErr((e as Error).message); }
  };
  return (
    <FormPage
      header={<SubHeader title="New password" />}
      title="Choose a new password"
      intro="Make it something only you would know."
      footer={<Button title="Save and log in" onPress={save} />}
    >
      <Label>New password</Label>
      <PasswordField value={pw} onChangeText={(t) => { setPw(t); setErr(''); }} placeholder="At least 8 characters" error={!!err} />
      <View style={{ height: 18 }} />
      <Label>Confirm new password</Label>
      <PasswordField value={pw2} onChangeText={(t) => { setPw2(t); setErr(''); }} placeholder="Type it again" ok={!!pw2 && pw2 === pw} />
      <FieldError text={err} />
      <Rules items={rules} />
    </FormPage>
  );
}
