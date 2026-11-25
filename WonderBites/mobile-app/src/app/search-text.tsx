// M09 Search (typing)
import React, { useMemo, useState } from 'react';
import { DEFAULT_FILTERS, setStore, useStore } from '../state/store';
import { tr, useLang } from '../i18n';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Halo } from '../components/Halo';
import { Page, back, useTopInset } from '../components/layout';
import { Card, Group, Icon, IconBtn, ListRow, Pill, SectionLabel, W } from '../components/ui';
import { sync } from '../api/client';
import { dayWindow } from '../lib/format';
import { photos } from '../lib/photos';
import { colors } from '../theme';
import { TabBarView } from '../components/TabBar';

// Words people type for a kind of food → the bag type it means (English and Arabic).
const KEYWORDS: [RegExp, string][] = [
  [/crois|bread|bake|pastr|sourdough|كروا|خبز|مخبوز|معجنات/i, 'Bread & pastries'],
  [/donut|cake|sweet|dessert|دونات|كيك|حلو|حلويات/i, 'Sweets & desserts'],
  [/salad|meal|grill|lunch|dinner|سلط|وجب|مشاوي|غداء|عشاء/i, 'Meals'],
  [/grocer|fruit|veg|بقال|فواكه|خضار/i, 'Groceries'],
];
const norm = (x: string) => x.toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F]/g, '');
const has = (hay: string, q: string) => norm(hay).includes(norm(q)) || norm(tr(hay)).includes(norm(q));

type Row = { key: string; title: string; sub: string; icon: 'store' | 'bag'; go: () => void };

