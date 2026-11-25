// M01 Log in
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { FormPage, LinkText } from '../components/forms';
import { SubHeader } from '../components/layout';
import { Button, Check, Field, Label, PasswordField, PhoneField, Segmented, W } from '../components/ui';
import { FieldError } from '../components/forms';
import { formatPhone, isEmail, isMobile, mobileError } from '../lib/validate';
import { usePhoneCountry } from '../lib/region';
import { api } from '../api/client';
import { toast } from '../components/Toast';
import { DEMO, LIVE } from '../config';
import { colors } from '../theme';

export default function Login() {
  const cc = usePhoneCountry();
  const [mode, setMode] = useState('Mobile number');
  const [remember, setRemember] = useState(true);
  const [phone, setPhone] = useState(DEMO ? '5512 3456' : '');
  const [email, setEmail] = useState(DEMO ? 'sarah@email.com' : '');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const e: Record<string, string> = {};
    if (mode === 'Email' ? !isEmail(email) : !isMobile(phone, cc.dial)) e.id = mode === 'Email' ? 'Enter a valid email' : mobileError(cc.dial) ;
    if (pw.length < 8) e.pw = 'Enter your password (at least 8 characters)';
    if (DEMO) Object.keys(e).forEach((k) => delete (e as Record<string, string>)[k]);
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try { await api.login(mode === 'Email' ? email.trim() : formatPhone(phone, cc.dial), pw); setPw(''); router.replace('/home'); }
    catch (x) { setErr({ pw: (x as Error).message }); }
    finally { setBusy(false); }
  };
  const social = (p: string) => toast(`Sign in with ${p} will work once accounts are connected to WonderBites.`, 'info');
  return (
    <FormPage
      header={<SubHeader title="Log in" />}
      title="Welcome back"
      intro="Log in to follow your orders and get back to your favourites."
      footer={
        <View style={{ gap: 12, alignItems: 'center' }}>
          <Button title={busy ? 'Logging in…' : 'Log in'} onPress={submit} disabled={busy} />
          <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>New here? <LinkText onPress={() => router.replace('/signup')}>Create an account</LinkText></Text>
        </View>
      }
    >
      <Segmented items={['Mobile number', 'Email']} value={mode} onChange={setMode} />
      <View style={{ height: 18 }} />
      {mode === 'Email' ? (<><Label>Email</Label><Field icon="mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={!!err.id} /></>) : (<><Label>Mobile number</Label><PhoneField value={phone} onChangeText={setPhone} error={!!err.id} onCountry={() => router.push('/country-code')} /></>)}
      <FieldError text={err.id} />
      <View style={{ height: 18 }} />
      <Label>Password</Label>
      <PasswordField value={pw} onChangeText={setPw} placeholder="Your password" error={!!err.pw} kind="current" />
      <FieldError text={err.pw} />
      {!LIVE ? <Text style={{ fontSize: 13, color: colors.rubyDark, marginTop: 8, ...W('semibold') }}>Demo: anything works, even empty fields. Nothing is checked or stored.</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <Pressable onPress={() => setRemember(!remember)} hitSlop={13} accessibilityRole="checkbox" accessibilityState={{ checked: remember }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Check on={remember} /><Text style={{ fontSize: 14, color: colors.plum, ...W('medium') }}>Remember me</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/forgot-password')} hitSlop={14} accessibilityRole="link"><LinkText>Forgot password?</LinkText></Pressable>
      </View>
      <Text style={{ textAlign: 'center', color: colors.muted2, fontSize: 13, marginVertical: 18, ...W('regular') }}>or</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button kind="secondary" title="Apple" icon="apple" onPress={() => social('Apple')} style={{ flex: 1, height: 52, borderColor: colors.field, borderWidth: 1.5 }} />
        <Button kind="secondary" title="Google" icon="google" onPress={() => social('Google')} style={{ flex: 1, height: 52, borderColor: colors.field, borderWidth: 1.5 }} />
      </View>
    </FormPage>
  );
}
