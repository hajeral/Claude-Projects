// F01 Refine your search — opened from the map's filter chips and the Home filter button.
import React, { useState } from 'react';
import { atStart, atEnd } from '../i18n';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { sync } from '../api/client';
import { DEFAULT_FILTERS, setStore, toggleIn, useStore, type Filters } from '../state/store';
import { activeCount, applyFilters, SORTS, TIME_SLOTS } from '../lib/filters';
import { Calendar } from '../components/Calendar';
import { dohaKey } from '../lib/clock';
import { dayLabel } from '../lib/format';
import { Image } from 'expo-image';
import { useBottomInset, useTopInset } from '../components/layout';
import { Slider } from '../components/Slider';
import { Button, Icon, IconBtn, OptChip, Segmented, W } from '../components/ui';
import { photos } from '../lib/photos';
import type { PhotoKey } from '../api/types';
import { colors, fonts, shadow } from '../theme';

const AREAS = ['Near me', 'Msheireb', 'West Bay', 'Al Sadd', 'The Pearl', 'Lusail', 'Katara', 'Al Waab', '+ 6 more'];
const BAGS: [string, PhotoKey][] = [['Meals', 'salmon_plate'], ['Bread & pastries', 'store_shelves'], ['Sweets & desserts', 'donut_interim'], ['Groceries', 'groceries']];
const SHOPS = ['Bakery', 'Patisserie', 'Café', 'Restaurant', 'Hotel buffet', 'Supermarket', 'Healthy & salads', 'Donuts'];
const DIET = ['Vegetarian', 'Vegan', 'Gluten free', 'Dairy free', 'Nut free'];
const RATING: [string, number][] = [['Any', 0], ['3.5 ★', 3.5], ['4.0 ★', 4], ['4.5 ★', 4.5]];
const DAYS: [string, Filters['day']][] = [['Today', 'today'], ['Tomorrow', 'tomorrow'], ['Any day', 'any'], ['Choose date', 'date']];
const HIST = [3, 5, 9, 12, 16, 19, 18, 15, 11, 8, 5, 3, 2, 2];

