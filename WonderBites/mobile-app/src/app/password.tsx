// P03 Password & security
import { DEMO } from '../config';
import React, { useState } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/client';
import { isStrongPassword, passwordRules } from '../lib/validate';
import { FieldError } from '../components/forms';
import { toast } from '../components/Toast';
import { LIVE } from '../config';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Rules } from '../components/forms';
import { Page, SubHeader } from '../components/layout';
import { Button, Group, Label, ListRow, PasswordField } from '../components/ui';
import { colors } from '../theme';


export default function PasswordSecurity() {
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [devices, setDevices] = useState(false);
  const rules = passwordRules(pw);
  const save = async () => {
    if (!DEMO && !cur) { setErr('Enter your current password'); return; }
    if (!DEMO && !isStrongPassword(pw)) { setErr('Your new password doesn’t meet the rules below'); return; }
    if (!DEMO && pw !== pw2) { setErr('The new passwords don’t match'); return; }
    try { await api.changePassword(cur, pw); setCur(''); setPw(''); setPw2(''); toast(LIVE ? 'Password updated' : 'Demo: password checked. Nothing is stored'); router.back(); }
    catch (e) { setErr((e as Error).message); }
  };
  return (
    <Page header={<SubHeader title="Password & security" />} footer={<View><Button title="Update password" onPress={save} /><Button kind="text" title="Forgot your password?" onPress={() => router.push('/forgot-password')} /></View>}>
      <Label>Current password</Label><PasswordField value={cur} onChangeText={(t) => { setCur(t); setErr(''); }} placeholder="Your current password" kind="current" />
      <View style={{ height: 16 }} />
      <Label>New password</Label><PasswordField value={pw} onChangeText={(t) => { setPw(t); setErr(''); }} placeholder="At least 8 characters" />
      <View style={{ height: 16 }} />
      <Label>Confirm new password</Label><PasswordField value={pw2} onChangeText={(t) => { setPw2(t); setErr(''); }} placeholder="Type it again" ok={!!pw2 && pw2 === pw} />
      <FieldError text={err} />
      <Rules items={rules} />
      <Group style={{ marginTop: 16 }}>
        <ListRow icon="shield" title="Signed-in devices" sub={`This ${Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android phone' : 'browser'} · Doha · now`} onPress={() => setDevices(!devices)} />
        {devices ? <ListRow title="Sign out of all other devices" sub="You stay signed in here" danger onPress={async () => { await api.signOutOtherDevices(); toast(LIVE ? 'Signed out of other devices' : 'Demo: only this device is signed in'); }} /> : null}
      </Group>
    </Page>
  );
}