export default function SearchText() {
  const top = useTopInset();
  useLang();
  const [q, setQ] = useState('');
  const recent = useStore((x) => x.recent);
  const setRecent = (r: string[]) => setStore((x) => ({ ...x, recent: r }));
  const remember = () => { const t = q.trim(); if (t) setRecent([t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6)); };
  // "Popular": the best-rated bag still available (any catalogue), or nothing at all
  const pop = [...sync.bags()].filter((b) => b.bagsLeft > 0 && sync.findBranch(b.branchId)).sort((a, b) => (sync.findBranch(b.branchId)!.rating - sync.findBranch(a.branchId)!.rating) || (b.discountPercent - a.discountPercent))[0];
  const br = pop ? sync.findBranch(pop.branchId) : undefined;
  const results = useMemo<Row[]>(() => {
    const t = q.trim();
    if (t.length < 2) return [];
    const bags = sync.bags();
    const out: Row[] = [];
    for (const [re, type] of KEYWORDS) {
      if (re.test(t) || has(type, t)) {
        const n = bags.filter((b) => b.bagType === type && b.bagsLeft > 0).length;
        out.push({ key: `t-${type}`, title: type, sub: `Bag type · ${n} bags in Doha`, icon: 'bag', go: () => { setStore((x) => ({ ...x, filters: { ...DEFAULT_FILTERS, bagTypes: [type] } })); router.push('/results'); } });
      }
    }
    for (const b0 of sync.branches()) {
      if ([b0.storeName, b0.branchName, b0.area, b0.shopType].some((x) => has(x, t))) {
        const n = bags.filter((b) => b.branchId === b0.id && b.bagsLeft > 0).length;
        out.push({ key: `s-${b0.id}`, title: b0.storeName, sub: `${b0.shopType} · ${b0.area} · ${n} ${n === 1 ? 'bag' : 'bags'}`, icon: 'store', go: () => router.push(`/shop/${b0.id}`) });
      }
    }
    for (const b of bags) {
      const b0 = sync.findBranch(b.branchId);
      if (!b0 || out.some((r) => r.key === `s-${b0.id}`)) continue;
      if ([b.title, b.bagType, b.category, b.description].some((x) => has(x, t)) || KEYWORDS.some(([re, ty]) => re.test(t) && ty === b.bagType)) {
        out.push({ key: `b-${b.id}`, title: b0.storeName, sub: `${b.title} · ${b0.area} · ${b.bagsLeft > 0 ? `${b.bagsLeft} left` : 'Sold out'}`, icon: 'bag', go: () => router.push(`/store/${b.id}`) });
      }
    }
    return out.slice(0, 8);
  }, [q]);
  const Hi = ({ t: en }: { t: string }) => {
    const t = tr(en);
    const i = t.toLowerCase().indexOf(q.toLowerCase());
    if (!q || i < 0) return <Text style={{ fontSize: 15, color: colors.plum, ...W('semibold') }}>{t}</Text>;
    return <Text style={{ fontSize: 15, color: colors.plum, ...W('semibold') }}>{t.slice(0, i)}<Text style={W('extrabold')}>{t.slice(i, i + q.length)}</Text>{t.slice(i + q.length)}</Text>;
  };
  return (
    <View style={{ flex: 1 }}>
    <Page
      tabBar
      header={
        <Halo style={{ paddingTop: top + 8, paddingHorizontal: 20 }} curve={30}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconBtn name="back" variant="glass" onPress={back} label="Back" />
            <View style={{ flex: 1, height: 48, borderRadius: 16, backgroundColor: '#fff', paddingHorizontal: 18, justifyContent: 'center' }}>
              <TextInput value={q} onChangeText={setQ} onSubmitEditing={remember} returnKeyType="search" autoFocus style={{ fontSize: 17, color: colors.plum, paddingVertical: 0, outlineWidth: 0, outlineStyle: 'none', ...W('medium') } as object} placeholder="Search places or dishes" placeholderTextColor={colors.muted2} />
            </View>
            <IconBtn name="filter" variant="glass" onPress={() => router.push('/refine')} label="Filters" />
          </View>
          <View style={{ height: 16 }} />
        </Halo>
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <SectionLabel>Recent searches</SectionLabel>
        {recent.length ? <Pressable onPress={() => setRecent([])} hitSlop={14} accessibilityRole="button"><Text style={{ fontSize: 13, color: colors.ruby, ...W('bold') }}>Clear</Text></Pressable> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {recent.map((r) => (
          <Pressable key={r} onPress={() => setQ(r)} hitSlop={{ top: 5, bottom: 5 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: colors.field, backgroundColor: '#fff' }}>
            <Icon name="clock" size={14} color={colors.plum} /><Text style={{ fontSize: 14, color: colors.plum, ...W('semibold') }}>{r}</Text>
          </Pressable>
        ))}
      </View>
      {q.trim().length >= 2 ? (
        <>
          <SectionLabel>You might also like</SectionLabel>
          {results.length ? (
            <Group>
              {results.map((r) => (
                <ListRow key={r.key} icon={r.icon} title={r.title} titleNode={<Hi t={r.title} />} sub={r.sub} onPress={() => { remember(); r.go(); }} />
              ))}
            </Group>
          ) : (
            <Text style={{ fontSize: 15, color: colors.muted, ...W('regular') }}>{`No shops or bags match “${q.trim()}”. Try a shop name, an area or a food like bread or salad.`}</Text>
          )}
        </>
      ) : null}
      {pop && br ? <>
      <SectionLabel>Trending in Doha</SectionLabel>
      <Card onPress={() => router.push(`/store/${pop.id}`)} style={{ flexDirection: 'row', gap: 12, padding: 12 }}>
        <Image source={photos[pop.photo]} style={{ width: 64, height: 64, borderRadius: 14 }} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, color: colors.plum, ...W('bold') }}>{br.storeName}</Text>
            <Pill label={`${pop.bagsLeft} left`} tone="green" />
          </View>
          <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>{br.branchName} · {br.distanceKm} km · ★ {br.rating}</Text>
          <Text style={{ fontSize: 13, color: colors.ruby, ...W('bold') }}>{dayWindow(pop.pickupStart, pop.pickupEnd)}</Text>
          <Text style={{ fontSize: 13, color: colors.plum, ...W('bold') }}>QAR {pop.price} <Text style={{ color: colors.muted, textDecorationLine: 'line-through', ...W('regular') }}>QAR {pop.originalPrice}</Text><Text style={{ color: colors.muted, ...W('regular') }}> · {pop.discountPercent}% off</Text></Text>
        </View>
      </Card>
      </> : null}
    </Page>
    <TabBarView active="search" />
    </View>
  );
}
