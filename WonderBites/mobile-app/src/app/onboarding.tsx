// E02–E04 Onboarding: three swipeable pages with the live logo, product photos,
// a swing tag / value stickers / price tag, and the curved plum panel.
import React, { useRef, useState } from 'react';
import { atStart, atEnd } from '../i18n';
import { Pressable, ScrollView, type ScrollViewInstance, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Path } from 'react-native-svg';
import { KenBurns, PanelUp, Pop, Rise, Swing } from '../components/motion';
import { CurvedPanel } from '../components/CurvedPanel';
import { Mark, Lockup } from '../components/Logo';
import { Stamp } from '../components/PriceTag';
import { useBottomInset, useTopInset } from '../components/layout';
import { Icon, W } from '../components/ui';
import type { IconName } from '../components/icons';
import { photos } from '../lib/photos';
import { colors, fonts, shadow } from '../theme';
import { useLang } from '../i18n';

const PAGES = [
  { photo: photos.ob1_box, title: 'Your good finds\nare reserved.', body: 'Pick a surprise bag in the app and collect it nearby, at a time that suits you.' },
  { photo: photos.collect_qr, title: 'From local favorites,\npicked for you.', body: 'Discover handpicked finds from cafés, bakeries and shops we trust.' },
  { photo: photos.pinkbox, title: 'Too good to miss.', body: 'Sweet treats, fresh bites and hidden gems, with 50–70% savings today.' },
];

export default function Onboarding() {
  const { width: w, height: h } = useWindowDimensions();
  const top = useTopInset();
  const bottom = useBottomInset();
  const ref = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const first = useRef(true); // the first page's opening sequence runs once
  if (page !== 0) first.current = false;
  // Arabic: pages run right to left. The pager itself stays LTR (reliable paging on every
  // platform) with the pages in reverse order, starting from the right-most one.
  const ar = useLang() === 'ar';
  const xOf = (i: number) => (ar ? 2 - i : i) * w;
  const go = (i: number) => { if (i > 2) return router.replace('/welcome'); ref.current?.scrollTo({ x: xOf(i), animated: true }); setPage(i); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.plum }}>
      <StatusBar style="light" />
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ direction: 'ltr' }} contentOffset={{ x: xOf(0), y: 0 }} onLayout={() => ar && ref.current?.scrollTo({ x: xOf(page), animated: false })} onMomentumScrollEnd={(e) => { const v = Math.round(e.nativeEvent.contentOffset.x / w); setPage(ar ? 2 - v : v); }} scrollEventThrottle={16}>
        {(ar ? [...PAGES].reverse() : PAGES).map((p, vi) => { const i = ar ? 2 - vi : vi; return (
          <View key={i} style={{ width: w, height: h, direction: ar ? 'rtl' : 'ltr' }}>
            <KenBurns play={page === i} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h * 0.74 }}>
              <Image source={p.photo} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            </KenBurns>
            <LinearGradient colors={['rgba(51,22,49,0.95)', 'rgba(110,26,76,0.55)', 'rgba(51,22,49,0)']} locations={[0, 0.45, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 260 }} />
            <Rise delay={100} duration={700} style={{ position: 'absolute', top: top + 6, left: 0, right: 0, alignItems: 'center' }}>
              <Mark size={30} />
              <View style={{ marginTop: 4 }}><Lockup width={156} /></View>
            </Rise>
            {page === i && i === 0 ? <ReservedTag top={h * 0.25} /> : null}
            {page === i && i === 0 ? (
              <Rise delay={1100} duration={600} style={[st.pickup, atStart(20), { top: Math.min(h * 0.565, h - 300 - 56) }]}>
                <Icon name="clock" size={16} color={colors.ruby} />
                <Text style={{ fontSize: 14, color: colors.plum, ...W('semibold') }}>Pick up today <Text style={{ color: colors.ruby }}>18:00 – 20:00</Text></Text>
              </Rise>
            ) : null}
            {page === i && i === 2 ? <PriceTagLarge top={h * 0.25} /> : null}
            {/* banner pops up after the photo has been seen (first page, on open) */}
            <PanelUp play={i === 0 && first.current} delay={1300} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: i === 1 ? Math.max(h * 0.48, 420) : Math.max(h * 0.36, 300) }}>
            <CurvedPanel style={{ flex: 1 }}>
              <View key={page === i ? 'on' : 'off'} style={{ paddingHorizontal: 24, opacity: page === i || i === 0 ? 1 : 0 }}>
                <Rise delay={150} dy={i === 0 && first.current ? 0 : 14}><Text style={st.title}>{p.title}</Text></Rise>
                <Rise delay={280} dy={i === 0 && first.current ? 0 : 14}><Text style={st.body}>{p.body}</Text></Rise>
                {i === 1 && page === 1 ? (
                  <View style={st.values}>
                    {([['store', 'Local places worth discovering'], ['shield', 'Tasty picks, chosen with confidence'], ['pin', 'Easy choice, pickup close by']] as [IconName, string][]).map(([ic, l], k) => (
                      <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                        <Pop delay={400 + k * 180} from={1.4} mid={0.92}><View style={st.sticker}><View style={st.stickerIn}><Icon name={ic} size={22} color={colors.ruby} /></View></View></Pop>
                        <Rise delay={400}><Text style={st.vlab}>{l}</Text></Rise>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </CurvedPanel>
            </PanelUp>
          </View>
        ); })}
      </ScrollView>
      {page > 0 ? (
        <Pressable onPress={() => router.replace('/welcome')} style={[st.skip, atEnd(20), { top: top + 2 }]} accessibilityRole="button"><Text style={{ fontSize: 15, color: colors.plum, ...W('semibold') }}>Skip</Text></Pressable>
      ) : null}
      <View style={[st.foot, { bottom: bottom + 10 }]}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {[0, 1, 2].map((d) => (
            <View key={d} style={[st.dot, d === page && st.dotOn]} />
          ))}
        </View>
        <Pressable onPress={() => go(page + 1)} style={({ pressed }) => [st.next, pressed && { opacity: 0.9 }]} accessibilityRole="button">
          <Text style={{ color: '#fff', fontSize: 17, ...W('semibold') }}>{page === 2 ? 'Get started' : 'Next'}</Text>
          <Svg width={18} height={18} viewBox="0 0 24 24" style={ar ? { transform: [{ scaleX: -1 }] } : undefined}><Path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Pressable>
      </View>
    </View>
  );
}

