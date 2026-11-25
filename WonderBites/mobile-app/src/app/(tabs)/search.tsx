// E11 Search map — every shop is a round ruby stamp; the selected one stamps down and
// its card glides up with a swinging price tag. Filter chips open Refine (F01).
// The map is a real map (concept 6): cream & rose brand colours, Doha landmarks
// while zoomed out; the stamps sit at each shop's coordinates and resize with the zoom.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { getState, setStore, useStore, type Filters } from '../../state/store';
import { CATEGORIES, matches, SORTS, TIME_SLOTS } from '../../lib/filters';
import { Calendar } from '../../components/Calendar';
import { dohaKey } from '../../lib/clock';
import { locateMe } from '../../lib/device';
import { Segmented } from '../../components/ui';
import { padEnd } from '../../i18n';
import { atStart, atEnd } from '../../i18n';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SlideUp } from '../../components/motion';
import { Halo } from '../../components/Halo';
import { MapLayer } from '../../components/map/MapLayer';
import type { MapPinData } from '../../components/map/parts';
import { SwingTag } from '../../components/PriceTag';
import { useTopInset } from '../../components/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, MerchantLogo, W } from '../../components/ui';
import { sync, useTick } from '../../api/client';
import { dayLabel, dayWindow, pickupState } from '../../lib/format';
import { photos } from '../../lib/photos';
import { colors, shadow } from '../../theme';
import { statusColor } from '../../components/BagCard';

