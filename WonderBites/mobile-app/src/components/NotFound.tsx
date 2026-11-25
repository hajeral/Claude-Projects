// Friendly page for a link to a bag, shop, order or voucher that doesn't exist
// (or has expired), instead of the crash screen.
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Text } from './AppText';
import { Button, Icon, W } from './ui';
import { Page, SubHeader } from './layout';
import { colors, fonts } from '../theme';

const COPY = {
  bag: ['This bag isn’t available', 'It may have sold out or the link is old. New picks arrive every day.', 'Discover bags nearby', '/home'],
  shop: ['We couldn’t find this shop', 'The link may be old, or the shop is no longer on WonderBites.', 'See shops near me', '/search'],
  order: ['We couldn’t find this order', 'It may belong to another account, or the link is wrong. Your orders are all in My orders.', 'Go to my orders', '/orders'],
  cancelled: ['This order was cancelled', 'Any refund goes back to your original payment method within 3–5 working days.', 'Go to my orders', '/orders'],
  voucher: ['This voucher isn’t available', 'It may have expired or been used. See the vouchers you have now.', 'Go to my vouchers', '/vouchers'],
  ticket: ['We couldn’t find this ticket', 'It may belong to another account, or the link is wrong. All your requests are in Support requests.', 'Go to my support requests', '/tickets'],
  page: ['This page doesn’t exist', 'The link may be old or mistyped. Let’s get you back to tasty finds.', 'Back to home', '/home'],
} as const;

export function NotFound({ kind }: { kind: keyof typeof COPY }) {
  const [title, body, cta, to] = COPY[kind];
  return (
    <Page header={<SubHeader title="" />} footer={<Button title={cta} onPress={() => router.replace(to)} />}>
      <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 12 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="search" size={30} color={colors.ruby} /></View>
        <Text style={{ fontFamily: fonts.serif, fontSize: 28, lineHeight: 33, color: colors.plum, textAlign: 'center', marginTop: 20 }}>{title}</Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: colors.muted, textAlign: 'center', marginTop: 10, ...W('regular') }}>{body}</Text>
      </View>
    </Page>
  );
}
