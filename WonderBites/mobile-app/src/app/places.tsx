// P06 Saved places
import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Text } from '../components/AppText';
import { Page, SubHeader } from '../components/layout';
import { StreetMap } from '../components/StreetMap';
import { Button, Card, Group, Icon, ListRow, Pill, W } from '../components/ui';
import { colors } from '../theme';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { placeIcon, placeLabel, setStore, useStore } from '../state/store';
import { locateMe } from '../lib/device';
import { toast } from '../components/Toast';

export default function Places() {
  const { width } = useWindowDimensions();
  const places = useStore((x) => x.places);
  return (
    <Page header={<SubHeader title="Saved places" />} contentStyle={{ gap: 12 }}>
      <Text style={{ fontSize: 14, color: colors.muted, ...W('regular') }}>We use your places to show bags nearby. Pickup only, nothing is delivered.</Text>
      <Card style={{ overflow: 'hidden' }}>
        <StreetMap width={width - 42} height={140} labels={false} bayX={0.72}>
          <View style={{ position: 'absolute', left: (width - 42) * 0.37 - 22, top: 64, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(217,23,92,0.18)', alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.ruby }} /></View>
        </StreetMap>
      </Card>
      <Group>
        {places.map((p, i) => (
          <ListRow key={p.id} icon={placeIcon(p)} title={placeLabel(p.label)} sub={p.detail} chevron={false}
            onPress={() => { setStore((x) => ({ ...x, location: { ...x.location, area: p.area, source: 'manual' } })); toast(`Showing bags near ${p.label}`); }}
            end={i === 0 ? <Pill label="Default" tone="green" style={{ height: 24 }} /> : null}
            actions={<>
              <Pressable onPress={() => router.push({ pathname: '/select-location', params: { mode: 'place', id: p.id } })} hitSlop={14} accessibilityRole="button" accessibilityLabel={`Edit ${p.label}`}><Icon name="edit" size={16} color={colors.muted} /></Pressable>
              {i > 0 ? <Pressable onPress={() => { setStore((x) => ({ ...x, places: x.places.filter((y) => y.id !== p.id) })); toast(`${p.label} removed`); }} hitSlop={14} accessibilityRole="button" accessibilityLabel={`Remove ${p.label}`}><Icon name="trash" size={16} color={colors.muted} /></Pressable> : null}
            </>} />
        ))}
      </Group>
      <Button title="Add a place" icon="plus" kind="secondary" onPress={() => router.push({ pathname: '/select-location', params: { mode: 'place', id: 'new' } })} />
      <Group><ListRow icon="pin" title="Use my current location" sub="Allowed while using the app" onPress={() => locateMe()} /></Group>
    </Page>
  );
}