export default function Refine() {
  const top = useTopInset();
  const bottom = useBottomInset();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const saved = useStore((x) => x.filters);
  const [f, setF] = useState<Filters>(saved); // a draft: applied only when "Show N bags" is tapped
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));
  const all = sync.bags();
  const matches = applyFilters(all, sync.findBranch, f).length;
  const on = activeCount(f);
  const bagDays = [...new Set(all.map((b) => dohaKey(new Date(b.pickupStart).getTime())))];
  const reset = () => setF({ ...DEFAULT_FILTERS });
  const apply = () => {
    setStore((x) => ({ ...x, filters: f }));
    if (from === 'map' || from === 'results') router.back();
    else router.replace('/results');
  };
  const avail = f.available ? 'Available only' : 'Show unavailable too';
  const day = DAYS.find(([, k]) => k === f.day)![0];
  const rating = (RATING.find(([, n]) => n === f.minRating) ?? RATING[0])[0];
  const km = f.km, price = f.price;

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={[s.grab, { marginTop: Math.max(10, top - 34) }]} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 14 }}>
          <View>
            <Text style={s.title}>Refine your <Text style={{ color: colors.ruby }}>search</Text></Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2, ...W('regular') }}>{on} {on === 1 ? 'filter' : 'filters'} on · <Text style={{ color: colors.plum, ...W('bold') }}>{`${matches} ${matches === 1 ? 'bag' : 'bags'}`}</Text> match in Doha</Text>
          </View>
          <IconBtn name="close" variant="white" size={40} onPress={() => router.back()} label="Close" />
        </View>

        <Sec t="Pickup or delivery"><Segmented items={['Pickup or delivery', 'Delivery available']} value={f.delivery ? 'Delivery available' : 'Pickup or delivery'} onChange={(v) => set('delivery', v === 'Delivery available')} /></Sec>
        <Sec t="Availability"><Segmented items={['Available only', 'Show unavailable too']} value={avail} onChange={(v) => set('available', v === 'Available only')} /></Sec>
        <Sec t="Pickup day" right={f.day === 'date' && f.date ? dayLabel(`${f.date}T12:00:00+03:00`) : undefined}>
          <Segmented items={DAYS.map(([l]) => l)} value={day} onChange={(v) => { const k = DAYS.find(([l]) => l === v)![1]; setF((x) => ({ ...x, day: k, date: k === 'date' ? x.date ?? dohaKey() : undefined })); }} />
          {f.day === 'date' ? <View style={{ marginTop: 12 }}><Calendar value={f.date} onChange={(k) => set('date', k)} marked={bagDays} /></View> : null}
        </Sec>
        <Sec t="Pickup time"><Wrap>{TIME_SLOTS.map((x) => <OptChip key={x.key} label={x.label} on={f.times.includes(x.key)} onPress={() => set('times', toggleIn(f.times, x.key))} />)}</Wrap></Sec>
        <Sec t="Area" right={`${f.areas.length} selected`}><Wrap>{AREAS.map((x) => <OptChip key={x} label={x} on={f.areas.includes(x)} onPress={() => x.startsWith('+') ? router.push('/select-location') : set('areas', toggleIn(f.areas, x))} />)}</Wrap></Sec>
        <Sec t="Distance" right={km >= 20 ? 'Any distance' : `Within ${km} km`}><Slider from={1} to={20} value={km} onChange={(a) => set('km', a)} ticks={['1 km', '5', '10', '15', '20 km']} /></Sec>
        <Sec t="Bag type">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {BAGS.map(([b, ph]) => {
              const sel = f.bagTypes.includes(b);
              return (
                <Pressable key={b} onPress={() => set('bagTypes', toggleIn(f.bagTypes, b))} style={[s.tile, sel && s.tileOn]} accessibilityRole="checkbox" accessibilityState={{ checked: sel }}>
                  <Image source={photos[ph]} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(51,22,49,0.32)' }]} />
                  <Text style={s.tileTx}>{b}</Text>
                  {sel ? <View style={[s.tick, atEnd(8)]}><Icon name="check" size={13} color="#fff" stroke={2.6} /></View> : null}
                </Pressable>
              );
            })}
          </View>
        </Sec>
        <Sec t="Type of shop"><Wrap>{SHOPS.map((x) => <OptChip key={x} label={x} on={f.shopTypes.includes(x)} onPress={() => set('shopTypes', toggleIn(f.shopTypes, x))} />)}</Wrap></Sec>
        <Sec t="Dietary preference" right="Shops describe what’s in their bags" rightMuted><Wrap>{DIET.map((x) => <OptChip key={x} label={x} on={f.diet.includes(x)} onPress={() => set('diet', toggleIn(f.diet, x))} />)}</Wrap></Sec>
        <Sec t="Budget" right={`QAR ${price[0]} – ${price[1]}`}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 26, paddingHorizontal: 4 }}>
            {HIST.map((h, i) => { const v = 5 + i * 4; const inR = v >= price[0] && v <= price[1]; return <View key={i} style={{ flex: 1, height: h + 4, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: inR ? colors.ruby : '#F1DDE6' }} />; })}
          </View>
          <Slider from={5} to={60} value={price[0]} value2={price[1]} onChange={(a, b) => set('price', [a, b ?? a])} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={s.minmax}><Text style={s.mmL}>Min</Text><Text style={s.mmV}>QAR {price[0]}</Text></View>
            <View style={s.minmax}><Text style={s.mmL}>Max</Text><Text style={s.mmV}>QAR {price[1]}</Text></View>
          </View>
        </Sec>
        <Sec t="Minimum rating"><Segmented items={RATING.map(([l]) => l)} value={rating} onChange={(v) => set('minRating', RATING.find(([l]) => l === v)![1])} /></Sec>
        <Sec t="Sort by"><Wrap>{SORTS.map((x) => <OptChip key={x.key} label={x.label} on={f.sort === x.key} onPress={() => set('sort', x.key)} />)}</Wrap></Sec>
      </ScrollView>
      <View style={[s.foot, { paddingBottom: bottom + 8 }]}>
        <Pressable onPress={reset} hitSlop={8}><Text style={{ fontSize: 15, color: colors.plum, textDecorationLine: 'underline', ...W('bold') }}>Reset all</Text></Pressable>
        <Button title={matches ? `Show ${matches} ${matches === 1 ? 'bag' : 'bags'}` : 'No bags match'} onPress={apply} disabled={!matches} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function Sec({ t, right, rightMuted, children }: { t: string; right?: string; rightMuted?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{t}</Text>
        {right ? <Text style={{ fontSize: rightMuted ? 12 : 13, color: rightMuted ? colors.muted2 : colors.ruby, ...W(rightMuted ? 'regular' : 'bold') }}>{right}</Text> : null}
      </View>
      {children}
    </View>
  );
}
const Wrap = ({ children }: { children: React.ReactNode }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;

const s = StyleSheet.create({
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#E6B8C0' },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 37, color: colors.plum },
  tile: { width: '48%', flexGrow: 1, height: 96, borderRadius: 16, overflow: 'hidden', justifyContent: 'flex-end', padding: 10, borderWidth: 2, borderColor: 'transparent' },
  tileOn: { borderColor: colors.ruby },
  tileTx: { color: '#fff', fontSize: 14, ...W('bold') },
  tick: { position: 'absolute', top: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.ruby, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  minmax: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.field, backgroundColor: '#fff' },
  mmL: { fontSize: 13, color: colors.muted, ...W('regular') },
  mmV: { fontSize: 15, color: colors.plum, ...W('semibold') },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(254,250,247,0.97)', borderTopWidth: 1, borderTopColor: colors.line, ...shadow.card },
});
