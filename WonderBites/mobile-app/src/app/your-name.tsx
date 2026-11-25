// E08 What's your name? (step 3 of 3)
import { DEMO } from '../config';
import { api } from '../api/client';
import { setStore, useStore } from '../state/store';
import { signupDraft } from '../lib/validate';
import { FieldError } from '../components/forms';
import React, { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Pop } from '../components/motion';
import { FormPage, StepHeader } from '../components/forms';
import { Button, Check, Field, Label, Pill, W } from '../components/ui';
import { colors } from '../theme';

export default function YourName() {
  const profile = useStore((x) => x.profile);
  const [first, setFirst] = useState(profile.firstName || (DEMO ? 'Sarah' : ''));
  const [last, setLast] = useState(profile.lastName || (DEMO ? 'Al-Kuwari' : ''));
  const [err, setErr] = useState<Record<string, string>>({});
  const create = async () => {
    const e: Record<string, string> = {};
    if (!first.trim()) e.first = 'Enter your first name';
    if (!last.trim()) e.last = 'Enter your last name';
    if (DEMO) Object.keys(e).forEach((k) => delete (e as Record<string, string>)[k]);
    setErr(e);
    if (Object.keys(e).length) return;
    await api.welcomeGift();
    await api.updateProfile({ firstName: first.trim() || profile.firstName || 'Guest', lastName: last.trim() || profile.lastName || '', phone: signupDraft.phone ?? profile.phone });
    setStore((x) => ({ ...x, session: { ...x.session, signedIn: true, guest: false }, prefs: { ...x.prefs, offers } }));
    router.replace('/welcome-user');
  };
  const [offers, setOffers] = useState(true);
  const hiDelay = useRef(1300); // first time: pops in after the form has risen in
  return (
    <FormPage
      header={<StepHeader step={3} />}
      title="What should we call you?"
      intro="So the shop knows who is picking up."
      footer={
        <View style={{ gap: 12 }}>
          <Button title="Create account" onPress={create} />
          <Text style={{ textAlign: 'center', fontSize: 13, lineHeight: 20, color: colors.muted, ...W('regular') }}>
            By creating an account you agree to the{' '}
            <Text onPress={() => router.push('/privacy')} style={{ color: colors.plum, textDecorationLine: 'underline', ...W('bold') }}>Privacy Policy</Text> and{'\n'}
            <Text onPress={() => router.push('/terms')} style={{ color: colors.plum, textDecorationLine: 'underline', ...W('bold') }}>Terms of Use</Text>.
          </Text>
        </View>
      }
    >
      <Label>First name</Label>
      <Field icon="user" value={first} onChangeText={(t) => { hiDelay.current = 0; setFirst(t); }} error={!!err.first} />
      <FieldError text={err.first} />
      <View style={{ height: 20 }} />
      <Label>Last name</Label>
      <Field icon="user" value={last} onChangeText={setLast} error={!!err.last} />
      <FieldError text={err.last} />
      {first.trim() ? (
        <Pop delay={hiDelay.current} style={{ marginTop: 16, alignSelf: 'flex-start' }}>
          <Pill label={`Hello ${first.trim()}!`} tone="pink" icon="sparkle" />
        </Pop>
      ) : null}
      <Pressable onPress={() => setOffers(!offers)} hitSlop={13} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 }} accessibilityRole="checkbox" accessibilityState={{ checked: offers }}>
        <Check on={offers} delay={700} />
        <Text style={{ fontSize: 14, color: colors.plum, ...W('semibold') }}>Yes, send me the latest offers and perks</Text>
      </Pressable>
    </FormPage>
  );
}
