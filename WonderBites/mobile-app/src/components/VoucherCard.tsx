import React from 'react';
import { atStart, atEnd, borderEnd } from '../i18n';
import { slopFor } from '../lib/platform';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import type { Voucher } from '../api/types';
import { longDate } from '../lib/format';
import { colors, fonts, shadow } from '../theme';
import { Icon, Pill, W } from './ui';
import type { IconName } from './icons';

// Voucher types mirror the merchant platform: amount off, percentage off (incl. delivery),
// free delivery, free service fee.
export function voucherText(v: Voucher) {
  switch (v.kind) {
    case 'amount': return { kicker: 'AMOUNT OFF', big: `QAR ${v.value}`, small: 'OFF', title: `Discount QAR ${v.value}`, long: `QAR ${v.value} off`, icon: 'ticket' as IconName };
    case 'percent': return { kicker: 'PERCENTAGE OFF', big: `${v.value}%`, small: 'OFF', title: `Discount ${v.value}%`, long: `${v.value}% off`, icon: 'ticket' as IconName };
    case 'percentDelivery': return { kicker: 'PERCENTAGE OFF', big: `${v.value}%`, small: 'DELIVERY', title: `Delivery discount ${v.value}%`, long: `${v.value}% off delivery`, icon: 'ticket' as IconName };
    case 'freeDelivery': return { kicker: 'FREE DELIVERY', big: 'FREE', small: 'DELIVERY', title: 'Free delivery', long: 'Free delivery', icon: 'ticket' as IconName };
    case 'freeServiceFee': return { kicker: 'FREE SERVICE FEE', big: 'FREE', small: 'FEE', title: 'No service fee', long: 'No service fee', icon: 'ticket' as IconName };
  }
}

export function VoucherCard({ v, onPress, onAdd, note, isNew }: { v: Voucher; onPress?: () => void; onAdd?: () => void; note?: { ok: boolean; text: string }; isNew?: boolean }) {
  const t = voucherText(v);
  return (
    <Pressable onPress={onPress} style={s.card}>
      <View style={[s.amt, borderEnd(2, '#E6B8C0')]}>
        <Icon name={t.icon} size={18} color={colors.ruby} />
        <Text style={{ fontFamily: fonts.serif, fontSize: t.big.length > 5 ? 22 : 24, color: colors.ruby, marginTop: 4 }}>{t.big}</Text>
        <Text style={{ fontSize: 11, letterSpacing: 1.2, color: colors.ruby, ...W('extrabold') }}>{t.small}</Text>
      </View>
      <View style={[s.punch, atStart(96), { top: -9 }]} /><View style={[s.punch, atStart(96), { bottom: -9 }]} />
      <View style={{ flex: 1, padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 11, letterSpacing: 1.3, color: colors.muted, ...W('extrabold') }}>{t.kicker}</Text>
          {isNew ? <Pill label="New" tone="ruby" solid style={{ height: 20, paddingHorizontal: 8 }} /> : null}
        </View>
        <Text style={{ fontSize: 16, color: colors.plum, marginTop: 4, ...W('bold') }}>{t.title}</Text>
        <Text style={{ fontSize: 13, color: colors.muted, ...W('regular') }}>{v.minSpend ? `Minimum spend QAR ${v.minSpend}` : 'No minimum spend'}</Text>
        <Text style={{ fontSize: 12, color: colors.muted2, ...W('regular') }}>From {v.issuer}{v.scope ? ` · ${v.scope}` : ''}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, columnGap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.line }}>
          {note ? <Text style={{ fontSize: 13, color: note.ok ? colors.emerald : colors.rubyDark, flexShrink: 1, ...W('bold') }}>{note.text}</Text> : <Pill label={`Expires ${longDate(v.expires)}`} tone="green" icon="clock" style={{ height: 24 }} />}
          <Text style={{ fontSize: 13, color: colors.ruby, ...W('bold') }}>Details</Text>
        </View>
        {onAdd ? (
          <Pressable onPress={onAdd} hitSlop={slopFor(32)} style={[s.add, atEnd(12)]} accessibilityLabel="Use voucher"><Icon name="plus" size={18} color="#fff" stroke={2.2} /></Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 20, overflow: 'hidden', ...shadow.card, shadowOpacity: 0.12 },
  amt: { width: 104, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', padding: 10 },
  punch: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line },
  add: { position: 'absolute', top: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ruby, alignItems: 'center', justifyContent: 'center' },
});
