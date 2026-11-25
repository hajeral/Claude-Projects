// E09 Location — Doha Bay at night: streets glow in, shops bloom as orbs sized by bags left,
// cards appear two at a time with their discount stamp.
import { locateMe } from '../lib/device';
import React from 'react';
import { Stage } from '../components/Stage';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Rise } from '../components/motion';
import { NightMap } from '../components/NightMap';
import { useBottomInset } from '../components/layout';
import { Button, W } from '../components/ui';
import { colors, fonts } from '../theme';

export default function Location() {
  const bottom = useBottomInset();
  const { width, height } = useWindowDimensions();
  // Map is drawn at 390 × 560; scale to the width, but keep ~330 px for the text and buttons on short phones.
  const k = Math.min(width / 390, Math.max(0.55, (height - 330 - bottom) / 560));
  return (
    <View style={{ flex: 1, backgroundColor: colors.plum }}>
      <StatusBar style="light" />
      <LinearGradient colors={['#5A1B4A', '#3E1A3B', '#331631']} locations={[0, 0.45, 0.8]} style={StyleSheet.absoluteFill} />
      <View style={{ alignItems: 'center' }}>
        <Stage scale={k} height={560}><NightMap /></Stage>
        <LinearGradient colors={['rgba(51,22,49,0)', '#331631']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 }} pointerEvents="none" />
      </View>
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, gap: 10 }}>
        <Rise delay={300}><Text style={st.h1}>Discover the flavours near you</Text></Rise>
        <Rise delay={400}><Text style={st.p}>We use your location to show surprise bags close by and how far each shop is.</Text></Rise>
      </View>
      <Rise delay={550} style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: bottom + 8, gap: 12 }}>
        <Button title="Allow location" icon="pin" onPress={async () => { await locateMe(); router.replace('/home'); }} />
        <Button title="Choose an area instead" kind="ghost" style={{ height: 52, borderColor: colors.pale }} onPress={() => router.push('/select-location')} />
        <Text style={{ textAlign: 'center', fontSize: 13, color: colors.pale, marginTop: 4, ...W('regular') }}>You can change this anytime in Settings.</Text>
      </Rise>
    </View>
  );
}

const st = StyleSheet.create({
  h1: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 37, color: colors.cream },
  p: { fontSize: 16, lineHeight: 24, color: colors.pale, ...W('regular') },
});
