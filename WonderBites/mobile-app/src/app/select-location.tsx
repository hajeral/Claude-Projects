// M08 Select location
import React, { useMemo, useState } from 'react';
import { router as R, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { isPlaceKindLabel, PLACE_KINDS, placeLabel, type PlaceKind, setStore, useStore } from '../state/store';
import { AREAS } from '../lib/areas';
import { locateMe } from '../lib/device';
import { sync } from '../api/client';
import { toast } from '../components/Toast';
import { tr } from '../i18n';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SubHeader, useBottomInset } from '../components/layout';
import { Slider } from '../components/Slider';
import { StreetMap } from '../components/StreetMap';
import { Button, Card, Check, Field, Icon, OptChip, W } from '../components/ui';
import { colors, shadow } from '../theme';

export default function SelectLocation() {
  const { width, height } = useWindowDimensions();
  const bottom = useBottomInset();
  const { mode, id } = useLocalSearchParams<{ mode?: string; id?: string }>(); // mode=place: edit or add a saved place
  const loc = useStore((x) => x.location);
  const places = useStore((x) => x.places);
  const editing = mode === 'place' ? places.find((p) => p.id === id) : undefined;
  const [km, setKm] = useState(loc.km);
  const [area, setArea] = useState(editing?.area ?? loc.area);
  const [q, setQ] = useState('');
  const [label, setLabel] = useState(editing ? placeLabel(editing.label) : '');
  const [kind, setKind] = useState<PlaceKind | undefined>(editing?.kind ?? (editing ? 'other' : undefined));
  const [isDefault, setIsDefault] = useState(!!editing && places[0]?.id === editing.id);
  const pickKind = (k: PlaceKind, l: string) => { setKind(k); if (k !== 'other' && (!label.trim() || isPlaceKindLabel(label.trim()))) setLabel(placeLabel(l)); if (k === 'other' && isPlaceKindLabel(label.trim())) setLabel(''); };
  const r = 40 + km * 16;
  const found = useMemo(() => (q.trim() ? AREAS.filter((a) => [a.area, a.detail].some((x) => x.toLowerCase().includes(q.trim().toLowerCase()) || tr(x).includes(q.trim()))) : []), [q]);
  const detail = AREAS.find((a) => a.area === area)?.detail ?? `${area}, Doha`;
  const nearby = sync.bags().filter((b) => b.bagsLeft > 0 && (sync.findBranch(b.branchId)?.distanceKm ?? 99) <= km).length;
  const useGps = async () => { const a = await locateMe(); if (a) setArea(a); };
  const confirm = () => {
    if (mode === 'place') {
      const name = label.trim();
      if (!name) { toast('Give this place a name', 'error'); return; }
      const pid = editing?.id ?? `p${Date.now()}`;
      const saved = { id: pid, label: name, area, detail, kind: kind ?? 'other' };
      setStore((x) => {
        const list = editing ? x.places.map((p) => (p.id === pid ? { ...p, ...saved } : p)) : [...x.places, saved];
        // the first place is the default
        return { ...x, places: isDefault ? [saved, ...list.filter((p) => p.id !== pid)] : list };
      });
      toast(editing ? 'Place updated' : 'Place saved');
      R.back();
      return;
    }
    setStore((x) => ({ ...x, location: { ...x.location, area, km, source: 'manual' }, filters: { ...x.filters, km } }));
    toast(`Showing bags within ${km} km of ${area}`);
    if (R.canGoBack()) R.back(); else R.replace('/home');
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <StatusBar style="light" />
      <StreetMap width={width} height={height} style={StyleSheet.absoluteFill}>
        <View style={{ position: 'absolute', left: width * 0.44 - r, top: height * 0.43 - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: 'rgba(217,23,92,0.12)', borderWidth: 1.2, borderStyle: 'dashed', borderColor: 'rgba(217,23,92,0.5)' }} />
        <Animated.View entering={ZoomIn.springify()} style={{ position: 'absolute', left: width * 0.44 - 22, top: height * 0.43 - 48 }}>
          <Svg width={44} height={54} viewBox="0 0 44 54"><Path d="M22 52S4 34 4 21a18 18 0 0 1 36 0c0 13-18 31-18 31z" fill={colors.ruby} stroke="#fff" strokeWidth={3} /><Circle cx={22} cy={21} r={6.5} fill="#fff" /></Svg>
        </Animated.View>
        <Pressable onPress={useGps} hitSlop={4} accessibilityRole="button" style={[st.useCur, { top: height * 0.56 }]}><Icon name="pin" size={16} color={colors.plum} /><Text style={{ fontSize: 13, color: colors.plum, ...W('bold') }}>Use current location</Text></Pressable>
      </StreetMap>
      <SubHeader title="Select location" />
      <View style={{ paddingHorizontal: 20, marginTop: 2, zIndex: 2 }}>
        <Field icon="search" placeholder="Search area or address" value={q} onChangeText={setQ} controlled style={shadow.float} />
        {found.length ? (
          <ScrollView style={st.results} keyboardShouldPersistTaps="handled">
            {found.map((a) => (
              <Pressable key={a.area} onPress={() => { setArea(a.area); setQ(''); }} style={({ pressed }) => [st.res, pressed && { backgroundColor: colors.rubySoft }]} accessibilityRole="button">
                <Icon name="pin" size={16} color={colors.ruby} />
                <View style={{ flex: 1 }}><Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{a.area}</Text><Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>{a.detail}</Text></View>
              </Pressable>
            ))}
          </ScrollView>
        ) : q.trim() ? <View style={st.results}><Text style={{ padding: 14, fontSize: 14, color: colors.muted, ...W('regular') }}>No Doha area matches that. Try West Bay, Lusail or Al Sadd.</Text></View> : null}
      </View>
      <View style={[st.sheet, { paddingBottom: bottom + 8 }]}>
        <View style={st.grab} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>Show bags within</Text>
          <Text style={{ fontSize: 15, color: colors.ruby, ...W('bold') }}>{km} km</Text>
        </View>
        <Slider from={1} to={20} value={km} onChange={(a) => setKm(a)} ticks={['1 km', '5', '10', '15', '20 km']} />
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: 14 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="pin" size={20} color={colors.ruby} /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{area}</Text>
            <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>{`${detail} · ${nearby} bags nearby`}</Text>
          </View>
        </Card>
        {mode === 'place' ? <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {PLACE_KINDS.map((k) => <OptChip key={k.kind} label={placeLabel(k.label)} on={kind === k.kind} onPress={() => pickKind(k.kind, k.label)} />)}
          </View>
          <Field icon="edit" placeholder={kind === 'other' ? 'Name this place, e.g. Grandma’s house' : 'Name this place, e.g. Home'} value={label} onChangeText={setLabel} controlled style={{ marginTop: 10 }} />
          {places.length > (editing ? 1 : 0) ? (
            <Pressable onPress={() => setIsDefault(!isDefault)} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: isDefault }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <Check on={isDefault} /><Text style={{ fontSize: 14, color: colors.plum, ...W('medium') }}>Use as my default place</Text>
            </Pressable>
          ) : null}
        </> : null}
        <Button title={mode === 'place' ? 'Save place' : 'Confirm location'} style={{ marginTop: 14 }} onPress={confirm} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  results: { maxHeight: 240, marginTop: 6, backgroundColor: '#fff', borderRadius: 16, ...shadow.float },
  res: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 52 },
  useCur: { position: 'absolute', right: 20, /* map overlay: physical */ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#fff', ...shadow.float },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 22, backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, ...shadow.card, shadowOffset: { width: 0, height: -8 } },
  grab: { position: 'absolute', top: 10, alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E6B8C0' },
});
