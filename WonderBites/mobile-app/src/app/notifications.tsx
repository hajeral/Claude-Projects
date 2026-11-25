// P07 Notifications
import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { setStore, useStore } from '../state/store';
import { api } from '../api/client';
import { LIVE } from '../config';
import { colors } from '../theme';
import { Page, SubHeader } from '../components/layout';
import { Group, ListRow, OptChip, SectionLabel, Toggle, W } from '../components/ui';

export default function Notifications() {
  const v = useStore((x) => x.prefs);
  const quiet = useStore((x) => x.quietHours);
  const [editQuiet, setEditQuiet] = useState(false);
  const T = (k: string) => <Toggle on={!!v[k]} onChange={(x) => api.updatePrefs({ [k]: x })} />;
  const favCount = useStore((x) => x.favBranches.length);
  const setQuiet = (p: Partial<typeof quiet>) => setStore((x) => ({ ...x, quietHours: { ...x.quietHours, ...p } }));
  const HOURS = ['20:00', '21:00', '22:00', '23:00', '00:00'];
  const ENDS = ['06:00', '07:00', '08:00', '09:00'];
  return (
    <Page header={<SubHeader title="Notifications" />}>
      <SectionLabel style={{ marginTop: 10 }}>Your bags</SectionLabel>
      <Group>
        <ListRow title="Pickup reminders" sub="30 minutes before your window opens" end={T('pick')} />
        <ListRow title="Order updates" sub="Reserved, ready, collected and refunds" end={T('upd')} />
        <ListRow title="Don’t-miss picks" sub="When a bag near you is about to close" end={T('last')} />
      </Group>
      <SectionLabel>Favourite shops</SectionLabel>
      <Group>
        <ListRow title="New bags from favourites" sub={favCount ? `From your ${favCount} favourite shops` : 'Add favourites to get these'} end={T('fav')} />
        <ListRow title="Daily new picks" sub="Every day at 17:00" end={T('drop')} />
      </Group>
      <SectionLabel>Other</SectionLabel>
      <Group>
        <ListRow title="Offers and perks" sub="Treats, milestones and seasonal deals" end={T('offers')} />
        <ListRow title="WonderBites emails" sub="New shops and your impact" end={T('mail')} />
        <ListRow title="Account security" sub="Always on to keep your account safe" end={<Toggle on locked />} />
      </Group>
      <Group style={{ marginTop: 14 }}>
        <ListRow icon="moon" title="Quiet hours" sub={quiet.on ? `${quiet.from} – ${quiet.to} · no alerts except order updates` : 'Off'} end={<Toggle on={quiet.on} onChange={(x) => setQuiet({ on: x })} />} />
        {quiet.on ? <ListRow title="Change hours" sub={`From ${quiet.from} to ${quiet.to}`} onPress={() => setEditQuiet(!editQuiet)} /> : null}
      </Group>
      {quiet.on && editQuiet ? (
        <View style={{ marginTop: 12, gap: 10 }}>
          <Text style={{ fontSize: 14, color: colors.plum, ...W('bold') }}>Starts</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{HOURS.map((h) => <OptChip key={h} label={h} on={quiet.from === h} onPress={() => setQuiet({ from: h })} />)}</View>
          <Text style={{ fontSize: 14, color: colors.plum, ...W('bold') }}>Ends</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ENDS.map((h) => <OptChip key={h} label={h} on={quiet.to === h} onPress={() => setQuiet({ to: h })} />)}</View>
        </View>
      ) : null}
      <Text style={{ fontSize: 13, color: colors.muted, marginTop: 14, ...W('regular') }}>{LIVE ? 'Changes are saved to your account.' : 'Demo: your choices are saved on this phone. Real alerts start once notifications are connected.'}</Text>
    </Page>
  );
}
