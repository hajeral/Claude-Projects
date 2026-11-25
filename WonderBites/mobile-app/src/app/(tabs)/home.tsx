// E10 Home — Halo header that collapses as you scroll; rails of bag cards whose
// price swing-tags drop in on their strings and stamps thump in.
import { bellMessage, markBellSeen, offerRank, valueLabel, voucherNews } from '../../lib/voucherAlerts';
import { toast } from '../../components/Toast';
import React, { useEffect, useState } from 'react';
import { atStart, atEnd } from '../../i18n';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, Extrapolation, interpolate, withDelay, withTiming, useAnimatedScrollHandler, useAnimatedStyle, useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { BagCard } from '../../components/BagCard';
import { Halo } from '../../components/Halo';
import { useTopInset } from '../../components/layout';
import { Button, Chip, Icon, IconBtn, Toggle, W } from '../../components/ui';
import type { IconName } from '../../components/icons';
import { sync, useApi, useTick, api } from '../../api/client';
import type { Bag, Category, ShopType } from '../../api/types';
import { dayDiff } from '../../lib/format';
import { colors, fonts } from '../../theme';
import { useLang } from '../../i18n';
import { setStore, useStore } from '../../state/store';

// Home quick filters: categories, "Tomorrow" (bags planned for tomorrow) and shop types.
type HomeCat = Category | 'Tomorrow' | 'Delivery' | ShopType;
const CATS: [HomeCat, IconName][] = [['All', 'grid'], ['Tomorrow', 'clock'], ['Delivery', 'home'], ['Pastries', 'pastry'], ['Groceries', 'basketI'], ['Meals', 'bowlI'],
  ['Restaurant', 'bowlI'], ['Bakery', 'pastry'], ['Patisserie', 'sparkle'], ['Café', 'store'], ['Hotel buffet', 'star'], ['Supermarket', 'basketI'], ['Healthy & salads', 'leaf'], ['Donuts', 'sparkle']];
const CATEGORY_KEYS: string[] = ['All', 'Pastries', 'Groceries', 'Meals'];
const SHOP_KEYS: string[] = ['Restaurant', 'Bakery', 'Patisserie', 'Café', 'Hotel buffet', 'Supermarket', 'Healthy & salads', 'Donuts'];
const fitsCat = (b: Bag, c: HomeCat) => {
  if (c === 'All') return true;
  if (c === 'Tomorrow') return dayDiff(b.pickupStart) === 1;
  if (c === 'Delivery') return !!sync.findBranch(b.branchId)?.delivery;
  if (CATEGORY_KEYS.includes(c)) return b.category === c;
  return sync.findBranch(b.branchId)?.shopType === c;
};
const COLLAPSE = 180;

