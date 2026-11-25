// Results list: what "Show N bags" (Filters) and Home "See all" open.
// ?rail=<index> lists one Home row; otherwise it lists the saved filters' results.
import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '../components/AppText';
import { Page, SubHeader } from '../components/layout';
import { BagCard } from '../components/BagCard';
import { Button, Chip, Icon, W } from '../components/ui';
import { api, sync, useApi, useTick } from '../api/client';
import { DEFAULT_FILTERS, setStore, useStore } from '../state/store';
import { activeCount, applyFilters, SORTS } from '../lib/filters';
import { colors } from '../theme';

export default function Results() {
  const { rail } = useLocalSearchParams<{ rail?: string }>();
  const f = useStore((s) => s.filters);
  const stock = useStore((s) => s.stock);
  const { data: rails } = useApi(() => api.homeRails());
  useTick(30000);
  const railDef = rail !== undefined ? rails?.[Number(rail)] : undefined;
  const list = useMemo(() => {
    const base = railDef ? railDef.bagIds.map((id) => sync.findBag(id)).filter((b): b is NonNullable<typeof b> => !!b) : sync.bags();
    return applyFilters(base, sync.findBranch, railDef ? { ...DEFAULT_FILTERS, sort: f.sort } : f);
  }, [railDef, f, stock]); // eslint-disable-line react-hooks/exhaustive-deps
  const on = activeCount(f);
  return (
    <Page header={<SubHeader title={railDef ? railDef.title : 'Results'} />} contentStyle={{ gap: 12, paddingTop: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{`${list.length} ${list.length === 1 ? 'bag' : 'bags'}`}</Text>
        {!railDef ? (
          <Pressable onPress={() => router.push({ pathname: '/refine', params: { from: 'results' } })} hitSlop={10} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="filter" size={18} color={colors.ruby} />
            <Text style={{ fontSize: 14, color: colors.ruby, ...W('bold') }}>{on ? `Filters (${on})` : 'Filters'}</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }} style={{ marginHorizontal: -20, paddingHorizontal: 20, flexGrow: 0 }}>
        {SORTS.map((x) => <Chip key={x.key} label={x.label} on={f.sort === x.key} onPress={() => setStore((s) => ({ ...s, filters: { ...s.filters, sort: x.key } }))} />)}
      </ScrollView>
      {list.map((b) => <BagCard key={b.id} bag={b} branch={sync.branch(b.branchId)} width={-1} onPress={() => router.push(`/store/${b.id}`)} />)}
      {!list.length ? (
        <View style={{ alignItems: 'center', paddingTop: 40, gap: 8 }}>
          <Icon name="search" size={30} color={colors.rose} />
          <Text style={{ fontSize: 17, color: colors.plum, ...W('bold') }}>No bags match these filters</Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', ...W('regular') }}>Widen your search or pick another day. New picks arrive every afternoon.</Text>
          <Button title="Reset filters" kind="secondary" onPress={() => setStore((s) => ({ ...s, filters: { ...DEFAULT_FILTERS } }))} style={{ marginTop: 8, alignSelf: 'stretch' }} />
        </View>
      ) : null}
    </Page>
  );
}
