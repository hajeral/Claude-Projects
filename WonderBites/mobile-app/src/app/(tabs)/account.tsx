// P01 Account
import { voucherNews } from '../../lib/voucherAlerts';
import { resetStore, placeLabel } from '../../state/store';
import { toast } from '../../components/Toast';
import { LIVE } from '../../config';
import React from 'react';
import { getLang } from '../../i18n';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/AppText';
import { router } from 'expo-router';
import { Halo } from '../../components/Halo';
import { Page, useTopInset } from '../../components/layout';
import { Badge, Button, Card, Group, Icon, Impact, ListRow, Pill, SectionLabel, W } from '../../components/ui';
import { api, useApi } from '../../api/client';
import { useStore } from '../../state/store';
import { Image } from 'expo-image';
import { colors, fonts } from '../../theme';
import { Rise } from '../../components/motion';

export default function Account() {
  const top = useTopInset();
  const profile = useStore((x) => x.profile);
  const places = useStore((x) => x.places);
  const [resetAsk, setResetAsk] = React.useState(false);
  const { data: me } = useApi(() => api.me(), [profile]);
  const { data: vouchers = [] } = useApi(() => api.vouchers());
  const seenV = useStore((x) => x.seenVouchers); const bellSeen = useStore((x) => x.bellSeen);
  const news = voucherNews(vouchers, seenV, bellSeen);
  const { data: tickets = [] } = useApi(() => api.tickets());
  const open = tickets.filter((t) => t.status === 'open').length;
  if (!me) return null;
  return (
    <Page tabBar header={
      <Halo style={{ paddingTop: top + 6, paddingHorizontal: 16 }} curve={30}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: colors.cream, borderWidth: 3, borderColor: '#E6B8C0', alignItems: 'center', justifyContent: 'center' }}>
            {profile.photo ? <Image source={{ uri: profile.photo }} style={{ width: 86, height: 86, borderRadius: 43 }} contentFit="cover" /> : <Text style={{ fontFamily: fonts.serif, fontSize: 36, color: colors.rubyDark }}>{me.firstName[0]}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.serif, fontSize: 26, color: '#fff' }}>{me.firstName} {me.lastName}</Text>
            <Text style={{ fontSize: 14, color: colors.pale, ...W('regular') }} numberOfLines={1}>{me.email} · {me.phone}</Text>
            <Pressable onPress={() => router.push('/edit-profile')} hitSlop={7} style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, marginTop: 8, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
              <Icon name="edit" size={15} color="#fff" /><Text style={{ color: '#fff', fontSize: 14, ...W('semibold') }}>Edit profile</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ height: 34 }} />
      </Halo>
    } contentStyle={{ marginTop: -38 }}>
      <Rise delay={100}><Card style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 15, color: colors.plum, ...W('bold') }}>Your positive impact</Text>
          <Pill label={`With WonderBites since ${me.rescuerSince}`} tone="green" icon="leaf" />
        </View>
        <Impact items={[[String(me.impact.meals), 'meals enjoyed'], [`QAR ${me.impact.saved}`, 'saved'], [`${me.impact.co2Kg} kg`, 'CO₂ avoided']]} />
      </Card></Rise>
      <SectionLabel>My account</SectionLabel>
      <Group>
        <ListRow icon="user" title="Personal details" sub="Name, email, phone" onPress={() => router.push('/edit-profile')} />
        <ListRow icon="lock" title="Password & security" onPress={() => router.push('/password')} />
        <ListRow icon="ticket" title="Offers & vouchers" end={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{news.tagged.length ? <Pill label="New" tone="ruby" solid style={{ height: 22, paddingHorizontal: 8 }} /> : null}<Badge n={vouchers.filter((v) => v.state === 'available').length} /></View>} onPress={() => router.push('/vouchers')} />
        <ListRow icon="pin" title="Saved places" sub={places[0] ? `${placeLabel(places[0].label)} · ${places[0].area}` : 'Add a place'} onPress={() => router.push('/places')} />
        <ListRow icon="bell" title="Notifications" onPress={() => router.push('/notifications')} />
        <ListRow icon="globe" title="Language" end={<Text style={{ fontSize: 14, color: colors.muted, ...W('regular') }}>{getLang() === 'ar' ? 'العربية' : 'English'}</Text>} onPress={() => router.push('/language')} />
      </Group>
      <SectionLabel>Help & feedback</SectionLabel>
      <Group>
        <ListRow icon="help" title="Help centre" sub="FAQs and contact" onPress={() => router.push('/help')} />
        <ListRow icon="chat" title="Support requests" end={open ? <Pill label={`${open} open`} tone="green" style={{ height: 24 }} /> : null} onPress={() => router.push('/tickets')} />
        <ListRow icon="star" title="Share your experience" onPress={() => router.push('/feedback')} />
        <ListRow icon="store" title="Suggest a place you love" onPress={() => router.push('/recommend')} />
      </Group>
      <SectionLabel>About</SectionLabel>
      <Group>
        <ListRow icon="info" title="About WonderBites" onPress={() => router.push('/about')} />
        <ListRow icon="shield" title="Privacy policy" onPress={() => router.push('/privacy')} />
        <ListRow icon="doc" title="Terms & conditions" onPress={() => router.push('/terms')} />
      </Group>
      <Button title="Log out" icon="out" kind="secondary" style={{ marginTop: 24 }} onPress={() => router.push('/logout')} />
      <Button title="Delete account" kind="text" onPress={() => router.push('/delete-account')} />
      {!LIVE ? <Button title={resetAsk ? 'Tap again to clear all demo data' : 'Reset demo data'} kind="text" onPress={async () => { if (!resetAsk) { setResetAsk(true); return; } await resetStore(); setResetAsk(false); toast('Demo data cleared'); }} /> : null}
      <Text style={{ textAlign: 'center', fontSize: 13, color: colors.muted, marginTop: 4, ...W('regular') }}>WonderBites 1.0.0 · Doha, Qatar</Text>
    </Page>
  );
}
