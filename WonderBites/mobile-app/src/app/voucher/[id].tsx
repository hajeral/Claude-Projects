// P04b Voucher details
import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/AppText';
import { router, useLocalSearchParams } from 'expo-router';
import { Halo } from '../../components/Halo';
import { Page, SubHeader } from '../../components/layout';
import { voucherText } from '../../components/VoucherCard';
import { Button, Group, ListRow, SectionLabel, W } from '../../components/ui';
import { sync } from '../../api/client';
import { setStore, useStore } from '../../state/store';
import { NotFound } from '../../components/NotFound';
import { toast } from '../../components/Toast';
import { copyText } from '../../lib/actions';
import { longDate } from '../../lib/format';
import { colors, fonts } from '../../theme';

export default function VoucherRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useStore((s) => s.usedVouchers);
  return sync.findVoucher(id) ? <VoucherDetail /> : <NotFound kind="voucher" />;
}

function VoucherDetail() {
  const { id, select } = useLocalSearchParams<{ id: string; select?: string }>();
  const v = sync.findVoucher(id)!;
  const t = voucherText(v);
  const delivery = v.kind === 'percentDelivery' || v.kind === 'freeDelivery';
  const usable = v.state === 'available' && !delivery;
  const use = () => {
    setStore((s) => ({ ...s, appliedVoucher: v.id }));
    toast(select ? `${v.code} applied` : `${v.code} will be applied at checkout`);
    if (select) { router.back(); router.back(); } else router.back();
  };
  const copy = async () => { const ok = await copyText(v.code); toast(ok === false ? 'Couldn’t copy the code' : 'Code copied', ok === false ? 'error' : 'ok'); };
  return (
    <Page header={<SubHeader title="Voucher details" />} footer={<Button title={usable ? 'Use at checkout' : delivery ? 'Not valid on pickup orders' : v.state === 'used' ? 'Already used' : 'Expired'} onPress={usable ? use : undefined} disabled={!usable} />}>
      <View style={{ borderRadius: 22, overflow: 'hidden' }}>
        <Halo full style={{ padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 26, color: colors.ruby, ...W('bold') }}>%</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, letterSpacing: 1.4, color: '#E6B8C0', ...W('extrabold') }}>{t.kicker}</Text>
              <Text style={{ fontFamily: fonts.serif, fontSize: 28, lineHeight: 32, color: '#fff' }}>{t.long}</Text>
              <Text style={{ fontSize: 14, color: colors.pale, ...W('regular') }}>From {v.issuer}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, height: 40, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <Text style={{ fontSize: 13, color: colors.pale, ...W('regular') }}>Code</Text>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, letterSpacing: 2, color: '#fff', ...W('extrabold') }}>{v.code}</Text>
            <Pressable onPress={copy} hitSlop={14} accessibilityRole="button" accessibilityLabel="Copy code"><Text style={{ fontSize: 14, color: '#E6B8C0', ...W('bold') }}>Copy</Text></Pressable>
          </View>
        </Halo>
      </View>
      <SectionLabel>Conditions</SectionLabel>
      <Group>
        <ListRow icon="bag" title={v.minSpend ? `Minimum spend QAR ${v.minSpend}` : 'No minimum spend'} sub="Before the voucher is applied" />
        {v.maxDiscount ? <ListRow icon="ticket" title={`Up to QAR ${v.maxDiscount} off`} sub="Maximum discount per order" /> : null}
        <ListRow icon="store" title={v.issuer} sub={v.scope ? `${v.scope[0].toUpperCase()}${v.scope.slice(1)} · Lusail Boulevard, The Pearl` : 'All shops on WonderBites'} />
        {delivery ? <ListRow icon="bag" title="Delivery orders only" sub="Not valid on pickup orders" /> : null}
        <ListRow icon="user" title="One use per customer" sub="One voucher per order" />
        <ListRow icon="clock" title={`Expires ${longDate(v.expires)}, 23:59`} sub="Doha time" />
      </Group>
    </Page>
  );
}
