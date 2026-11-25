// E06 Create account (step 1 of 3)
import React, { useState } from 'react';
import { padEnd, borderEnd } from '../i18n';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import Svg, { Rect, Path } from 'react-native-svg';
import { FieldError, FormPage, LinkText, PasswordStrength, StepHeader } from '../components/forms';
import { formatPhone, isMobile, isStrongPassword, mobileError, passwordLevel, signupDraft } from '../lib/validate';
import { usePhoneCountry } from '../lib/region';
import { DEMO } from '../config';
import { Button, Field, Icon, Label, PasswordField, W } from '../components/ui';
import { colors } from '../theme';

const QatarFlag = () => (
  <Svg width={22} height={14} viewBox="0 0 22 14"><Rect width={22} height={14} rx={2} fill="#8A1538" /><Path d="M0 0H7L9 1.2 7 2.3 9 3.5 7 4.7 9 5.8 7 7 9 8.2 7 9.3 9 10.5 7 11.7 9 12.8 7 14H0Z" fill="#fff" /></Svg>
);

export default function SignUp() {
  const cc = usePhoneCountry();
  const [phone, setPhone] = useState(signupDraft.phone?.replace(/^\+974\s*/, '') ?? '5512 3456');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const next = () => {
    const e: Record<string, string> = {};
    if (!isMobile(phone, cc.dial)) e.phone = mobileError(cc.dial);
    if (!isStrongPassword(pw)) e.pw = 'Use at least 8 characters with a number and upper and lower case';
    if (pw2 !== pw) e.pw2 = 'The passwords don’t match';
    if (DEMO) { e.phone = ''; e.pw = ''; e.pw2 = ''; Object.keys(e).forEach((k) => delete e[k]); }
    setErr(e);
    if (Object.keys(e).length) return;
    signupDraft.phone = formatPhone(phone || '55123456', cc.dial); signupDraft.purpose = 'signup';
    router.push('/verify-method');
  };
  return (
    <FormPage
      header={<StepHeader step={1} />}
      title="Create your account"
      intro="Join WonderBites to discover surprise bags from great local places, for more to enjoy for less."
      footer={
        <View style={{ gap: 14, alignItems: 'center' }}>
          <Button title="Continue" onPress={next} />
          <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>Already have an account? <LinkText onPress={() => router.push('/login')}>Log in</LinkText></Text>
        </View>
      }
    >
      <Label>Phone number</Label>
      <Field
        value={phone}
        onChangeText={(t) => { setPhone(t); setErr((x) => ({ ...x, phone: '' })); }}
        keyboardType="phone-pad"
        maxLength={cc.dial === '+974' ? 9 : 16}
        error={!!err.phone}
        left={
          <Pressable onPress={() => router.push('/country-code')} hitSlop={{ top: 10, bottom: 10 }} accessibilityLabel="Country code" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, ...padEnd(10), ...borderEnd(1, colors.line) }}>
            {cc.iso === 'QA' ? <QatarFlag /> : <View style={{ width: 30, height: 22, borderRadius: 6, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 10, color: colors.rubyDark, ...W('extrabold') }}>{cc.iso}</Text></View>}
            <Text style={{ fontSize: 15, color: colors.plum, ...W('semibold') }}>{cc.dial}</Text>
            <Icon name="down" size={14} color={colors.muted} />
          </Pressable>
        }
      />
      <FieldError text={err.phone} />
      <View style={{ height: 20 }} />
      <Label>Password</Label>
      <PasswordField value={pw} onChangeText={(t) => { setPw(t); setErr((x) => ({ ...x, pw: '' })); }} placeholder="At least 8 characters" error={!!err.pw} />
      <PasswordStrength level={Math.min(3, Math.max(1, passwordLevel(pw))) as 1 | 2 | 3} hidden={!pw} />
      <FieldError text={err.pw} />
      <View style={{ height: 20 }} />
      <Label>Confirm password</Label>
      <PasswordField value={pw2} onChangeText={(t) => { setPw2(t); setErr((x) => ({ ...x, pw2: '' })); }} placeholder="Type it again" error={!!err.pw2} ok={!!pw2 && pw2 === pw} />
      <FieldError text={err.pw2} />
      {DEMO ? <Text style={{ fontSize: 13, color: colors.rubyDark, marginTop: 14, ...W('semibold') }}>Demo: anything works, even empty fields. Nothing is checked or stored.</Text> : null}
    </FormPage>
  );
}
