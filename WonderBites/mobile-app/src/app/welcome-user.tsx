// M07 Welcome, Sarah — account ready, welcome voucher added.
import React from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Rise } from '../components/motion';
import { Mark } from '../components/Logo';
import { PlumField } from '../components/PlumField';
import { useBottomInset } from '../components/layout';
import { Button, Pill, W } from '../components/ui';
import { useStore } from '../state/store';
import { colors, fonts } from '../theme';

export default function WelcomeUser() {
  const user = useStore((x) => x.profile);
  const bottom = useBottomInset();
  return (
    <View style={{ flex: 1, backgroundColor: colors.plum }}>
      <StatusBar style="light" />
      <PlumField glowY={0.4} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
        <Rise delay={100}><Mark size={72} /></Rise>
        <Rise delay={300}><Text style={{ fontFamily: fonts.serif, fontSize: 32, lineHeight: 37, color: '#fff', marginTop: 22, textAlign: 'center' }}>Welcome, {user.firstName}</Text></Rise>
        <Rise delay={450}><Text style={{ fontSize: 16, lineHeight: 24, color: colors.pale, textAlign: 'center', marginTop: 8, ...W('regular') }}>Welcome to WonderBites! Your account is ready, and tasty finds are waiting.</Text></Rise>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: bottom + 10 }}>
        <Button title="Discover bags near me" onPress={() => router.replace('/location')} />
      </View>
    </View>
  );
}
