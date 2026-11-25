// M05 Country code: every country, with the phone's own country suggested first.
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Page, SubHeader } from '../components/layout';
import { Field, Group, Icon, SectionLabel, W } from '../components/ui';
import { colors } from '../theme';
import { COUNTRIES, GULF, type Country } from '../lib/countries';
import { detectCountry, usePhoneCountry } from '../lib/region';
import { setStore } from '../state/store';
import { getLang } from '../i18n';

export default function CountryCode() {
  const [q, setQ] = useState('');
  const sel = usePhoneCountry().iso;
  const ar = getLang() === 'ar';
  const name = (c: Country) => (ar ? c.nameAr : c.name);
  const find = (iso: string) => COUNTRIES.find((c) => c.iso === iso)!;
  const here = detectCountry();
  const suggested = [...new Set([here, 'QA'])].map(find);
  const gulf = GULF.filter((g) => !suggested.some((s) => s.iso === g)).map(find);
  const all = useMemo(() => [...COUNTRIES].sort((a, b) => name(a).localeCompare(name(b), ar ? 'ar' : 'en')), [ar]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = q.trim().toLowerCase().replace(/^\+/, '');
  const hit = (c: Country) => !t || `${c.iso} ${c.name} ${c.nameAr} ${c.dial}`.toLowerCase().includes(t);
  const pick = (c: Country) => { setStore((x) => ({ ...x, phoneCountry: c.iso })); router.back(); };
  const Row = (c: Country) => (
    <Pressable key={c.iso} onPress={() => pick(c)} accessibilityRole="button" accessibilityState={{ selected: sel === c.iso }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 50, paddingHorizontal: 14 }}>
      <View style={{ width: 30, height: 22, borderRadius: 6, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 10, color: colors.rubyDark, ...W('extrabold') }}>{c.iso}</Text></View>
      <Text style={{ flex: 1, fontSize: 15, color: colors.plum, ...W('semibold') }} numberOfLines={1}>{name(c)}</Text>
      <Text style={{ fontSize: 14, color: colors.muted, ...W('semibold') }}>{c.dial}</Text>
      {sel === c.iso ? <Icon name="check" size={18} color={colors.ruby} stroke={2.2} /> : null}
    </Pressable>
  );
  const S = suggested.filter(hit), G = gulf.filter(hit), A = all.filter(hit);
  return (
    <Page header={<SubHeader title="Country code" />} contentStyle={{ paddingTop: 8 }}>
      <Field icon="search" placeholder="Search country or code" onChangeText={setQ} />
      {S.length ? <><SectionLabel>Suggested</SectionLabel><Group>{S.map(Row)}</Group></> : null}
      {!t && G.length ? <><SectionLabel>Gulf</SectionLabel><Group>{G.map(Row)}</Group></> : null}
      {A.length ? <><SectionLabel>All countries</SectionLabel><Group>{A.map(Row)}</Group></> : null}
      {!S.length && !A.length ? <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 24, ...W('regular') }}>No country matches that</Text> : null}
    </Page>
  );
}
