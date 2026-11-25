// P16 Log out
import { api, sync } from '../api/client';
import { dayLabel, hhmm } from '../lib/format';
import React from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Sheet } from '../components/Sheet';
import { Button, Icon, W } from '../components/ui';
import { colors, fonts } from '../theme';

export default function Logout() {
  const active = sync.orders().find((o) => o.status === 'paid' || o.status === 'reserved');
  return (
    <Sheet>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="out" size={22} color={colors.ruby} /></View>
        <Text style={{ fontFamily: fonts.serif, fontSize: 24, color: colors.plum, marginTop: 12 }}>Log out of WonderBites?</Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center', marginTop: 6, ...W('regular') }}>{active ? `Your reserved bag for ${dayLabel(active.pickupStart).toLowerCase()} at ${hhmm(active.pickupStart)} stays safe. ` : ''}You can log back in any time.</Text>
      </View>
      <View style={{ gap: 10, marginTop: 18 }}>
        <Button title="Log out" onPress={async () => { await api.logout(); router.dismissAll?.(); router.replace('/welcome'); }} />
        <Button title="Stay logged in" kind="secondary" onPress={() => router.back()} />
      </View>
    </Sheet>
  );
}
