import React, { useEffect } from 'react';
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { EASE_RISE } from './motion';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { Image } from 'expo-image';
import type { Order } from '../api/types';
import { sync } from '../api/client';
import { dayLabel, isToday, hhmm, pickupState, qar, shortDate, windowText } from '../lib/format';
import { photos } from '../lib/photos';
import { colors, shadow } from '../theme';
import { Button, Icon, Pill, W } from './ui';
import { isDelivery, isDone, isEnded } from '../lib/orders';

const STATUS: Record<Order['status'], [string, 'green' | 'pink' | 'grey']> = {
  paid: ['Paid', 'green'], reserved: ['Reserved', 'pink'], collected: ['Collected', 'green'], delivered: ['Delivered', 'green'], cancelled: ['Cancelled', 'grey'],
};

/** One order row as used on My orders (all four tabs). */
export function OrderCard({ o, action, onAction, onPress, link, onLink, muted, exitAnim }: { o: Order; action?: string; onAction?: () => void; onPress?: () => void; link?: string; onLink?: () => void; muted?: boolean; exitAnim?: boolean }) {
  const bag = sync.bag(o.bagId);
  const br = sync.branch(o.branchId);
  const ended = isEnded(o);
  const dl = isDelivery(o);
  const [label, tone] = ended ? [dl ? 'Delivery window ended' : 'Pickup ended', 'grey'] as const : STATUS[o.status];
  let when: string;
  if (ended) when = `Was ${isToday(o.pickupStart) ? 'today' : shortDate(o.pickupStart)} ${windowText(o.pickupStart, o.pickupEnd)}`;
  else if (isDone(o)) when = `${o.status === 'delivered' ? 'Delivered' : 'Collected'} ${shortDate(o.collectedAt!)} · ${hhmm(o.collectedAt!)}`;
  else if (o.status === 'cancelled') when = `Was ${isToday(o.pickupStart) ? 'today' : shortDate(o.pickupStart)} ${windowText(o.pickupStart, o.pickupEnd)}`;
  else {
    const st = pickupState(o.pickupStart, o.pickupEnd, 1);
    when = `${dayLabel(o.pickupStart)} ${windowText(o.pickupStart, o.pickupEnd)}${st.kind === 'later' && st.text ? ` · ${st.text.toLowerCase()}` : ''}`;
  }
  return (
    <Animated.View style={s.card} exiting={exitAnim ? FadeOut.duration(180) : undefined} layout={exitAnim ? LinearTransition.duration(220).delay(120).easing(EASE_RISE) : undefined}>
      <Pressable style={{ flexDirection: 'row', gap: 12 }} onPress={onPress} disabled={!onPress}>
        <Image source={photos[bag.photo]} style={s.img} contentFit="cover" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <Text style={s.name} numberOfLines={1}>{br.storeName}</Text>
            <Pill label={label} tone={tone} style={{ height: 24, paddingHorizontal: 9 }} />
          </View>
          <Text style={s.mu}>{br.branchName} · {bag.title} × {o.quantity}</Text>
          {dl && o.deliverTo && !isDone(o) && o.status !== 'cancelled' ? <Text style={s.mu} numberOfLines={1}>{`Delivery to ${o.deliverTo.label} · ${o.deliverTo.area}`}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Icon name="clock" size={14} color={o.status === 'cancelled' || ended ? colors.muted : colors.ruby} />
            <Text style={[s.when, (o.status === 'cancelled' || ended) && { color: colors.muted }]} numberOfLines={1}>{when}</Text>
          </View>
          {o.status === 'paid' || o.status === 'reserved' ? (
            <Text style={{ fontSize: 13, color: colors.plum, marginTop: 2, ...W('bold') }}>
              {qar(o.price)} <Text style={{ color: colors.muted, textDecorationLine: 'line-through', ...W('regular') }}>{qar(o.originalPrice)}</Text>
              {o.freeCancelUntil && !ended && new Date(o.freeCancelUntil).getTime() > Date.now() ? <Text style={{ color: colors.muted, ...W('regular') }}> · free cancel until {hhmm(o.freeCancelUntil)}</Text> : null}
            </Text>
          ) : null}
          {isDone(o) ? (
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2, ...W('regular') }}>You saved <Text style={{ color: colors.emerald, ...W('bold') }}>{qar(o.originalPrice - o.price)}</Text>{o.rating ? ` · ★ ${o.rating} rated` : ''}</Text>
          ) : null}
          {o.status === 'cancelled' ? (
            <>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2, ...W('regular') }}>Cancelled by {o.cancelledBy === 'shop' ? 'the shop' : 'you'}</Text>
              <Text style={{ fontSize: 13, color: colors.emerald, ...W('bold') }}>Refunded {qar(o.refund ?? 0, true)}{o.cancelledBy === 'you' ? ' · free cancellation' : ` to ${o.paidWith}`}</Text>
            </>
          ) : null}
        </View>
      </Pressable>
      {action ? <Warn text={action}><Button title={action} small onPress={onAction} style={{ marginTop: 12, height: 40 }} /></Warn> : null}
      {link ? <Warn text={link} center><Pressable onPress={onLink} hitSlop={10} accessibilityRole="button" style={{ alignSelf: 'center', marginTop: 10 }}><Text style={{ fontSize: 13, color: muted ? colors.muted : colors.ruby, ...W(muted ? 'semibold' : 'bold') }}>{link}</Text></Pressable></Warn> : null}
    </Animated.View>
  );
}


const s = StyleSheet.create({
  card: { padding: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 20, ...shadow.card, shadowOpacity: 0.12 },
  img: { width: 64, height: 64, borderRadius: 14, backgroundColor: colors.rubySoft },
  name: { flex: 1, fontSize: 15, color: colors.plum, ...W('bold') },
  mu: { fontSize: 13, color: colors.muted, ...W('regular') },
  when: { fontSize: 13, color: colors.ruby, ...W('semibold'), flexShrink: 1 },
});

/** When a label changes it cross-fades (150ms); "Tap again…" also gives one tiny 2px shake so the warning is noticed. */
function Warn({ text, center, children }: { text: string; center?: boolean; children: React.ReactNode }) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (text.startsWith('Tap again')) x.value = withSequence(withTiming(2, { duration: 50 }), withTiming(-2, { duration: 70 }), withTiming(0, { duration: 50 }));
  }, [text, x]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View key={text} entering={FadeIn.duration(150)} style={[center && { alignSelf: 'center' }, a]}>{children}</Animated.View>;
}
