import React, { useEffect, useRef, useState } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { atStart, atEnd } from '../i18n';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { Bag, Branch } from '../api/types';
import { dayWindow, leftLabel, pickupState } from '../lib/format';
import { photos } from '../lib/photos';
import { colors, shadow } from '../theme';
import { SwingTag } from './PriceTag';
import { EASE_POP, EASE_RISE, PulseHalo } from './motion';
import { useStore } from '../state/store';
import { api } from '../api/client';
import { toast } from './Toast';
import { Icon, Pill, W } from './ui';

export function statusColor(kind: string, urgent?: boolean) {
  if (kind === 'now') return urgent ? colors.ruby : colors.emerald;
  if (kind === 'soldout' || kind === 'ended') return colors.muted;
  return colors.plum;
}

/** Home / list card for one surprise bag. All values come from the Bag + Branch records. */
export function BagCard({ bag, branch, onPress, delay = 0, width = 264 }: { bag: Bag; branch: Branch; onPress?: () => void; delay?: number; width?: number }) {
  const fav = useStore((s) => s.favBranches.includes(bag.branchId));
  const setFav = (on: boolean) => { api.setFavourite(bag.branchId, on); toast(on ? 'Saved to favourites' : 'Removed from favourites'); };
  const st = pickupState(bag.pickupStart, bag.pickupEnd, bag.bagsLeft);
  const sold = st.kind === 'soldout';
  return (
    <View style={width < 0 ? { alignSelf: 'stretch' } : { width }}>
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.99 }] }]} accessibilityRole="button" accessibilityLabel={`${branch.storeName}, ${bag.title}`}>
      <View style={s.photoWrap}>
        <Image source={photos[bag.photo]} style={[StyleSheet.absoluteFill, sold && { opacity: 0.55 }]} contentFit="cover" />
        {sold ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(120,110,118,0.35)' }]} /> : null}
        <LinearGradient colors={['rgba(51,22,49,0)', 'rgba(51,22,49,0.35)']} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', ...atStart(12), top: 12 }}>
          {bag.bagsLeft === 1 ? <PulseHalo /> : null}
          <Pill label={leftLabel(bag.bagsLeft)} tone={sold ? 'grey' : 'green'} solid />
        </View>
        {sold ? <View style={[s.soldSt, atEnd(14)]}><Text maxFontSizeMultiplier={1.15} style={s.soldTx}>Sold out</Text></View> : null}
      </View>
      {sold ? null : (
        <SwingTag price={bag.price} was={bag.originalPrice} percent={bag.discountPercent} delay={delay} style={{ position: 'absolute', ...atEnd(6), top: -14 }} />
      )}
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 }}>
        <View style={s.rowB}>
          <Text maxFontSizeMultiplier={1.15} style={[s.name, sold && { color: colors.muted }]} numberOfLines={1}>{branch.storeName}</Text>
          <View style={s.rate}><Icon name="star" size={13} color={colors.emerald} fill={colors.emerald} stroke={2} /><Text maxFontSizeMultiplier={1.15} style={s.rateTx}>{branch.rating}</Text></View>
        </View>
        <View style={[s.row, { marginTop: 6 }]}>
          <Icon name="clock" size={16} color={sold ? colors.muted : colors.ruby} />
          <Text maxFontSizeMultiplier={1.15} style={[s.when, sold && { color: colors.muted }]}>{dayWindow(bag.pickupStart, bag.pickupEnd)}</Text>
        </View>
        {st.text ? <Text maxFontSizeMultiplier={1.15} style={[s.status, { color: statusColor(st.kind, st.kind === 'now' && st.urgent) }]}>{st.text}</Text> : <View style={{ height: 4 }} />}
        <View style={[s.rowB, { marginTop: 10 }]}>
          <View style={s.row}>
            <Icon name="bag" size={14} color={colors.muted} />
            <Text maxFontSizeMultiplier={1.15} style={s.meta} numberOfLines={1}>{bag.title} · {branch.area} · {branch.distanceKm} km</Text>
          </View>
          <View style={{ width: 20, height: 20 }} />
        </View>
      </View>
    </Pressable>
      {/* the favourite heart is its own button, laid over the card's bottom corner */}
      <Pressable onPress={() => setFav(!fav)} hitSlop={14} accessibilityRole="button" accessibilityState={{ selected: fav }} accessibilityLabel="Favourite" style={[{ position: 'absolute', bottom: 15 }, atEnd(14)]}>
        <HeartPop on={fav} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 20, ...shadow.card },
  photoWrap: { height: 140, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', backgroundColor: colors.line },
  soldSt: { position: 'absolute', top: 16, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C9A6B8', transform: [{ rotate: '-6deg' }] },
  soldTx: { color: colors.muted, fontSize: 14, ...W('extrabold') },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  rowB: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 15, color: colors.plum, ...W('semibold') },
  rate: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rateTx: { color: colors.emerald, fontSize: 14, ...W('bold') },
  when: { color: colors.ruby, fontSize: 14, ...W('semibold') },
  status: { fontSize: 13, marginTop: 4, ...W('bold') },
  meta: { color: colors.muted, fontSize: 13, ...W('regular'), flexShrink: 1 },
});

/** The favourite heart: a small pop (1 → 1.28 → 1, about 250ms) when it is saved; removing stays instant. */
function HeartPop({ on }: { on: boolean }) {
  const k = useSharedValue(1);
  const was = useRef(on);
  useEffect(() => {
    if (on && !was.current) k.value = withSequence(withTiming(1.28, { duration: 110, easing: EASE_RISE }), withTiming(1, { duration: 160, easing: EASE_POP }));
    was.current = on;
  }, [on, k]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  return <Animated.View style={a}><Icon name="heart" size={20} color={on ? colors.ruby : colors.muted} fill={on ? colors.ruby : 'none'} /></Animated.View>;
}
