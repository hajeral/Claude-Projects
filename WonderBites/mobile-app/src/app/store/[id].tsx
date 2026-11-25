// E12 / E12b Store — one bag from one branch. Everything shown comes from the Bag + Branch records.
import React, { useEffect, useState } from 'react';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Halo } from '../../components/Halo';
import { shareText } from '../../lib/actions';
import { setStore, useStore } from '../../state/store';
import { NotFound } from '../../components/NotFound';
import { toast } from '../../components/Toast';
import { atStart, atEnd } from '../../i18n';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Path } from 'react-native-svg';
import { SwingTag } from '../../components/PriceTag';
import { back, useBottomInset, useTopInset } from '../../components/layout';
import { Card, Icon, IconBtn, MerchantLogo, Pill, Toggle, W } from '../../components/ui';
import { api, sync, useApi, useTick } from '../../api/client';
import { dayLabel, leftLabel, pickupState, windowText } from '../../lib/format';
import { photos } from '../../lib/photos';
import { colors, fonts, shadow } from '../../theme';

export default function StoreRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useStore((s) => s.stock);
  return sync.findBag(id) ? <Store /> : <NotFound kind="bag" />;
}

function Store() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bag = sync.bag(id);
  const br = sync.branch(bag.branchId);
  const { data: reviews } = useApi(() => api.reviews(br.id), [br.id]);
  const top = useTopInset();
  const bottom = useBottomInset();
  const [qty, setQty] = useState(1);
  const fav = useStore((s) => s.favBranches.includes(bag.branchId));
  const setFav = (on: boolean) => { api.setFavourite(bag.branchId, on); toast(on ? 'Saved to favourites' : 'Removed from favourites'); };
  const notify = useStore((s) => s.notifyBags.includes(bag.id));
  const setNotify = (on: boolean) => { setStore((s) => ({ ...s, notifyBags: on ? [...s.notifyBags, bag.id] : s.notifyBags.filter((x) => x !== bag.id) })); toast(on ? 'We’ll remind you when new bags drop' : 'Reminder off'); };
  useTick(30000);
  const st = pickupState(bag.pickupStart, bag.pickupEnd, bag.bagsLeft);
  // Store header (design E12 hero motion): on open the photo stretches from its top edge
  // (scale 1.12) and springs back; scrolling collapses the 300 px band into a slim plum Halo
  // bar while the photo slides up and fades and the shop name fades into the bar.
  // Pulling down stretches the photo from the top edge.
  const y = useSharedValue(0);
  const pull = useSharedValue(0);
  useEffect(() => { pull.value = withDelay(900, withSequence(withTiming(0.12, { duration: 700, easing: Easing.bezier(0.65, 0, 0.35, 1) }), withSpring(0, { damping: 9, stiffness: 90 }))); }, [pull]);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const BAR = top + 60;
  const COL = 300 - BAR;
  const photoS = useAnimatedStyle(() => {
    const yy = y.value;
    return {
      opacity: interpolate(yy, [0, COL], [1, 0.15], Extrapolation.CLAMP),
      transform: [
        { translateY: yy < 0 ? yy : yy * 0.45 },
        { scale: (yy < 0 ? 1 - yy / 300 : 1) + pull.value },
      ],
    };
  });
  const logoS = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, COL * 0.6], [1, 0], Extrapolation.CLAMP) }));
  const barS = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [COL - 60, COL - 10], [0, 1], Extrapolation.CLAMP) }));
  const barTitle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [COL - 20, COL + 30], [0, 1], Extrapolation.CLAMP), transform: [{ translateY: interpolate(y.value, [COL - 20, COL + 30], [10, 0], Extrapolation.CLAMP) }] }));
  const away = br.walkMinutes ? `${br.walkMinutes} min walk` : br.driveMinutes ? `${br.driveMinutes} min drive` : '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <StatusBar style="light" />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 300, zIndex: -1 }}>
          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: 'top' } as object, photoS]}>
            <Image source={photos[bag.photo]} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
          <Svg width="100%" height={40} viewBox="0 0 390 40" preserveAspectRatio="none" style={{ position: 'absolute', bottom: -1 }}>
            <Path d="M0 0 Q195 60 390 0 V40 H0Z" fill={colors.cream} />
          </Svg>
          <Animated.View style={[{ position: 'absolute', ...atStart(18), bottom: 20 }, logoS]}>
            <Pressable onPress={() => router.push(`/shop/${br.id}`)} accessibilityLabel="Shop profile">
              <View style={s.logoRing}><MerchantLogo initials={br.initials} size={50} /></View>
            </Pressable>
          </Animated.View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, minHeight: 168, backgroundColor: colors.cream }}>
          <SwingTag price={bag.price} was={bag.originalPrice} percent={bag.discountPercent} delay={500} rest={-5} scale={1} style={{ position: 'absolute', ...atEnd(20), top: 8 }} soldOut={bag.bagsLeft === 0} />
          <Text style={s.h1}>{br.storeName} <View style={{ width: 20, height: 20, transform: [{ translateY: 2 }] }}><Svg width={20} height={20} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={10} fill={colors.plum} /><Path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg></View></Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2, ...W('semibold') }}>{br.branchName}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10, maxWidth: 240 }}>
            <Pill label={bag.title} tone="pink" icon="bag" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="star" size={14} color={colors.emerald} fill={colors.emerald} stroke={2} />
              <Text style={{ color: colors.emerald, fontSize: 14, ...W('bold') }}>{br.rating}</Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 13, ...W('regular') }}>({br.reviewCount >= 1000 ? `${(br.reviewCount / 1000).toFixed(1)}k` : br.reviewCount})</Text>
            <Pill label={leftLabel(bag.bagsLeft)} tone={bag.bagsLeft ? 'green' : 'grey'} />
            {br.delivery ? <Pill label={`Delivery · QAR ${br.delivery.fee}`} tone="pink" icon="home" /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <Icon name="clock" size={18} color={colors.ruby} />
            <Text style={{ color: colors.ruby, fontSize: 15, ...W('semibold') }}>Pickup {dayLabel(bag.pickupStart).toLowerCase()} {windowText(bag.pickupStart, bag.pickupEnd)}</Text>
          </View>
          {st.text ? <Text style={{ fontSize: 13, color: st.kind === 'now' ? colors.emerald : colors.plum, marginTop: 4, ...W('bold') }}>{st.text}</Text> : null}
        </View>

        <View style={{ paddingHorizontal: 20, gap: 12, paddingTop: 14, backgroundColor: colors.cream }}>
          <Card onPress={() => router.push(`/shop/${br.id}`)} style={s.rowCard}>
            <View style={s.ib}><Icon name="pin" size={20} color={colors.ruby} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{br.branchName} · {br.distanceKm} km</Text>
              <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }} numberOfLines={1}>{br.address}{away ? ` · ${away} ·` : ''}</Text>
              <Text style={{ fontSize: 13, color: colors.ruby, ...W('bold') }}>Directions</Text>
            </View>
            <Icon name="chev" size={18} color={colors.muted} />
          </Card>
          <Card style={s.rowCard}>
            <View style={s.ib}><Icon name="bell" size={20} color={colors.ruby} /></View>
            <Text style={{ flex: 1, fontSize: 15, color: colors.plum, ...W('bold') }}>Tell me when new bags arrive</Text>
            <Toggle on={notify} onChange={setNotify} />
          </Card>
          <Card style={{ padding: 16 }}>
            <Text style={s.h2}>About this bag</Text>
            <Text style={s.body}>{bag.description}</Text>
            <View style={s.surprise}>
              <Text style={{ color: colors.rubyDark, fontSize: 14, ...W('semibold') }}>Tasty surprises inside</Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4, ...W('regular') }}>Each bag changes from day to day with what the shop has available, so every one is a new find.</Text>
            </View>
          </Card>
          <Card style={{ padding: 16 }}>
            <Text style={s.h2}>Pickup instructions</Text>
            <Text style={s.body}>Collect your bag in the pickup window. Show your QR code or tell the staff your 4-digit PIN.</Text>
          </Card>
          <Card style={{ padding: 16 }}>
            <Text style={s.h2}>Allergens</Text>
            <Text style={s.body}>{bag.allergens}</Text>
          </Card>
          <Card style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={s.h2}>Reviews</Text>
              <Text style={{ color: colors.emerald, fontSize: 14, ...W('bold') }}>★ {br.rating} · {(br.reviewCount / 1000).toFixed(1)}k reviews</Text>
            </View>
            {reviews?.map((r) => (
              <View key={r.who} style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 15, lineHeight: 22, color: colors.plum, ...W('medium') }}>{r.text}</Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2, ...W('regular') }}>{r.who}</Text>
              </View>
            ))}
          </Card>
        </View>
      </Animated.ScrollView>

      {/* collapsed plum bar with the shop name */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0 }, barS]}>
        <Halo curve={22} enter={false} style={{ height: BAR + 22 }}>
          <Animated.View style={[{ paddingTop: top + 16, paddingHorizontal: 116, alignItems: 'center' }, barTitle]}>
            <Text style={{ color: '#fff', fontSize: 17, ...W('bold') }} numberOfLines={1}>{br.storeName}</Text>
          </Animated.View>
        </Halo>
      </Animated.View>
      <View style={[s.topBar, { top: top + 6 }]}>
        <IconBtn name="back" onPress={back} label="Back" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconBtn name="heart" onPress={() => setFav(!fav)} color={fav ? colors.ruby : colors.plum} filled={fav} label="Favourite" />
          <IconBtn name="share" label="Share" onPress={() => shareText(`${br.storeName} · ${bag.title} · ${bag.discountPercent}% off on WonderBites`)} />
        </View>
      </View>

      <View style={[s.bar, { paddingBottom: bottom + 8 }]}>
        <View style={s.stepper}>
          <Pressable onPress={() => setQty(Math.max(1, qty - 1))} hitSlop={14} accessibilityLabel="Fewer"><Icon name="minus" size={20} color={colors.ruby} /></Pressable>
          <Text style={{ fontSize: 17, color: colors.plum, ...W('bold') }}>{qty}</Text>
          <Pressable onPress={() => setQty(Math.min(bag.bagsLeft, qty + 1))} hitSlop={14} accessibilityLabel="More"><Icon name="plus" size={20} color={colors.ruby} /></Pressable>
        </View>
        <Pressable disabled={!bag.bagsLeft} onPress={() => router.push({ pathname: '/checkout/[bagId]', params: { bagId: bag.id, qty: String(qty) } })} style={({ pressed }) => [s.reserve, !bag.bagsLeft && { backgroundColor: colors.muted2 }, pressed && { opacity: 0.92 }]}>
          <Text style={{ color: '#fff', fontSize: 17, ...W('semibold') }}>{bag.bagsLeft ? `Reserve · QAR ${bag.price * qty}` : 'Sold out'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  topBar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  logoRing: { padding: 4, borderRadius: 40, backgroundColor: colors.cream, ...shadow.float },
  h1: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 37, color: colors.plum, maxWidth: 236 },
  h2: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 27, color: colors.plum },
  body: { fontSize: 16, lineHeight: 25, color: colors.muted, marginTop: 6, ...W('regular') },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  ib: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center' },
  surprise: { marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: colors.rubySoft },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 14, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, ...shadow.card, shadowOffset: { width: 0, height: -6 } },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 114, height: 56, paddingHorizontal: 16, borderRadius: 28, borderWidth: 1.5, borderColor: '#E6B8C0' },
  reserve: { flex: 1, height: 56, borderRadius: 28, backgroundColor: colors.ruby, alignItems: 'center', justifyContent: 'center', ...shadow.button },
});
