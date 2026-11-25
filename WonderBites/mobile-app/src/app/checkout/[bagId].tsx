// E13 Checkout
import { offerLine, offerRank, valueLabel } from '../../lib/voucherAlerts';
import React, { useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { WALLET } from '../../lib/platform';
import { Text } from '../../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Page, SubHeader } from '../../components/layout';
import { Card, Hair, Icon, IconBtn, MerchantLogo, OptChip, Pill, Radio, Segmented, W } from '../../components/ui';
import { api, sync, useTick } from '../../api/client';
import { dayLabel, pickupState, qar, windowText } from '../../lib/format';
import { photos } from '../../lib/photos';
import { colors, fonts } from '../../theme';
import { AutoHeight, GlowFlash, Rise } from '../../components/motion';
import { callShop, copyText } from '../../lib/actions';

import { checkVoucher, quote, SERVICE_FEE } from '../../lib/pricing';
import { pay as payOrder } from '../../api/payments';
import { placeLabel, setStore, useStore } from '../../state/store';
import type { Fulfilment } from '../../api/types';
import { NotFound } from '../../components/NotFound';
import { toast } from '../../components/Toast';
import { LIVE } from '../../config';
type Pay = 'Apple Pay' | 'Google Pay' | 'Card';

export default function CheckoutRoute() {
  const { bagId } = useLocalSearchParams<{ bagId: string }>();
  useStore((s) => s.stock); // re-check availability when stock changes
  return sync.findBag(bagId) ? <Checkout /> : <NotFound kind="bag" />;
}

function Checkout() {
  const { bagId, qty: q } = useLocalSearchParams<{ bagId: string; qty?: string }>();
  const bag = sync.bag(bagId);
  const br = sync.branch(bag.branchId);
  const qty = Math.min(Math.max(1, Math.floor(Number(q ?? 1)) || 1), Math.max(1, bag.bagsLeft));
  const [pay, setPay] = useState<Pay>(WALLET);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false); // blocks a second tap while the first payment runs
  useTick(30000);
  const st = pickupState(bag.pickupStart, bag.pickupEnd, bag.bagsLeft);
  const applied = useStore((s) => s.appliedVoucher);
  const used = useStore((s) => s.usedVouchers);
  // Pickup, or delivery by the shop during the same window (only shops that deliver)
  const [how, setHow] = useState<Fulfilment>('pickup');
  const dl = how === 'delivery' && !!br.delivery;
  const fee = dl ? br.delivery!.fee : 0;
  const places = useStore((x) => x.places);
  const [placeId, setPlaceId] = useState<string | undefined>(places[0]?.id);
  const place = places.find((x) => x.id === placeId) ?? places[0];
  const voucher = applied ? sync.findVoucher(applied) : undefined;
  const vc = voucher ? checkVoucher(voucher, bag.price * qty, br, used, dl ? 'delivery' : 'pickup', fee) : undefined;
  const p = quote(bag.price, qty, vc?.ok ? vc.discount : 0, fee);
  // No voucher chosen yet: suggest one that would apply, soonest-expiring first, then welcome/gift/delivery
  const offer = voucher ? undefined : sync.vouchers()
    .filter((v) => v.state === 'available' && offerRank(v) < 9 && checkVoucher(v, bag.price * qty, br, used, dl ? 'delivery' : 'pickup', fee).ok)
    .sort((a, b) => offerRank(a) - offerRank(b) || new Date(a.expires).getTime() - new Date(b.expires).getTime())[0];
  const sub = p.subtotal;
  const total = p.total;
  const save = (bag.originalPrice - bag.price) * qty + p.discount;
  const blocked = bag.bagsLeft <= 0 || st.kind === 'ended' || st.kind === 'soldout' || (dl && !place);
  const onPay = async () => {
    if (lock.current || blocked) return;
    lock.current = true; setBusy(true);
    try {
      const order = await payOrder({ bagId: bag.id, quantity: qty, payWith: pay, voucherId: vc?.ok ? voucher?.id : undefined, fulfilment: dl ? 'delivery' : 'pickup', deliverTo: dl && place ? { label: place.label, area: place.area, detail: place.detail } : undefined });
      router.replace(`/passport/${order.id}`);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== 'cancelled') toast((e as Error).message || 'Payment failed. You have not been charged.', 'error');
      lock.current = false; setBusy(false);
    }
  };
  return (
    <Page
      header={<SubHeader title="Checkout" />}
      footer={
        <View style={{ gap: 10 }}>
          <Pressable onPress={onPay} disabled={busy || blocked} style={({ pressed }) => [s.pay, (busy || blocked) && { opacity: 0.6 }, blocked && { backgroundColor: colors.muted2 }, pressed && { opacity: 0.92 }]} accessibilityRole="button" accessibilityState={{ busy, disabled: blocked }}>
            {busy ? <ActivityIndicator color="#fff" /> : pay === 'Apple Pay' ? <Icon name="apple" size={18} color="#fff" /> : pay === 'Google Pay' ? <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Icon name="google" size={14} /></View> : <Icon name="card" size={18} color="#fff" />}
            <Text style={{ color: '#fff', fontSize: 17, ...W('semibold') }}>{blocked ? (bag.bagsLeft <= 0 ? 'Sold out' : dl && !place ? 'Add a delivery address' : 'Pickup has ended') : busy ? 'Confirming payment…' : `Pay ${qar(total, true)}`}</Text>
          </Pressable>
          {!LIVE ? <Text style={{ textAlign: 'center', fontSize: 13, color: colors.rubyDark, ...W('semibold') }}>Demo: no real payment is taken.</Text> : null}
          <Text style={{ textAlign: 'center', fontSize: 13, color: colors.muted, ...W('regular') }}>
            By reserving you agree to WonderBites’ <Text onPress={() => router.push('/terms')} style={{ color: colors.plum, textDecorationLine: 'underline', ...W('bold') }}>Terms & Conditions</Text>
          </Text>
        </View>
      }
      contentStyle={{ gap: 12, paddingTop: 10 }}
    >
      <Rise delay={150}><Card style={s.shop}>
        <MerchantLogo initials={br.initials} size={46} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{br.storeName}</Text>
          <Text style={s.mu}>{br.branchName}</Text>
          <Text style={s.mu}>{br.phone}</Text>
        </View>
        <IconBtn name="phone" variant="soft" label="Call shop" onPress={() => callShop(br.phone)} />
        <IconBtn name="copy" variant="white" size={40} label="Copy address" onPress={() => copyText(`${br.storeName}, ${br.branchName}, ${br.address}, Doha`)} />
      </Card></Rise>

      <Rise delay={250}><Card style={{ padding: 16 }}>
        <Text style={s.h2}>Order summary</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'center' }}>
          <Image source={photos[bag.photo]} style={{ width: 56, height: 56, borderRadius: 12 }} contentFit="cover" />
          <View>
            <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{bag.title}</Text>
            <Text style={s.mu}>Quantity × {qty}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <Text style={{ fontSize: 20, color: colors.ruby, ...W('extrabold') }}>{qar(bag.price)} <Text style={{ fontSize: 13, color: colors.muted, textDecorationLine: 'line-through', ...W('regular') }}>{qar(bag.originalPrice)}</Text></Text>
          <Pill label={`${bag.discountPercent}% OFF`} tone="ruby" solid />
        </View>
        <Text style={[s.mu, { marginTop: 12, fontSize: 14 }]}>{dl ? 'Delivery time' : 'Collection time'} ({dayLabel(bag.pickupStart).toLowerCase()})</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Icon name="clock" size={16} color={colors.ruby} />
          <Text style={{ color: colors.ruby, fontSize: 14, ...W('medium') }}>{windowText(bag.pickupStart, bag.pickupEnd)}</Text>
        </View>
        <Text style={{ fontSize: 13, color: colors.plum, marginTop: 4, ...W('bold') }}>{[st.text, `${bag.bagsLeft} left`].filter(Boolean).join(' · ')}</Text>
      </Card></Rise>

      {br.delivery ? (
        <Rise delay={300}><Card style={{ padding: 16 }}>
          <Text style={s.h2}>Pickup or delivery</Text>
          <Segmented items={['Pickup', 'Delivery']} value={dl ? 'Delivery' : 'Pickup'} onChange={(v) => setHow(v === 'Delivery' ? 'delivery' : 'pickup')} style={{ marginTop: 12 }} />
          <AutoHeight k={dl ? 'delivery' : 'pickup'}>{dl ? (
            <>
              <Text style={[s.mu, { marginTop: 12, fontSize: 14 }]}>{`Delivered by ${br.storeName} during your window · QAR ${br.delivery.fee} delivery fee`}</Text>
              <Text style={{ fontSize: 14, color: colors.plum, marginTop: 12, ...W('bold') }}>Deliver to</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {places.map((x) => <OptChip key={x.id} label={`${placeLabel(x.label)} · ${x.area}`} on={place?.id === x.id} onPress={() => setPlaceId(x.id)} />)}
                <OptChip label="Add a place" onPress={() => router.push({ pathname: '/select-location', params: { mode: 'place', id: 'new' } })} />
              </View>
            </>
          ) : <Text style={[s.mu, { marginTop: 12, fontSize: 14 }]}>Collect it from the shop during your window.</Text>}</AutoHeight>
        </Card></Rise>
      ) : null}

      <Rise delay={350}><Card onPress={() => router.push({ pathname: '/vouchers', params: { select: '1', bagId: bag.id, qty: String(qty), how: dl ? 'delivery' : 'pickup' } })} style={[s.shop, { paddingVertical: 12 }]}>
        <View style={s.ib}><Icon name="ticket" size={20} color={colors.ruby} /></View>
        <View style={{ flex: 1 }}>
          {voucher ? (
            <>
              <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{voucher.code}</Text>
              <Text style={{ fontSize: 13, color: vc?.ok ? colors.emerald : colors.rubyDark, ...W('bold') }}>{vc?.ok ? `−${qar(vc.discount, true)} applied` : vc?.reason}</Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{offer ? offerLine(offer, valueLabel(offer)) : 'Got an offer code?'}</Text>
              <Text style={{ fontSize: 13, color: colors.ruby, ...W('bold') }}>See your vouchers</Text>
            </>
          )}
        </View>
        {voucher ? <IconBtn name="close" variant="white" size={36} label="Remove voucher" onPress={() => setStore((x) => ({ ...x, appliedVoucher: undefined }))} />
          : offer ? <Pressable onPress={() => setStore((x) => ({ ...x, appliedVoucher: offer.id }))} accessibilityRole="button" hitSlop={8} style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.ruby, justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 13, ...W('bold') }}>Use</Text></Pressable>
          : <Icon name="chev" size={18} color={colors.muted} />}
      </Card></Rise>

      <Rise delay={450}><Card style={{ padding: 16 }}>
        <Text style={s.h2}>Payment option</Text>
        {([WALLET, 'Card'] as Pay[]).map((m, i) => (
          <React.Fragment key={m}>
            {i ? <Hair style={{ marginVertical: 2 }} /> : null}
            <Pressable onPress={() => setPay(m)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }} accessibilityRole="radio" accessibilityState={{ checked: pay === m }}>
              <View style={[s.payIc, m === 'Apple Pay' ? { backgroundColor: colors.plum } : m === 'Google Pay' ? { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line } : { backgroundColor: colors.rubySoft }]}>
                <Icon name={m === 'Apple Pay' ? 'apple' : m === 'Google Pay' ? 'google' : 'card'} size={20} color={m === 'Apple Pay' ? '#fff' : colors.ruby} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>{m === 'Card' ? 'Card payment' : m}</Text>
                <Text style={s.mu}>{m === 'Card' ? 'Visa, Mastercard' : `Pay with ${m}`}</Text>
              </View>
              <Radio on={pay === m} />
            </Pressable>
          </React.Fragment>
        ))}
      </Card></Rise>

      <Rise delay={550}><Card style={{ padding: 16 }}>
        <Text style={s.h2}>Price summary</Text>
        <Row l={`${bag.title} × ${qty}`} r={qar(sub, true)} />
        <Row l="Service fee" r={qar(SERVICE_FEE, true)} info />
        <AutoHeight k={dl ? 'fee' : 'none'}>{dl ? <Row l="Delivery fee" r={qar(fee, true)} /> : null}</AutoHeight>
        {p.discount ? <Row l="Voucher" r={`−${qar(p.discount, true)}`} /> : null}
        <Hair style={{ marginVertical: 12 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 17, color: colors.plum, ...W('bold') }}>Total</Text>
          <View>
            {/* totGlow: one ruby glow pulse on the total once everything has landed */}
            <GlowFlash delay={1900} duration={1200} width={170} height={56} peak={0.32} style={{ left: -25, top: -14 }} />
            <Text style={{ fontSize: 22, color: colors.ruby, ...W('extrabold') }}>{qar(total, true)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ fontSize: 14, color: colors.emerald, ...W('semibold') }}>You save</Text>
          <Text style={{ fontSize: 14, color: colors.emerald, ...W('bold') }}>{qar(save, true)}</Text>
        </View>
      </Card></Rise>
    </Page>
  );
}

function Row({ l, r, info }: { l: string; r: string; info?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 16, color: colors.muted, ...W('regular') }}>{l}</Text>
        {info ? <Icon name="info" size={15} color={colors.muted} /> : null}
      </View>
      <Text style={{ fontSize: 16, color: colors.plum, ...W('bold') }}>{r}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  shop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  mu: { fontSize: 13, color: colors.muted, ...W('regular') },
  h2: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 27, color: colors.plum },
  ib: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center' },
  payIc: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 28, backgroundColor: colors.ruby, shadowColor: colors.ruby, shadowOpacity: 0.45, shadowRadius: 13, shadowOffset: { width: 0, height: 10 } },
});
