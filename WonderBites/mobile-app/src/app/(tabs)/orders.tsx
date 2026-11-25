// P18 / M11 / M12 / M13 My orders — Active, Upcoming, Completed, Cancelled.
import React, { useState } from 'react';
import { WALLET } from '../../lib/platform';
import { View } from 'react-native';
import { Text } from '../../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { BigHeader, Page } from '../../components/layout';
import { OrderCard } from '../../components/OrderCard';
import { Impact, SectionLabel, Segmented, W } from '../../components/ui';
import { api, sync, useApi, useTick } from '../../api/client';
import { useStore } from '../../state/store';
import { toast } from '../../components/Toast';
import type { Order } from '../../api/types';
import { isToday } from '../../lib/format';
import { cancelUntil, canCancel, isDelivery, isDone, isEnded } from '../../lib/orders';
import { hhmm } from '../../lib/format';
import { colors } from '../../theme';

const TABS = ['To collect', 'Upcoming', 'Completed', 'Cancelled'];
const TAB_KEYS = ['active', 'upcoming', 'completed', 'cancelled'];

export default function Orders() {
  const { tab: t } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState(TABS[TAB_KEYS.indexOf(String(t))] ?? TABS[0]);
  const mine = useStore((s) => s.orders); const patches = useStore((s) => s.orderPatches);
  const orders = React.useMemo(() => sync.orders(), [mine, patches]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirm, setConfirm] = useState('');
  const open = (o: Order) => router.push(isDone(o) ? `/completed/${o.id}` : `/passport/${o.id}`);
  const [leaving, setLeaving] = useState(false);
  const cancel = async (o: Order) => {
    if (confirm !== o.id) { setConfirm(o.id); return; }
    // only a cancelled card fades out and lets the list close up; switching tabs stays instant
    setLeaving(true); setTimeout(() => setLeaving(false), 600);
    try { await api.cancelOrder(o.id); toast('Reservation cancelled. Your full refund is on its way.'); } catch (e) { toast((e as Error).message, 'error'); }
    setConfirm('');
  };
  const { data: me } = useApi(() => api.me());
  useTick(30000);
  // A delivery is never closed automatically: it stays here until the customer confirms or asks for help.
  const live = orders.filter((o) => (o.status === 'paid' || o.status === 'reserved') && (!isEnded(o) || isDelivery(o)));
  const missed = orders.filter((o) => isEnded(o) && !isDelivery(o));
  const help = (o: Order) => router.push({ pathname: '/ticket-new', params: { order: o.id } });
  const cancelLink = (o: Order) => (canCancel(o) ? (confirm === o.id ? 'Tap again to cancel' : 'Cancel reservation') : undefined);
  // After the free-cancel cutoff the spot explains why, instead of going empty
  const endedNote = (o: Order) => (!canCancel(o) ? `Free cancellation ended at ${hhmm(cancelUntil(o))} · Need help?` : undefined);
  const active = live.filter((o) => o.status === 'paid' || isToday(o.pickupStart));
  const upcoming = live.filter((o) => !active.includes(o));
  const done = orders.filter(isDone);
  const history = [...done, ...missed].sort((a, b) => new Date(b.collectedAt ?? b.pickupEnd).getTime() - new Date(a.collectedAt ?? a.pickupEnd).getTime());
  const cancelled = orders.filter((o) => o.status === 'cancelled');

  return (
    <Page tabBar header={<BigHeader title="My orders"><Segmented dark items={TABS} value={tab} onChange={setTab} style={{ marginTop: 14 }} /></BigHeader>} contentStyle={{ paddingTop: 10, gap: 12 }}>
      {tab === TABS[0] ? (
        <>
          {active.map((o) => <OrderCard key={o.id} o={o} exitAnim={leaving} onPress={() => open(o)} action={o.status === 'paid' ? (isDelivery(o) ? (isEnded(o) ? 'Confirm delivery received' : 'Show order and PIN') : 'Show pickup passport') : undefined} onAction={() => open(o)} link={isDelivery(o) && isEnded(o) ? 'Didn’t arrive? Get help' : cancelLink(o) ?? endedNote(o)} muted={!canCancel(o) && !(isDelivery(o) && isEnded(o))} onLink={() => (canCancel(o) ? cancel(o) : help(o))} />)}
          {upcoming.slice(0, 1).map((o) => <OrderCard key={o.id} o={o} exitAnim={leaving} onPress={() => open(o)} />)}
          {!active.length && !upcoming.length ? <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 8, ...W('regular') }}>No active orders yet. Pick your first bag and it’ll show up here.</Text> : null}
          {me ? (<><SectionLabel style={{ marginTop: 8, marginBottom: 0 }}>Your impact this month</SectionLabel><Impact items={[[String(me.monthImpact.bags), 'bags'], [`QAR ${me.monthImpact.saved}`, 'saved'], [`${me.monthImpact.co2Kg} kg`, 'CO₂ avoided']]} /></>) : null}
          <SectionLabel style={{ marginTop: 8, marginBottom: 0 }}>Recently collected</SectionLabel>
          {done.slice(0, 1).map((o) => <OrderCard key={o.id} o={o} exitAnim={leaving} onPress={() => open(o)} action={o.rating ? undefined : 'Rate this bag'} onAction={() => open(o)} />)}
        </>
      ) : null}
      {tab === 'Upcoming' ? (
        <>
          {upcoming.map((o) => <OrderCard key={o.id} o={o} exitAnim={leaving} onPress={() => open(o)} action={cancelLink(o)} onAction={() => cancel(o)} link={endedNote(o)} muted onLink={() => help(o)} />)}
          {!upcoming.length ? <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 8, ...W('regular') }}>No upcoming orders.</Text> : null}
          <Text style={{ textAlign: 'center', fontSize: 13, color: colors.muted, ...W('regular') }}>You can cancel for free up to 2 hours before your pickup window opens.</Text>
        </>
      ) : null}
      {tab === 'Completed' ? (
        <>
          {me ? <Impact items={[[String(me.impact.meals), 'meals enjoyed'], [`QAR ${me.impact.saved}`, 'saved'], [`${me.impact.co2Kg} kg`, 'CO₂ avoided']]} /> : null}
          {history.map((o) => (isEnded(o)
            ? <OrderCard key={o.id} o={o} exitAnim={leaving} onPress={() => open(o)} action="Get help with this order" onAction={() => help(o)} />
            : <OrderCard key={o.id} o={o} exitAnim={leaving} onPress={() => open(o)} action={o.rating ? undefined : 'Rate this bag'} onAction={() => open(o)} />))}
        </>
      ) : null}
      {tab === 'Cancelled' ? (
        <>
          {cancelled.map((o) => <OrderCard key={o.id} o={o} exitAnim={leaving} onPress={() => open(o)} />)}
          <Text style={{ textAlign: 'center', fontSize: 13, color: colors.muted, ...W('regular') }}>Refunds reach your card or {WALLET} in 3–5 working days.</Text>
        </>
      ) : null}
    </Page>
  );
}
