// P04 Vouchers — every voucher type from the merchant platform.
// Opened from checkout (select=1) it shows which vouchers fit this order and applies one.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { isDeliveryVoucher, markBellSeen, markVouchersSeen } from '../lib/voucherAlerts';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { Page, SubHeader } from '../components/layout';
import { VoucherCard } from '../components/VoucherCard';
import { Icon, Segmented, W } from '../components/ui';
import { api, sync } from '../api/client';
import { setStore, useStore } from '../state/store';
import { checkVoucher } from '../lib/pricing';
import { qar } from '../lib/format';
import { toast } from '../components/Toast';
import { colors } from '../theme';

export default function Vouchers() {
  // "New" tags show while this screen is open; once the customer has been here they're seen
  const seenNow = useStore((x) => x.seenVouchers);
  const seen = useRef(seenNow); // what was already seen when the screen opened
  // Tags stay visible for this visit; after a moment on the screen the vouchers count as seen
  useEffect(() => { const t = setTimeout(() => { const all = sync.vouchers().filter((v) => v.state === 'available'); markVouchersSeen(all.map((v) => v.id)); markBellSeen(all); }, 1500); return () => clearTimeout(t); }, []);
  const { select, bagId, qty, how } = useLocalSearchParams<{ select?: string; bagId?: string; qty?: string; how?: string }>();
  const added = useStore((s) => s.addedVouchers);
  const used = useStore((s) => s.usedVouchers);
  const list = useMemo(() => sync.vouchers(), [added, used]); // eslint-disable-line react-hooks/exhaustive-deps
  const bag = select ? sync.findBag(bagId) : undefined;
  const br = bag ? sync.findBranch(bag.branchId) : undefined;
  const sub = bag ? bag.price * Math.max(1, Number(qty ?? 1)) : 0;
  const avail = list.filter((v) => v.state === 'available');
  const tabs = [`Available (${avail.length})`, 'Used', 'Expired'];
  const [tab, setTab] = useState(0);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const shown = list.filter((v) => v.state === (['available', 'used', 'expired'] as const)[tab]);

  const add = async () => {
    setErr(''); setBusy(true);
    try { const v = await api.addVoucherCode(code); setCode(''); setTab(0); toast(`${v.code} added`); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  const use = (id: string) => {
    const v = sync.findVoucher(id)!;
    if (bag && br) {
      const c = checkVoucher(v, sub, br, used, how === 'delivery' ? 'delivery' : 'pickup', how === 'delivery' ? br.delivery?.fee ?? 0 : 0);
      if (!c.ok) { toast(c.reason, 'error'); return; }
    }
    setStore((s) => ({ ...s, appliedVoucher: id }));
    toast(bag ? `${v.code} applied` : `${v.code} will be applied at checkout`);
    router.back();
  };

  return (
    <Page header={<SubHeader title={bag ? 'Choose a voucher' : 'Offers & vouchers'} />} contentStyle={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingStart: 14, paddingEnd: 6, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1.5, borderColor: err ? colors.ruby : colors.field }}>
        <Icon name="ticket" size={18} color={colors.muted} />
        <TextInput value={code} onChangeText={(t) => { setCode(t); setErr(''); }} onSubmitEditing={add} placeholder="Enter a voucher code" placeholderTextColor={colors.muted2} style={{ flex: 1, minWidth: 0, fontSize: 16, color: colors.plum, ...W('medium') }} autoCapitalize="characters" autoCorrect={false} returnKeyType="done" />
        <Pressable onPress={add} disabled={busy || !code.trim()} accessibilityRole="button" style={{ height: 40, minWidth: 64, paddingHorizontal: 16, borderRadius: 20, backgroundColor: code.trim() ? colors.plum : colors.muted2, justifyContent: 'center', alignItems: 'center' }}>
          {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 14, ...W('bold') }}>Add</Text>}
        </Pressable>
      </View>
      {err ? <Text style={{ fontSize: 13, color: colors.rubyDark, marginTop: -6, ...W('semibold') }}>{err}</Text> : null}
      <Segmented items={tabs} value={tabs[tab]} onChange={(v) => setTab(tabs.indexOf(v))} />
      {shown.map((v) => {
        const c = bag && br && v.state === 'available' ? checkVoucher(v, sub, br, used, how === 'delivery' ? 'delivery' : 'pickup', how === 'delivery' ? br.delivery?.fee ?? 0 : 0) : undefined;
        return (
          <VoucherCard
            key={v.id}
            v={v}
            note={c ? (c.ok ? { ok: true, text: `Saves ${qar(c.discount, true)} on this order` } : { ok: false, text: c.reason }) : undefined}
            onPress={() => router.push({ pathname: '/voucher/[id]', params: { id: v.id, ...(bag ? { select: '1', bagId, qty } : {}) } })}
            onAdd={v.state === 'available' ? () => use(v.id) : undefined}
            isNew={v.state === 'available' && !seen.current.includes(v.id) && !isDeliveryVoucher(v)}
          />
        );
      })}
      {!shown.length ? <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 20, ...W('regular') }}>{tab === 0 ? 'No vouchers yet. Add a code above.' : tab === 1 ? 'You haven’t used any vouchers yet.' : 'No expired vouchers.'}</Text> : null}
      <Text style={{ textAlign: 'center', fontSize: 13, color: colors.muted, ...W('regular') }}>Vouchers come from WonderBites or from shops on the merchant platform. One voucher per order.</Text>
    </Page>
  );
}