function TagString({ h = 60 }: { h?: number }) {
  return (
    <Svg width={12} height={h} style={{ alignSelf: 'center' }}>
      <Circle cx={6} cy={5} r={4} fill="#fff" stroke={colors.plum} strokeWidth={1.5} />
      <Path d={`M6 9 V${h}`} stroke={colors.plum} strokeWidth={1.6} />
    </Svg>
  );
}

function ReservedTag({ top }: { top: number }) {
  const ar = useLang() === 'ar';
  return (
    <Swing delay={200} mirror={ar} style={{ position: 'absolute', ...atEnd(26), top, alignItems: 'center' }}>
      <TagString h={62} />
      <View style={st.rtag}>
        <Text style={{ fontSize: 13, color: colors.muted, ...W('medium') }}>Picked for</Text>
        <Text style={{ fontSize: 24, color: colors.plum, ...W('bold') }}>Sarah</Text>
        <Text style={{ fontSize: 13, color: colors.ruby, fontStyle: 'italic', ...W('semibold') }}>with love</Text>
      </View>
      <Stamp percent={70} size={58} delay={950} style={{ position: 'absolute', ...atStart(-32), top: 132 }} />
    </Swing>
  );
}

function PriceTagLarge({ top }: { top: number }) {
  const ar = useLang() === 'ar';
  return (
    <Swing delay={200} mirror={ar} style={{ position: 'absolute', ...atEnd(26), top, alignItems: 'center' }}>
      <TagString h={22} />
      <View style={[st.rtag, { paddingVertical: 10, paddingHorizontal: 16 }]}>
        <Text style={{ fontSize: 22, color: colors.ruby, ...W('extrabold') }}>QAR 15</Text>
        <Text style={{ fontSize: 13, color: colors.muted, textDecorationLine: 'line-through', ...W('semibold') }}>QAR 50</Text>
      </View>
      <Stamp percent={70} label="" size={58} delay={950} style={{ position: 'absolute', ...atStart(-36), top: 62 }} />
    </Swing>
  );
}

const st = StyleSheet.create({
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 37, color: '#fff' },
  body: { color: colors.pale, fontSize: 16, lineHeight: 24, marginTop: 14, ...W('regular') },
  values: { flexDirection: 'row', marginTop: 18, gap: 6 },
  sticker: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.float },
  stickerIn: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.2, borderStyle: 'dashed', borderColor: '#E6B8C0', alignItems: 'center', justifyContent: 'center' },
  vlab: { color: '#fff', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 18, ...W('medium') },
  pickup: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#fff', ...shadow.float },
  skip: { position: 'absolute', height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  foot: { position: 'absolute', left: 22, right: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotOn: { width: 30, height: 10, borderRadius: 5, backgroundColor: colors.ruby, borderWidth: 2, borderColor: '#fff' },
  next: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 56, paddingHorizontal: 40, borderRadius: 28, backgroundColor: colors.ruby, ...shadow.button },
  rtag: { backgroundColor: '#fff', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 22, alignItems: 'center', borderWidth: 1.2, borderStyle: 'dashed', borderColor: '#D8BFCB', marginTop: -2, ...shadow.float },
});