export default function Home() {
  // Bell: a dot when there's a new or soon-expiring voucher; tapping shows the message and opens Vouchers
  const seenV = useStore((x) => x.seenVouchers); const bellSeen = useStore((x) => x.bellSeen);
  const added = useStore((x) => x.addedVouchers); const usedV = useStore((x) => x.usedVouchers);
  const vlist = React.useMemo(() => sync.vouchers(), [added, usedV]); // eslint-disable-line react-hooks/exhaustive-deps
  const news = voucherNews(vlist, seenV, bellSeen);
  const onBell = () => {
    if (!news.bell.length) { router.push('/notifications'); return; }
    const v = [...news.bell].sort((a, b) => offerRank(a) - offerRank(b))[0];
    toast(bellMessage(v, valueLabel(v)), 'info');
    markBellSeen(news.bell);
    router.push('/vouchers');
  };
  const top = useTopInset();
  const H = 244 + top;
  const [cat, setCat] = useState<HomeCat>('All');
  const area = useStore((x) => x.location.area);
  const [veg, setVeg] = useState(false);
  const lang = useLang();
  const { data: rails } = useApi(() => api.homeRails());
  const { data: me } = useApi(() => api.me());
  useTick(30000);
  const y = useSharedValue(0);
  // On open the header starts slim and stretches down to full height, then follows the scroll.
  const intro = useSharedValue(1);
  useEffect(() => { intro.value = withDelay(150, withTiming(0, { duration: 900, easing: Easing.bezier(0.65, 0, 0.35, 1) })); }, [intro]);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  // One derived value that every header style reads directly (styles must read shared values
  // themselves, not through a helper function, or they don't update).
  const prog = useDerivedValue(() => Math.max(intro.value, interpolate(y.value, [0, COLLAPSE], [0, 1], Extrapolation.CLAMP)));
  const band = useAnimatedStyle(() => ({ transform: [{ translateY: -COLLAPSE * prog.value }] }));
  const keep = useAnimatedStyle(() => ({ transform: [{ translateY: COLLAPSE * prog.value }] }));
  const loc = useAnimatedStyle(() => ({ opacity: interpolate(prog.value, [0, 0.6], [1, 0], Extrapolation.CLAMP), transform: [{ translateY: -12 * prog.value }] }));
  const hi = useAnimatedStyle(() => ({ transform: [{ translateY: COLLAPSE * prog.value - 46 * prog.value }, { translateX: -0 }, { scale: 1 - 0.45 * prog.value }] }));
  const fade = useAnimatedStyle(() => ({ opacity: interpolate(prog.value, [0, 0.5], [1, 0], Extrapolation.CLAMP) }));
  const sbtn = useAnimatedStyle(() => ({ opacity: interpolate(prog.value, [0.5, 1], [0, 1], Extrapolation.CLAMP), transform: [{ translateY: COLLAPSE * prog.value }, { scale: 0.6 + 0.4 * prog.value }] }));

  useStore((x) => x.stock);
  // The same choice is saved to the filters, so "See all" and the map show the same bags.
  const pickCat = (c: HomeCat) => { setCat(c); setStore((x) => ({ ...x, filters: { ...x.filters, category: CATEGORY_KEYS.includes(c) ? c : 'All', shopTypes: SHOP_KEYS.includes(c) ? [c as ShopType] : [], delivery: c === 'Delivery', day: c === 'Tomorrow' ? 'tomorrow' : x.filters.day === 'tomorrow' ? 'any' : x.filters.day } })); };
  const filter = (ids: string[]) => ids.map((id) => sync.findBag(id)).filter((b): b is NonNullable<typeof b> => !!b).filter((b) => fitsCat(b, cat) && (!veg || b.dietary.includes('Vegetarian')));

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <StatusBar style="light" />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: H + 14, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 8 }}>
          {CATS.map(([c, ic]) => <Chip key={c} label={c} icon={ic} on={cat === c} onPress={() => pickCat(c)} />)}
        </ScrollView>
        {rails && !rails.some((r) => filter(r.bagIds).length) ? (
          <View style={{ alignItems: 'center', paddingTop: 30, paddingHorizontal: 30, gap: 8 }}>
            <Text style={{ fontSize: 17, color: colors.plum, textAlign: 'center', ...W('bold') }}>{cat === 'Tomorrow' ? 'No bags planned for tomorrow yet' : cat === 'Delivery' ? 'No delivery bags near you right now' : `No ${cat === 'All' ? '' : `${cat} `}bags near you right now`}</Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', ...W('regular') }}>New picks arrive every afternoon. Try another category or check back soon.</Text>
            <Button title="Discover all bags" kind="secondary" onPress={() => pickCat('All')} style={{ alignSelf: 'stretch', marginTop: 6 }} />
          </View>
        ) : null}
        {rails?.map((r, ri) => {
          const items = filter(r.bagIds);
          if (!items.length) return null;
          return (
            <View key={r.title} style={{ marginTop: 8 }}>
              <View style={st.railHead}>
                <Text style={st.railTitle}>{r.title}</Text>
                <Pressable onPress={() => router.push({ pathname: '/results', params: { rail: String(ri) } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 }}>
                  <Text style={{ color: colors.ruby, fontSize: 14, ...W('semibold') }}>See all</Text>
                  <Icon name="chev" size={16} color={colors.ruby} />
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 }}>
                {items.map((b, i) => (
                  <BagCard key={b.id} bag={b} branch={sync.branch(b.branchId)} delay={300 + ri * 250 + i * 120} onPress={() => router.push(`/store/${b.id}`)} />
                ))}
              </ScrollView>
            </View>
          );
        })}
      </Animated.ScrollView>

      {/* Collapsing Halo header */}
      <Animated.View style={[st.header, { height: H }, band]} pointerEvents="box-none">
        <Halo style={{ height: H }} curve={36} enter={false}>
          <Animated.View style={[{ paddingTop: top + 10, paddingHorizontal: 20 }, keep]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Animated.View style={loc}>
                <Pressable onPress={() => router.push('/select-location')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={st.pin}><Icon name="pin" size={20} color="#fff" /></View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 15, ...W('bold') }}>My location</Text>
                      <Icon name="down" size={14} color="#fff" />
                    </View>
                    <Text style={{ color: colors.pale, fontSize: 13, ...W('regular') }}>{`${area}, Doha`}</Text>
                  </View>
                </Pressable>
              </Animated.View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Animated.View style={sbtn}><IconBtn name="search" variant="glass" onPress={() => router.push('/search-text')} label="Search" /></Animated.View>
                <View>
                  <IconBtn name="bell" variant="glass" onPress={onBell} label="Alerts" />
                  {news.bell.length ? <View style={[st.bellDot, atEnd(9)]} /> : null}
                </View>
              </View>
            </View>
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', ...atStart(20), top: top + 64, transformOrigin: lang === 'ar' ? 'right top' : 'left top' } as object, hi]}>
            <Text maxFontSizeMultiplier={1.1} style={st.hello}>{me?.firstName ? `Hello ${me.firstName}!` : 'Hello!'}</Text>
          </Animated.View>
          <Animated.View style={[{ position: 'absolute', left: 20, right: 20, top: top + 118 }, fade]}>
            <Text maxFontSizeMultiplier={1.1} style={{ color: colors.pale, fontSize: 16, ...W('regular') }}>Tasty finds worth discovering, close to you.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Pressable onPress={() => router.push('/search-text')} style={[st.hfield, { flex: 1 }]}>
                <Icon name="search" size={18} color="#fff" />
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, ...W('regular') }}>Discover shops</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/refine')} style={[st.hfield, { width: 52, justifyContent: 'center', paddingHorizontal: 0 }]} accessibilityLabel="Filters">
                <Icon name="filter" size={20} color="#fff" />
              </Pressable>
              <View style={[st.hfield, { gap: 10 }]}>
                <Text style={{ color: '#fff', fontSize: 15, ...W('semibold') }}>Veg</Text>
                <Toggle on={veg} onChange={setVeg} onColor={colors.emerald} />
              </View>
            </View>
          </Animated.View>
        </Halo>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  header: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 10 },
  pin: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ruby, alignItems: 'center', justifyContent: 'center', shadowColor: colors.ruby, shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  bellDot: { position: 'absolute', top: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.ruby, borderWidth: 1.5, borderColor: '#fff' },
  hello: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 46, color: '#fff', textShadowColor: 'rgba(217,23,92,0.45)', textShadowRadius: 24 },
  hfield: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  railHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  railTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 27, color: colors.plum },
});
