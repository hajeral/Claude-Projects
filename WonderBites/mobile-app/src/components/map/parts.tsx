// Pieces shared by the real map (phones) and the movable drawn map (web preview):
// the animated stamp that resizes with the zoom, the landmark badge and "you are here".
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import Animated, { Easing, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Text } from '../AppText';
import { MapPin } from '../MapPin';
import { PulseRing } from '../motion';
import { W } from '../ui';
import { colors } from '../../theme';
import type { LandmarkIcon, LatLng } from '../../lib/mapGeo';

export type MapPinData = LatLng & {
  id: string; pct: number; price: number; was: number; soldOut: boolean; hurry: boolean; label: string; delay: number; tilt: number;
};

export type MapLayerProps = {
  pins: MapPinData[];
  selected?: string;
  onSelect: (id: string) => void;
  /** The customer's position, when the phone shared it. */
  you?: LatLng;
  /** Where the map opens (read once): the customer, else the shop on the card. */
  start?: LatLng;
  /** Move the map here; change `key` to move again to the same place. */
  focus?: LatLng & { key: number };
  /** Space covered by the header (top) and the shop card + tab bar (bottom). */
  insets: { top: number; bottom: number };
  night: boolean;
};

/** Room around a stamp for its "stamp down" ink ring. */
export const stampBox = (size: number) => Math.round(size * 1.9);

/** The animated ruby stamp; when the zoom level changes it eases to its new size. */
export function Stamp({ pin, size, selected, onPress }: { pin: MapPinData; size: number; selected: boolean; onPress?: () => void }) {
  const box = stampBox(size);
  const prev = useRef(size);
  const k = useSharedValue(1);
  useEffect(() => {
    if (prev.current !== size) {
      k.value = prev.current / size;
      k.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
      prev.current = size;
    }
  }, [size, k]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  const o = (box - size) / 2;
  return (
    <Animated.View pointerEvents="box-none" style={[{ width: box, height: box }, a]}>
      <MapPin id={pin.id} x={o} y={o} size={size} tilt={pin.tilt} delay={pin.delay} pct={pin.pct} price={pin.price} was={pin.was}
        soldOut={pin.soldOut} selected={selected} hurry={pin.hurry} onPress={onPress} label={pin.label} />
    </Animated.View>
  );
}

const ICON: Record<LandmarkIcon, string> = {
  museum: 'M-8 7h16M-6 7V1h12v6M-3 1v-4h6v4M0-3v-4',
  dhow: 'M-9 4h18l-3 4h-12zM0 4v-13l7 10h-7',
  arches: 'M-9 7h18M-8 7V2a4 4 0 0 1 8 0v5M0 7V2a4 4 0 0 1 8 0v5',
  lantern: 'M-4-8h8M-3-8v3h6v-3M-5-5h10l-2 11h-6zM0 6v3',
  pearl: 'M-8-5a9 9 0 0 1 16 0',
};

/** A small Doha landmark badge (only drawn while zoomed out). */
export function Landmark({ name, icon, night }: { name: string; icon: LandmarkIcon; night: boolean }) {
  const ink = night ? colors.cream : colors.plum;
  return (
    <View pointerEvents="none" style={{ width: 120, alignItems: 'center' }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: night ? '#4A1C45' : '#FEFAF7', borderWidth: 1.5, borderColor: night ? '#6E1A4C' : '#E6B8C0', alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={24} height={24} viewBox="-12 -12 24 24">
          <G fill="none" stroke={ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <Path d={ICON[icon]} />
            {icon === 'pearl' ? <Circle cx={0} cy={1} r={5} /> : null}
          </G>
        </Svg>
      </View>
      <Text numberOfLines={2} style={{ marginTop: 3, textAlign: 'center', fontSize: 10, lineHeight: 13, color: ink, textShadowColor: night ? '#2A1128' : '#FEFAF7', textShadowRadius: 3, ...W('bold') }}>{name}</Text>
    </View>
  );
}

/** "You are here": the plum dot with its slow pulse. */
export function YouDot() {
  return (
    <View pointerEvents="none" style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
      <PulseRing size={20} color="rgba(51,22,49,0.35)" duration={3600} to={3.2} />
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.plum, borderWidth: 3, borderColor: '#fff' }} />
    </View>
  );
}
