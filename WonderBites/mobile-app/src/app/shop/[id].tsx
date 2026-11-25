// M10 Shop profile
import React, { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import { back, useBottomInset, useTopInset } from '../../components/layout';
import { StreetMap } from '../../components/StreetMap';
import { Button, Card, Group, Icon, IconBtn, ListRow, MerchantLogo, Pill, Stars, W } from '../../components/ui';
import { api, sync, useApi } from '../../api/client';
import { NotFound } from '../../components/NotFound';
import { useStore } from '../../state/store';
import { toast } from '../../components/Toast';
import { callShop, openDirections } from '../../lib/actions';
import { photos } from '../../lib/photos';
import { colors, fonts } from '../../theme';

export default function ShopRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return sync.findBranch(id) ? <ShopProfile /> : <NotFound kind="shop" />;
}

function ShopProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const br = sync.branch(id);
  const today = sync.bags().find((b) => b.branchId === br.id);
  const { data: reviews } = useApi(() => api.reviews(br.id), [br.id]);
  const top = useTopInset();
  const bottom = useBottomInset();
  const { width } = useWindowDimensions();
  const fav = useStore((s) => s.favBranches.includes(br.id));
  const setFav = (on: boolean) => { api.setFavourite(br.id, on); toast(on ? 'Saved to favourites' : 'Removed from favourites'); };
  const r = br.ratings;
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 240 }}>
          <Image source={photos[today?.photo ?? 'store_shelves']} style={StyleSheet.absoluteFill} contentFit="cover" />
          <Svg width="100%" height={40} viewBox="0 0 390 40" preserveAspectRatio="none" style={{ position: 'absolute', bottom: -1 }}><Path d="M0 0 Q195 60 390 0 V40 H0Z" fill={colors.cream} /></Svg>
          <View style={{ position: 'absolute', top: top + 6, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
            <IconBtn name="back" onPress={back} label="Back" />
            <IconBtn name="heart" onPress={() => setFav(!fav)} color={colors.ruby} filled={fav} label="Favourite" />
          </View>
        </View>
        <View style={{ paddingHorizontal: 20, gap: 12, marginTop: -28 }}>
          <Card style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <MerchantLogo initials={br.initials} size={58} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 24, lineHeight: 28, color: colors.plum }}>{br.storeName}</Text>
                <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>{br.shopType} · {br.branchName} · {br.distanceKm} km</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <Pill label={`★ ${br.rating} · ${(br.reviewCount / 1000).toFixed(1)}k reviews`} tone="green" />
              {br.dailyDropTime ? <Pill label={`Bags daily at ${br.dailyDropTime}`} tone="pink" /> : null}
              {br.delivery ? <Pill label={`Delivery · QAR ${br.delivery.fee}`} tone="pink" icon="home" /> : null}
              <Pill label={`${br.mealsRescued} meals enjoyed`} tone="green" />
            </View>
          </Card>
          <Card style={{ overflow: 'hidden' }}>
            <View style={{ padding: 16, paddingBottom: 6 }}>
              <Text style={{ fontSize: 16, color: colors.plum, ...W('bold') }}>About</Text>
              <Text style={{ fontSize: 15, lineHeight: 22, color: colors.plum, marginTop: 4, ...W('regular') }}>{br.about}</Text>
            </View>
            <Group style={{ borderWidth: 0, borderRadius: 0, shadowOpacity: 0, elevation: 0 }}>
              <ListRow icon="phone" title={br.phone} sub="Call the shop" onPress={() => callShop(br.phone)} />
              <ListRow icon="clock" title={`Open today ${br.openingHours}`} sub="Pickup windows vary by bag" chevron={false} />
            </Group>
          </Card>
          <Card style={{ overflow: 'hidden' }}>
            <StreetMap width={width - 42} height={140} labels={false} bayX={0.68}>
              <View style={{ position: 'absolute', left: (width - 42) * 0.35 - 22, top: 48, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(217,23,92,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.ruby }} />
              </View>
            </StreetMap>
            <ListRow icon="pin" title={`${br.address}, Doha`} sub={`${br.branchName}${br.walkMinutes ? ` · ${br.walkMinutes} min walk` : ''}`} chevron={false} onPress={() => openDirections(br.lat, br.lng, br.storeName)} end={<Text style={{ fontSize: 14, color: colors.ruby, ...W('bold') }}>Directions</Text>} />
          </Card>
          <Card style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, color: colors.plum, ...W('bold') }}>Reviews</Text>
              <Text style={{ fontSize: 14, color: colors.ruby, ...W('bold') }}>See all {(br.reviewCount / 1000).toFixed(1)}k</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, alignItems: 'center' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 40, color: colors.plum }}>{br.rating}</Text>
                <Stars value={br.rating} size={13} color={colors.ruby} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                {r ? (Object.entries(r) as [string, number][]).map(([k, v]) => (
                  <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ width: 70, fontSize: 13, color: colors.muted, textTransform: 'capitalize', ...W('regular') }}>{k}</Text>
                    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line }}><View style={{ width: `${(v / 5) * 100}%`, height: 6, borderRadius: 3, backgroundColor: colors.ruby }} /></View>
                    <Text style={{ fontSize: 13, color: colors.plum, ...W('bold') }}>{v}</Text>
                  </View>
                )) : null}
              </View>
            </View>
            {reviews?.slice(0, 1).map((x) => (
              <View key={x.who} style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 15, lineHeight: 22, color: colors.plum, ...W('medium') }}>{x.text}</Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2, ...W('regular') }}>{x.who}</Text>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
      {today ? (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: bottom + 8 }}>
          <Button title={`See today’s bag · QAR ${today.price}`} onPress={() => router.push(`/store/${today.id}`)} />
        </View>
      ) : null}
    </View>
  );
}