// A small, steady tilt per shop so the stamps look hand-placed.
const tiltOf = (id: string) => ([...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 17) - 8;

export default function SearchMap() {
  const top = useTopInset();
  const tabH = 56 + Math.max(useSafeAreaInsets().bottom, 22);
  const f = useStore((x) => x.filters);
  const stock = useStore((x) => x.stock);
  const loc = useStore((x) => x.location);
  const [open, setOpen] = useState<null | 'category' | 'window' | 'sort'>(null);
  const [headH, setHeadH] = useState(150);
  const setF = (p: Partial<Filters>) => setStore((x) => ({ ...x, filters: { ...x.filters, ...p } }));
  // one stamp per shop that matches the filters, placed at the shop's coordinates
  // (a shop with several bags shows the one first in the chosen sort)
  const sortKey = (b: ReturnType<typeof sync.bag>) => { const br0 = sync.branch(b.branchId); return f.sort === 'soonest' ? new Date(b.pickupStart).getTime() : f.sort === 'discount' ? -b.discountPercent : f.sort === 'cheapest' ? b.price : f.sort === 'rating' ? -br0.rating : br0.distanceKm; };
  const visible = useMemo(() => {
    const best = new Map<string, ReturnType<typeof sync.bag>>();
    for (const b of sync.bags()) {
      const br0 = sync.findBranch(b.branchId);
      if (!br0 || !matches(b, br0, f)) continue;
      const cur = best.get(b.branchId);
      const better = !cur || (cur.bagsLeft === 0 && b.bagsLeft > 0) || ((cur.bagsLeft > 0) === (b.bagsLeft > 0) && sortKey(b) < sortKey(cur));
      if (better) best.set(b.branchId, b);
    }
    return [...best.values()].map((b) => ({ bagId: b.id }));
  }, [f, stock]); // eslint-disable-line react-hooks/exhaustive-deps
  const firstPick = useMemo(() => {
    const avail = visible.map((p) => sync.bag(p.bagId)).filter((b) => b.bagsLeft > 0);
    return avail.sort((a, b) => sortKey(a) - sortKey(b))[0]?.id;
  }, [visible, f.sort]);
  const [picked, setSel] = useState<string | undefined>(undefined);
  const sel = picked && visible.some((p) => p.bagId === picked) ? picked : firstPick;
  const firstSheet = useRef(true); // the shop card glides up after the pins have settled, once
  useEffect(() => { firstSheet.current = false; }, [sel]);
  const [focus, setFocus] = useState<{ lat: number; lng: number; key: number } | undefined>(undefined);
  useTick(30000);
  const night = false; // always the cream & rose map (the plum night colours are kept in mapGeo for later)
  const pins: MapPinData[] = visible.map((p, i) => {
    const b = sync.bag(p.bagId);
    const br0 = sync.branch(b.branchId);
    return { id: b.id, lat: br0.lat, lng: br0.lng, pct: b.discountPercent, price: b.price, was: b.originalPrice, soldOut: b.bagsLeft === 0,
      hurry: isHurry(pickupState(b.pickupStart, b.pickupEnd, b.bagsLeft)), tilt: tiltOf(b.id), delay: 300 + Math.min(i, 8) * 110,
      label: `${br0.storeName}, ${b.discountPercent}% off, now QAR ${b.price}, was QAR ${b.originalPrice}` };
  });
  const pick = (id: string) => {
    const b = sync.bag(id);
    if (b.bagsLeft === 0) return;
    setSel(id);
    const br0 = sync.branch(b.branchId);
    setFocus({ lat: br0.lat, lng: br0.lng, key: Date.now() });
  };
  const you = loc.source === 'gps' && loc.lat !== undefined && loc.lng !== undefined ? { lat: loc.lat, lng: loc.lng } : undefined;
  const bag = sel ? sync.bag(sel) : undefined;
  const br = bag ? sync.branch(bag.branchId) : undefined;
  const st = bag ? pickupState(bag.pickupStart, bag.pickupEnd, bag.bagsLeft) : undefined;
  const bagDays = [...new Set(sync.bags().map((b) => dohaKey(new Date(b.pickupStart).getTime())))];
  const chipLabel = {
    category: f.category === 'All' ? 'Category' : f.category,
    window: f.day === 'any' && !f.times.length ? 'Pickup window' : [f.day === 'today' ? 'Today' : f.day === 'tomorrow' ? 'Tomorrow' : f.day === 'date' && f.date ? dayLabel(`${f.date}T12:00:00+03:00`) : '', f.times.length ? `${f.times.length} times` : ''].filter(Boolean).join(' · '),
    sort: SORTS.find((x) => x.key === f.sort)!.label,
  };
  const chipOn = { category: f.category !== 'All', window: f.day !== 'any' || f.times.length > 0, sort: f.sort !== 'nearest' };
  return (
    <View style={{ flex: 1, backgroundColor: night ? '#2A1128' : '#F7EEF1' }}>
      <StatusBar style="light" />
      <MapLayer pins={pins} selected={sel} onSelect={pick} you={you} start={br ? { lat: br.lat, lng: br.lng } : undefined} focus={focus} night={night} insets={{ top: headH, bottom: tabH + 170 }} />

      <View onLayout={(e) => setHeadH(e.nativeEvent.layout.height)} style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: 3 }}>
      <Halo style={{ paddingTop: top + 4, paddingHorizontal: 20 }} curve={26} fieldTop={-460} spin={60000}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => router.push('/search-text')} style={s.search}>
            <Icon name="search" size={20} color={colors.plum} />
            <Text style={{ color: colors.muted, fontSize: 16, ...W('regular') }}>Search places or dishes</Text>
          </Pressable>
          <Pressable onPress={async () => { if (await locateMe()) { const l = getState().location; if (l.lat !== undefined && l.lng !== undefined) setFocus({ lat: l.lat, lng: l.lng, key: Date.now() }); } }} style={s.locate} accessibilityRole="button" accessibilityLabel="Use my location"><Icon name="locate" size={22} color="#fff" /></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 12 }}>
          <Pressable onPress={() => { setOpen(null); router.push({ pathname: '/refine', params: { from: 'map' } }); }} style={[s.gchip, { width: 44, paddingHorizontal: 0, justifyContent: 'center' }]} accessibilityRole="button" accessibilityLabel="All filters"><Icon name="filter" size={20} color="#fff" /></Pressable>
          {(['category', 'window', 'sort'] as const).map((c) => (
            <Pressable key={c} onPress={() => setOpen(open === c ? null : c)} style={[s.gchip, (chipOn[c] || open === c) && s.gchipOn]} accessibilityRole="button" accessibilityState={{ expanded: open === c }}>
              <Text style={{ color: chipOn[c] || open === c ? colors.plum : '#fff', fontSize: 14, ...W('semibold') }}>{chipLabel[c]}</Text>
              <View style={{ transform: [{ rotate: open === c ? '180deg' : '0deg' }] }}><Icon name="down" size={16} color={chipOn[c] || open === c ? colors.plum : '#fff'} /></View>
            </Pressable>
          ))}
        </ScrollView>
      </Halo>
      </View>

      {open ? (
        <>
          <Pressable onPress={() => setOpen(null)} style={[StyleSheet.absoluteFill, { zIndex: 4 }]} accessibilityLabel="Close" />
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={[s.drop, { top: headH - 18, zIndex: 5 }]}>
            {open === 'category' ? CATEGORIES.map((c) => {
              const n = sync.bags().filter((b) => matches(b, sync.findBranch(b.branchId), { ...f, category: c })).length;
              return <DropRow key={c} label={c} count={n} on={f.category === c} onPress={() => { setF({ category: c }); setOpen(null); }} />;
            }) : null}
            {open === 'sort' ? SORTS.map((x) => <DropRow key={x.key} label={x.label} on={f.sort === x.key} onPress={() => { setF({ sort: x.key }); setOpen(null); }} />) : null}
            {open === 'window' ? (
              <View style={{ gap: 12, padding: 6 }}>
                <Segmented items={['Today', 'Tomorrow', 'Any day', 'Choose date']} value={f.day === 'today' ? 'Today' : f.day === 'tomorrow' ? 'Tomorrow' : f.day === 'date' ? 'Choose date' : 'Any day'}
                  onChange={(v) => setF(v === 'Today' ? { day: 'today', date: undefined } : v === 'Tomorrow' ? { day: 'tomorrow', date: undefined } : v === 'Any day' ? { day: 'any', date: undefined } : { day: 'date', date: f.date ?? dohaKey() })} />
                {f.day === 'date' ? <Calendar value={f.date} onChange={(k) => setF({ date: k })} marked={bagDays} /> : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {TIME_SLOTS.map((t) => {
                    const on = f.times.includes(t.key);
                    return (
                      <Pressable key={t.key} onPress={() => setF({ times: on ? f.times.filter((x) => x !== t.key) : [...f.times, t.key] })} hitSlop={{ top: 6, bottom: 6 }} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[s.slot, on && { backgroundColor: colors.plum, borderColor: colors.plum }]}>
                        <Text style={{ fontSize: 13, color: on ? '#fff' : colors.plum, ...W('semibold') }}>{t.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={() => setOpen(null)} style={s.done} accessibilityRole="button"><Text style={{ color: '#fff', fontSize: 15, ...W('bold') }}>{`Show ${visible.length} shops`}</Text></Pressable>
              </View>
            ) : null}
          </Animated.View>
        </>
      ) : null}

      {!bag || !br || !st ? (
        <SlideUp key="none" duration={450} style={[s.sheet, { bottom: tabH, alignItems: 'center', gap: 6 }]}>
          <View style={s.grab} />
          <Text style={{ fontSize: 16, color: colors.plum, ...W('bold') }}>No results for these choices</Text>
          <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>Try another day, time or category.</Text>
          <Pressable onPress={() => setF({ category: 'All', day: 'any', date: undefined, times: [] })} hitSlop={10} accessibilityRole="button"><Text style={{ fontSize: 14, color: colors.ruby, marginTop: 4, ...W('bold') }}>Clear map filters</Text></Pressable>
        </SlideUp>
      ) : (
      <SlideUp key={sel} delay={firstSheet.current ? 1350 : 0} duration={firstSheet.current ? 1000 : 450} style={[s.sheet, { bottom: tabH }]}>
        <View style={s.grab} />
        <Pressable onPress={() => router.push(`/store/${bag.id}`)} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View>
            <Image source={photos[bag.photo]} style={{ width: 84, height: 84, borderRadius: 16 }} contentFit="cover" />
            <View style={{ position: 'absolute', ...atEnd(-6), bottom: -8 }}><MerchantLogo initials={br.initials} size={36} /></View>
          </View>
          <View style={[{ flex: 1 }, padEnd(70)]}>
            <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }} numberOfLines={1}>{br.storeName}</Text>
            <View style={s.line}><Icon name="pastry" size={15} color={colors.ruby} /><Text style={s.t}>{bag.title} · <Text style={{ color: colors.emerald, ...W('bold') }}>{bag.bagsLeft} left</Text></Text></View>
            <View style={s.line}><Icon name="clock" size={15} color={colors.ruby} stroke={2} /><Text style={[s.t, { color: colors.ruby, ...W('semibold') }]}>{dayWindow(bag.pickupStart, bag.pickupEnd)}</Text></View>
            {st.text ? <Text style={[s.t, { marginTop: 3, color: statusColor(st.kind, st.kind === 'now' && st.urgent), ...W('bold') }]}>{st.text}</Text> : null}
            <View style={s.line}><Icon name="pin" size={15} color={colors.muted} /><Text style={s.t}>{br.area} · {br.distanceKm} km</Text></View>
          </View>
        </Pressable>
        <SwingTag price={bag.price} was={bag.originalPrice} percent={bag.discountPercent} delay={250} scale={1.05} style={{ position: 'absolute', ...atEnd(12), top: -2 }} />
      </SlideUp>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 18, borderRadius: 16, backgroundColor: '#fff' },
  locate: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.ruby, alignItems: 'center', justifyContent: 'center', ...shadow.button },
  gchip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  sheet: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 22, paddingTop: 28, paddingBottom: 22, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.cream, ...shadow.card, shadowOffset: { width: 0, height: -6 } },
  grab: { position: 'absolute', top: 10, alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: '#E6B8C0' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  t: { fontSize: 13, color: colors.muted, ...W('regular') },
  gchipOn: { backgroundColor: '#fff', borderColor: '#fff' },
  drop: { position: 'absolute', left: 16, right: 16, backgroundColor: '#fff', borderRadius: 20, padding: 8, ...shadow.card, shadowOpacity: 0.25 },
  dropRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 12, borderRadius: 14, gap: 10 },
  slot: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1.5, borderColor: colors.field, justifyContent: 'center' },
  done: { height: 48, borderRadius: 24, backgroundColor: colors.ruby, alignItems: 'center', justifyContent: 'center' },
});

function DropRow({ label, count, on, onPress }: { label: string; count?: number; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.dropRow, (on || pressed) && { backgroundColor: colors.rubySoft }]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
      <Text style={{ flex: 1, fontSize: 15, color: colors.plum, ...W(on ? 'bold' : 'medium') }}>{label}</Text>
      {count !== undefined ? <Text style={{ fontSize: 13, color: colors.muted, ...W('semibold') }}>{String(count)}</Text> : null}
      {on ? <Icon name="check" size={18} color={colors.ruby} stroke={2.4} /> : <View style={{ width: 18 }} />}
    </Pressable>
  );
}

const isHurry = (p: ReturnType<typeof pickupState>) => 'urgent' in p && !!p.urgent;
