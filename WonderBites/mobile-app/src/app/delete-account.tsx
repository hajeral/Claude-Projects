// P17 Delete account
import { api, useApi } from '../api/client';
import { resetStore, useStore } from '../state/store';
import { toast } from '../components/Toast';
import { LIVE } from '../config';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Page, SubHeader } from '../components/layout';
import { Button, Group, Icon, Label, Radio, W } from '../components/ui';
import { colors } from '../theme';

const WHY = ['I don’t use it anymore', 'Not enough choice near me', 'I had a bad experience', 'Privacy concerns', 'Something else'];

export default function DeleteAccount() {
  const [why, setWhy] = useState(WHY[0]);
  const [sure, setSure] = useState(false);
  // What the account holds: from the signed-in account (sample data in the demo, the backend when live)
  const { data: me } = useApi(() => api.me());
  const { data: vouchers = [] } = useApi(() => api.vouchers());
  const favs = useStore((x) => x.favBranches).length;
  const places = useStore((x) => x.places).length;
  const open = vouchers.filter((v) => v.state === 'available');
  const worth = open.filter((v) => v.kind === 'amount').reduce((n, v) => n + v.value, 0);
  const meals = me?.impact.meals ?? 0;
  const lines: React.ReactNode[][] = [
    ['Your bags and past orders: ', <Text key="m" style={{ color: colors.emerald, ...W('bold') }}>{`${meals} ${meals === 1 ? 'meal' : 'meals'}`}</Text>],
    ...(open.length ? [[worth ? `${open.length} unused vouchers (QAR ${worth}+)` : `${open.length} unused vouchers`]] : []),
    [favs || places ? `${favs} favourite ${favs === 1 ? 'shop' : 'shops'} and ${places} saved ${places === 1 ? 'place' : 'places'}` : 'Your favourite shops and saved places'],
  ];
  const del = async () => {
    if (!sure) { setSure(true); return; }
    await api.deleteAccount();
    if (!LIVE) await resetStore(); // demo: removes everything saved on this phone
    toast(LIVE ? 'Your account is deleted' : 'Demo: account removed and demo data cleared');
    router.dismissAll?.();
    router.replace('/welcome');
  };
  return (
    <Page header={<SubHeader title="Delete account" />} footer={<View><Button title="Keep my account" kind="secondary" onPress={() => router.back()} /><Button title={sure ? 'Tap again to delete for good' : 'Delete my account permanently'} kind="text" onPress={del} /></View>}>
      <View style={{ flexDirection: 'row', gap: 12, padding: 16, borderRadius: 20, backgroundColor: '#FFF4F7', borderWidth: 1, borderColor: '#F3D2DD' }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="trash" size={18} color={colors.ruby} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>This can’t be undone</Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2, ...W('regular') }}>Deleting your account removes:</Text>
          {lines.map((x, i) => (
            <Text key={i} style={{ fontSize: 13, color: colors.plum, marginTop: 4, ...W('regular') }}>{['•  ', ...x]}</Text>
          ))}
        </View>
      </View>
      <View style={{ marginTop: 20 }}><Label extra="(optional)">We’re sorry to see you go. Can you tell us why?</Label></View>
      <Group>
        {WHY.map((w) => (
          <Pressable key={w} onPress={() => setWhy(w)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 50, paddingHorizontal: 14 }} accessibilityRole="radio" accessibilityState={{ checked: why === w }}>
            <Radio on={why === w} /><Text style={{ fontSize: 15, color: colors.plum, ...W('medium') }}>{w}</Text>
          </Pressable>
        ))}
      </Group>
    </Page>
  );
}
