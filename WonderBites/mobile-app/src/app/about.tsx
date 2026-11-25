// P13 About WonderBites
import { Platform } from 'react-native';
import { rateApp } from '../lib/actions';
import React from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lockup, Mark } from '../components/Logo';
import { Page, SubHeader } from '../components/layout';
import { Group, Impact, ListRow, SectionLabel, W } from '../components/ui';
import { colors, fonts } from '../theme';

const STEPS = [['Discover', 'Browse surprise bags from great places near you in Doha.'], ['Choose & reserve', 'Pay in the app and save 50–70% on the usual value.'], ['Collect', 'Show your QR code or PIN in your pickup window.'], ['Enjoy', 'Enjoy your find, and give good food a second chance.']];

export default function About() {
  return (
    <Page header={<SubHeader title="About WonderBites" />}>
      <LinearGradient colors={['#5E1B4D', colors.plum, '#2B1229']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ borderRadius: 22, paddingVertical: 24, alignItems: 'center' }}>
        <Mark size={54} />
        <View style={{ marginTop: 10 }}><Lockup width={200} /></View>
      </LinearGradient>
      <Text style={{ fontSize: 15, lineHeight: 24, color: '#4A2E47', marginTop: 14, ...W('regular') }}>WonderBites brings you tasty picks from cafés, bakeries and restaurants across Doha, in surprise bags that change with what’s available each day. Enjoy new finds for 50–70% less, and help good food get enjoyed.</Text>
      <SectionLabel>How it works</SectionLabel>
      <Group>
        {STEPS.map(([t, d], i) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: fonts.serif, fontSize: 17, color: colors.ruby }}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}><Text style={{ fontSize: 15, color: colors.plum, ...W('semibold') }}>{t}</Text><Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>{d}</Text></View>
          </View>
        ))}
      </Group>
      <SectionLabel>From Doha, with you</SectionLabel>
      <Impact items={[['12,400', 'meals enjoyed'], ['180', 'partner shops'], ['9.3 t', 'CO₂ avoided']]} />
      <Group style={{ marginTop: 16 }}>
        <ListRow icon="shield" title="Privacy policy" onPress={() => router.push('/privacy')} />
        <ListRow icon="doc" title="Terms & conditions" onPress={() => router.push('/terms')} />
        <ListRow icon="star" title={Platform.OS === 'android' ? 'Rate us on Google Play' : 'Rate us on the App Store'} onPress={rateApp} />
      </Group>
      <Text style={{ textAlign: 'center', fontSize: 12, color: colors.muted2, marginTop: 14, ...W('regular') }}>Version 1.0.0 · © 2026 WonderBites</Text>
    </Page>
  );
}
