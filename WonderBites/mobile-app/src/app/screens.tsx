// Developer index of every design screen (open /screens). Remove before release.
import React from 'react';
import { Pressable } from 'react-native';
import { Text } from '../components/AppText';
import { router, type Href } from 'expo-router';
import { Page, SubHeader } from '../components/layout';
import { W } from '../components/ui';
import { colors } from '../theme';

export const SCREENS: [string, string, string][] = [
  ['E01', 'Splash', '/'], ['E02–04', 'Onboarding', '/onboarding'], ['E05', 'Welcome', '/welcome'], ['E06', 'Create account', '/signup'],
  ['M06', 'Verification method', '/verify-method'], ['E07', 'Verify number', '/verify'], ['E08', 'Your name', '/your-name'], ['M07', 'Welcome, Sarah', '/welcome-user'],
  ['E09', 'Location', '/location'], ['M08', 'Select location', '/select-location'], ['E10', 'Home', '/home'], ['E11', 'Search map', '/search'],
  ['F01', 'Refine your search', '/refine'], ['M09', 'Search', '/search-text'], ['E12', 'Store · La Patisserie', '/store/lp-bakery'], ['E12b', 'Store · Glaze & Co', '/store/gc-donut'],
  ['M10', 'Shop profile', '/shop/lp-msheireb'], ['E13', 'Checkout', '/checkout/lp-bakery'], ['E14', 'Pickup passport', '/passport/0974-1118'], ['E15', 'Pickup completed', '/completed/0974-1118'],
  ['M01', 'Log in', '/login'], ['M02', 'Forgot password', '/forgot-password'], ['M03', 'Reset code', '/reset-code'], ['M04', 'New password', '/new-password'], ['M05', 'Country code', '/country-code'],
  ['P18', 'My orders · Active', '/orders'], ['M11', 'My orders · Upcoming', '/orders?tab=upcoming'], ['M12', 'My orders · Completed', '/orders?tab=completed'], ['M13', 'My orders · Cancelled', '/orders?tab=cancelled'],
  ['P19', 'Favourites', '/favorites'], ['P01', 'Account', '/account'], ['P02', 'Personal details', '/edit-profile'], ['P03', 'Password & security', '/password'],
  ['P04', 'Vouchers', '/vouchers'], ['P04b', 'Voucher details', '/voucher/v2'], ['P05', 'Language', '/language'], ['P06', 'Saved places', '/places'], ['P07', 'Notifications', '/notifications'],
  ['P08', 'Help centre', '/help'], ['P09', 'Help article', '/help-article'], ['P10', 'My tickets', '/tickets'], ['P10b', 'New ticket', '/ticket-new'], ['P10c', 'Ticket sent', '/ticket-sent'],
  ['P11', 'Share feedback', '/feedback'], ['P12', 'Recommend a store', '/recommend'], ['P13', 'About', '/about'], ['P14', 'Privacy policy', '/privacy'], ['P15', 'Terms', '/terms'],
  ['P16', 'Log out', '/logout'], ['P17', 'Delete account', '/delete-account'],
];

export default function Screens() {
  return (
    <Page header={<SubHeader title="All screens" />}>
      {SCREENS.map(([code, name, href]) => (
        <Pressable key={code + href} onPress={() => router.push(href as Href)} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <Text style={{ width: 60, fontSize: 14, color: colors.ruby, ...W('bold') }}>{code}</Text>
          <Text style={{ fontSize: 15, color: colors.plum, ...W('semibold') }}>{name}</Text>
        </Pressable>
      ))}
    </Page>
  );
}
