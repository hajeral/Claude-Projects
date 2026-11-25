// P19 Favourites
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/AppText';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { BigHeader, Page } from '../../components/layout';
import { Card, Icon, W } from '../../components/ui';
import { api, sync, useTick } from '../../api/client';
import { useStore } from '../../state/store';
import { toast } from '../../components/Toast';
import { hhmm, pickupState } from '../../lib/format';
import { photos } from '../../lib/photos';
import { colors } from '../../theme';

export default function Favorites() {
  const ids = useStore((s) => s.favBranches);
  useStore((s) => s.stock);
  useTick(30000);
  const all = sync.bags();
  const rows = ids.filter((id) => sync.findBranch(id)).map((id) => ({ br: sync.branch(id), bag: all.find((b) => b.branchId === id) }));
  const avail = rows.filter((r) => r.bag && r.bag.bagsLeft > 0);
  const [tab, setTab] = useState('avail');
  const list = tab === 'avail' ? avail : rows;
  return (
    <Page tabBar header={
      <BigHeader title="Favourites" sub="We’ll tell you when they drop new bags.">
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {[['avail', `Bags available (${avail.length})`], ['all', `All shops (${rows.length})`]].map(([k, l]) => (
            <Pressable key={k} onPress={() => setTab(k)} hitSlop={{ top: 6, bottom: 6 }} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: tab === k ? '#fff' : 'rgba(255,255,255,0.12)' }}>
              <Text style={{ fontSize: 14, color: tab === k ? colors.plum : '#fff', ...W('bold') }}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </BigHeader>} contentStyle={{ paddingTop: 10, gap: 12 }}>
      {list.map(({ br, bag }) => {
        const st = bag ? pickupState(bag.pickupStart, bag.pickupEnd, bag.bagsLeft) : null;
        const sold = !bag || bag.bagsLeft <= 0;
        return (
          <Card key={br.id} onPress={() => (bag ? router.push(`/store/${bag.id}`) : router.push(`/shop/${br.id}`))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
            <Image source={photos[bag?.photo ?? 'cafe_pastries']} style={{ width: 64, height: 64, borderRadius: 14, opacity: sold ? 0.6 : 1 }} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{br.storeName}</Text>
              <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>{br.branchName} · ★ {br.rating}</Text>
              {sold ? (
                <>
                  <Text style={{ fontSize: 13, color: colors.muted, ...W('bold') }}>Sold out</Text>
                  <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>No bags today · usually drops at {br.dailyDropTime ?? '17:00'}</Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 13, color: colors.ruby, ...W('bold') }}>{st?.text || `Pickup today ${hhmm(bag!.pickupStart)}`}</Text>
                  <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}><Text style={{ color: colors.emerald, ...W('bold') }}>{bag!.bagsLeft} left</Text> · QAR {bag!.price} instead of {bag!.originalPrice}</Text>
                </>
              )}
            </View>
            <Pressable onPress={() => { api.setFavourite(br.id, false); toast('Removed from favourites'); }} hitSlop={13} accessibilityRole="button" accessibilityLabel="Remove from favourites">
              <Icon name="heart" size={22} color={colors.ruby} fill={colors.ruby} />
            </Pressable>
          </Card>
        );
      })}
      {!list.length ? (
        <View style={{ alignItems: 'center', paddingTop: 40, gap: 6 }}>
          <Icon name="heart" size={30} color={colors.rose} />
          <Text style={{ fontSize: 16, color: colors.plum, ...W('bold') }}>{rows.length ? 'No bags from your favourites right now' : 'No favourites yet'}</Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', ...W('regular') }}>Tap the heart on any shop or bag to keep it here.</Text>
        </View>
      ) : null}
    </Page>
  );
}
