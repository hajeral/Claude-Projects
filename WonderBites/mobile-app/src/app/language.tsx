// P05 Language
import React, { useState } from 'react';
import { getLang, setLanguage, type Lang } from '../i18n';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Page, SubHeader } from '../components/layout';
import { Button, Radio, W } from '../components/ui';
import { colors, fonts, shadow } from '../theme';

const LANGS = [['en', 'En', 'English', 'English · the app switches to left-to-right'], ['ar', 'ع', 'العربية', 'Arabic · the app switches to right-to-left']];

export default function Language() {
  const [l, setL] = useState<Lang>(getLang());
  return (
    <Page header={<SubHeader title="Language" />} footer={<Button title="Save" onPress={async () => { await setLanguage(l); router.back(); }} />} contentStyle={{ gap: 12 }}>
      <Text style={{ fontSize: 14, color: colors.muted, ...W('regular') }}>Choose the language for the app, notifications and receipts.</Text>
      {LANGS.map(([k, badge, name, sub]) => (
        <Pressable key={k} onPress={() => setL(k as Lang)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 2, borderColor: l === k ? '#F1C6D3' : colors.line, ...shadow.card, shadowOpacity: 0.08 }} accessibilityRole="radio" accessibilityState={{ checked: l === k }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: fonts.serif, fontSize: 18, color: colors.ruby }}>{badge}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, color: colors.plum, ...W('bold') }}>{name}</Text>
            <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>{sub}</Text>
          </View>
          <Radio on={l === k} />
        </Pressable>
      ))}
    </Page>
  );
}
