// P02 Personal details
import { splitPhone, usePhoneCountry } from '../lib/region';
import { formatPhone, isMobile, mobileError } from '../lib/validate';
import React from 'react';
import { atStart, atEnd } from '../i18n';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Page, SubHeader } from '../components/layout';
import { Button, Field, Icon, Label, PhoneField, Pill, W } from '../components/ui';
import { api } from '../api/client';
import { getState, setStore, useStore } from '../state/store';
import { pickPhoto } from '../lib/device';
import { toast } from '../components/Toast';
import { Image } from 'expo-image';
import { Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import { colors, fonts } from '../theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function EditProfile() {
  const user = useStore((x) => x.profile);
  const [name, setName] = useState(`${user.firstName} ${user.lastName}`.trim());
  const [email, setEmail] = useState(user.email);
  const cc = usePhoneCountry();
  const [phone, setPhone] = useState(splitPhone(user.phone).local);
  // Start from the country of the saved number, unless the customer has picked another one.
  useEffect(() => { const own = splitPhone(user.phone).country; if (own && !getState().phoneCountry) setStore((x) => ({ ...x, phoneCountry: own.iso })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [birthday, setBirthday] = useState(user.birthday ?? '');
  const [photo, setPhoto] = useState(user.photo);
  const [err, setErr] = useState<Record<string, string>>({});
  const save = async () => {
    const e: Record<string, string> = {};
    const [first, ...rest] = name.trim().split(/\s+/);
    if (!first) e.name = 'Enter your name';
    if (!EMAIL.test(email.trim())) e.email = 'Enter a valid email';
    if (!isMobile(phone, cc.dial)) e.phone = mobileError(cc.dial);
    if (birthday && !/^(0?[1-9]|[12]\d|3[01])\s*\/\s*(0?[1-9]|1[0-2])$/.test(birthday.trim())) e.birthday = 'Use DD / MM';
    setErr(e);
    if (Object.keys(e).length) return;
    const p = phone.replace(/\s/g, '');
    await api.updateProfile({ firstName: first, lastName: rest.join(' '), email: email.trim(), phone: formatPhone(p, cc.dial), photo, birthday: birthday.trim() || undefined } as never);
    toast('Your details are saved');
    router.back();
  };
  const addPhoto = async () => { const uri = await pickPhoto(); if (uri) setPhoto(uri); };
  const Err = ({ k }: { k: string }) => (err[k] ? <Text style={{ fontSize: 13, color: colors.rubyDark, marginTop: 6, ...W('semibold') }}>{err[k]}</Text> : null);
  return (
    <Page header={<SubHeader title="Personal details" />} footer={<Button title="Save changes" onPress={save} />}>
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <Pressable onPress={addPhoto} accessibilityRole="button" accessibilityLabel="Add a photo" style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.cream, borderWidth: 3, borderColor: '#E6B8C0', alignItems: 'center', justifyContent: 'center' }}>
          {photo ? <Image source={{ uri: photo }} style={{ width: 78, height: 78, borderRadius: 39 }} contentFit="cover" /> : <Text style={{ fontFamily: fonts.serif, fontSize: 34, color: colors.rubyDark }}>{(name.trim()[0] ?? 'S').toUpperCase()}</Text>}
          <View style={{ position: 'absolute', ...atEnd(-6), bottom: -4, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ruby, borderWidth: 3, borderColor: colors.cream, alignItems: 'center', justifyContent: 'center' }}><Icon name="camera" size={16} color="#fff" /></View>
        </Pressable>
        <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8, ...W('regular') }}>Add a photo to make pickup easier</Text>
      </View>
      <View style={{ marginTop: 18 }}><Label>Full name</Label><Field value={name} onChangeText={setName} error={!!err.name} /><Err k="name" /></View>
      <View style={{ marginTop: 16 }}><Label>Email</Label><Field value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={!!err.email} right={email.trim() === user.email ? <Pill label="Verified" tone="green" icon="check" style={{ height: 24 }} /> : undefined} /><Err k="email" /></View>
      <View style={{ marginTop: 16 }}><Label>Mobile number</Label><PhoneField value={phone} onChangeText={setPhone} error={!!err.phone} onCountry={() => router.push('/country-code')} /><Err k="phone" />
        <Text style={{ fontSize: 13, color: colors.muted, marginTop: 6, ...W('regular') }}>We text your pickup PIN to this number.</Text></View>
      <View style={{ marginTop: 16 }}><Label extra="(optional, we might surprise you!)">Birthday</Label><Field placeholder="DD / MM" value={birthday} onChangeText={setBirthday} keyboardType="number-pad" maxLength={7} error={!!err.birthday} /><Err k="birthday" /></View>
    </Page>
  );
}
