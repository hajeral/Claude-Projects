import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold } from '@expo-google-fonts/figtree';
import { NotoNaskhArabic_700Bold } from '@expo-google-fonts/noto-naskh-arabic';
import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold } from '@expo-google-fonts/ibm-plex-sans-arabic';
import { restoreLanguage, useLang } from '../i18n';
import { restoreStore } from '../state/store';
import { ToastHost } from '../components/Toast';
import { LIVE } from '../config';
import { bootstrapLive } from '../api/live';
import { colors } from '../theme';

export default function Root() {
  const [loaded, fontError] = useFonts({
    DMSerifDisplay_400Regular, Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold,
    NotoNaskhArabic_700Bold, IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold,
  });
  const lang = useLang();
  const [langReady, setLangReady] = useState(false);
  // Language, saved demo data and (live mode) the catalogue load before the first screen
  useEffect(() => { Promise.allSettled([restoreLanguage(), restoreStore(), LIVE ? bootstrapLive() : Promise.resolve()]).finally(() => setLangReady(true)); }, []);
  // If the brand fonts fail or take too long, open with the phone's own fonts instead of a blank screen.
  const [fontWait, setFontWait] = useState(true);
  useEffect(() => { const t = setTimeout(() => setFontWait(false), 4000); return () => clearTimeout(t); }, []);
  const fontsReady = loaded || !!fontError || !fontWait;
  if (!fontsReady || !langReady) return <View style={{ flex: 1, backgroundColor: colors.plum }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1, overflow: 'hidden', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <SafeAreaProvider key={lang}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream }, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="refine" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="logout" options={{ presentation: 'transparentModal', animation: 'none' }} />
          <Stack.Screen name="verify-method" options={{ presentation: 'transparentModal', animation: 'none' }} />
          <Stack.Screen name="completed/[orderId]" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Shown instead of a crash if any screen throws: branded, translated, with a way back. */
export function ErrorBoundary({ retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#331631', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 }}>
      <Text style={{ color: '#fff', fontSize: 24, fontFamily: 'DMSerifDisplay_400Regular', textAlign: 'center' }}>That didn’t go as planned</Text>
      <Text style={{ color: '#EBD9E4', fontSize: 16, textAlign: 'center' }}>Please try again. Your orders and vouchers are safe.</Text>
      <Pressable onPress={retry} accessibilityRole="button" style={{ height: 52, paddingHorizontal: 32, borderRadius: 26, backgroundColor: '#D9175C', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
        <Text style={{ color: '#fff', fontSize: 17 }}>Try again</Text>
      </Pressable>
    </View>
  );
}
